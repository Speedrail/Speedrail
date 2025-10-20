import Feather from '@expo/vector-icons/Feather';
import * as Location from 'expo-location';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
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
  const [startingPoint, setStartingPoint] = useState('');
  const [destination, setDestination] = useState('');
  const [startingLocation, setStartingLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [destinationLocation, setDestinationLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [currentLocation, setCurrentLocation] = useState<Location.LocationObject | null>(null);
  const [routes, setRoutes] = useState<TransitRoute[]>([]);
  const [selectedRoute, setSelectedRoute] = useState<TransitRoute | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingLocation, setLoadingLocation] = useState(false);

  useEffect(() => {
    getCurrentLocation();
  }, []);

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
        const limitedRoutes = directionsResponse.routes.slice(0, 5);
        setRoutes(limitedRoutes);
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
    setSelectedRoute(route);
  };

  const handleBackFromTracking = () => {
    setSelectedRoute(null);
  };

  if (selectedRoute) {
    return <LiveTrackingView route={selectedRoute} onBack={handleBackFromTracking} />;
  }

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: '#fff' }}>
      <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
        <View>
          <View style={styles.actionWrapper}>
            <Text style={styles.title}>Ready to Speed through New York?</Text>
            <TouchableOpacity
              onPress={() => {}}
              style={{ marginLeft: 'auto' }}>
              <View style={styles.action}>
                <Feather name="bell" size={22} color="#6a99e3" />
              </View>
            </TouchableOpacity>
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
});