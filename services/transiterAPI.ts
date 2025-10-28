// Transiter requires self-hosting or a custom instance
// Set EXPO_PUBLIC_TRANSITER_URL environment variable if you have a Transiter instance
const BASE_URL = process.env.EXPO_PUBLIC_TRANSITER_URL || '';

export interface TransiterStop {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  distance?: number;
}

export interface TransiterRoute {
  id: string;
  shortName: string;
  longName?: string;
  color?: string;
  textColor?: string;
  type?: string;
}

export interface VehiclePosition {
  latitude: number;
  longitude: number;
  bearing?: number;
  speed?: number;
}

export interface TransiterTrip {
  id: string;
  routeId: string;
  directionId?: number;
  headsign?: string;
  vehicle?: {
    id: string;
    label?: string;
    licensePlate?: string;
    currentStatus?: string;
  };
  position?: VehiclePosition;
  timestamp?: number;
  stopTimeUpdates?: Array<{
    stopId: string;
    stopSequence: number;
    arrival?: {
      time?: number;
      delay?: number;
    };
    departure?: {
      time?: number;
      delay?: number;
    };
  }>;
}

export interface NearbyStopsResponse {
  stops: TransiterStop[];
}

export interface RouteResponse {
  route: TransiterRoute;
}

export interface TripsResponse {
  trips: TransiterTrip[];
}

export interface StopsResponse {
  stops: Array<{
    id: string;
    name: string;
    latitude: number;
    longitude: number;
    serviceMaps?: any[];
    stopTimes?: any[];
  }>;
}

async function fetchFromTransiter<T>(endpoint: string): Promise<T> {
  // If no Transiter URL is configured, throw error silently
  if (!BASE_URL) {
    throw new Error('Transiter URL not configured');
  }
  
  const url = `${BASE_URL}${endpoint}`;
  
  const response = await fetch(url);
  
  if (!response.ok) {
    throw new Error(`Transiter API error: ${response.status}`);
  }
  
  return await response.json();
}

export async function getNearbyStops(
  systemId: string,
  latitude: number,
  longitude: number,
  maxDistance: number = 2.0,
  limit: number = 30
): Promise<NearbyStopsResponse> {
  try {
    // Transiter API expects distance in kilometers
    const params = new URLSearchParams({
      latitude: latitude.toString(),
      longitude: longitude.toString(),
      max_distance: maxDistance.toString(),
      skip_stop_times: 'true',
      limit: limit.toString(),
    });
    
    return await fetchFromTransiter<NearbyStopsResponse>(
      `/systems/${systemId}/stops?${params.toString()}`
    );
  } catch (error) {
    // Silently return empty array if Transiter is not configured or stops can't be fetched
    return { stops: [] };
  }
}

export async function getRouteInfo(
  systemId: string,
  routeId: string
): Promise<RouteResponse> {
  return fetchFromTransiter<RouteResponse>(
    `/systems/${systemId}/routes/${routeId}`
  );
}

export async function getRouteTrips(
  systemId: string,
  routeId: string
): Promise<TripsResponse> {
  return fetchFromTransiter<TripsResponse>(
    `/systems/${systemId}/routes/${routeId}/trips`
  );
}

export async function getStopDetails(
  systemId: string,
  stopIds: string[]
): Promise<StopsResponse> {
  const params = new URLSearchParams();
  stopIds.forEach(id => params.append('id', id));
  
  return fetchFromTransiter<StopsResponse>(
    `/systems/${systemId}/stops?${params.toString()}`
  );
}

export interface StopArrival {
  routeId: string;
  routeShortName?: string;
  routeColor?: string;
  headsign?: string;
  arrivalTime: number;
  departureTime?: number;
  tripId: string;
  vehicleId?: string;
  delay?: number;
  track?: string;
}

export interface StopWithArrivals {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  arrivals: StopArrival[];
}

export async function getStopArrivals(
  systemId: string,
  stopId: string
): Promise<StopWithArrivals> {
  try {
    const response = await fetchFromTransiter<any>(
      `/systems/${systemId}/stops/${stopId}`
    );
    
    const arrivals: StopArrival[] = [];
    
    if (response.stopTimes) {
      const now = Date.now() / 1000;
      
      for (const stopTime of response.stopTimes) {
        const arrivalTime = stopTime.arrival?.time || stopTime.departure?.time;
        
        if (arrivalTime && arrivalTime > now) {
          arrivals.push({
            routeId: stopTime.trip?.route?.id || 'unknown',
            routeShortName: stopTime.trip?.route?.shortName,
            routeColor: stopTime.trip?.route?.color,
            headsign: stopTime.trip?.headsign,
            arrivalTime: arrivalTime,
            departureTime: stopTime.departure?.time,
            tripId: stopTime.trip?.id || 'unknown',
            vehicleId: stopTime.trip?.vehicle?.id,
            delay: stopTime.arrival?.delay || 0,
            track: stopTime.track,
          });
        }
      }
      
      arrivals.sort((a, b) => a.arrivalTime - b.arrivalTime);
    }
    
    return {
      id: response.id,
      name: response.name,
      latitude: response.latitude,
      longitude: response.longitude,
      arrivals: arrivals.slice(0, 10),
    };
  } catch (error) {
    // Silently return empty arrivals if Transiter is not configured or stop can't be fetched
    return {
      id: stopId,
      name: 'Unknown Stop',
      latitude: 0,
      longitude: 0,
      arrivals: [],
    };
  }
}

export const TransiterSystems = {
  NYC_SUBWAY: 'us-ny-subway',
  NYC_BUS: 'us-ny-nycbus',
} as const;

export type SystemId = typeof TransiterSystems[keyof typeof TransiterSystems];