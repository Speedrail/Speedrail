import Feather from '@expo/vector-icons/Feather';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Haptics from 'expo-haptics';
import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Modal,
    Platform,
    ScrollView,
    StyleSheet,
    Switch,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { Colors } from '../constants/theme';
import { useTheme } from '../contexts/theme-context';
import { GoogleMapsService, TransitRoute } from '../services/google-maps-api';
import { fetchServiceAlerts, ServiceAlert } from '../services/mta-api';
import PlaceAutocompleteInput from './place-autocomplete-input';

interface NotificationItem {
  id: string;
  title: string;
  message: string;
  timestamp: Date;
  type: 'alert' | 'delay' | 'update' | 'info' | 'departure';
  read: boolean;
  routeInfo?: string;
}

interface DailyRoute {
  id: string;
  name: string;
  startLocation: string;
  startCoords?: { lat: number; lng: number };
  destination: string;
  destinationCoords: { lat: number; lng: number };
  trainLines: string[];
  departureTime: string;
  daysOfWeek: boolean[];
  advanceNoticeMinutes: number;
  bufferMinutes: number;
  enabled: boolean;
  morningBriefing: boolean;
  selectedRoute?: TransitRoute;
  routeSummary?: string;
}

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export default function NotificationMenu() {
  const { actualTheme } = useTheme();
  const colors = Colors[actualTheme];
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [expoPushToken, setExpoPushToken] = useState('');
  const [channels, setChannels] = useState<Notifications.NotificationChannel[]>([]);
  const [notification, setNotification] = useState<Notifications.Notification | undefined>(
    undefined
  );
  const [dailyRoutes, setDailyRoutes] = useState<DailyRoute[]>([]);
  const [showRouteModal, setShowRouteModal] = useState(false);
  const [editingRoute, setEditingRoute] = useState<DailyRoute | null>(null);
  const [activeTab, setActiveTab] = useState<'notifications' | 'routes'>('notifications');
  const [loadingAlerts, setLoadingAlerts] = useState(false);

  useEffect(() => {
    registerForPushNotificationsAsync().then((token: string | undefined) => token && setExpoPushToken(token));
    requestNotificationPermissions();
    loadRealTransitAlerts();
    loadDailyRoutes();
    setupNotificationListener();

    const alertInterval = setInterval(() => {
      loadRealTransitAlerts();
    }, 120000);

    return () => clearInterval(alertInterval);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      checkAndScheduleRouteNotifications();
    }, 60000);
    checkAndScheduleRouteNotifications();
    return () => clearInterval(interval);
  }, [dailyRoutes]);

  const setupNotificationListener = () => {
    const subscription = Notifications.addNotificationReceivedListener(handleNewNotification);
    return () => subscription.remove();
  };

  const requestNotificationPermissions = async () => {
    try {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        Alert.alert('Permission Required', 'Please enable notifications to receive transit alerts');
        return;
      }

      const locationStatus = await Location.requestForegroundPermissionsAsync();
      if (locationStatus.status !== 'granted') {
        Alert.alert('Location Required', 'Please enable location access for smart departure notifications');
      }
    } catch (error) {
      console.error('Error requesting notification permissions:', error);
    }
  };

  const loadDailyRoutes = async () => {
    try {
      const stored = await AsyncStorage.getItem('dailyRoutes');
      if (stored) {
        setDailyRoutes(JSON.parse(stored));
      }
    } catch (error) {
      console.error('Error loading daily routes:', error);
    }
  };

  const saveDailyRoutes = async (routes: DailyRoute[]) => {
    try {
      await AsyncStorage.setItem('dailyRoutes', JSON.stringify(routes));
      setDailyRoutes(routes);
    } catch (error) {
      console.error('Error saving daily routes:', error);
    }
  };

  const checkAndScheduleRouteNotifications = async () => {
    const now = new Date();
    const currentDay = now.getDay();
    const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

    for (const route of dailyRoutes) {
      if (!route.enabled || !route.daysOfWeek[currentDay]) continue;

      const [hours, minutes] = route.departureTime.split(':').map(Number);
      const departureDate = new Date(now);
      departureDate.setHours(hours, minutes, 0, 0);

      const timeDiff = departureDate.getTime() - now.getTime();
      const minutesUntilDeparture = Math.floor(timeDiff / 60000);

      if (minutesUntilDeparture === route.advanceNoticeMinutes && minutesUntilDeparture > 0) {
        await sendMorningBriefing(route);
      }

      if (minutesUntilDeparture > 0 && minutesUntilDeparture <= route.advanceNoticeMinutes) {
        const walkingTime = await calculateWalkingTime(route);
        const departureNoticeTime = minutesUntilDeparture - walkingTime - route.bufferMinutes;

        if (departureNoticeTime <= 5 && departureNoticeTime >= -2) {
          await sendDepartureNotification(route, walkingTime);
        }
      }
    }
  };

  const calculateWalkingTime = async (route: DailyRoute): Promise<number> => {
    try {
      const location = await Location.getCurrentPositionAsync({});
      const origin = {
        lat: location.coords.latitude,
        lng: location.coords.longitude,
      };

      const directions = await GoogleMapsService.getDirections(
        origin,
        route.destinationCoords,
        'walking'
      );

      if (directions?.routes?.[0]?.legs?.[0]?.duration?.value) {
        return Math.ceil(directions.routes[0].legs[0].duration.value / 60);
      }
    } catch (error) {
      console.error('Error calculating walking time:', error);
    }
    return 15;
  };

  const sendMorningBriefing = async (route: DailyRoute) => {
    if (!route.morningBriefing) return;

    const walkingTime = await calculateWalkingTime(route);
    const departureTime = new Date();
    const [hours, minutes] = route.departureTime.split(':').map(Number);
    departureTime.setHours(hours, minutes);

    await Notifications.scheduleNotificationAsync({
      content: {
        title: '🌅 Morning Commute Briefing',
        body: `${route.name}: ${walkingTime} min walk to ${route.destination}. ${route.trainLines.join(', ')} trains. Leave by ${new Date(departureTime.getTime() - (walkingTime + route.bufferMinutes) * 60000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
        data: { type: 'briefing', routeId: route.id },
        sound: true,
      },
      trigger: null,
    });

    const newNotification: NotificationItem = {
      id: Date.now().toString(),
      title: '🌅 Morning Commute Briefing',
      message: `${route.name}: ${walkingTime} min walk. Leave by ${new Date(departureTime.getTime() - (walkingTime + route.bufferMinutes) * 60000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
      timestamp: new Date(),
      type: 'info',
      read: false,
      routeInfo: route.trainLines.join(', '),
    };
    setNotifications(prev => [newNotification, ...prev]);
  };

  const sendDepartureNotification = async (route: DailyRoute, walkingTime: number) => {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: '⏰ Time to Leave!',
        body: `Leave now for ${route.destination} (${walkingTime} min walk + ${route.bufferMinutes} min buffer). Catch the ${route.trainLines.join(' or ')} train.`,
        data: { type: 'departure', routeId: route.id },
        sound: true,
        priority: Notifications.AndroidNotificationPriority.HIGH,
      },
      trigger: null,
    });

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);

    const newNotification: NotificationItem = {
      id: Date.now().toString(),
      title: '⏰ Time to Leave!',
      message: `${route.name}: ${walkingTime} min walk to ${route.destination}`,
      timestamp: new Date(),
      type: 'departure',
      read: false,
      routeInfo: route.trainLines.join(', '),
    };
    setNotifications(prev => [newNotification, ...prev]);
  };

  const addOrUpdateRoute = async (route: DailyRoute) => {
    const existingIndex = dailyRoutes.findIndex(r => r.id === route.id);
    let updatedRoutes;

    if (existingIndex >= 0) {
      updatedRoutes = [...dailyRoutes];
      updatedRoutes[existingIndex] = route;
    } else {
      updatedRoutes = [...dailyRoutes, route];
    }

    await saveDailyRoutes(updatedRoutes);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const deleteRoute = (id: string) => {
    Alert.alert(
      'Delete Route',
      'Are you sure you want to delete this daily route?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const updatedRoutes = dailyRoutes.filter(r => r.id !== id);
            await saveDailyRoutes(updatedRoutes);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          },
        },
      ]
    );
  };

  const toggleRouteEnabled = async (id: string) => {
    const updatedRoutes = dailyRoutes.map(r =>
      r.id === id ? { ...r, enabled: !r.enabled } : r
    );
    await saveDailyRoutes(updatedRoutes);
  };

  const handleNewNotification = (notification: Notifications.Notification) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    const newNotification: NotificationItem = {
      id: Date.now().toString(),
      title: notification.request.content.title || 'New Notification',
      message: notification.request.content.body || '',
      timestamp: new Date(),
      type: 'info',
      read: false,
    };

    setNotifications(prev => [newNotification, ...prev]);
  };

  const loadRealTransitAlerts = async () => {
    if (loadingAlerts) return;

    setLoadingAlerts(true);
    try {

      const alerts = await fetchServiceAlerts();

      const notificationItems: NotificationItem[] = alerts.map((alert: ServiceAlert) => {

        let type: NotificationItem['type'] = 'info';
        if (alert.severity === 'critical') {
          type = 'alert';
        } else if (alert.severity === 'warning') {
          type = 'delay';
        }

        const routeInfo = alert.affectedRoutes.length > 0 
          ? alert.affectedRoutes.join(', ') 
          : undefined;

        return {
          id: alert.id,
          title: alert.header,
          message: alert.description || alert.header,
          timestamp: new Date(alert.activePeriod.start),
          type,
          read: false,
          routeInfo,
        };
      });

      notificationItems.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

      setNotifications(prev => {
        const existingIds = new Set(prev.map(n => n.id));
        const newNotifications = notificationItems.filter(n => !existingIds.has(n.id));

        const updated = prev.map(existing => {
          const fresh = notificationItems.find(n => n.id === existing.id);
          return fresh ? { ...fresh, read: existing.read } : existing;
        });

        return [...newNotifications, ...updated];
      });

      console.log(`Loaded ${notificationItems.length} transit alerts from MTA`);
    } catch (error) {
      console.error('Error loading transit alerts:', error);
    } finally {
      setLoadingAlerts(false);
    }
  };

  const markAsRead = (id: string) => {
    setNotifications(prev =>
      prev.map(notif =>
        notif.id === id ? { ...notif, read: true } : notif
      )
    );
  };

  const deleteNotification = (id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setNotifications(prev => prev.filter(notif => notif.id !== id));
  };

  const clearAllNotifications = () => {
    Alert.alert(
      'Clear All',
      'Are you sure you want to clear all notifications?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: () => {
            setNotifications([]);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          },
        },
      ]
    );
  };

  async function schedulePushNotification() {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: "Service Alert!",
        body: 'Your train is arriving in 5 minutes',
        data: { type: 'info' },
        sound: true,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: 2,
      },
    });
  }

  async function registerForPushNotificationsAsync() {
    let token;

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('myNotificationChannel', {
        name: 'A channel is needed for the permissions prompt to appear',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F7C',
      });
    }

    if (Device.isDevice) {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      if (finalStatus !== 'granted') {
        alert('Failed to get push token for push notification!');
        return;
      }

      try {
        const projectId =
          Constants?.expoConfig?.extra?.eas?.projectId ?? Constants?.easConfig?.projectId;
        if (!projectId) {
          throw new Error('Project ID not found');
        }
        token = (
          await Notifications.getExpoPushTokenAsync({
            projectId,
          })
        ).data;
        console.log(token);
      } catch (e) {
        token = `${e}`;
      }
    } else {
      alert('Must use physical device for Push Notifications');
    }

    return token;
  }

  const getIconForType = (type: NotificationItem['type']) => {
    switch (type) {
      case 'alert':
        return 'alert-circle';
      case 'delay':
        return 'clock';
      case 'update':
        return 'refresh-cw';
      case 'info':
      default:
        return 'bell';
    }
  };

  const getColorForType = (type: NotificationItem['type']) => {
    switch (type) {
      case 'alert':
        return '#f44336';
      case 'delay':
        return '#ff9800';
      case 'update':
        return '#2196f3';
      case 'info':
      default:
        return '#6a99e3';
    }
  };

  const formatTimestamp = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const renderNotification = ({ item }: { item: NotificationItem }) => (
    <TouchableOpacity
      style={[styles.notificationCard, { backgroundColor: colors.surface }, !item.read && styles.unreadCard, !item.read && { borderLeftColor: colors.unreadIndicator }]}
      onPress={() => markAsRead(item.id)}
      activeOpacity={0.7}>
      <View style={styles.notificationContent}>
        <View style={[styles.iconContainer, { backgroundColor: getColorForType(item.type) }]}>
          <Feather name={getIconForType(item.type)} size={20} color="#fff" />
        </View>

        <View style={styles.textContainer}>
          <View style={styles.headerRow}>
            <Text style={[styles.notificationTitle, { color: colors.text }]}>{item.title}</Text>
            {!item.read && <View style={[styles.unreadDot, { backgroundColor: colors.unreadIndicator }]} />}
          </View>
          <Text style={[styles.notificationMessage, { color: colors.secondaryText }]} numberOfLines={2}>
            {item.message}
          </Text>
          <View style={styles.metaRow}>
            <Text style={[styles.timestamp, { color: colors.metaText }]}>{formatTimestamp(item.timestamp)}</Text>
            {item.routeInfo && (
              <Text style={[styles.routeInfo, { color: colors.buttonPrimary, backgroundColor: colors.buttonSecondary }]}>{item.routeInfo}</Text>
            )}
          </View>
        </View>

        <TouchableOpacity
          style={styles.deleteButton}
          onPress={() => deleteNotification(item.id)}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Feather name="x" size={18} color={colors.metaText} />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  const unreadCount = notifications.filter(n => !n.read).length;

  const renderRouteCard = ({ item }: { item: DailyRoute }) => {
    const daysAbbrev = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const activeDays = item.daysOfWeek
      .map((active, idx) => active ? daysAbbrev[idx] : null)
      .filter(Boolean)
      .join(', ');

    return (
      <View style={[styles.routeCard, { backgroundColor: colors.surface, borderColor: colors.border }, !item.enabled && styles.routeCardDisabled]}>
        <View style={styles.routeHeader}>
          <View style={styles.routeHeaderLeft}>
            <Text style={[styles.routeName, { color: colors.text }]}>{item.name}</Text>
            <Text style={[styles.routeDays, { color: colors.buttonPrimary }]}>{activeDays}</Text>
          </View>
          <Switch
            value={item.enabled}
            onValueChange={() => toggleRouteEnabled(item.id)}
            trackColor={{ false: colors.inputBorder, true: colors.buttonPrimary }}
            thumbColor="#fff"
          />
        </View>

        <View style={styles.routeDetails}>
          <View style={styles.routeDetailRow}>
            <Feather name="map-pin" size={14} color={colors.secondaryText} />
            <Text style={[styles.routeDetailText, { color: colors.secondaryText }]}>{item.destination}</Text>
          </View>
          <View style={styles.routeDetailRow}>
            <Feather name="clock" size={14} color={colors.secondaryText} />
            <Text style={[styles.routeDetailText, { color: colors.secondaryText }]}>
              Depart at {item.departureTime} ({item.advanceNoticeMinutes} min notice)
            </Text>
          </View>
          <View style={styles.routeDetailRow}>
            <Feather name="navigation" size={14} color={colors.secondaryText} />
            <Text style={[styles.routeDetailText, { color: colors.secondaryText }]}>
              {item.trainLines.join(', ')} • {item.bufferMinutes} min buffer
            </Text>
          </View>
        </View>

        <View style={[styles.routeActions, { borderTopColor: colors.border }]}>
          <TouchableOpacity
            style={styles.routeActionButton}
            onPress={() => {
              setEditingRoute(item);
              setShowRouteModal(true);
            }}>
            <Feather name="edit-2" size={16} color={colors.buttonPrimary} />
            <Text style={[styles.routeActionText, { color: colors.buttonPrimary }]}>Edit</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.routeActionButton}
            onPress={() => deleteRoute(item.id)}>
            <Feather name="trash-2" size={16} color={colors.buttonDanger} />
            <Text style={[styles.routeActionText, { color: colors.buttonDanger }]}>Delete</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.surfaceSecondary }]}>
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <View>
          <Text style={[styles.title, { color: colors.text }]}>Notifications</Text>
          {activeTab === 'notifications' && unreadCount > 0 && (
            <Text style={[styles.unreadCount, { color: colors.buttonPrimary }]}>{unreadCount} unread</Text>
          )}
          {activeTab === 'routes' && (
            <Text style={[styles.unreadCount, { color: colors.buttonPrimary }]}>{dailyRoutes.length} routes</Text>
          )}
        </View>
        <View style={styles.headerButtons}>
          {activeTab === 'notifications' && (
            <>
              <TouchableOpacity
                style={[styles.refreshButton, { backgroundColor: colors.buttonSecondary }]}
                onPress={loadRealTransitAlerts}
                disabled={loadingAlerts}>
                {loadingAlerts ? (
                  <ActivityIndicator size="small" color={colors.buttonPrimary} />
                ) : (
                  <Feather name="refresh-cw" size={20} color={colors.buttonPrimary} />
                )}
              </TouchableOpacity>
              {notifications.length > 0 && (
                <TouchableOpacity
                  style={[styles.clearButton, { backgroundColor: colors.buttonDangerBg }]}
                  onPress={clearAllNotifications}>
                  <Text style={[styles.clearButtonText, { color: colors.buttonDanger }]}>Clear All</Text>
                </TouchableOpacity>
              )}
            </>
          )}
          {activeTab === 'routes' && (
            <TouchableOpacity
              style={[styles.addRouteButton, { backgroundColor: colors.buttonPrimary }]}
              onPress={() => {
                setEditingRoute(null);
                setShowRouteModal(true);
              }}>
              <Feather name="plus" size={20} color="#fff" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <View style={[styles.tabBar, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'notifications' && styles.activeTab, activeTab === 'notifications' && { borderBottomColor: colors.buttonPrimary }]}
          onPress={() => setActiveTab('notifications')}>
          <Feather
            name="bell"
            size={18}
            color={activeTab === 'notifications' ? colors.buttonPrimary : colors.metaText}
          />
          <Text style={[styles.tabText, { color: colors.metaText }, activeTab === 'notifications' && styles.activeTabText, activeTab === 'notifications' && { color: colors.buttonPrimary }]}>
            Notifications
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'routes' && styles.activeTab, activeTab === 'routes' && { borderBottomColor: colors.buttonPrimary }]}
          onPress={() => setActiveTab('routes')}>
          <Feather
            name="navigation"
            size={18}
            color={activeTab === 'routes' ? colors.buttonPrimary : colors.metaText}
          />
          <Text style={[styles.tabText, { color: colors.metaText }, activeTab === 'routes' && styles.activeTabText, activeTab === 'routes' && { color: colors.buttonPrimary }]}>
            Daily Routes
          </Text>
        </TouchableOpacity>
      </View>

      {activeTab === 'notifications' ? (
        notifications.length === 0 ? (
          <View style={styles.emptyState}>
            <Feather name="bell-off" size={64} color={colors.border} />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>No notifications</Text>
            <Text style={[styles.emptySubtitle, { color: colors.secondaryText }]}>
              You&apos;ll be notified about service changes and updates
            </Text>
          </View>
        ) : (
          <FlatList
            data={notifications}
            renderItem={renderNotification}
            keyExtractor={item => item.id}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
          />
        )
      ) : dailyRoutes.length === 0 ? (
        <View style={styles.emptyState}>
          <Feather name="navigation" size={64} color={colors.border} />
          <Text style={[styles.emptyTitle, { color: colors.text }]}>No daily routes</Text>
          <Text style={[styles.emptySubtitle, { color: colors.secondaryText }]}>
            Add your daily commute to get smart departure notifications
          </Text>
          <TouchableOpacity
            style={[styles.addFirstRouteButton, { backgroundColor: colors.buttonPrimary }]}
            onPress={() => {
              setEditingRoute(null);
              setShowRouteModal(true);
            }}>
            <Feather name="plus" size={20} color="#fff" />
            <Text style={styles.addFirstRouteText}>Add Your First Route</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={dailyRoutes}
          renderItem={renderRouteCard}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}

      <RouteModal
        visible={showRouteModal}
        route={editingRoute}
        onClose={() => {
          setShowRouteModal(false);
          setEditingRoute(null);
        }}
        onSave={addOrUpdateRoute}
      />
    </View>
  );
}

function RouteModal({
  visible,
  route,
  onClose,
  onSave,
}: {
  visible: boolean;
  route: DailyRoute | null;
  onClose: () => void;
  onSave: (route: DailyRoute) => void;
}) {
  const { actualTheme } = useTheme();
  const colors = Colors[actualTheme];
  const [step, setStep] = useState<'location' | 'route' | 'config'>(route ? 'config' : 'location');
  const [name, setName] = useState('');
  const [startingPoint, setStartingPoint] = useState('');
  const [destination, setDestination] = useState('');
  const [startingLocation, setStartingLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [destinationLocation, setDestinationLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [routes, setRoutes] = useState<TransitRoute[]>([]);
  const [selectedRoute, setSelectedRoute] = useState<TransitRoute | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingLocation, setLoadingLocation] = useState(false);
  const [departureTime, setDepartureTime] = useState('08:00');
  const [daysOfWeek, setDaysOfWeek] = useState([false, true, true, true, true, true, false]);
  const [advanceNoticeMinutes, setAdvanceNoticeMinutes] = useState(30);
  const [bufferMinutes, setBufferMinutes] = useState(5);
  const [morningBriefing, setMorningBriefing] = useState(true);

  useEffect(() => {
    if (visible) {
      if (route) {
        setStep('config');
        setName(route.name);
        setStartingPoint(route.startLocation || '');
        setDestination(route.destination);
        setStartingLocation(route.startCoords || null);
        setDestinationLocation(route.destinationCoords);
        setSelectedRoute(route.selectedRoute || null);
        setDepartureTime(route.departureTime);
        setDaysOfWeek(route.daysOfWeek);
        setAdvanceNoticeMinutes(route.advanceNoticeMinutes);
        setBufferMinutes(route.bufferMinutes);
        setMorningBriefing(route.morningBriefing);
      } else {
        setStep('location');
        setName('');
        setStartingPoint('');
        setDestination('');
        setStartingLocation(null);
        setDestinationLocation(null);
        setRoutes([]);
        setSelectedRoute(null);
        setDepartureTime('08:00');
        setDaysOfWeek([false, true, true, true, true, true, false]);
        setAdvanceNoticeMinutes(30);
        setBufferMinutes(5);
        setMorningBriefing(true);
        getCurrentLocation();
      }
    }
  }, [route, visible]);

  const getCurrentLocation = async () => {
    setLoadingLocation(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setLoadingLocation(false);
        return;
      }
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      const address = await GoogleMapsService.reverseGeocode(
        location.coords.latitude,
        location.coords.longitude
      );
      if (address) {
        setStartingPoint(address);
        setStartingLocation({
          lat: location.coords.latitude,
          lng: location.coords.longitude,
        });
      }
    } catch (error) {
      console.error('Error getting current location:', error);
    } finally {
      setLoadingLocation(false);
    }
  };

  const handleFindRoutes = async () => {
    if (!startingLocation || !destinationLocation) {
      Alert.alert('Missing Information', 'Please select both starting point and destination');
      return;
    }
    setLoading(true);
    try {
      const directionsResponse = await GoogleMapsService.getDirections(
        startingLocation,
        destinationLocation,
        'transit',
        Date.now(),
        true
      );
      if (directionsResponse && directionsResponse.routes.length > 0) {
        setRoutes(directionsResponse.routes.slice(0, 5));
        setStep('route');
      } else {
        Alert.alert('No Routes Found', 'No public transit routes available for this destination');
      }
    } catch (error) {
      console.error('Error fetching routes:', error);
      Alert.alert('Error', 'Failed to fetch routes. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleRouteSelect = (transitRoute: TransitRoute) => {
    setSelectedRoute(transitRoute);
    setStep('config');
  };

  const extractTrainLines = (transitRoute: TransitRoute): string[] => {
    const lines: string[] = [];
    const leg = transitRoute.legs?.[0];
    if (leg?.steps) {
      leg.steps.forEach(step => {
        if (step.travel_mode === 'TRANSIT' && step.transit_details) {
          const lineName = step.transit_details.line?.short_name || step.transit_details.line?.name;
          if (lineName) {
            lines.push(lineName);
          }
        }
      });
    }
    return lines;
  };

  const handleSave = async () => {
    if (!name) {
      Alert.alert('Missing Information', 'Please enter a route name');
      return;
    }
    if (!selectedRoute || !destinationLocation) {
      Alert.alert('Missing Information', 'Please select a route');
      return;
    }

    const trainLines = extractTrainLines(selectedRoute);
    const leg = selectedRoute.legs?.[0];
    const destinationName = leg?.end_address || destination;

    const newRoute: DailyRoute = {
      id: route?.id || Date.now().toString(),
      name,
      startLocation: startingPoint || 'Current Location',
      startCoords: startingLocation || undefined,
      destination: destinationName,
      destinationCoords: destinationLocation,
      trainLines,
      departureTime,
      daysOfWeek,
      advanceNoticeMinutes,
      bufferMinutes,
      enabled: route?.enabled ?? true,
      morningBriefing,
      selectedRoute,
      routeSummary: selectedRoute.summary,
    };

    onSave(newRoute);
    onClose();
  };

  const handleBack = () => {
    if (step === 'route') {
      setStep('location');
    } else if (step === 'config') {
      if (route) {
        onClose();
      } else {
        setStep('route');
      }
    }
  };

  const daysAbbrev = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

  const renderLocationStep = () => (
    <>
      <View style={[styles.modalHeader, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={onClose}>
          <Feather name="x" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.modalTitle, { color: colors.text }]}>Select Route</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
        <View style={styles.formSection}>
          <Text style={[styles.formLabel, { color: colors.text }]}>Starting Point</Text>
          <View style={styles.inputRow}>
            <PlaceAutocompleteInput
              placeholder="Starting Point"
              icon="navigation"
              value={startingPoint}
              onPlaceSelected={(placeId, description, location) => {
                setStartingPoint(description);
                setStartingLocation(location);
              }}
              onChangeText={(text) => setStartingPoint(text)}
              containerStyle={{ position: 'relative', zIndex: 1000 }}
            />
            {loadingLocation && (
              <View style={styles.locationLoadingOverlay}>
                <ActivityIndicator size="small" color={colors.buttonPrimary} />
              </View>
            )}
          </View>
          <TouchableOpacity
            style={styles.currentLocationButton}
            onPress={getCurrentLocation}
            disabled={loadingLocation}>
            <Feather name="crosshair" size={14} color={colors.buttonPrimary} />
            <Text style={[styles.currentLocationText, { color: colors.buttonPrimary }]}>Use current location</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.formSection}>
          <Text style={[styles.formLabel, { color: colors.text }]}>Destination</Text>
          <PlaceAutocompleteInput
            placeholder="Destination"
            icon="map-pin"
            value={destination}
            onPlaceSelected={(placeId, description, location) => {
              setDestination(description);
              setDestinationLocation(location);
            }}
            onChangeText={(text) => setDestination(text)}
          />
        </View>

        <TouchableOpacity
          onPress={handleFindRoutes}
          disabled={loading || !startingLocation || !destinationLocation}
          style={[
            styles.findRouteButton,
            { backgroundColor: colors.buttonPrimary },
            (!startingLocation || !destinationLocation) && styles.findRouteButtonDisabled,
            (!startingLocation || !destinationLocation) && { backgroundColor: colors.inputBorder },
          ]}>
          {loading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.findRouteButtonText}>Find Routes</Text>
          )}
        </TouchableOpacity>

        {(!startingLocation || !destinationLocation) && (
          <Text style={[styles.helperText, { color: colors.secondaryText }]}>
            {!startingLocation && !destinationLocation
              ? 'Please select starting point and destination'
              : !startingLocation
              ? 'Please select a starting point from the autocomplete'
              : 'Please select a destination from the autocomplete'}
          </Text>
        )}
      </ScrollView>
    </>
  );

  const renderRouteStep = () => (
    <>
      <View style={[styles.modalHeader, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={handleBack}>
          <Feather name="arrow-left" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.modalTitle, { color: colors.text }]}>Choose Route</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
        <Text style={[styles.routesTitle, { color: colors.text }]}>Available Routes</Text>
        {routes.map((transitRoute, index) => (
          <RouteOptionCard
            key={`route-${index}`}
            route={transitRoute}
            routeNumber={index + 1}
            onSelect={() => handleRouteSelect(transitRoute)}
          />
        ))}
      </ScrollView>
    </>
  );

  const renderConfigStep = () => (
    <>
      <View style={[styles.modalHeader, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={handleBack}>
          <Feather name={route ? 'x' : 'arrow-left'} size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.modalTitle, { color: colors.text }]}>{route ? 'Edit Route' : 'Configure Notifications'}</Text>
        <TouchableOpacity onPress={handleSave}>
          <Text style={[styles.saveButton, { color: colors.buttonPrimary }]}>Save</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
        <View style={styles.formSection}>
          <Text style={[styles.formLabel, { color: colors.text }]}>Route Name</Text>
          <TextInput
            style={[styles.textInput, { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder, color: colors.text }]}
            value={name}
            onChangeText={setName}
            placeholder="e.g., Morning Commute"
            placeholderTextColor={colors.metaText}
          />
        </View>

        {selectedRoute && (
          <View style={[styles.selectedRoutePreview, { backgroundColor: colors.infoBoxBg }]}>
            <Text style={[styles.previewLabel, { color: colors.buttonPrimary }]}>Selected Route</Text>
            <Text style={[styles.previewText, { color: colors.text }]}>
              {selectedRoute.summary || 'Transit route'}
            </Text>
            <Text style={[styles.previewSubtext, { color: colors.secondaryText }]}>
              {selectedRoute.legs?.[0]?.duration?.text || 'Unknown duration'}
            </Text>
          </View>
        )}

        <View style={styles.formSection}>
          <Text style={[styles.formLabel, { color: colors.text }]}>Departure Time</Text>
          <TextInput
            style={[styles.textInput, { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder, color: colors.text }]}
            value={departureTime}
            onChangeText={setDepartureTime}
            placeholder="HH:MM"
            placeholderTextColor={colors.metaText}
          />
        </View>

        <View style={styles.formSection}>
          <Text style={[styles.formLabel, { color: colors.text }]}>Days of Week</Text>
          <View style={styles.daysContainer}>
            {daysAbbrev.map((day, idx) => (
              <TouchableOpacity
                key={idx}
                style={[styles.dayButton, { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder }, daysOfWeek[idx] && styles.dayButtonActive, daysOfWeek[idx] && { backgroundColor: colors.buttonPrimary, borderColor: colors.buttonPrimary }]}
                onPress={() => {
                  const newDays = [...daysOfWeek];
                  newDays[idx] = !newDays[idx];
                  setDaysOfWeek(newDays);
                }}>
                <Text style={[styles.dayButtonText, { color: colors.secondaryText }, daysOfWeek[idx] && styles.dayButtonTextActive]}>
                  {day}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.formSection}>
          <Text style={[styles.formLabel, { color: colors.text }]}>Advance Notice: {advanceNoticeMinutes} minutes</Text>
          <View style={styles.timeButtonsContainer}>
            {[15, 30, 45, 60].map(minutes => (
              <TouchableOpacity
                key={minutes}
                style={[
                  styles.timeButton,
                  { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder },
                  advanceNoticeMinutes === minutes && styles.timeButtonActive,
                  advanceNoticeMinutes === minutes && { backgroundColor: colors.buttonPrimary, borderColor: colors.buttonPrimary },
                ]}
                onPress={() => setAdvanceNoticeMinutes(minutes)}>
                <Text
                  style={[
                    styles.timeButtonText,
                    { color: colors.secondaryText },
                    advanceNoticeMinutes === minutes && styles.timeButtonTextActive,
                  ]}>
                  {minutes}m
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.formSection}>
          <Text style={[styles.formLabel, { color: colors.text }]}>Walking Buffer: {bufferMinutes} minutes</Text>
          <View style={styles.timeButtonsContainer}>
            {[0, 5, 10, 15].map(minutes => (
              <TouchableOpacity
                key={minutes}
                style={[
                  styles.timeButton,
                  { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder },
                  bufferMinutes === minutes && styles.timeButtonActive,
                  bufferMinutes === minutes && { backgroundColor: colors.buttonPrimary, borderColor: colors.buttonPrimary },
                ]}
                onPress={() => setBufferMinutes(minutes)}>
                <Text
                  style={[
                    styles.timeButtonText,
                    { color: colors.secondaryText },
                    bufferMinutes === minutes && styles.timeButtonTextActive,
                  ]}>
                  {minutes}m
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.formSection}>
          <View style={styles.switchRow}>
            <View>
              <Text style={[styles.formLabel, { color: colors.text }]}>Morning Briefing</Text>
              <Text style={styles.formSubtext}>Get a summary notification in advance</Text>
            </View>
            <Switch
              value={morningBriefing}
              onValueChange={setMorningBriefing}
              trackColor={{ false: colors.inputBorder, true: colors.buttonPrimary }}
              thumbColor="#fff"
            />
          </View>
        </View>

        <View style={[styles.infoBox, { backgroundColor: colors.infoBoxBg }]}>
          <Feather name="info" size={16} color={colors.buttonPrimary} />
          <Text style={[styles.infoText, { color: colors.secondaryText }]}>
            We&apos;ll calculate walking time from your location and notify you when it&apos;s time to leave!
          </Text>
        </View>
      </ScrollView>
    </>
  );

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={[styles.modalContainer, { backgroundColor: colors.surfaceSecondary }]}>
        {step === 'location' && renderLocationStep()}
        {step === 'route' && renderRouteStep()}
        {step === 'config' && renderConfigStep()}
      </View>
    </Modal>
  );
}

function RouteOptionCard({ route, routeNumber, onSelect }: { route: TransitRoute; routeNumber: number; onSelect: () => void }) {
  const { actualTheme } = useTheme();
  const colors = Colors[actualTheme];
  const leg = route.legs?.[0];
  if (!leg) return null;

  let transfers = 0;
  const modes: string[] = [];

  leg.steps?.forEach((step) => {
    if (step.travel_mode === 'TRANSIT' && step.transit_details) {
      const vehicleType = step.transit_details?.line?.vehicle?.type;
      const lineName = step.transit_details?.line?.short_name || step.transit_details?.line?.name;
      if (vehicleType === 'SUBWAY') {
        modes.push(`Subway ${lineName || ''}`);
      } else if (vehicleType === 'BUS') {
        modes.push(`Bus ${lineName || ''}`);
      } else {
        modes.push(lineName || 'Transit');
      }
      transfers++;
    }
  });

  const modesSummary = modes.length > 0 ? modes.join(' → ') : 'No transit info';
  const transferCount = Math.max(0, transfers - 1);
  const arrivalTime = leg.arrival_time?.text || '';

  return (
    <TouchableOpacity style={[styles.routeOptionCard, { backgroundColor: colors.surface, borderColor: colors.border }]} onPress={onSelect}>
      <View style={styles.routeOptionHeader}>
        <Text style={[styles.routeOptionNumber, { color: colors.text }]}>Route {routeNumber}</Text>
        <View style={[styles.routeOptionDuration, { backgroundColor: colors.buttonSecondary }]}>
          <Feather name="clock" size={16} color={colors.buttonPrimary} />
          <Text style={[styles.routeOptionDurationText, { color: colors.buttonPrimary }]}>{leg.duration?.text || 'Unknown'}</Text>
        </View>
      </View>
      <Text style={[styles.routeOptionMode, { color: colors.text }]} numberOfLines={2}>{modesSummary}</Text>
      <View style={styles.routeOptionDetails}>
        <View style={styles.routeOptionDetail}>
          <Feather name="shuffle" size={14} color={colors.secondaryText} />
          <Text style={[styles.routeOptionDetailText, { color: colors.secondaryText }]}>
            {transferCount} {transferCount === 1 ? 'transfer' : 'transfers'}
          </Text>
        </View>
        {arrivalTime && (
          <View style={styles.routeOptionDetail}>
            <Feather name="target" size={14} color={colors.secondaryText} />
            <Text style={[styles.routeOptionDetailText, { color: colors.secondaryText }]}>Arrive {arrivalTime}</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: 27,
    textAlign: 'left',
    fontWeight: '700',
  },
  unreadCount: {
    fontSize: 14,
    marginTop: 4,
    fontWeight: '600',
  },
  headerButtons: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },
  refreshButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  testButton: {
    padding: 8,
  },
  clearButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  clearButtonText: {
    fontSize: 13,
    fontWeight: '600',
  },
  listContent: {
    padding: 16,
    paddingBottom: 100,
  },
  notificationCard: {
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  unreadCard: {
    borderLeftWidth: 3,
  },
  notificationContent: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  textContainer: {
    flex: 1,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  notificationTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  notificationMessage: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 8,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  timestamp: {
    fontSize: 12,
  },
  routeInfo: {
    fontSize: 12,
    fontWeight: '600',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  deleteButton: {
    padding: 4,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: 8,
  },
  testNotificationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#6a99e3',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 10,
    marginTop: 24,
  },
  testNotificationText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },
  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: 1,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTab: {
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
  },
  activeTabText: {
    fontWeight: '600',
  },
  addRouteButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  routeCard: {
    borderRadius: 12,
    marginBottom: 12,
    padding: 16,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  routeCardDisabled: {
    opacity: 0.5,
  },
  routeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  routeHeaderLeft: {
    flex: 1,
  },
  routeName: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  routeDays: {
    fontSize: 13,
    fontWeight: '500',
  },
  routeDetails: {
    gap: 8,
    marginBottom: 12,
  },
  routeDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  routeDetailText: {
    fontSize: 14,
  },
  routeActions: {
    flexDirection: 'row',
    gap: 12,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  routeActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  routeActionText: {
    fontSize: 14,
    fontWeight: '600',
  },
  addFirstRouteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 24,
  },
  addFirstRouteText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    paddingTop: 60,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  saveButton: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6a99e3',
  },
  modalContent: {
    flex: 1,
    padding: 16,
  },
  formSection: {
    marginBottom: 24,
  },
  formLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  formSubtext: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
  },
  formLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  linkText: {
    fontSize: 13,
    color: '#6a99e3',
    fontWeight: '500',
  },
  textInput: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 15,
  },
  daysContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  dayButton: {
    flex: 1,
    paddingVertical: 12,
    borderWidth: 1,
    borderRadius: 8,
    alignItems: 'center',
  },
  dayButtonActive: {
  },
  dayButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  dayButtonTextActive: {
    color: '#fff',
  },
  timeButtonsContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  timeButton: {
    flex: 1,
    paddingVertical: 10,
    borderWidth: 1,
    borderRadius: 8,
    alignItems: 'center',
  },
  timeButtonActive: {
  },
  timeButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  timeButtonTextActive: {
    color: '#fff',
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  infoBox: {
    flexDirection: 'row',
    gap: 12,
    padding: 16,
    borderRadius: 8,
    marginTop: 8,
    marginBottom: 32,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
  },
  inputRow: {
    position: 'relative',
  },
  locationLoadingOverlay: {
    position: 'absolute',
    right: 12,
    top: 12,
  },
  currentLocationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
  },
  currentLocationText: {
    fontSize: 13,
    fontWeight: '500',
  },
  findRouteButton: {
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 24,
  },
  findRouteButtonDisabled: {
  },
  findRouteButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  helperText: {
    fontSize: 13,
    textAlign: 'center',
    marginTop: 12,
  },
  routesTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  routeOptionCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  routeOptionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  routeOptionNumber: {
    fontSize: 18,
    fontWeight: '700',
  },
  routeOptionDuration: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 6,
  },
  routeOptionDurationText: {
    fontSize: 15,
    fontWeight: '600',
  },
  routeOptionMode: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 12,
  },
  routeOptionDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  routeOptionDetail: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  routeOptionDetailText: {
    fontSize: 13,
  },
  selectedRoutePreview: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
  },
  previewLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  previewText: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  previewSubtext: {
    fontSize: 14,
  },
});