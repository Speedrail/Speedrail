export interface PlaceAutocompleteResult {
  place_id: string;
  description: string;
  structured_formatting: {
    main_text: string;
    secondary_text: string;
  };
}

export interface PlaceDetails {
  place_id: string;
  formatted_address: string;
  geometry: {
    location: {
      lat: number;
      lng: number;
    };
  };
  name: string;
}

export interface TransitRoute {
  summary: string;
  legs: RouteLeg[];
  overview_polyline: {
    points: string;
  };
  warnings: string[];
  fare?: {
    currency: string;
    value: number;
    text: string;
  };
}

export interface RouteLeg {
  distance: {
    text: string;
    value: number;
  };
  duration: {
    text: string;
    value: number;
  };
  start_address: string;
  end_address: string;
  start_location: {
    lat: number;
    lng: number;
  };
  end_location: {
    lat: number;
    lng: number;
  };
  steps: RouteStep[];
  arrival_time?: {
    text: string;
    time_zone: string;
    value: number;
  };
  departure_time?: {
    text: string;
    time_zone: string;
    value: number;
  };
}

export interface RouteStep {
  distance: {
    text: string;
    value: number;
  };
  duration: {
    text: string;
    value: number;
  };
  start_location: {
    lat: number;
    lng: number;
  };
  end_location: {
    lat: number;
    lng: number;
  };
  html_instructions: string;
  travel_mode: 'WALKING' | 'TRANSIT' | 'DRIVING' | 'BICYCLING';
  transit_details?: TransitDetails;
  polyline: {
    points: string;
  };
  maneuver?: string;
}

export interface TransitDetails {
  arrival_stop: {
    name: string;
    location: {
      lat: number;
      lng: number;
    };
  };
  departure_stop: {
    name: string;
    location: {
      lat: number;
      lng: number;
    };
  };
  arrival_time: {
    text: string;
    time_zone: string;
    value: number;
  };
  departure_time: {
    text: string;
    time_zone: string;
    value: number;
  };
  headsign: string;
  line: {
    name: string;
    short_name: string;
    color: string;
    text_color: string;
    vehicle: {
      name: string;
      type: string;
      icon: string;
    };
  };
  num_stops: number;
}

export interface DirectionsResponse {
  routes: TransitRoute[];
  status: string;
  geocoded_waypoints?: Array<{
    geocoder_status: string;
    place_id: string;
    types: string[];
  }>;
}

const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY || process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY || '';

export class GoogleMapsService {
  private static baseUrl = 'https://maps.googleapis.com/maps/api';

  static async getPlaceAutocomplete(
    input: string,
    sessionToken?: string
  ): Promise<PlaceAutocompleteResult[]> {
    if (!input.trim()) return [];

    try {
      console.log('Autocomplete with key:', GOOGLE_MAPS_API_KEY ? 'Key present' : 'NO KEY!');
      console.log('Autocomplete input:', input);
      
      const params = new URLSearchParams({
        input,
        key: GOOGLE_MAPS_API_KEY,
        locationbias: 'ipbias',
        language: 'en',
      });

      if (sessionToken) {
        params.append('sessiontoken', sessionToken);
      }

      const url = `${this.baseUrl}/place/autocomplete/json?${params}`;
      console.log('Autocomplete URL:', url.replace(GOOGLE_MAPS_API_KEY, 'API_KEY'));

      const response = await fetch(url);
      const data = await response.json();

      console.log('Autocomplete response status:', data.status);
      if (data.error_message) {
        console.log('Autocomplete error message:', data.error_message);
      }

      if (data.status === 'OK' && data.predictions) {
        console.log('Autocomplete predictions count:', data.predictions.length);
        return data.predictions;
      }

      if (data.status === 'REQUEST_DENIED') {
        console.log('Legacy API denied, falling back to Geocoding API');
        return await this.geocodeAutocomplete(input);
      }

      console.log('Autocomplete returned no predictions');
      return [];
    } catch (error) {
      console.error('Error fetching place autocomplete:', error);
      return [];
    }
  }

  static async geocodeAutocomplete(input: string): Promise<PlaceAutocompleteResult[]> {
    try {
      const params = new URLSearchParams({
        address: input,
        key: GOOGLE_MAPS_API_KEY,
        components: 'country:US',
      });

      const url = `${this.baseUrl}/geocode/json?${params}`;
      console.log('Geocode autocomplete URL:', url.replace(GOOGLE_MAPS_API_KEY, 'API_KEY'));

      const response = await fetch(url);
      const data = await response.json();

      console.log('Geocode response status:', data.status);

      if (data.status === 'OK' && data.results) {
        console.log('Geocode results count:', data.results.length);
        return data.results.slice(0, 5).map((result: any) => ({
          place_id: result.place_id,
          description: result.formatted_address,
          structured_formatting: {
            main_text: result.formatted_address.split(',')[0],
            secondary_text: result.formatted_address.split(',').slice(1).join(',').trim(),
          },
        }));
      }

      return [];
    } catch (error) {
      console.error('Error fetching geocode autocomplete:', error);
      return [];
    }
  }

  static async getPlaceDetails(placeId: string): Promise<PlaceDetails | null> {
    try {
      const params = new URLSearchParams({
        place_id: placeId,
        key: GOOGLE_MAPS_API_KEY,
        fields: 'place_id,formatted_address,geometry,name',
      });

      const response = await fetch(
        `${this.baseUrl}/place/details/json?${params}`
      );
      const data = await response.json();

      console.log('Place details response status:', data.status);

      if (data.status === 'OK' && data.result) {
        return data.result;
      }

      if (data.status === 'REQUEST_DENIED') {
        console.log('Legacy API denied for place details, using geocoding fallback');
        return await this.getPlaceDetailsByGeocode(placeId);
      }

      return null;
    } catch (error) {
      console.error('Error fetching place details:', error);
      return null;
    }
  }

  static async getPlaceDetailsByGeocode(placeId: string): Promise<PlaceDetails | null> {
    try {
      const params = new URLSearchParams({
        place_id: placeId,
        key: GOOGLE_MAPS_API_KEY,
      });

      const response = await fetch(
        `${this.baseUrl}/geocode/json?${params}`
      );
      const data = await response.json();

      console.log('Geocode place details response status:', data.status);

      if (data.status === 'OK' && data.results && data.results[0]) {
        const result = data.results[0];
        return {
          place_id: result.place_id,
          formatted_address: result.formatted_address,
          geometry: result.geometry,
          name: result.formatted_address.split(',')[0],
        };
      }

      return null;
    } catch (error) {
      console.error('Error fetching place details by geocode:', error);
      return null;
    }
  }

  static async getDirections(
    origin: string | { lat: number; lng: number },
    destination: string | { lat: number; lng: number },
    mode: 'transit' | 'driving' | 'walking' | 'bicycling' = 'transit',
    departureTime: number = Date.now(),
    alternatives: boolean = true
  ): Promise<DirectionsResponse | null> {
    try {
      const originStr =
        typeof origin === 'string' ? origin : `${origin.lat},${origin.lng}`;
      const destinationStr =
        typeof destination === 'string'
          ? destination
          : `${destination.lat},${destination.lng}`;

      const params = new URLSearchParams({
        origin: originStr,
        destination: destinationStr,
        mode,
        key: GOOGLE_MAPS_API_KEY,
        alternatives: alternatives.toString(),
      });

      if (mode === 'transit') {
        params.append('departure_time', Math.floor(departureTime / 1000).toString());
        params.append('transit_mode', 'bus|subway|train');
      }

      const response = await fetch(
        `${this.baseUrl}/directions/json?${params}`
      );
      const data = await response.json();

      if (data.status === 'OK') {
        return data;
      } else {
        console.error('Directions API error:', data.status, data.error_message);
        return null;
      }
    } catch (error) {
      console.error('Error fetching directions:', error);
      return null;
    }
  }

  static async reverseGeocode(lat: number, lng: number): Promise<string | null> {
    try {
      console.log('Reverse geocoding with key:', GOOGLE_MAPS_API_KEY ? 'Key present' : 'NO KEY!');
      const params = new URLSearchParams({
        latlng: `${lat},${lng}`,
        key: GOOGLE_MAPS_API_KEY,
      });

      const url = `${this.baseUrl}/geocode/json?${params}`;
      console.log('Geocoding URL:', url.replace(GOOGLE_MAPS_API_KEY, 'API_KEY'));
      
      const response = await fetch(url);
      const data = await response.json();
      
      console.log('Geocoding response status:', data.status);
      if (data.error_message) {
        console.log('Geocoding error message:', data.error_message);
      }

      if (data.status === 'OK' && data.results && data.results[0]) {
        return data.results[0].formatted_address;
      }

      return null;
    } catch (error) {
      console.error('Error reverse geocoding:', error);
      return null;
    }
  }

  static decodePolyline(encoded: string): Array<{ latitude: number; longitude: number }> {
    const poly: Array<{ latitude: number; longitude: number }> = [];
    let index = 0;
    const len = encoded.length;
    let lat = 0;
    let lng = 0;

    while (index < len) {
      let b;
      let shift = 0;
      let result = 0;
      do {
        b = encoded.charCodeAt(index++) - 63;
        result |= (b & 0x1f) << shift;
        shift += 5;
      } while (b >= 0x20);
      const dlat = (result & 1) !== 0 ? ~(result >> 1) : result >> 1;
      lat += dlat;

      shift = 0;
      result = 0;
      do {
        b = encoded.charCodeAt(index++) - 63;
        result |= (b & 0x1f) << shift;
        shift += 5;
      } while (b >= 0x20);
      const dlng = (result & 1) !== 0 ? ~(result >> 1) : result >> 1;
      lng += dlng;

      poly.push({
        latitude: lat / 1e5,
        longitude: lng / 1e5,
      });
    }

    return poly;
  }

  static extractRouteSummary(route: TransitRoute): {
    totalDuration: string;
    totalDistance: string;
    modes: string;
    transfers: number;
  } {
    const leg = route.legs?.[0];
    
    if (!leg) {
      return {
        totalDuration: 'Unknown',
        totalDistance: 'Unknown',
        modes: 'No route data',
        transfers: 0,
      };
    }

    let transfers = 0;
    const modesSet = new Set<string>();

    leg.steps?.forEach((step) => {
      if (step.travel_mode === 'TRANSIT' && step.transit_details) {
        const vehicleType = step.transit_details?.line?.vehicle?.type;
        const lineName = step.transit_details?.line?.short_name || step.transit_details?.line?.name;
        
        if (vehicleType === 'SUBWAY') {
          modesSet.add(`Subway ${lineName || ''}`);
        } else if (vehicleType === 'BUS') {
          modesSet.add(`Bus ${lineName || ''}`);
        } else {
          modesSet.add(lineName || 'Transit');
        }
        transfers++;
      }
    });

    const modes = Array.from(modesSet).join(' → ');

    return {
      totalDuration: leg.duration?.text || 'Unknown',
      totalDistance: leg.distance?.text || 'Unknown',
      modes,
      transfers: Math.max(0, transfers - 1),
    };
  }
}
