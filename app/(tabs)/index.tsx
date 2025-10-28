import { useSelectedRoute } from '@/contexts/selected-route-context';
import Feather from '@expo/vector-icons/Feather';
import * as Location from 'expo-location';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    ScrollView,
    StyleSheet,
    Switch,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import LiveTrackingView from '../../components/live-tracking-view';
import PlaceAutocompleteInput from '../../components/place-autocomplete-input';
import RouteOption from '../../components/route-option';
import { GoogleMapsService, TransitRoute } from '../../services/google-maps-api';

export default function HomePage() {
  const { selectedRoute, setSelectedRoute } = useSelectedRoute();
  const [localSelectedRoute, setLocalSelectedRoute] = useState<TransitRoute>();
  const [oldAgeRoute, setOldAgeRoute] = useState<boolean>(false);
  const [startingPoint, setStartingPoint] = useState('');
  const [destination, setDestination] = useState('');
  const [startingLocation, setStartingLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [destinationLocation, setDestinationLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [currentLocation, setCurrentLocation] = useState<Location.LocationObject | null>(null);
  const [routes, setRoutes] = useState<TransitRoute[]>([]);
  const [originalRoutes, setOriginalRoutes] = useState<TransitRoute[]>([]);
  const [originalSelectedRoute, setOriginalSelectedRoute] = useState<TransitRoute | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingLocation, setLoadingLocation] = useState(false);

  useEffect(() => {
    getCurrentLocation();
  }, []);

  useEffect(() => {
    if (selectedRoute && !originalSelectedRoute) {
      setOriginalSelectedRoute(selectedRoute);
    }
  }, [selectedRoute]);

  useEffect(() => {
    if (originalRoutes.length > 0) {
      const routesToDisplay = oldAgeRoute 
        ? applyOldAgeAdjustment(originalRoutes)
        : originalRoutes;
      setRoutes(routesToDisplay);
    }
    
    if (originalSelectedRoute) {
      const routeToDisplay = oldAgeRoute 
        ? applyOldAgeAdjustment([originalSelectedRoute])[0]
        : originalSelectedRoute;
      setSelectedRoute(routeToDisplay);
    }
  }, [oldAgeRoute]);

  const getCurrentLocation = async () => {
    setLoadingLocation(true);
    try {
      console.log('Requesting location permissions...');
      const { status } = await Location.requestForegroundPermissionsAsync();
      console.log('Permission status:', status);
      
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Location permission is required to use this feature');
        setLoadingLocation(false);
        return;
      }

      console.log('Getting current position...');
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      console.log('Location obtained:', location.coords);
      setCurrentLocation(location);
      
      console.log('Reverse geocoding location...');
      const address = await GoogleMapsService.reverseGeocode(
        location.coords.latitude,
        location.coords.longitude
      );
      
      console.log('Address obtained:', address);
      if (address) {
        setStartingPoint(address);
        setStartingLocation({
          lat: location.coords.latitude,
          lng: location.coords.longitude,
        });
        console.log('Starting location set successfully');
      } else {
        Alert.alert('Error', 'Could not determine address from location');
      }
    } catch (error) {
      console.error('Error getting current location:', error);
      Alert.alert('Error', 'Failed to get current location: ' + (error as Error).message);
    } finally {
      setLoadingLocation(false);
    }
  };

  const applyOldAgeAdjustment = (routes: TransitRoute[]) => {
    return routes.map(route => {
      const routeCopy = JSON.parse(JSON.stringify(route));
      
      if (routeCopy.legs && routeCopy.legs[0]) {
        const leg = routeCopy.legs[0];
        let totalWalkingTime = 0;
        
        leg.steps?.forEach((step: any) => {
          if (step.travel_mode === 'WALKING' && step.duration) {
            totalWalkingTime += step.duration.value;
          }
        });
        
        const additionalTime = totalWalkingTime * 0.4;
        
        if (leg.duration) {
          leg.duration.value = Math.round(leg.duration.value + additionalTime);
          const minutes = Math.round(leg.duration.value / 60);
          const hours = Math.floor(minutes / 60);
          const mins = minutes % 60;
          
          if (hours === 1 && mins > 0) {
            leg.duration.text = `${hours} hour ${mins} mins`;
          } else if (hours > 1) {
            leg.duration.text = `${hours} hours ${mins} mins`;
          } else if (mins > 0) {
            leg.duration.text = `${mins} min`;
          }
        }
        
        if (leg.arrival_time) {
          const newArrivalValue = leg.arrival_time.value + additionalTime;
          leg.arrival_time.value = newArrivalValue;
          const arrivalDate = new Date(newArrivalValue * 1000);
          const hours = arrivalDate.getHours() % 12 || 12;
          const minutes = arrivalDate.getMinutes();
          const ampm = arrivalDate.getHours() >= 12 ? 'PM' : 'AM';
          leg.arrival_time.text = `${hours}:${minutes.toString().padStart(2, '0')} ${ampm}`;
        }
      }
      return routeCopy;
    });
  };

  const handleFindRoute = async () => {
    console.log('Starting location:', startingLocation);
    console.log('Destination location:', destinationLocation);
    
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
        let limitedRoutes = directionsResponse.routes.slice(0, 5);
        
        setOriginalRoutes(limitedRoutes);
        
        const routesToDisplay = oldAgeRoute 
          ? applyOldAgeAdjustment(limitedRoutes)
          : limitedRoutes;
        
        setRoutes(routesToDisplay);
      } else {
        Alert.alert('No Routes Found', 'No public transit routes available for this destination');
        setRoutes([]);
      }
    } catch (error) {
      console.error('Error fetching routes:', error);
      Alert.alert('Error', 'Failed to fetch routes. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleRouteSelect = (route: TransitRoute) => {
    const originalRoute = originalRoutes.find(r => r.summary === route.summary);
    if (originalRoute) {
      setOriginalSelectedRoute(originalRoute);
      setSelectedRoute(route);
    }
    setLocalSelectedRoute(route);
  };

  const handleBackFromTracking = () => {
    setLocalSelectedRoute(undefined);
  };

  if (localSelectedRoute) {
    return <LiveTrackingView route={localSelectedRoute!} onBack={handleBackFromTracking} oldAgeRoute={oldAgeRoute} />;
  }

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: '#fff' }}>
      <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
        <View>
          <View style={styles.actionWrapper}>
            <Text style={styles.title}>Ready to Speed through New York?</Text>
          </View>

          <View style={styles.inputsContainer}>
            <View style={styles.inputSection}>
              <View style={styles.inputRow}>
                <PlaceAutocompleteInput
                  placeholder="Starting Point"
                  icon="navigation"
                  value={startingPoint}
                  onPlaceSelected={(placeId, description, location) => {
                    setStartingPoint(description);
                    setStartingLocation(location);
                  }}
                  onChangeText={(text) => {
                    setStartingPoint(text);
                  }}
                  containerStyle={{ position: 'relative', zIndex: 1000 }}
                />
                {loadingLocation && (
                  <View style={styles.locationLoadingOverlay}>
                    <ActivityIndicator size="small" color="#6a99e3" />
                  </View>
                )}
              </View>
              <TouchableOpacity
                style={styles.currentLocationButton}
                onPress={getCurrentLocation}
                disabled={loadingLocation}
              >
                <Feather name="crosshair" size={14} color="#6a99e3" />
                <Text style={styles.currentLocationText}>Use current location</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.inputSection}>
              <PlaceAutocompleteInput
                placeholder="Destination"
                icon="map-pin"
                value={destination}
                onPlaceSelected={(placeId, description, location) => {
                  setDestination(description);
                  setDestinationLocation(location);
                }}
                onChangeText={(text) => {
                  setDestination(text);
                }}
              />
            </View>

            <View style={styles.oldAgeContainer}>
              <Text style={styles.oldAgeTitle}>Age-Dependent Transportation:</Text>
              <Switch
                style={{ marginLeft: 'auto' }}
                value={oldAgeRoute}
                onValueChange={() => setOldAgeRoute(!oldAgeRoute)}
                trackColor={{ true: '#6a99e3', false: '#9ca3af' }}
                thumbColor={'#ffffff'}
                ios_backgroundColor={'#9ca3af'}
              />
            </View>

            <TouchableOpacity
              onPress={handleFindRoute}
              disabled={loading || !startingLocation || !destinationLocation}
              style={[
                styles.btn,
                (!startingLocation || !destinationLocation) && styles.btnDisabled,
              ]}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.btnText}>Find Route</Text>
              )}
            </TouchableOpacity>
            
            {(!startingLocation || !destinationLocation) && (
              <Text style={styles.helperText}>
                {!startingLocation && !destinationLocation 
                  ? 'Please select starting point and destination'
                  : !startingLocation 
                  ? 'Please select a starting point from the autocomplete'
                  : 'Please select a destination from the autocomplete'}
              </Text>
            )}
          </View>
        </View>

        {selectedRoute && (
          <View style={styles.routesContainer}>
            <Text style={styles.routesTitle}>Selected Route</Text>
            <RouteOption 
              route={selectedRoute}
              routeNumber={1}
              onSelect={() => handleRouteSelect(selectedRoute)}
            />
          </View>
        )}

        {routes.length > 0 && (
          <View style={styles.routesContainer}>
            <Text style={styles.routesTitle}>Available Routes</Text>
            {routes.map((route, index) => (
              <RouteOption
                key={`route-${route.summary}-${index}`}
                route={route}
                routeNumber={index + 1}
                onSelect={() => handleRouteSelect(route)}
              />
            ))}
          </View>
        )}

        {!loading && routes.length === 0 && (
          <View style={styles.placeholder}>
            <View style={styles.placeholderInset}>
              <Feather name="map" size={48} color="#9ca3af" />
              <Text style={styles.noResultsText}>Enter destination to find routes</Text>
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
const styles = StyleSheet.create({
  container: {
    padding: 24,
    flexGrow: 1,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  title: {
    fontSize: 27,
    fontWeight: '700',
    color: '#222',
    marginTop: 24,
    marginBottom: 16,
    textAlign: 'left',
    flexWrap: 'wrap',
    width: '85%',
  },
  action: {
    width: 48,
    height: 48,
    borderRadius: 12,
    marginHorizontal: 8,
    backgroundColor: '#e8f0f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    marginHorizontal: -8,
  },
  inputsContainer: {
    marginTop: 24,
  },
  inputSection: {
    marginBottom: 16,
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
    marginTop: 8,
    paddingVertical: 4,
  },
  currentLocationText: {
    fontSize: 14,
    color: '#6a99e3',
    marginLeft: 6,
    fontWeight: '500',
  },
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 24,
    backgroundColor: '#222',
    marginTop: 8,
  },
  btnDisabled: {
    backgroundColor: '#9ca3af',
  },
  btnText: {
    fontSize: 17,
    lineHeight: 24,
    fontWeight: '600',
    color: '#fff',
  },
  helperText: {
    fontSize: 13,
    color: '#6b7280',
    textAlign: 'center',
    marginTop: 8,
    fontStyle: 'italic',
  },
  routesContainer: {
    marginTop: 32,
  },
  routesTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#222',
    marginBottom: 16,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  closeButton: {
    padding: 8,
  },
  placeholder: {
    flexGrow: 1,
    height: 300,
    marginTop: 32,
    padding: 0,
    backgroundColor: 'transparent',
  },
  placeholderInset: {
    borderWidth: 4,
    borderColor: '#e5e7eb',
    borderStyle: 'dashed',
    borderRadius: 9,
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  noResultsText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#6b7280',
    textAlign: 'center',
    marginTop: 16,
  },
  oldAgeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  oldAgeTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#222',
    marginRight: 'auto',
    marginLeft: 8,
  },
});