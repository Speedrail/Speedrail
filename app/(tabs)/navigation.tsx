import { MapView, Marker, PROVIDER_GOOGLE, Region } from '@/components/map-view-wrapper';
import StationDetail from '@/components/station-detail';
import { useTabBar } from '@/contexts/tab-bar-context';
import {
  fetchAllTransitStations,
  fetchBusStops,
  getDetailedStationInfo,
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
  const [showParameters, setShowParameters] = useState(false);
  const [stopFilter, setStopFilter] = useState<string>('');
  const [fareFilter, setFareFilter] = useState<number>(30);
  const [accessibilityFilter, setAccessibilityFilter] = useState<'all' | 'wheelchair' | 'ada'>('all');
  const [alertFilter, setAlertFilter] = useState<'all' | 'no-alerts' | 'has-alerts'>('all');
  const [stationDetailsCache, setStationDetailsCache] = useState<Map<string, DetailedStationInfo>>(new Map());
  const [loadingStationDetails, setLoadingStationDetails] = useState<Set<string>>(new Set());
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
    setBusApiKey(process.env.EXPO_PUBLIC_MTA_BUS_API_KEY || '');
  }, []);

  const loadTransitData = useCallback(async () => {
    try {
      setDataLoading(true);
      const data = await fetchAllTransitStations();

      const stations: TransitStation[] = [
        ...convertToTransitStation(data.subway, 'subway'),
        ...convertToTransitStation(data.lirr, 'lirr'),
        ...convertToTransitStation(data.metroNorth, 'metro-north'),
        ...convertToTransitStation(data.sir, 'sir'),
        ...convertToTransitStation(data.ferry, 'ferry'),
      ];

      if (userLocation) {
        const busStops = await fetchBusStops(userLocation.latitude, userLocation.longitude, 8000);
        const busStations = convertToTransitStation(busStops, 'bus');
        stations.push(...busStations);
      }

      setAllStations(stations);
    } catch (error) {
      console.error('Error loading transit data:', error);
    } finally {
      setDataLoading(false);
    }
  }, [userLocation]);

  useEffect(() => {
    requestLocationPermission();
  }, []);

  useEffect(() => {
    loadTransitData();
  }, [loadTransitData]);

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
    
    if (stationDetailsCache.has(cacheKey)) {
      return stationDetailsCache.get(cacheKey)!;
    }
    
    if (loadingStationDetails.has(cacheKey)) {
      return null;
    }
    
    try {
      setLoadingStationDetails(prev => new Set(prev).add(cacheKey));
      
      const originalId = station.id.replace(`${station.type}-`, '');
      const details = await getDetailedStationInfo(originalId, station.type);

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
  }, [stationDetailsCache, loadingStationDetails]);

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
    { key: 'bus' as const, label: 'Bus', icon: 'bus' },
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
      const originalId = station.id.replace(`${station.type}-`, '');
      const info = await getDetailedStationInfo(originalId, station.type);
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
      .filter(station => !stationDetailsCache.has(station.id) && !loadingStationDetails.has(station.id))
      .slice(0, 10);
    
    if (stationsToLoad.length > 0) {
      Promise.all(stationsToLoad.map(station => getStationDetails(station)));
    }
  }, [stationDetailsCache, loadingStationDetails, getStationDetails]);

  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (filteredStations.length > 0) {
      preloadStationDetails(filteredStations);
    }
  }, [filteredStations, preloadStationDetails]);

  const renderFilterItem = useCallback(({ item }: { item: typeof filterOptions[0] }) => (
    <TouchableOpacity
      onPress={() => handleFilterChange(item.key)}
      style={[
        styles.filterButton,
        selectedFilter === item.key && styles.filterButtonActive,
      ]}>
      <MaterialCommunityIcons
        name={item.icon as any}
        size={20}
        color={selectedFilter === item.key ? '#fff' : '#6a99e3'}
      />
      <Text
        style={[
          styles.filterButtonText,
          selectedFilter === item.key && styles.filterButtonTextActive,
        ]}>
        {item.label}
      </Text>
    </TouchableOpacity>
  ), [selectedFilter, handleFilterChange]);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <BottomSheetModalProvider>
        <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: '#fff' }}>
          <View style={styles.container}>
            <View style={styles.header}>
              <View style={{ flex: 1 }}>
                <Text style={styles.title}>Navigation</Text>
                <Text style={styles.subtitle}>
                  {dataLoading ? 'Loading...' : `${filteredStations.length} stations nearby`}
                </Text>
                {(accessibilityFilter !== 'all' || alertFilter !== 'all' || fareFilter < 30 || stopFilter.length > 0) && (
                  <View style={styles.activeFiltersContainer}>
                    {accessibilityFilter !== 'all' && (
                      <View style={styles.activeFilterBadge}>
                        <MaterialCommunityIcons name="wheelchair-accessibility" size={12} color="#6a99e3" />
                      </View>
                    )}
                    {alertFilter !== 'all' && (
                      <View style={styles.activeFilterBadge}>
                        <MaterialCommunityIcons name="alert-circle" size={12} color="#6a99e3" />
                      </View>
                    )}
                    {fareFilter < 30 && (
                      <View style={styles.activeFilterBadge}>
                        <MaterialCommunityIcons name="cash" size={12} color="#6a99e3" />
                      </View>
                    )}
                    {stopFilter.length > 0 && (
                      <View style={styles.activeFilterBadge}>
                        <Feather name="search" size={12} color="#6a99e3" />
                      </View>
                    )}
                  </View>
                )}
              </View>
              <TouchableOpacity
                style={styles.parametersButton}
                onPress={() => setShowParameters(true)}>
                <Feather name="settings" size={24} color="#6a99e3" />
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
              <View style={styles.distanceFilterContainer}>
                <View style={styles.distanceHeader}>
                  <MaterialCommunityIcons name="map-marker-distance" size={20} color="#6a99e3" />
                  <Text style={styles.distanceLabel}>Distance: {tempDistanceFilter.toFixed(1)} miles</Text>
                </View>
                <Slider
                  style={styles.slider}
                  minimumValue={0.5}
                  maximumValue={30}
                  step={0.5}
                  value={tempDistanceFilter}
                  onValueChange={handleDistanceChange}
                  minimumTrackTintColor="#6a99e3"
                  maximumTrackTintColor="#e8f0f9"
                  thumbTintColor="#6a99e3"
                />
                <View style={styles.distanceLabels}>
                  <Text style={styles.distanceMinMax}>0.5 mi</Text>
                  <Text style={styles.distanceMinMax}>30 mi</Text>
                </View>
              </View>
            )}

            {loading || dataLoading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#6a99e3" />
                <Text style={styles.loadingText}>Loading map...</Text>
              </View>
            ) : (
              <MapView
                ref={mapRef}
                style={styles.map}
                provider={PROVIDER_GOOGLE}
                initialRegion={initialRegion}
                showsUserLocation
                showsMyLocationButton
                showsCompass
                loadingEnabled
                loadingIndicatorColor="#6a99e3"
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

            <View style={styles.legendContainer}>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: '#6a99e3' }]} />
                <Text style={styles.legendText}>Subway</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: '#FF9800' }]} />
                <Text style={styles.legendText}>LIRR</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: '#E91E63' }]} />
                <Text style={styles.legendText}>M-N</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: '#00BCD4' }]} />
                <Text style={styles.legendText}>Ferry</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: '#9C27B0' }]} />
                <Text style={styles.legendText}>SIR</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: '#4CAF50' }]} />
                <Text style={styles.legendText}>Bus</Text>
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
          handleIndicatorStyle={{ backgroundColor: '#ccc' }}
          backgroundStyle={{ backgroundColor: '#fff' }}>
          <BottomSheetScrollView>
            <StationDetail stationInfo={stationInfo} loading={stationLoading} />
          </BottomSheetScrollView>
        </BottomSheetModal>

        <Modal
          visible={showParameters}
          animationType="slide"
          presentationStyle="pageSheet"
          onRequestClose={() => setShowParameters(false)}>
          <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }}>
            <View style={styles.parametersContainer}>
              <View style={styles.parametersHeader}>
                <Text style={styles.parametersTitle}>Filter Stations</Text>
                <TouchableOpacity
                  style={styles.parametersCloseButton}
                  onPress={() => setShowParameters(false)}>
                  <Feather name="x" size={24} color="#222" />
                </TouchableOpacity>
              </View>
              
              <View style={styles.parametersContent}>
                <View style={styles.filterSection}>
                  <Text style={styles.filterSectionTitle}>Search by Name</Text>
                  <View style={styles.searchInputContainer}>
                    <Feather name="search" size={18} color="#687076" style={styles.searchIcon} />
                    <TextInput
                      style={styles.searchInput}
                      placeholder="Search stations..."
                      value={stopFilter}
                      onChangeText={setStopFilter}
                      placeholderTextColor="#9ca3af"
                    />
                    {stopFilter.length > 0 && (
                      <TouchableOpacity onPress={() => setStopFilter('')} style={styles.clearButton}>
                        <Feather name="x-circle" size={18} color="#687076" />
                      </TouchableOpacity>
                    )}
                  </View>
                </View>

                <View style={styles.filterSection}>
                  <View style={styles.filterSectionHeader}>
                    <MaterialCommunityIcons name="wheelchair-accessibility" size={20} color="#222" />
                    <Text style={styles.filterSectionTitle}>Accessibility</Text>
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
                          accessibilityFilter === option.key && styles.filterOptionActive
                        ]}
                        onPress={() => setAccessibilityFilter(option.key as any)}>
                        <View style={styles.filterOptionContent}>
                          <MaterialCommunityIcons 
                            name={option.icon as any} 
                            size={16} 
                            color={accessibilityFilter === option.key ? '#fff' : '#6a99e3'} 
                          />
                          <Text style={[
                            styles.filterOptionText,
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
                    <MaterialCommunityIcons name="cash" size={20} color="#222" />
                    <Text style={styles.filterSectionTitle}>Maximum Fare: ${fareFilter.toFixed(2)}</Text>
                  </View>
                  <View style={styles.sliderContainer}>
                    <Slider
                      style={styles.slider}
                      minimumValue={0.0}
                      maximumValue={30.0}
                      step={0.5}
                      value={fareFilter}
                      onValueChange={handleFareChange}
                      minimumTrackTintColor="#6a99e3"
                      maximumTrackTintColor="#e8f0f9"
                      thumbTintColor="#6a99e3"
                    />
                    <View style={styles.fareLabels}>
                      <Text style={styles.fareMin}>$0.00</Text>
                      <Text style={styles.fareMax}>$30.00</Text>
                    </View>
                  </View>
                </View>

                <View style={styles.filterSection}>
                  <View style={styles.filterSectionHeader}>
                    <MaterialCommunityIcons name="alert-circle-outline" size={20} color="#222" />
                    <Text style={styles.filterSectionTitle}>Service Alerts</Text>
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
                          alertFilter === option.key && styles.filterOptionActive
                        ]}
                        onPress={() => setAlertFilter(option.key as any)}>
                        <View style={styles.filterOptionContent}>
                          <MaterialCommunityIcons 
                            name={option.icon as any} 
                            size={16} 
                            color={alertFilter === option.key ? '#fff' : '#6a99e3'} 
                          />
                          <Text style={[
                            styles.filterOptionText,
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
                  style={styles.resetButton}
                  onPress={() => {
                    setStopFilter('');
                    setFareFilter(30);
                    setAccessibilityFilter('all');
                    setAlertFilter('all');
                    setDistanceFilter(1);
                    setTempDistanceFilter(1);
                  }}>
                  <MaterialCommunityIcons name="refresh" size={20} color="#6a99e3" />
                  <Text style={styles.resetButtonText}>Reset All Filters</Text>
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
    backgroundColor: '#fff',
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
    color: '#222',
    textAlign: 'left',
    flexWrap: 'wrap',
  },
  subtitle: {
    fontSize: 14,
    color: '#687076',
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
    backgroundColor: '#e8f0f9',
    marginRight: 8,
  },
  filterButtonActive: {
    backgroundColor: '#6a99e3',
  },
  filterButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6a99e3',
  },
  filterButtonTextActive: {
    color: '#fff',
  },
  distanceFilterContainer: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: '#f8f9fa',
    borderBottomWidth: 1,
    borderBottomColor: '#e8f0f9',
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
    color: '#222',
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
    color: '#687076',
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
    color: '#687076',
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
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
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
    color: '#222',
    fontWeight: '500',
  },
  parametersButton: {
    marginLeft: 'auto',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 14,
    backgroundColor: '#e8f0f9',
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
    color: '#222',
  },
  parametersContent: {
    flex: 1,
    padding: 24,
    backgroundColor: '#fff',
  },
  parametersHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
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
    color: '#222',
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
    backgroundColor: '#e8f0f9',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  filterOptionActive: {
    backgroundColor: '#6a99e3',
    borderColor: '#6a99e3',
  },
  filterOptionText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6a99e3',
  },
  filterOptionTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
    color: '#222',
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
    color: '#687076',
  },
  fareMax: {
    fontSize: 11,
    color: '#687076',
  },
  filterOptionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e8f0f9',
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
    backgroundColor: '#e8f0f9',
    borderRadius: 12,
    marginTop: 8,
  },
  resetButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6a99e3',
  },
  activeFiltersContainer: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 6,
  },
  activeFilterBadge: {
    backgroundColor: '#e8f0f9',
    borderRadius: 12,
    padding: 4,
    paddingHorizontal: 8,
  },
});