import Feather from '@expo/vector-icons/Feather';
import React, { useEffect, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Switch,
} from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSelectedRoute } from '../contexts/selected-route-context';
import { useTabBar } from '../contexts/tab-bar-context';
import { GoogleMapsService, RouteStep, TransitRoute } from '../services/google-maps-api';

export function SelectedRoute() {
  
}

interface LiveTrackingViewProps {
  route: TransitRoute;
  onBack: () => void;
}

export default function LiveTrackingView({ route, onBack }: LiveTrackingViewProps) {
  const [oldAgeRoute, setOldAgeRoute] = useState<boolean>(false);
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

  const handleCancelRoute = () => {
    setSelectedRoute(null);
    onBack();
  };

  const handleSelectRoute = () => {
    setSelectedRoute(route);
    onBack();
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
        <Text style={styles.headerTitle}>Live Tracking</Text>
        <View style={{ width: 40 }} />
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
          showsUserLocation
          showsMyLocationButton
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

          {nextTransit?.transit_details && (
            <Marker
              coordinate={{
                latitude: nextTransit.transit_details?.departure_stop?.location?.lat || 0,
                longitude: nextTransit.transit_details?.departure_stop?.location?.lng || 0,
              }}
              title={`Next: ${nextTransit.transit_details?.line?.short_name || nextTransit.transit_details?.line?.name || 'Transit'}`}
              description={nextTransit.transit_details?.departure_stop?.name || 'Departure stop'}
            >
              <View style={styles.vehicleMarker}>
                <Feather name="navigation" size={20} color="#fff" />
              </View>
            </Marker>
          )}

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
        <View style={{ flexDirection: 'row', alignItems: 'center', }}>
          <Text style={styles.stepsTitle}>Trip Steps</Text>
          <Text style={styles.oldAgeTitle}>Old Age:</Text>
          <Switch
            style={{ marginLeft: 'auto', marginBottom: 16 }}
            value={oldAgeRoute}
            onValueChange={setOldAgeRoute}
            trackColor={{ true: '#6a99e3', false: '#cce6ff' }}
            thumbColor={'#ffffff'}
          />
        </View>
        <ScrollView style={styles.stepsList}>
          {leg.steps.map((step, index) => (
            <View key={`step-${index}`} style={styles.stepItem}>
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
                {/* old people walk about 40% slower than average */}
                <Text style={styles.stepDuration}>{Math.round(step.duration?.value * (oldAgeRoute && getStepInstructions(step).includes('Walk') ? 1.4 : 1) / 60.0).toString() || 'Unknown duration'} minutes</Text>
                {step.transit_details && (
                  <View style={styles.transitDetailsContainer}>
                    <Text style={styles.transitDetail}>
                      {step.transit_details?.num_stops || 0} stops
                    </Text>
                    <Text style={styles.transitDetail}>
                      Get off at {step.transit_details?.arrival_stop?.name || 'Unknown stop'}
                    </Text>
                  </View>
                )}
              </View>
            </View>
          ))}
        </ScrollView>
        {nextTransit?.transit_details && (
          <View style={styles.etaCard}>
            <View style={styles.etaHeader}>
              <Feather name="clock" size={18} color="#6a99e3" />
              <Text style={styles.etaTitle}>Next Vehicle</Text>
            </View>
            <Text style={styles.etaLine}>
              {nextTransit.transit_details?.line?.short_name ||
                nextTransit.transit_details?.line?.name || 'Transit'}{' '}
              - {nextTransit.transit_details?.headsign || 'Unknown direction'}
            </Text>
            <Text style={styles.etaTime}>
              Departs at {nextTransit.transit_details?.departure_time?.text || 'Unknown time'}
            </Text>
            <Text style={styles.etaStop}>
              From {nextTransit.transit_details?.departure_stop?.name || 'Unknown stop'}
            </Text>
          </View>
        )}
      </View>
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
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  backButton: {
    padding: 8,
    marginLeft: -8,
    zIndex: 10,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#222',
  },
  mapContainer: {
    height: 300,
    position: 'relative',
  },
  map: {
    flex: 1,
    borderColor: '#e5e7eb',
    borderWidth: 0.5,
  },
  vehicleMarker: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#6a99e3',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  etaCard: {
    position: 'relative',
    bottom: 16,
    justifyContent: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
  etaHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  etaTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6a99e3',
    marginLeft: 8,
  },
  etaLine: {
    fontSize: 18,
    fontWeight: '700',
    color: '#222',
    marginBottom: 4,
  },
  etaTime: {
    fontSize: 15,
    fontWeight: '600',
    color: '#222',
    marginBottom: 4,
  },
  etaStop: {
    fontSize: 13,
    color: '#6b7280',
  },
  stepsContainer: {
    flex: 1,
    padding: 16,
  },
  stepsTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#222',
    marginBottom: 16,
  },
  stepsList: {
    flex: 1,
  },
  stepItem: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  stepIconContainer: {
    alignItems: 'center',
    marginRight: 12,
    position: 'relative',
  },
  stepConnector: {
    width: 2,
    flex: 1,
    backgroundColor: '#e5e7eb',
    position: 'absolute',
    top: 24,
    bottom: -20,
  },
  stepContent: {
    flex: 1,
  },
  stepInstruction: {
    fontSize: 15,
    fontWeight: '500',
    color: '#222',
    marginBottom: 4,
  },
  stepDuration: {
    fontSize: 13,
    color: '#6b7280',
    marginBottom: 4,
  },
  transitDetailsContainer: {
    marginTop: 4,
  },
  transitDetail: {
    fontSize: 12,
    color: '#9ca3af',
  },
  selectRouteButton: {
    backgroundColor: '#6a99e3',
    width: 'auto',
    padding: 12,
    borderRadius: 8,
    top: 10,
    left: 16,
    right: 16,
    position: 'absolute',
    zIndex: 1000,
  },
  selectRouteButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  oldAgeTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#222',
    marginRight: -120,
    marginBottom: 16,
    marginLeft: 'auto',
  },
});
