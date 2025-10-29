import { MapView, Marker, PROVIDER_GOOGLE, Region } from '@/components/map-view-wrapper';
import StationDetail from '@/components/station-detail';
import { Colors } from '@/constants/theme';
import { useTabBar } from '@/contexts/tab-bar-context';
import { useTheme } from '@/contexts/theme-context';
import { cacheService } from '@/services/cache-service';
import {
  setBusApiKey,
  type BusStop,
  type DetailedStationInfo,
  type FerryStop,
  type RailStation,
  type SubwayStation
} from '@/services/mta-api';
import Feather from '@expo/vector-icons/Feather';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetModalProvider,
  BottomSheetScrollView,
} from '@gorhom/bottom-sheet';
import Slider from '@react-native-community/slider';
import * as Location from 'expo-location';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaView } from 'react-native-safe-area-context';

type TransitType = 'subway' | 'bus' | 'lirr' | 'metro-north' | 'ferry' | 'sir';

interface TransitStation {
  id: string;
  name: string;
  type: TransitType;
  coordinate: {
    latitude: number;
    longitude: number;
  };
  lines?: string[];
}

const convertToTransitStation = (
  stations: (SubwayStation | RailStation | FerryStop | BusStop)[],
  type: TransitType
): TransitStation[] => {
  return stations.map(station => ({
    id: `${type}-${station.id}`,
    name: station.name,
    type,
    coordinate: {
      latitude: station.latitude,
      longitude: station.longitude,
    },
    lines: 'routes' in station ? station.routes : 'lines' in station ? station.lines : undefined,
  }));
};


const CustomMarker = React.memo(({ 
  station, 
  markerColor, 
  markerIcon,
  onPress,
}: { 
  station: TransitStation; 
  markerColor: string; 
  markerIcon: string;
  onPress: () => void;
}) => {
  const handlePress = (e: any) => {
    e.stopPropagation();
    onPress();
  };

  return (
    <Marker
      coordinate={station.coordinate}
      tracksViewChanges={false}
      onPress={handlePress}>
      <TouchableOpacity onPress={handlePress} activeOpacity={0.7}>
        <View
          style={[
            styles.markerContainer,
            { backgroundColor: markerColor },
          ]}>
          <MaterialCommunityIcons
            name={markerIcon as any}
            size={16}
            color="#fff"
          />
        </View>
      </TouchableOpacity>
    </Marker>
  );
}, (prevProps, nextProps) => {
  return (
    prevProps.station.id === nextProps.station.id &&
    prevProps.markerColor === nextProps.markerColor &&
    prevProps.markerIcon === nextProps.markerIcon
  );
});

CustomMarker.displayName = 'CustomMarker';

export default function NavigationPage() {
  const { actualTheme } = useTheme();
  const colors = Colors[actualTheme];
  const [showParameters, setShowParameters] = useState(false);
  const [stopFilter, setStopFilter] = useState<string>('');
  const [fareFilter, setFareFilter] = useState<number>(30);
  const [accessibilityFilter, setAccessibilityFilter] = useState<'all' | 'wheelchair' | 'ada'>('all');
  const [alertFilter, setAlertFilter] = useState<'all' | 'no-alerts' | 'has-alerts'>('all');
  const [stationDetailsCache, setStationDetailsCache] = useState<Map<string, DetailedStationInfo>>(new Map());
  const [loadingStationDetails, setLoadingStationDetails] = useState<Set<string>>(new Set());
  const stationDetailsCacheRef = useRef<Map<string, DetailedStationInfo>>(new Map());
  const loadingStationDetailsRef = useRef<Set<string>>(new Set());
  const { setTabBarVisible } = useTabBar();
  const mapRef = useRef<React.ElementRef<typeof MapView> | null>(null);
  const bottomSheetModalRef = useRef<BottomSheetModal>(null);
  const [initialRegion] = useState<Region>({
    latitude: 40.7580,
    longitude: -73.9855,
    latitudeDelta: 0.5,
    longitudeDelta: 0.5,
  });
  const [userLocation, setUserLocation] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [mapStyle, setMapStyle] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedFilter, setSelectedFilter] = useState<TransitType | 'all'>('all');
  const [allStations, setAllStations] = useState<TransitStation[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [distanceFilter, setDistanceFilter] = useState<number>(1); 
  const [tempDistanceFilter, setTempDistanceFilter] = useState<number>(1); 
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [selectedStation, setSelectedStation] = useState<TransitStation | null>(null);
  const [stationInfo, setStationInfo] = useState<DetailedStationInfo | null>(null);
  const [stationLoading, setStationLoading] = useState(false);
  const snapPoints = useMemo(() => ['60%', '90%'], []);

  useEffect(() => {
    stationDetailsCacheRef.current = stationDetailsCache;
  }, [stationDetailsCache]);

  useEffect(() => {
    loadingStationDetailsRef.current = loadingStationDetails;
  }, [loadingStationDetails]);

  useEffect(() => {
    setBusApiKey(process.env.EXPO_PUBLIC_MTA_BUS_API_KEY || '');
  }, []);

  useEffect(() => {
    if (actualTheme === 'dark') {
      setMapStyle([
        { elementType: 'geometry', stylers: [{ color: '#1a1a1a' }] },
        { elementType: 'labels.text.stroke', stylers: [{ color: '#1a1a1a' }] },
        { elementType: 'labels.text.fill', stylers: [{ color: '#8a8a8a' }] },
        {
          featureType: 'administrative.locality',
          elementType: 'labels.text.fill',
          stylers: [{ color: '#a8a8a8' }],
        },
        {
          featureType: 'poi',
          elementType: 'labels.text.fill',
          stylers: [{ color: '#6a6a6a' }],
        },
        {
          featureType: 'poi.park',
          elementType: 'geometry',
          stylers: [{ color: '#263c3f' }],
        },
        {
          featureType: 'poi.park',
          elementType: 'labels.text.fill',
          stylers: [{ color: '#6b9a76' }],
        },
        {
          featureType: 'road',
          elementType: 'geometry',
          stylers: [{ color: '#2c2c2c' }],
        },
        {
          featureType: 'road',
          elementType: 'geometry.stroke',
          stylers: [{ color: '#212121' }],
        },
        {
          featureType: 'road',
          elementType: 'labels.text.fill',
          stylers: [{ color: '#9ca5b3' }],
        },
        {
          featureType: 'road.highway',
          elementType: 'geometry',
          stylers: [{ color: '#3c3c3c' }],
        },
        {
          featureType: 'road.highway',
          elementType: 'geometry.stroke',
          stylers: [{ color: '#1f1f1f' }],
        },
        {
          featureType: 'road.highway',
          elementType: 'labels.text.fill',
          stylers: [{ color: '#b0b0b0' }],
        },
        {
          featureType: 'transit',
          elementType: 'geometry',
          stylers: [{ color: '#2f3948' }],
        },
        {
          featureType: 'transit.station',
          elementType: 'labels.text.fill',
          stylers: [{ color: '#a0a0a0' }],
        },
        {
          featureType: 'water',
          elementType: 'geometry',
          stylers: [{ color: '#17263c' }],
        },
        {
          featureType: 'water',
          elementType: 'labels.text.fill',
          stylers: [{ color: '#515c6d' }],
        },
        {
          featureType: 'water',
          elementType: 'labels.text.stroke',
          stylers: [{ color: '#17263c' }],
        },
      ]);
    } else {
      setMapStyle([]);
    }
  }, [actualTheme]);

  const loadTransitData = useCallback(async () => {
    try {
      setDataLoading(true);
      const data = await cacheService.getAllStations();

      const stations: TransitStation[] = [
        ...convertToTransitStation(data.subway, 'subway'),
        ...convertToTransitStation(data.lirr, 'lirr'),
        ...convertToTransitStation(data.metroNorth, 'metro-north'),
        ...convertToTransitStation(data.sir, 'sir'),
        ...convertToTransitStation(data.ferry, 'ferry'),
      ];

      setAllStations(stations);
    } catch (error) {
      console.error('Error loading transit data:', error);
    } finally {
      setDataLoading(false);
    }
  }, []);

  useEffect(() => {
    requestLocationPermission();
    loadTransitData();
  }, []);

  const requestLocationPermission = useCallback(async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const location = await Location.getCurrentPositionAsync({});
        const coords = {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        };
        setUserLocation(coords);
        setTimeout(() => {
          mapRef.current?.animateToRegion({
            ...coords,
            latitudeDelta: 0.15,
            longitudeDelta: 0.15,
          }, 800);
        }, 300);
      }
    } catch (error) {
      console.error('Error getting location:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const getMarkerColor = useCallback((type: TransitType): string => {
    switch (type) {
      case 'subway':
        return '#6a99e3';
      case 'bus':
        return '#4CAF50';
      case 'lirr':
        return '#FF9800';
      case 'metro-north':
        return '#E91E63';
      case 'ferry':
        return '#00BCD4';
      case 'sir':
        return '#9C27B0';
      default:
        return '#6a99e3';
    }
  }, []);

  const getMarkerIcon = useCallback((type: TransitType) => {
    switch (type) {
      case 'subway':
        return 'subway-variant';
      case 'bus':
        return 'bus';
      case 'lirr':
        return 'train-car';
      case 'metro-north':
        return 'train';
      case 'sir':
        return 'tram';
      case 'ferry':
        return 'ferry';
      default:
        return 'map-marker';
    }
  }, []);

  const calculateDistance = useCallback((
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number => {
    const R = 3959; 
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }, []);

  const getStationDetails = useCallback(async (station: TransitStation): Promise<DetailedStationInfo | null> => {
    const cacheKey = station.id;
    
    if (stationDetailsCacheRef.current.has(cacheKey)) {
      return stationDetailsCacheRef.current.get(cacheKey)!;
    }
    
    if (loadingStationDetailsRef.current.has(cacheKey)) {
      return null;
    }
    
    try {
      setLoadingStationDetails(prev => new Set(prev).add(cacheKey));
      
      const details = await cacheService.getOrFetchStationDetails(station.id, station.type);

      if (details) {
        setStationDetailsCache(prev => new Map(prev).set(cacheKey, details));
        return details;
      } else {
        return null;
      }
    } catch (error) {
      console.error('Error loading station details:', error);
      return null;
    } finally {
      setLoadingStationDetails(prev => {
        const newSet = new Set(prev);
        newSet.delete(cacheKey);
        return newSet;
      });
    }
  }, []);

  const filteredStations = useMemo(() => {
    const stations = allStations.filter((station) => {
      const typeMatch = selectedFilter === 'all' || station.type === selectedFilter;
      if (!typeMatch) {
        return false;
      }

      const nameMatch = !stopFilter || 
        station.name.toLowerCase().includes(stopFilter.toLowerCase());
      if (!nameMatch) {
        return false;
      }

      if (userLocation) {
        const distance = calculateDistance(
          userLocation.latitude,
          userLocation.longitude,
          station.coordinate.latitude,
          station.coordinate.longitude
        );
        if (distance > distanceFilter) {
          return false;
        }
      }

      const cachedDetails = stationDetailsCache.get(station.id);

      if (accessibilityFilter !== 'all') {
        if (!cachedDetails?.accessibility) {
          return true;
        }
        if (accessibilityFilter === 'wheelchair' && !cachedDetails.accessibility.wheelchairAccessible) {
          return false;
        }
        if (accessibilityFilter === 'ada' && !cachedDetails.accessibility.ada) {
          return false;
        }
      }

      if (alertFilter !== 'all') {
        if (!cachedDetails?.alerts) {
          return true;
        }
        if (alertFilter === 'has-alerts' && cachedDetails.alerts.length === 0) {
          return false;
        }
        if (alertFilter === 'no-alerts' && cachedDetails.alerts.length > 0) {
          return false;
        }
      }

      if (fareFilter < 30) {
        if (!cachedDetails?.fares) {
          return true;
        }
        const hasFareInRange = cachedDetails.fares.some(fare => fare.price <= fareFilter);
        if (!hasFareInRange) {
          return false;
        }
      }

      return true;
    });

    const uniqueStations = Array.from(
      new Map(stations.map(station => [station.id, station])).values()
    );

    return uniqueStations.slice(0, 500);
  }, [allStations, selectedFilter, stopFilter, accessibilityFilter, alertFilter, fareFilter, userLocation, stationDetailsCache, calculateDistance, distanceFilter]);

  const markerProps = useMemo(() => 
    filteredStations.map(station => ({
      station,
      markerColor: getMarkerColor(station.type),
      markerIcon: getMarkerIcon(station.type),
    })), [filteredStations, getMarkerColor, getMarkerIcon]
  );

  const filterOptions = useMemo(() => [
    { key: 'all' as const, label: 'All', icon: 'map-marker' },
    { key: 'subway' as const, label: 'Subway', icon: 'subway-variant' },
    { key: 'lirr' as const, label: 'LIRR', icon: 'train' },
    { key: 'metro-north' as const, label: 'Metro-North', icon: 'train' },
    { key: 'ferry' as const, label: 'Ferry', icon: 'ferry' },
    { key: 'sir' as const, label: 'SIR', icon: 'train' },
  ], []);

  const handleFilterChange = useCallback((key: TransitType | 'all') => {
    setSelectedFilter(key);
  }, []);

  const handleMarkerPress = useCallback(async (station: TransitStation) => {
    setTabBarVisible(false);
    setSelectedStation(station);
    setStationLoading(true);
    bottomSheetModalRef.current?.present();
    
    try {
      const info = await cacheService.getOrFetchStationDetails(station.id, station.type);
      if (info) {
        setStationDetailsCache(prev => {
          const newCache = new Map(prev);
          newCache.set(station.id, info);
          return newCache;
        });
      }
      setStationInfo(info || null);
    } catch (error) {
      console.error('Error loading station info:', error);
    } finally {
      setStationLoading(false);
    }
  }, [setTabBarVisible]);

  const markerPressHandlersRef = useRef<Map<string, () => void>>(new Map());
  const getMarkerPressHandler = useCallback((station: TransitStation) => {
    const map = markerPressHandlersRef.current;
    let handler = map.get(station.id);
    if (!handler) {
      handler = () => handleMarkerPress(station);
      map.set(station.id, handler);
    }
    return handler;
  }, [handleMarkerPress]);

  const handleSheetDismiss = useCallback(() => {
    setTabBarVisible(true);
  }, [setTabBarVisible]);

  const renderBackdrop = useCallback(
    (props: any) => (
      <BottomSheetBackdrop
        {...props}
        disappearsOnIndex={-1}
        appearsOnIndex={0}
        opacity={0.5}
        pressBehavior="close"
      />
    ),
    []
  );

  const handleDistanceChange = useCallback((value: number) => {
    setTempDistanceFilter(value);

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      setDistanceFilter(value);
    }, 300); 
  }, []);

  const handleFareChange = useCallback((value: number) => {
    setFareFilter(value);
  }, []);

  const preloadStationDetails = useCallback(async (stations: TransitStation[]) => {
    const stationsToLoad = stations
      .filter(station => !stationDetailsCacheRef.current.has(station.id) && !loadingStationDetailsRef.current.has(station.id))
      .slice(0, 10);
    
    if (stationsToLoad.length > 0) {
      Promise.all(stationsToLoad.map(station => getStationDetails(station)));
    }
  }, [getStationDetails]);

  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  const filteredStationsIdsRef = useRef<string>('');

  useEffect(() => {
    if (filteredStations.length > 0) {
      const stationIds = filteredStations.slice(0, 10).map(s => s.id).join(',');
      if (stationIds !== filteredStationsIdsRef.current) {
        filteredStationsIdsRef.current = stationIds;
        preloadStationDetails(filteredStations);
      }
    }
  }, [filteredStations, preloadStationDetails]);

  const renderFilterItem = useCallback(({ item }: { item: typeof filterOptions[0] }) => (
    <TouchableOpacity
      onPress={() => handleFilterChange(item.key)}
      style={[
        styles.filterButton,
        { backgroundColor: colors.filterInactive },
        selectedFilter === item.key && [styles.filterButtonActive, { backgroundColor: colors.filterActive }],
      ]}>
      <MaterialCommunityIcons
        name={item.icon as any}
        size={20}
        color={selectedFilter === item.key ? '#fff' : colors.tint}
      />
      <Text
        style={[
          styles.filterButtonText,
          { color: colors.tint },
          selectedFilter === item.key && styles.filterButtonTextActive,
        ]}>
        {item.label}
      </Text>
    </TouchableOpacity>
  ), [selectedFilter, handleFilterChange, colors]);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <BottomSheetModalProvider>
        <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: colors.background }}>
          <View style={[styles.container, { backgroundColor: colors.background }]}>
            <View style={styles.header}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.title, { color: colors.text }]}>Navigation</Text>
                <Text style={[styles.subtitle, { color: colors.secondaryText }]}>
                  {dataLoading ? 'Loading...' : `${filteredStations.length} stations nearby`}
                </Text>
                {(accessibilityFilter !== 'all' || alertFilter !== 'all' || fareFilter < 30 || stopFilter.length > 0) && (
                  <View style={styles.activeFiltersContainer}>
                    {accessibilityFilter !== 'all' && (
                      <View style={[styles.activeFilterBadge, { backgroundColor: colors.filterInactive }]}>
                        <MaterialCommunityIcons name="wheelchair-accessibility" size={12} color={colors.tint} />
                      </View>
                    )}
                    {alertFilter !== 'all' && (
                      <View style={[styles.activeFilterBadge, { backgroundColor: colors.filterInactive }]}>
                        <MaterialCommunityIcons name="alert-circle" size={12} color={colors.tint} />
                      </View>
                    )}
                    {fareFilter < 30 && (
                      <View style={[styles.activeFilterBadge, { backgroundColor: colors.filterInactive }]}>
                        <MaterialCommunityIcons name="cash" size={12} color={colors.tint} />
                      </View>
                    )}
                    {stopFilter.length > 0 && (
                      <View style={[styles.activeFilterBadge, { backgroundColor: colors.filterInactive }]}>
                        <Feather name="search" size={12} color={colors.tint} />
                      </View>
                    )}
                  </View>
                )}
              </View>
              <TouchableOpacity
                style={[styles.parametersButton, { backgroundColor: colors.filterInactive }]}
                onPress={() => setShowParameters(true)}>
                <Feather name="settings" size={24} color={colors.tint} />
              </TouchableOpacity>
            </View>

            <FlatList
              data={filterOptions}
              renderItem={renderFilterItem}
              keyExtractor={(item) => item.key}
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.filterContainer}
              contentContainerStyle={styles.filterContent}
              scrollEnabled={true}
              nestedScrollEnabled={false}
            />

            {userLocation && (
              <View style={[styles.distanceFilterContainer, { backgroundColor: colors.surfaceSecondary, borderBottomColor: colors.border }]}>
                <View style={styles.distanceHeader}>
                  <MaterialCommunityIcons name="map-marker-distance" size={20} color={colors.tint} />
                  <Text style={[styles.distanceLabel, { color: colors.text }]}>Distance: {tempDistanceFilter.toFixed(1)} miles</Text>
                </View>
                <Slider
                  style={styles.slider}
                  minimumValue={0.5}
                  maximumValue={30}
                  step={0.5}
                  value={tempDistanceFilter}
                  onValueChange={handleDistanceChange}
                  minimumTrackTintColor={colors.tint}
                  maximumTrackTintColor={actualTheme === 'dark' ? '#334155' : '#e8f0f9'}
                  thumbTintColor={colors.tint}
                />
                <View style={styles.distanceLabels}>
                  <Text style={[styles.distanceMinMax, { color: colors.secondaryText }]}>0.5 mi</Text>
                  <Text style={[styles.distanceMinMax, { color: colors.secondaryText }]}>30 mi</Text>
                </View>
              </View>
            )}

            {loading || dataLoading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={colors.tint} />
                <Text style={[styles.loadingText, { color: colors.secondaryText }]}>Loading map...</Text>
              </View>
            ) : (
              <MapView
                ref={mapRef}
                style={styles.map}
                provider={PROVIDER_GOOGLE}
                customMapStyle={mapStyle}
                initialRegion={initialRegion}
                showsUserLocation
                showsMyLocationButton
                showsCompass
                loadingEnabled
                loadingIndicatorColor={colors.tint}
                moveOnMarkerPress={false}
                toolbarEnabled={false}
                rotateEnabled={false}
                pitchEnabled={false}
                maxZoomLevel={18}
                minZoomLevel={8}>
                {markerProps.map(({ station, markerColor, markerIcon }) => (
                  <CustomMarker
                    key={station.id}
                    station={station}
                    markerColor={markerColor}
                    markerIcon={markerIcon}
                    onPress={getMarkerPressHandler(station)}
                  />
                ))}
              </MapView>
            )}

            <View style={[styles.legendContainer, { backgroundColor: actualTheme === 'dark' ? 'rgba(30, 41, 59, 0.95)' : 'rgba(255, 255, 255, 0.95)' }]}>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: '#6a99e3' }]} />
                <Text style={[styles.legendText, { color: colors.text }]}>Subway</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: '#FF9800' }]} />
                <Text style={[styles.legendText, { color: colors.text }]}>LIRR</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: '#E91E63' }]} />
                <Text style={[styles.legendText, { color: colors.text }]}>M-N</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: '#00BCD4' }]} />
                <Text style={[styles.legendText, { color: colors.text }]}>Ferry</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: '#9C27B0' }]} />
                <Text style={[styles.legendText, { color: colors.text }]}>SIR</Text>
              </View>
            </View>
          </View>
        </SafeAreaView>
        
        <BottomSheetModal
          ref={bottomSheetModalRef}
          index={1}
          snapPoints={snapPoints}
          backdropComponent={renderBackdrop}
          enablePanDownToClose={true}
          onDismiss={handleSheetDismiss}
          handleIndicatorStyle={{ backgroundColor: actualTheme === 'dark' ? '#64748B' : '#ccc' }}
          backgroundStyle={{ backgroundColor: colors.surface }}>
          <BottomSheetScrollView>
            <StationDetail stationInfo={stationInfo} loading={stationLoading} />
          </BottomSheetScrollView>
        </BottomSheetModal>

        <Modal
          visible={showParameters}
          animationType="slide"
          presentationStyle="pageSheet"
          onRequestClose={() => setShowParameters(false)}>
          <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
            <View style={[styles.parametersContainer, { backgroundColor: colors.background }]}>
              <View style={[styles.parametersHeader, { borderBottomColor: colors.border }]}>
                <Text style={[styles.parametersTitle, { color: colors.text }]}>Filter Stations</Text>
                <TouchableOpacity
                  style={styles.parametersCloseButton}
                  onPress={() => setShowParameters(false)}>
                  <Feather name="x" size={24} color={colors.text} />
                </TouchableOpacity>
              </View>
              
              <View style={[styles.parametersContent, { backgroundColor: colors.background }]}>
                <View style={styles.filterSection}>
                  <Text style={[styles.filterSectionTitle, { color: colors.text }]}>Search by Name</Text>
                  <View style={[styles.searchInputContainer, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border }]}>
                    <Feather name="search" size={18} color={colors.icon} style={styles.searchIcon} />
                    <TextInput
                      style={[styles.searchInput, { color: colors.text }]}
                      placeholder="Search stations..."
                      value={stopFilter}
                      onChangeText={setStopFilter}
                      placeholderTextColor={colors.metaText}
                    />
                    {stopFilter.length > 0 && (
                      <TouchableOpacity onPress={() => setStopFilter('')} style={styles.clearButton}>
                        <Feather name="x-circle" size={18} color={colors.icon} />
                      </TouchableOpacity>
                    )}
                  </View>
                </View>

                <View style={styles.filterSection}>
                  <View style={styles.filterSectionHeader}>
                    <MaterialCommunityIcons name="wheelchair-accessibility" size={20} color={colors.text} />
                    <Text style={[styles.filterSectionTitle, { color: colors.text }]}>Accessibility</Text>
                  </View>
                  <View style={styles.filterOptions}>
                    {[
                      { key: 'all', label: 'All Stations', icon: 'all-inclusive' },
                      { key: 'wheelchair', label: 'Wheelchair', icon: 'wheelchair-accessibility' },
                      { key: 'ada', label: 'ADA', icon: 'checkbox-marked-circle' }
                    ].map((option) => (
                      <TouchableOpacity
                        key={option.key}
                        activeOpacity={0.7}
                        style={[
                          styles.filterOption,
                          { backgroundColor: colors.filterInactive },
                          accessibilityFilter === option.key && [styles.filterOptionActive, { backgroundColor: colors.filterActive }]
                        ]}
                        onPress={() => setAccessibilityFilter(option.key as any)}>
                        <View style={styles.filterOptionContent}>
                          <MaterialCommunityIcons 
                            name={option.icon as any} 
                            size={16} 
                            color={accessibilityFilter === option.key ? '#fff' : colors.tint} 
                          />
                          <Text style={[
                            styles.filterOptionText,
                            { color: colors.tint },
                            accessibilityFilter === option.key && styles.filterOptionTextActive
                          ]}>
                            {option.label}
                          </Text>
                        </View>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                <View style={styles.filterSection}>
                  <View style={styles.filterSectionHeader}>
                    <MaterialCommunityIcons name="cash" size={20} color={colors.text} />
                    <Text style={[styles.filterSectionTitle, { color: colors.text }]}>Maximum Fare: ${fareFilter.toFixed(2)}</Text>
                  </View>
                  <View style={styles.sliderContainer}>
                    <Slider
                      style={styles.slider}
                      minimumValue={0.0}
                      maximumValue={30.0}
                      step={0.5}
                      value={fareFilter}
                      onValueChange={handleFareChange}
                      minimumTrackTintColor={colors.tint}
                      maximumTrackTintColor={actualTheme === 'dark' ? '#334155' : '#e8f0f9'}
                      thumbTintColor={colors.tint}
                    />
                    <View style={styles.fareLabels}>
                      <Text style={[styles.fareMin, { color: colors.secondaryText }]}>$0.00</Text>
                      <Text style={[styles.fareMax, { color: colors.secondaryText }]}>$30.00</Text>
                    </View>
                  </View>
                </View>

                <View style={styles.filterSection}>
                  <View style={styles.filterSectionHeader}>
                    <MaterialCommunityIcons name="alert-circle-outline" size={20} color={colors.text} />
                    <Text style={[styles.filterSectionTitle, { color: colors.text }]}>Service Alerts</Text>
                  </View>
                  <View style={styles.filterOptions}>
                    {[
                      { key: 'all', label: 'All Stations', icon: 'all-inclusive' },
                      { key: 'no-alerts', label: 'No Alerts', icon: 'check-circle' },
                      { key: 'has-alerts', label: 'Has Alerts', icon: 'alert-circle' }
                    ].map((option) => (
                      <TouchableOpacity
                        key={option.key}
                        activeOpacity={0.7}
                        style={[
                          styles.filterOption,
                          { backgroundColor: colors.filterInactive },
                          alertFilter === option.key && [styles.filterOptionActive, { backgroundColor: colors.filterActive }]
                        ]}
                        onPress={() => setAlertFilter(option.key as any)}>
                        <View style={styles.filterOptionContent}>
                          <MaterialCommunityIcons 
                            name={option.icon as any} 
                            size={16} 
                            color={alertFilter === option.key ? '#fff' : colors.tint} 
                          />
                          <Text style={[
                            styles.filterOptionText,
                            { color: colors.tint },
                            alertFilter === option.key && styles.filterOptionTextActive
                          ]}>
                            {option.label}
                          </Text>
                        </View>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                <TouchableOpacity 
                  style={[styles.resetButton, { backgroundColor: colors.filterInactive }]}
                  onPress={() => {
                    setStopFilter('');
                    setFareFilter(30);
                    setAccessibilityFilter('all');
                    setAlertFilter('all');
                    setDistanceFilter(1);
                    setTempDistanceFilter(1);
                  }}>
                  <MaterialCommunityIcons name="refresh" size={20} color={colors.tint} />
                  <Text style={[styles.resetButtonText, { color: colors.tint }]}>Reset All Filters</Text>
                </TouchableOpacity>
              </View>
            </View>
          </SafeAreaView>
        </Modal>
      </BottomSheetModalProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    padding: 24,
    paddingBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    fontSize: 27,
    fontWeight: '700',
    textAlign: 'left',
    flexWrap: 'wrap',
  },
  subtitle: {
    fontSize: 14,
    marginTop: 4,
  },
  filterContainer: {
    maxHeight: 60,
    paddingHorizontal: 16,
  },
  filterContent: {
    paddingVertical: 8,
    gap: 8,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
  },
  filterButtonActive: {
  },
  filterButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  filterButtonTextActive: {
    color: '#fff',
  },
  distanceFilterContainer: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  distanceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  distanceLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  slider: {
    width: '100%',
    height: 40,
  },
  distanceLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: -8,
  },
  distanceMinMax: {
    fontSize: 11,
  },
  map: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
  },
  markerContainer: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  legendContainer: {
    position: 'absolute',
    bottom: 115,
    left: 16,
    right: 16,
    flexDirection: 'row',
    justifyContent: 'space-around',
    borderRadius: 12,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendText: {
    fontSize: 11,
    fontWeight: '500',
  },
  parametersButton: {
    marginLeft: 'auto',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 14,
  },
  btnText: {
    fontSize: 17,
    lineHeight: 24,
    fontWeight: '600',
    color: '#fff',
  },
  parametersContainer: {
    flex: 1,
    padding: 24,
  },
  parametersTitle: {
    fontSize: 24,
    fontWeight: '700',
  },
  parametersContent: {
    flex: 1,
    padding: 24,
  },
  parametersHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    paddingBottom: 16,
  },
  parametersCloseButton: {
    padding: 8,
    marginLeft: 'auto',
  },
  parametersStopFilter: {
    fontSize: 20,
    fontWeight: '700',
    color: '#222',
    marginBottom: 24,
  },
  filterSection: {
    marginBottom: 24,
  },
  filterSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  filterOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  filterOption: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  filterOptionActive: {
    borderColor: 'transparent',
  },
  filterOptionText: {
    fontSize: 14,
    fontWeight: '500',
  },
  filterOptionTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
  },
  distanceFilterInfo: {
    padding: 16,
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e8f0f9',
  },
  distanceFilterText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#222',
    marginBottom: 4,
  },
  distanceFilterSubtext: {
    fontSize: 14,
    color: '#687076',
  },
  fareLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: -8,
    width: '100%',
  },
  fareMin: {
    fontSize: 11,
  },
  fareMax: {
    fontSize: 11,
  },
  filterOptionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
  },
  searchIcon: {
    marginRight: 8,
  },
  clearButton: {
    padding: 4,
    marginLeft: 8,
  },
  filterSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  sliderContainer: {
    width: '100%',
  },
  resetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 16,
    borderRadius: 12,
    marginTop: 8,
  },
  resetButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  activeFiltersContainer: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 6,
  },
  activeFilterBadge: {
    borderRadius: 12,
    padding: 4,
    paddingHorizontal: 8,
  },
});