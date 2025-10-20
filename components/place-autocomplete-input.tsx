import Feather from '@expo/vector-icons/Feather';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  GoogleMapsService,
  PlaceAutocompleteResult,
} from '../services/google-maps-api';

// Generate a UUID v4-like session token
const generateSessionToken = (): string => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

interface PlaceAutocompleteInputProps {
  placeholder: string;
  icon: keyof typeof Feather.glyphMap;
  value: string;
  onPlaceSelected: (placeId: string, description: string, location: { lat: number; lng: number }) => void;
  onChangeText?: (text: string) => void;
}

export default function PlaceAutocompleteInput({
  placeholder,
  icon,
  value,
  onPlaceSelected,
  onChangeText,
}: PlaceAutocompleteInputProps) {
  const [inputText, setInputText] = useState(value);
  const [predictions, setPredictions] = useState<PlaceAutocompleteResult[]>([]);
  const [showPredictions, setShowPredictions] = useState(false);
  const [loading, setLoading] = useState(false);
  const sessionToken = useRef(generateSessionToken());
  const debounceTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setInputText(value);
  }, [value]);

  // Cleanup debounce timeout on unmount
  useEffect(() => {
    return () => {
      if (debounceTimeout.current) {
        clearTimeout(debounceTimeout.current);
      }
    };
  }, []);

  const handleTextChange = (text: string) => {
    setInputText(text);
    if (onChangeText) {
      onChangeText(text);
    }

    if (debounceTimeout.current) {
      clearTimeout(debounceTimeout.current);
    }

    if (text.trim().length > 2) {
      setLoading(true);
      debounceTimeout.current = setTimeout(async () => {
        try {
          console.log('Fetching autocomplete for:', text);
          const results = await GoogleMapsService.getPlaceAutocomplete(
            text,
            sessionToken.current
          );
          console.log('Autocomplete results received:', results.length);
          setPredictions(results);
          setShowPredictions(true);
        } catch (error) {
          console.error('Error fetching autocomplete predictions:', error);
          setPredictions([]);
          setShowPredictions(false);
        } finally {
          setLoading(false);
        }
      }, 500);
    } else {
      setPredictions([]);
      setShowPredictions(false);
      setLoading(false);
    }
  };

  const handlePlaceSelect = async (prediction: PlaceAutocompleteResult) => {
    setInputText(prediction.description);
    setShowPredictions(false);
    setPredictions([]);

    try {
      const details = await GoogleMapsService.getPlaceDetails(prediction.place_id);
      if (details) {
        onPlaceSelected(
          prediction.place_id,
          prediction.description,
          {
            lat: details.geometry.location.lat,
            lng: details.geometry.location.lng,
          }
        );
      } else {
        console.error('Failed to fetch place details');
      }
    } catch (error) {
      console.error('Error fetching place details:', error);
    }

    // Generate new session token for next autocomplete session
    sessionToken.current = generateSessionToken();
  };

  return (
    <View style={styles.container}>
      <View style={styles.inputWrapper}>
        <TextInput
          placeholder={placeholder}
          placeholderTextColor="#9eadba"
          style={styles.input}
          value={inputText}
          onChangeText={handleTextChange}
          onFocus={() => {
            if (predictions.length > 0) {
              setShowPredictions(true);
            }
          }}
        />
        <View style={styles.inputIcon}>
          <Feather name={icon} size={16} color="#9eadba" />
        </View>
        {loading && (
          <View style={styles.loadingIcon}>
            <ActivityIndicator size="small" color="#6a99e3" />
          </View>
        )}
      </View>

      {showPredictions && predictions.length > 0 && (
        <View style={styles.predictionsContainer}>
          <ScrollView keyboardShouldPersistTaps="handled">
            {predictions.map((item) => (
              <TouchableOpacity
                key={item.place_id}
                style={styles.predictionItem}
                onPress={() => handlePlaceSelect(item)}
              >
                <View style={styles.predictionIcon}>
                  <Feather name="map-pin" size={16} color="#6a99e3" />
                </View>
                <View style={styles.predictionTextContainer}>
                  <Text style={styles.predictionMainText}>
                    {item.structured_formatting?.main_text || item.description}
                  </Text>
                  {item.structured_formatting?.secondary_text && (
                    <Text style={styles.predictionSecondaryText}>
                      {item.structured_formatting.secondary_text}
                    </Text>
                  )}
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    zIndex: 1,
  },
  inputWrapper: {
    position: 'relative',
    width: '100%',
  },
  input: {
    height: 44,
    backgroundColor: '#f0f6fb',
    paddingLeft: 44,
    paddingRight: 44,
    borderRadius: 12,
    fontSize: 15,
    fontWeight: '500',
    color: '#222',
  },
  inputIcon: {
    position: 'absolute',
    width: 44,
    height: 44,
    top: 0,
    left: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingIcon: {
    position: 'absolute',
    width: 44,
    height: 44,
    top: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  predictionsContainer: {
    position: 'absolute',
    top: 50,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    borderRadius: 12,
    maxHeight: 200,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
    zIndex: 1000,
  },
  predictionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  predictionIcon: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  predictionTextContainer: {
    flex: 1,
  },
  predictionMainText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#222',
    marginBottom: 2,
  },
  predictionSecondaryText: {
    fontSize: 13,
    color: '#6b7280',
  },
});
