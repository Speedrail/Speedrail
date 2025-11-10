import Feather from '@expo/vector-icons/Feather';
import React, { useCallback, useEffect, useState } from 'react';
import {
    ActivityIndicator,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from './map-view-wrapper';
import { useSelectedRoute } from '../contexts/selected-route-context';
import { useTabBar } from '../contexts/tab-bar-context';
import { GoogleMapsService, RouteStep, TransitRoute } from '../services/google-maps-api';
import {
    getNearbyStops,
    getStopArrivals,
    StopArrival,
    StopWithArrivals,
    TransiterSystems,
} from '../services/transiterAPI';

export function SelectedRoute() {
  
}

interface LiveTrackingViewProps {
  route: TransitRoute;
  onBack: () => void;
  oldAgeRoute: boolean;
}

export default function LiveTrackingView({ route, onBack, oldAgeRoute }: LiveTrackingViewProps) {
  const { selectedRoute, setSelectedRoute } = useSelectedRoute();
  const { setTabBarVisible } = useTabBar();
  const leg = route.legs?.[0];
  const [region, setRegion] = useState({
    latitude: leg?.start_location?.lat || 40.7128,
    longitude: leg?.start_location?.lng || -74.0060,
    latitudeDelta: 0.05,
    longitudeDelta: 0.05,
  });
  const [routeCoordinates, setRouteCoordinates] = useState<
    { latitude: number; longitude: number }[]
  >([]);
  
  const [stopArrivals, setStopArrivals] = useState<Map<string, StopWithArrivals>>(new Map());
  const [isLoadingArrivals, setIsLoadingArrivals] = useState(false);
  const [currentTime, setCurrentTime] = useState(Date.now());
  const [currentStepIndex, setCurrentStepIndex] = useState(0);

  useEffect(() => {
    setTabBarVisible(false);
    
    return () => {
      setTabBarVisible(true);
    };
  }, [setTabBarVisible]);

  useEffect(() => {
    if (!leg) return;
    setRegion({
      latitude: (leg.start_location.lat + leg.end_location.lat) / 2,
      longitude: (leg.start_location.lng + leg.end_location.lng) / 2,
      latitudeDelta: 0.05,
      longitudeDelta: 0.05,
    });

    const decodedRoute = GoogleMapsService.decodePolyline(
      route.overview_polyline.points
    );
    setRouteCoordinates(decodedRoute);
  }, [route]);

  // Update current time every 30 seconds for countdown timers
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(Date.now());
    }, 30000);
    
    return () => clearInterval(timer);
  }, []);

  const findNearestTransiterStop = useCallback(async (
    latitude: number,
    longitude: number,
    systemId: string
  ): Promise<string | null> => {
    try {
      // Use 0.5 km radius to find nearby stops (most stops are within 500m)
      const result = await getNearbyStops(systemId, latitude, longitude, 0.5, 5);
      
      if (result.stops && result.stops.length > 0) {
        return result.stops[0].id;
      }
      
      return null;
    } catch (error) {
      console.error('Error finding nearby Transiter stop:', error);
      return null;
    }
  }, []);

  const resolveSystemId = useCallback((vehicleType?: string, lineName?: string, headsign?: string) => {
    const t = (vehicleType || '').toUpperCase();
    const name = (lineName || '').toUpperCase();
    const head = (headsign || '').toUpperCase();
    if (t === 'SUBWAY') return TransiterSystems.NYC_SUBWAY;
    if (t === 'BUS') return TransiterSystems.NYC_BUS;
    if (t === 'FERRY' || name.includes('FERRY') || head.includes('FERRY')) return TransiterSystems.NYC_FERRY as any;
    if (name.includes('LIRR') || name.includes('LONG ISLAND')) return TransiterSystems.NYC_LIRR as any;
    if (name.includes('METRO-NORTH') || name.includes('METRO NORTH') || name.includes('MNR')) return TransiterSystems.NYC_METRO_NORTH as any;
    if (name.includes('STATEN ISLAND RAILWAY') || name.includes('SIR') || head.includes('STATEN ISLAND')) return TransiterSystems.NYC_SIR as any;
    if (['TRAIN','HEAVY_RAIL','COMMUTER_TRAIN','RAIL','METRO_RAIL'].includes(t)) return TransiterSystems.NYC_LIRR as any;
    return TransiterSystems.NYC_SUBWAY;
  }, []);

  const fetchStopArrivals = useCallback(async () => {
    if (!leg || !leg.steps) return;
    
    setIsLoadingArrivals(true);
    const newStopArrivals = new Map<string, StopWithArrivals>();

    try {
      const transitSteps = leg.steps.filter(step => step.transit_details);
      
      for (const step of transitSteps) {
        const transitDetails = step.transit_details;
        if (!transitDetails) continue;

        const departureStop = transitDetails.departure_stop;
        const vehicleType = transitDetails.line?.vehicle?.type;
        const lineName = transitDetails.line?.short_name || transitDetails.line?.name;
        const systemId = resolveSystemId(vehicleType, lineName, transitDetails.headsign);

        const transiterStopId = await findNearestTransiterStop(
          departureStop.location.lat,
          departureStop.location.lng,
          systemId
        );

        if (transiterStopId) {
          try {
            const stopData = await getStopArrivals(systemId, transiterStopId);
            newStopArrivals.set(departureStop.name, stopData);
          } catch (error) {
            console.error(`Error fetching arrivals for ${departureStop.name}:`, error);
          }
        }
      }

      setStopArrivals(newStopArrivals);
    } catch (error) {
      console.error('Error fetching stop arrivals:', error);
    } finally {
      setIsLoadingArrivals(false);
    }
  }, [leg, findNearestTransiterStop]);

  useEffect(() => {
    fetchStopArrivals();
    const interval = setInterval(fetchStopArrivals, 30000);
    return () => clearInterval(interval);
  }, [fetchStopArrivals]);

  const handleCancelRoute = () => {
    setSelectedRoute(null);
    onBack();
  };

  const handleSelectRoute = () => {
    setSelectedRoute(route);
    onBack();
  };

  const formatMinutesUntil = (timestamp: number): string => {
    const seconds = timestamp - (currentTime / 1000);
    const minutes = Math.floor(seconds / 60);
    
    if (minutes < 1) return 'Now';
    if (minutes === 1) return '1 min';
    return `${minutes} min`;
  };

  const getNextArrival = (stopName: string, routeId?: string): StopArrival | null => {
    const stopData = stopArrivals.get(stopName);
    if (!stopData || stopData.arrivals.length === 0) return null;
    
    // If routeId is provided, try to find matching route
    if (routeId) {
      const matchingArrival = stopData.arrivals.find(
        arr => arr.routeShortName === routeId || arr.routeId.includes(routeId)
      );
      if (matchingArrival) return matchingArrival;
    }
    
    // Return next available arrival
    return stopData.arrivals[0];
  };

  const renderStepIcon = (step: RouteStep) => {
    if (step.travel_mode === 'WALKING') {
      return <Feather name="user" size={16} color="#6a99e3" />;
    } else if (step.travel_mode === 'TRANSIT' && step.transit_details) {
      const vehicleType = step.transit_details?.line?.vehicle?.type;
      if (vehicleType === 'SUBWAY') {
        return <Feather name="square" size={16} color="#6a99e3" />;
      } else if (vehicleType === 'BUS') {
        return <Feather name="truck" size={16} color="#6a99e3" />;
      } else if (vehicleType === 'FERRY') {
        return <Feather name="anchor" size={16} color="#6a99e3" />;
      }
      return <Feather name="navigation" size={16} color="#6a99e3" />;
    }
    return <Feather name="navigation" size={16} color="#6a99e3" />;
  };

  const getStepInstructions = (step: RouteStep): string => {
    const htmlStripped = step.html_instructions
      .replace(/<[^>]*>/g, '')
      .replace(/&nbsp;/g, ' ');

    if (step.travel_mode === 'TRANSIT' && step.transit_details) {
      const { transit_details } = step;
      const lineName = transit_details?.line?.short_name || transit_details?.line?.name;
      const vehicleName = transit_details?.line?.vehicle?.name || 'Transit';
      const stopName = transit_details?.departure_stop?.name || 'station';
      return `Board ${vehicleName} ${lineName || ''} at ${stopName}`;
    }

    return htmlStripped;
  };

  const transitSteps = leg?.steps?.filter((step) => step.transit_details) || [];
  const nextTransit = transitSteps[0];

  if (!leg) {
    return (
      <SafeAreaView edges={['top']} style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onBack} style={styles.backButton}>
            <Feather name="arrow-left" size={24} color="#222" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Live Tracking</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.mapContainer}>
          <Text style={{ textAlign: 'center', marginTop: 20 }}>No route data available</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={['top']} style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity 
          onPress={onBack} 
          style={styles.backButton}
          accessibilityLabel="Go back"
          accessibilityRole="button"
        >
          <Feather name="arrow-left" size={24} color="#222" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Navigation</Text>
        <View style={styles.headerRight}>
          {isLoadingArrivals && (
            <ActivityIndicator size="small" color="#6a99e3" />
          )}
        </View>
      </View>

      <View style={styles.mapContainer}>
        {!selectedRoute && (
          <TouchableOpacity style={styles.selectRouteButton} onPress={handleSelectRoute}>
            <Text style={styles.selectRouteButtonText}>Select Route</Text>
          </TouchableOpacity>
        )}
        {selectedRoute && route === selectedRoute && (
          <TouchableOpacity style={styles.selectRouteButton} onPress={handleCancelRoute}>
            <Text style={styles.selectRouteButtonText}>Cancel Route</Text>
          </TouchableOpacity>
        )}

        <MapView
          provider={PROVIDER_GOOGLE}
          style={styles.map}
          region={region}
          accessibilityLabel="Map showing route from start to destination"
        >
          <Marker
            coordinate={{
              latitude: leg.start_location.lat,
              longitude: leg.start_location.lng,
            }}
            title="Start"
            description="Starting location"
            pinColor="white"
          />

          <Marker
            coordinate={{
              latitude: leg.end_location.lat,
              longitude: leg.end_location.lng,
            }}
            title="Destination"
            description="Destination location"
            pinColor="red"
          />

          {leg.steps.map((step, index) => {
            const isTransit = step.travel_mode === 'TRANSIT';
            const isCurrent = index === currentStepIndex;

            return (
              <Marker
                key={`waypoint-${index}`}
                coordinate={{
                  latitude: step.start_location.lat,
                  longitude: step.start_location.lng,
                }}
                title={`Step ${index + 1}`}
                description={getStepInstructions(step)}
              />
            );
          })}

          {routeCoordinates.length > 0 && (
            <Polyline
              coordinates={routeCoordinates}
              strokeWidth={4}
              strokeColor="#6a99e3"
            />
          )}
        </MapView>
      </View>

      <View style={styles.stepsContainer}>
        <Text style={styles.stepsTitle}>Your Journey</Text>
        <ScrollView style={styles.stepsList}>
          {leg.steps.map((step, index) => {
            const isTransit = step.travel_mode === 'TRANSIT';
            const transitDetails = step.transit_details;
            const departureStop = transitDetails?.departure_stop?.name;
            const arrivalStop = transitDetails?.arrival_stop?.name;
            const routeId = transitDetails?.line?.short_name || transitDetails?.line?.name;
            
            // Get real-time arrival for transit steps
            const nextArrival = isTransit && departureStop 
              ? getNextArrival(departureStop, routeId)
              : null;

            return (
              <TouchableOpacity 
                key={`step-${index}`} 
                style={[styles.stepItem, index === currentStepIndex && styles.stepItemActive]}
                onPress={() => setCurrentStepIndex(index)}
              >
                <View style={styles.stepIconContainer}>
                  {renderStepIcon(step)}
                  {index < leg.steps.length - 1 && (
                    <View style={styles.stepConnector} />
                  )}
                </View>
                <View style={styles.stepContent}>
                  <Text style={styles.stepInstruction}>
                    {getStepInstructions(step)}
                  </Text>
                  
                  {/* Walking step */}
                  {!isTransit && (
                    <Text style={styles.stepDuration}>
                      {Math.round(step.duration?.value * (oldAgeRoute ? 1.4 : 1) / 60)} min walk
                    </Text>
                  )}

                  {/* Transit step with real-time data */}
                  {isTransit && transitDetails && (
                    <View style={styles.transitDetailsContainer}>
                      {nextArrival ? (
                        <View style={styles.realtimeArrival}>
                          <View style={styles.realtimeBadge}>
                            <Feather name="radio" size={10} color="#22c55e" />
                            <Text style={styles.realtimeText}>Live</Text>
                          </View>
                          <Text style={styles.arrivalTime}>
                            Next arrival: {formatMinutesUntil(nextArrival.arrivalTime)}
                          </Text>
                        </View>
                      ) : (
                        <View style={styles.scheduledArrival}>
                          <Text style={styles.transitInfo}>
                            <Text style={styles.transitLabel}>Line: </Text>
                            {routeId}
                          </Text>
                          {transitDetails.headsign && (
                            <Text style={styles.transitInfo}>
                              <Text style={styles.transitLabel}>To: </Text>
                              {transitDetails.headsign}
                            </Text>
                          )}
                          <Text style={styles.transitInfo}>
                            <Text style={styles.transitLabel}>Duration: </Text>
                            {Math.round((step.duration?.value || 0) / 60)} min
                          </Text>
                          {transitDetails.num_stops && (
                            <Text style={styles.transitInfo}>
                              <Text style={styles.transitLabel}>Stops: </Text>
                              {transitDetails.num_stops}
                            </Text>
                          )}
                        </View>
                      )}
                      
                      {arrivalStop && arrivalStop !== departureStop && (
                        <Text style={styles.arrivalStopText}>
                          Get off at: {arrivalStop}
                        </Text>
                      )}
                    </View>
                  )}
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Next transit info banner */}
      {nextTransit && (
        <View style={styles.nextTransitBanner}>
          <View style={styles.bannerIcon}>
            {renderStepIcon(nextTransit)}
          </View>
          <View style={styles.bannerContent}>
            <Text style={styles.bannerTitle}>Next Transit</Text>
            <Text style={styles.bannerText} numberOfLines={1}>
              {nextTransit.transit_details?.line?.short_name || nextTransit.transit_details?.line?.name} - {nextTransit.transit_details?.headsign}
            </Text>
          </View>
          <View style={styles.bannerTime}>
            <Text style={styles.bannerTimeText}>
              {nextTransit.duration?.text || 'Soon'}
            </Text>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#222',
  },
  headerRight: {
    width: 40,
    alignItems: 'flex-end',
  },
  mapContainer: {
    height: 300,
    position: 'relative',
  },
  map: {
    flex: 1,
    backgroundColor: '#f3f4f6',
  },
  webMapPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  webMapText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6b7280',
    marginTop: 12,
  },
  webMapSubtext: {
    fontSize: 14,
    color: '#9ca3af',
    marginTop: 4,
    textAlign: 'center',
  },
  selectRouteButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    backgroundColor: '#6a99e3',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    zIndex: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  selectRouteButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  waypointMarker: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#6a99e3',
    justifyContent: 'center',
    alignItems: 'center',
  },
  waypointMarkerActive: {
    backgroundColor: '#6a99e3',
    borderColor: '#fff',
    borderWidth: 3,
  },
  waypointMarkerTransit: {
    borderColor: '#f59e0b',
  },
  waypointNumber: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6a99e3',
  },
  stepsContainer: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    paddingTop: 16,
  },
  stepsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#222',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  stepsList: {
    flex: 1,
    paddingHorizontal: 16,
  },
  stepItem: {
    flexDirection: 'row',
    marginBottom: 16,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  stepItemActive: {
    borderWidth: 2,
    borderColor: '#6a99e3',
    backgroundColor: '#eff6ff',
  },
  stepIconContainer: {
    alignItems: 'center',
    marginRight: 12,
    position: 'relative',
  },
  stepConnector: {
    width: 2,
    flex: 1,
    backgroundColor: '#d1d5db',
    marginTop: 4,
    marginBottom: -12,
  },
  stepContent: {
    flex: 1,
  },
  stepInstruction: {
    fontSize: 15,
    color: '#222',
    fontWeight: '500',
    marginBottom: 4,
  },
  stepDuration: {
    fontSize: 13,
    color: '#6b7280',
  },
  transitDetailsContainer: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  realtimeArrival: {
    marginBottom: 4,
  },
  realtimeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#dcfce7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    alignSelf: 'flex-start',
    marginBottom: 4,
  },
  realtimeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#22c55e',
    marginLeft: 4,
  },
  arrivalTime: {
    fontSize: 14,
    fontWeight: '600',
    color: '#22c55e',
  },
  scheduledArrival: {
    gap: 4,
  },
  transitInfo: {
    fontSize: 13,
    color: '#6b7280',
  },
  transitLabel: {
    fontWeight: '600',
    color: '#4b5563',
  },
  arrivalStopText: {
    fontSize: 13,
    color: '#ef4444',
    fontWeight: '500',
    marginTop: 4,
  },
  nextTransitBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#6a99e3',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderTopWidth: 1,
    borderTopColor: '#5a89d3',
  },
  bannerIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  bannerContent: {
    flex: 1,
  },
  bannerTitle: {
    fontSize: 12,
    color: '#dbeafe',
    fontWeight: '500',
  },
  bannerText: {
    fontSize: 14,
    color: '#fff',
    fontWeight: '600',
  },
  bannerTime: {
    backgroundColor: '#fff',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  bannerTimeText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6a99e3',
  },
});