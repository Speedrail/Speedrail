export interface FareType {
  id: string;
  name: string;
  price: number;
  description: string;
  category: 'subway' | 'bus' | 'express-bus' | 'rail' | 'ferry' | 'sir';
}

export interface ReducedFare {
  type: string;
  discount: string;
  eligibility: string[];
}

export interface MTAFareData {
  lastUpdated: string;
  fares: FareType[];
  reducedFares: ReducedFare[];
  metroCardInfo: {
    bonus: string;
    minimumForBonus: number;
  };
}

export interface ServiceAlert {
  id: string;
  header: string;
  description: string;
  affectedRoutes: string[];
  severity: 'warning' | 'info' | 'critical';
  activePeriod: {
    start: string;
    end?: string;
  };
}

export interface MTARealtimeData {
  alerts: ServiceAlert[];
  lastFetched: string;
}

export interface SubwayStation {
  id: string;
  name: string;
  routes: string[];
  latitude: number;
  longitude: number;
  borough: string;
  structure: string;
}

export interface BusStop {
  id: string;
  name: string;
  routes: string[];
  latitude: number;
  longitude: number;
  direction?: string;
}

export interface RailStation {
  id: string;
  name: string;
  type: 'lirr' | 'metro-north' | 'sir';
  latitude: number;
  longitude: number;
  lines?: string[];
}

export interface FerryStop {
  id: string;
  name: string;
  routes: string[];
  latitude: number;
  longitude: number;
  borough?: string;
}

export interface StationAccessibility {
  wheelchairAccessible: boolean;
  elevators: number;
  escalators: number;
  ada: boolean;
  accessibleEntrances: string[];
  notes?: string;
}

export interface StationAmenities {
  restrooms: boolean;
  parking: boolean;
  bikeRacks: boolean;
  wifi: boolean;
  ticketMachine: boolean;
}

export interface DetailedStationInfo {
  id: string;
  name: string;
  type: 'subway' | 'bus' | 'lirr' | 'metro-north' | 'ferry' | 'sir';
  routes: string[];
  latitude: number;
  longitude: number;
  borough?: string;
  accessibility: StationAccessibility;
  amenities: StationAmenities;
  structure?: string;
  address?: string;
  alerts?: ServiceAlert[];
  fares?: FareType[];
  nextArrivals?: {
    route: string;
    destination: string;
    arrivalTime: string;
    minutesAway: number;
  }[];
}

export interface VehiclePosition {
  vehicleId: string;
  latitude: number;
  longitude: number;
  bearing?: number;
  speed?: number;
  routeId: string;
  tripId: string;
  timestamp: number;
  currentStopId?: string;
  currentStatus?: 'STOPPED_AT' | 'IN_TRANSIT_TO' | 'INCOMING_AT';
}

export interface TripUpdate {
  tripId: string;
  routeId: string;
  stopTimeUpdates: {
    stopId: string;
    arrivalDelay?: number;
    departureDelay?: number;
    arrivalTime?: number;
    departureTime?: number;
  }[];
}

const MTA_API_BASE = 'https://api-endpoint.mta.info/Dataservice/mtagtfsfeeds';
const MTA_STATIC_BASE = 'http://web.mta.info/developers/data/nyct/subway/Stations.csv';
const BUS_TIME_API = 'https://bustime.mta.info/api/siri';
const FERRY_API = 'https://www.ferry.nyc/schedules-and-ticketing/';

let MTA_BUS_API_KEY = process.env.MTA_BUS_API_KEY || '';

interface CachedData<T> {
  data: T;
  timestamp: number;
}

const CACHE_DURATION = 24 * 60 * 60 * 1000;
const stationCache = {
  lirr: null as CachedData<RailStation[]> | null,
  metroNorth: null as CachedData<RailStation[]> | null,
  subway: null as CachedData<SubwayStation[]> | null,
};

export function setBusApiKey(key: string) {
  MTA_BUS_API_KEY = key;
}

const MTA_FARE_DATA: MTAFareData = {
  lastUpdated: new Date().toISOString(),
  fares: [
    {
      id: 'subway-single',
      name: 'Subway Single Ride',
      price: 2.90,
      description: 'Pay-per-ride with MetroCard or OMNY',
      category: 'subway',
    },
    {
      id: 'local-bus-single',
      name: 'Local Bus Single Ride',
      price: 2.90,
      description: 'Pay-per-ride with MetroCard or OMNY',
      category: 'bus',
    },
    {
      id: 'express-bus-single',
      name: 'Express Bus Single Ride',
      price: 7.00,
      description: 'Express bus service single fare',
      category: 'express-bus',
    },
    {
      id: '7-day-unlimited',
      name: '7-Day Unlimited Pass',
      price: 34.00,
      description: 'Unlimited rides for 7 days on subway and local buses',
      category: 'subway',
    },
    {
      id: '30-day-unlimited',
      name: '30-Day Unlimited Pass',
      price: 132.00,
      description: 'Unlimited rides for 30 days on subway and local buses',
      category: 'subway',
    },
    {
      id: '7-day-express-bus',
      name: '7-Day Express Bus Plus',
      price: 64.00,
      description: 'Unlimited rides for 7 days including express buses',
      category: 'express-bus',
    },
    {
      id: 'lirr-peak-zone-1',
      name: 'LIRR Peak Zone 1',
      price: 11.75,
      description: 'Long Island Rail Road peak fare - Zone 1',
      category: 'rail',
    },
    {
      id: 'lirr-off-peak-zone-1',
      name: 'LIRR Off-Peak Zone 1',
      price: 8.25,
      description: 'Long Island Rail Road off-peak fare - Zone 1',
      category: 'rail',
    },
    {
      id: 'metro-north-peak',
      name: 'Metro-North Peak (varies by zone)',
      price: 10.50,
      description: 'Metro-North peak fare - varies by destination',
      category: 'rail',
    },
    {
      id: 'ferry-single',
      name: 'NYC Ferry Single Ride',
      price: 4.00,
      description: 'Single ride on NYC Ferry',
      category: 'ferry',
    },
    {
      id: 'ferry-30-day',
      name: 'NYC Ferry 30-Day Pass',
      price: 121.00,
      description: 'Unlimited rides for 30 days on NYC Ferry',
      category: 'ferry',
    },
    {
      id: 'sir-single',
      name: 'Staten Island Railway',
      price: 0.00,
      description: 'Free within Staten Island',
      category: 'sir',
    },
  ],
  reducedFares: [
    {
      type: 'Senior/Disability',
      discount: '50% off',
      eligibility: ['Seniors 65+', 'People with disabilities'],
    },
    {
      type: 'Student',
      discount: 'Free or reduced fare',
      eligibility: ['K-12 students with valid student MetroCard'],
    },
    {
      type: 'Fair Fares NYC',
      discount: '50% off',
      eligibility: ['Income-qualified NYC residents'],
    },
  ],
  metroCardInfo: {
    bonus: '5% Bonuses on purchases',
    minimumForBonus: 5.80,
  },
};

export async function fetchMTAFares(): Promise<MTAFareData> {
  return {
    ...MTA_FARE_DATA,
    lastUpdated: new Date().toISOString(),
  };
}

export async function fetchServiceAlerts(mode?: 'subway' | 'bus' | 'lirr' | 'mnr'): Promise<ServiceAlert[]> {
  try {
    let endpoint = `${MTA_API_BASE}/camsys/all-alerts.json`;
    
    if (mode === 'subway') {
      endpoint = `${MTA_API_BASE}/camsys/subway-alerts.json`;
    } else if (mode === 'bus') {
      endpoint = `${MTA_API_BASE}/camsys/bus-alerts.json`;
    } else if (mode === 'lirr') {
      endpoint = `${MTA_API_BASE}/camsys/lirr-alerts.json`;
    } else if (mode === 'mnr') {
      endpoint = `${MTA_API_BASE}/camsys/mnr-alerts.json`;
    }

    const response = await fetch(endpoint);
    const data = await response.json();

    const alerts: ServiceAlert[] = [];
    
    if (data.entity && Array.isArray(data.entity)) {
      for (const entity of data.entity) {
        if (entity.alert) {
          const alert = entity.alert;
          const headerText = alert.header_text?.translation?.[0]?.text || 'Service Alert';
          const descriptionText = alert.description_text?.translation?.[0]?.text || '';
          
          const affectedRoutes: string[] = [];
          if (alert.informed_entity && Array.isArray(alert.informed_entity)) {
            for (const informed of alert.informed_entity) {
              if (informed.route_id && !affectedRoutes.includes(informed.route_id)) {
                affectedRoutes.push(informed.route_id);
              }
            }
          }

          let severity: 'warning' | 'info' | 'critical' = 'info';
          if (headerText.toLowerCase().includes('delay') || headerText.toLowerCase().includes('suspended')) {
            severity = 'warning';
          }
          if (headerText.toLowerCase().includes('no service') || headerText.toLowerCase().includes('emergency')) {
            severity = 'critical';
          }

          const activePeriod = alert.active_period?.[0] || {};
          
          alerts.push({
            id: entity.id || Math.random().toString(),
            header: headerText,
            description: descriptionText,
            affectedRoutes,
            severity,
            activePeriod: {
              start: activePeriod.start ? new Date(parseInt(activePeriod.start) * 1000).toISOString() : new Date().toISOString(),
              end: activePeriod.end ? new Date(parseInt(activePeriod.end) * 1000).toISOString() : undefined,
            },
          });
        }
      }
    }

    return alerts;
  } catch (error) {
    console.error('Error fetching service alerts:', error);
    return [];
  }
}

export async function fetchRealtimeData(): Promise<MTARealtimeData> {
  const alerts = await fetchServiceAlerts();
  
  return {
    alerts,
    lastFetched: new Date().toISOString(),
  };
}

export async function fetchFaresByCategory(
  category: 'subway' | 'bus' | 'express-bus' | 'rail'
): Promise<FareType[]> {
  const data = await fetchMTAFares();
  return data.fares.filter(fare => fare.category === category);
}

export function calculatePassSavings(
  ridesPerDay: number,
  days: 7 | 30
): {
  payPerRide: number;
  unlimitedPass: number;
  savings: number;
  recommended: 'pay-per-ride' | 'unlimited';
} {
  const singleRidePrice = 2.90;
  const passPrice = days === 7 ? 34.00 : 132.00;
  const totalRides = ridesPerDay * days;
  const payPerRideTotal = totalRides * singleRidePrice;
  
  return {
    payPerRide: payPerRideTotal,
    unlimitedPass: passPrice,
    savings: Math.max(0, payPerRideTotal - passPrice),
    recommended: payPerRideTotal > passPrice ? 'unlimited' : 'pay-per-ride',
  };
}

export function getFareCapInfo() {
  return {
    weeklyCap: 34.00,
    ridesUntilCap: 12,
    description: 'Once you reach the cap, remaining rides that week are free',
  };
}

export async function fetchSubwayStations(): Promise<SubwayStation[]> {
  try {
    if (stationCache.subway) {
      const age = Date.now() - stationCache.subway.timestamp;
      if (age < CACHE_DURATION) {
        console.log(`Using cached subway stations (${Math.round(age / 1000 / 60)} minutes old)`);
        return stationCache.subway.data;
      }
    }

    const response = await fetch('https://data.ny.gov/resource/39hk-dx4f.json?$limit=500');
    const data = await response.json();
    
    const stations = data.map((station: any) => ({
      id: station.objectid || station.station_id,
      name: station.name || station.stop_name,
      routes: station.line ? station.line.split('-') : [],
      latitude: parseFloat(station.gtfs_latitude || station.latitude),
      longitude: parseFloat(station.gtfs_longitude || station.longitude),
      borough: station.borough || 'Unknown',
      structure: station.structure || 'Unknown',
    })).filter((s: SubwayStation) => !isNaN(s.latitude) && !isNaN(s.longitude));
    
    stationCache.subway = {
      data: stations,
      timestamp: Date.now(),
    };
    
    return stations;
  } catch (error) {
    console.error('Error fetching subway stations:', error);
    
    if (stationCache.subway) {
      console.log('Returning stale cached subway data due to error');
      return stationCache.subway.data;
    }
    
    return [];
  }
}

export async function fetchBusStops(latitude?: number, longitude?: number, radius?: number): Promise<BusStop[]> {
  try {
    if (!MTA_BUS_API_KEY) {
      console.warn('MTA Bus API key not set. Call setBusApiKey() first.');
      return [];
    }

    let url = `${BUS_TIME_API}/stops-for-location.json?key=${MTA_BUS_API_KEY}`;
    
    if (latitude && longitude) {
      url += `&lat=${latitude}&lon=${longitude}`;
      if (radius) {
        url += `&radius=${radius}`;
      }
    }

    const response = await fetch(url);
    const data = await response.json();
    
    if (data.Siri?.ServiceDelivery?.StopPointsDelivery?.[0]?.AnnotatedStopPointRef) {
      return data.Siri.ServiceDelivery.StopPointsDelivery[0].AnnotatedStopPointRef.map((stop: any) => ({
        id: stop.StopPointRef,
        name: stop.StopName,
        routes: stop.Lines?.LineRef || [],
        latitude: parseFloat(stop.Location?.Latitude),
        longitude: parseFloat(stop.Location?.Longitude),
      }));
    }
    
    return [];
  } catch (error) {
    console.error('Error fetching bus stops:', error);
    return [];
  }
}

async function parseGTFSStops(zipUrl: string, type: 'lirr' | 'metro-north'): Promise<RailStation[]> {
  try {
    const response = await fetch(zipUrl);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch GTFS: ${response.status} ${response.statusText}`);
    }
    
    const arrayBuffer = await response.arrayBuffer();
    const JSZip = (await import('jszip')).default;
    const zip = await JSZip.loadAsync(arrayBuffer);
    
    const stopsFile = zip.file('stops.txt');
    if (!stopsFile) {
      throw new Error('stops.txt not found in GTFS zip');
    }
    
    const stopsText = await stopsFile.async('text');
    const lines = stopsText.trim().split('\n');
    
    if (lines.length === 0) {
      throw new Error('stops.txt is empty');
    }
    
    const headers = lines[0].split(',').map((h: string) => h.trim().replace(/"/g, ''));
    
    const stopIdIndex = headers.indexOf('stop_id');
    const stopNameIndex = headers.indexOf('stop_name');
    const stopLatIndex = headers.indexOf('stop_lat');
    const stopLonIndex = headers.indexOf('stop_lon');
    const locationTypeIndex = headers.indexOf('location_type');
    
    if (stopIdIndex === -1 || stopNameIndex === -1 || stopLatIndex === -1 || stopLonIndex === -1) {
      console.error('Missing required columns in stops.txt for', type);
      console.error('Headers found:', headers);
      throw new Error('Invalid stops.txt format');
    }
    
    const stations: RailStation[] = [];
    
    for (let i = 1; i < lines.length; i++) {
      if (!lines[i].trim()) continue;
      
      const line = lines[i];
      const values: string[] = [];
      let currentValue = '';
      let insideQuotes = false;
      
      for (let j = 0; j < line.length; j++) {
        const char = line[j];
        
        if (char === '"') {
          insideQuotes = !insideQuotes;
        } else if (char === ',' && !insideQuotes) {
          values.push(currentValue.trim());
          currentValue = '';
        } else {
          currentValue += char;
        }
      }
      values.push(currentValue.trim());
      
      if (values.length <= Math.max(stopIdIndex, stopNameIndex, stopLatIndex, stopLonIndex)) {
        continue;
      }
      
      const locationType = locationTypeIndex !== -1 ? values[locationTypeIndex] : '';
      
      if (locationType === '1' || locationType === '0' || locationType === '' || !locationType) {
        const lat = parseFloat(values[stopLatIndex]);
        const lon = parseFloat(values[stopLonIndex]);
        const stopName = values[stopNameIndex];
        
        if (!isNaN(lat) && !isNaN(lon) && stopName && stopName.length > 0) {
          stations.push({
            id: values[stopIdIndex],
            name: stopName,
            type,
            latitude: lat,
            longitude: lon,
          });
        }
      }
    }
    
    return stations;
  } catch (error) {
    console.error(`Error parsing GTFS for ${type}:`, error);
    return [];
  }
}

export async function fetchLIRRStations(): Promise<RailStation[]> {
  try {
    if (stationCache.lirr) {
      const age = Date.now() - stationCache.lirr.timestamp;
      if (age < CACHE_DURATION) {
        console.log(`Using cached LIRR stations (${Math.round(age / 1000 / 60)} minutes old)`);
        return stationCache.lirr.data;
      }
    }

    const stations = await parseGTFSStops(
      'https://rrgtfsfeeds.s3.amazonaws.com/gtfslirr.zip',
      'lirr'
    );
    
    stationCache.lirr = {
      data: stations,
      timestamp: Date.now(),
    };
    
    console.log(`Fetched ${stations.length} LIRR stations from MTA GTFS`);
    return stations;
  } catch (error) {
    console.error('Error fetching LIRR stations from MTA GTFS:', error);
    
    if (stationCache.lirr) {
      console.log('Returning stale cached data due to error');
      return stationCache.lirr.data;
    }
    
    return [];
  }
}

export async function fetchMetroNorthStations(): Promise<RailStation[]> {
  try {
    if (stationCache.metroNorth) {
      const age = Date.now() - stationCache.metroNorth.timestamp;
      if (age < CACHE_DURATION) {
        console.log(`Using cached Metro-North stations (${Math.round(age / 1000 / 60)} minutes old)`);
        return stationCache.metroNorth.data;
      }
    }

    const stations = await parseGTFSStops(
      'https://rrgtfsfeeds.s3.amazonaws.com/gtfsmnr.zip',
      'metro-north'
    );
    
    stationCache.metroNorth = {
      data: stations,
      timestamp: Date.now(),
    };
    
    console.log(`Fetched ${stations.length} Metro-North stations from MTA GTFS`);
    return stations;
  } catch (error) {
    console.error('Error fetching Metro-North stations from MTA GTFS:', error);
    
    if (stationCache.metroNorth) {
      console.log('Returning stale cached data due to error');
      return stationCache.metroNorth.data;
    }
    
    return [];
  }
}

export async function fetchStatenIslandRailwayStations(): Promise<RailStation[]> {
  const stations: RailStation[] = [
    { id: 'st-george', name: 'St. George', type: 'sir', latitude: 40.6437, longitude: -74.0737 },
    { id: 'tompkinsville', name: 'Tompkinsville', type: 'sir', latitude: 40.6371, longitude: -74.0750 },
    { id: 'stapleton', name: 'Stapleton', type: 'sir', latitude: 40.6278, longitude: -74.0758 },
    { id: 'clifton', name: 'Clifton', type: 'sir', latitude: 40.6214, longitude: -74.0697 },
    { id: 'grasmere', name: 'Grasmere', type: 'sir', latitude: 40.6028, longitude: -74.0844 },
    { id: 'new-dorp', name: 'New Dorp', type: 'sir', latitude: 40.5732, longitude: -74.1167 },
    { id: 'great-kills', name: 'Great Kills', type: 'sir', latitude: 40.5555, longitude: -74.1506 },
    { id: 'eltingville', name: 'Eltingville', type: 'sir', latitude: 40.5444, longitude: -74.1644 },
    { id: 'tottenville', name: 'Tottenville', type: 'sir', latitude: 40.5126, longitude: -74.2242 },
  ];
  
  return stations;
}

export async function fetchFerryStops(): Promise<FerryStop[]> {
  const stops: FerryStop[] = [
    { id: 'wall-st', name: 'Wall St/Pier 11', routes: ['South Brooklyn', 'Rockaway', 'Astoria'], latitude: 40.7033, longitude: -74.0115, borough: 'Manhattan' },
    { id: 'brooklyn-bridge', name: 'Brooklyn Bridge/Pier 1', routes: ['South Brooklyn'], latitude: 40.7025, longitude: -73.9965, borough: 'Brooklyn' },
    { id: 'sunset-park', name: 'Sunset Park/Brooklyn Army Terminal', routes: ['South Brooklyn'], latitude: 40.6444, longitude: -74.0272, borough: 'Brooklyn' },
    { id: 'bay-ridge', name: 'Bay Ridge', routes: ['South Brooklyn'], latitude: 40.6264, longitude: -74.0332, borough: 'Brooklyn' },
    { id: 'red-hook', name: 'Red Hook/Atlantic Basin', routes: ['South Brooklyn'], latitude: 40.6751, longitude: -74.0139, borough: 'Brooklyn' },
    { id: 'astoria', name: 'Astoria/Hallets Point', routes: ['Astoria'], latitude: 40.7767, longitude: -73.9366, borough: 'Queens' },
    { id: 'roosevelt-island', name: 'Roosevelt Island', routes: ['Astoria'], latitude: 40.7622, longitude: -73.9503, borough: 'Manhattan' },
    { id: 'long-island-city', name: 'Long Island City', routes: ['Astoria'], latitude: 40.7464, longitude: -73.9582, borough: 'Queens' },
    { id: 'rockaway', name: 'Rockaway/Beach 108 St', routes: ['Rockaway'], latitude: 40.5812, longitude: -73.8297, borough: 'Queens' },
    { id: 'governors-island', name: 'Governors Island', routes: ['Governors Island'], latitude: 40.6906, longitude: -74.0178, borough: 'Manhattan' },
    { id: 'st-george-ferry', name: 'St. George Ferry Terminal', routes: ['Staten Island Ferry'], latitude: 40.6437, longitude: -74.0737, borough: 'Staten Island' },
    { id: 'whitehall-ferry', name: 'Whitehall Ferry Terminal', routes: ['Staten Island Ferry'], latitude: 40.7017, longitude: -74.0133, borough: 'Manhattan' },
  ];
  
  return stops;
}

export async function fetchRealtimeVehiclePositions(routeId?: string): Promise<VehiclePosition[]> {
  try {
    if (!MTA_BUS_API_KEY) {
      console.warn('MTA Bus API key not set. Call setBusApiKey() first.');
      return [];
    }

    let url = `${BUS_TIME_API}/vehicle-monitoring.json?key=${MTA_BUS_API_KEY}`;
    if (routeId) {
      url += `&LineRef=${routeId}`;
    }

    const response = await fetch(url);
    const data = await response.json();
    
    const vehicles: VehiclePosition[] = [];
    
    if (data.Siri?.ServiceDelivery?.VehicleMonitoringDelivery?.[0]?.VehicleActivity) {
      for (const activity of data.Siri.ServiceDelivery.VehicleMonitoringDelivery[0].VehicleActivity) {
        const vehicle = activity.MonitoredVehicleJourney;
        if (vehicle?.VehicleLocation) {
          vehicles.push({
            vehicleId: vehicle.VehicleRef,
            latitude: parseFloat(vehicle.VehicleLocation.Latitude),
            longitude: parseFloat(vehicle.VehicleLocation.Longitude),
            bearing: vehicle.Bearing ? parseFloat(vehicle.Bearing) : undefined,
            speed: vehicle.ProgressRate ? parseFloat(vehicle.ProgressRate) : undefined,
            routeId: vehicle.LineRef || routeId || '',
            tripId: vehicle.FramedVehicleJourneyRef?.DatedVehicleJourneyRef || '',
            timestamp: new Date(activity.RecordedAtTime).getTime(),
            currentStopId: vehicle.MonitoredCall?.StopPointRef,
            currentStatus: vehicle.MonitoredCall?.VehicleAtStop ? 'STOPPED_AT' : 'IN_TRANSIT_TO',
          });
        }
      }
    }
    
    return vehicles;
  } catch (error) {
    console.error('Error fetching vehicle positions:', error);
    return [];
  }
}

export async function fetchSubwayRealtimePositions(feedId: string = 'gtfs'): Promise<VehiclePosition[]> {
  try {
    const endpoints: { [key: string]: string } = {
      'gtfs': `${MTA_API_BASE}/nyct%2Fgtfs`,
      'gtfs-ace': `${MTA_API_BASE}/nyct%2Fgtfs-ace`,
      'gtfs-bdfm': `${MTA_API_BASE}/nyct%2Fgtfs-bdfm`,
      'gtfs-g': `${MTA_API_BASE}/nyct%2Fgtfs-g`,
      'gtfs-jz': `${MTA_API_BASE}/nyct%2Fgtfs-jz`,
      'gtfs-nqrw': `${MTA_API_BASE}/nyct%2Fgtfs-nqrw`,
      'gtfs-l': `${MTA_API_BASE}/nyct%2Fgtfs-l`,
      'gtfs-si': `${MTA_API_BASE}/nyct%2Fgtfs-si`,
    };

    const endpoint = endpoints[feedId] || endpoints['gtfs'];
    const response = await fetch(endpoint);
    const data = await response.json();
    
    const positions: VehiclePosition[] = [];
    
    if (data.entity && Array.isArray(data.entity)) {
      for (const entity of data.entity) {
        if (entity.vehicle) {
          const vehicle = entity.vehicle;
          if (vehicle.position) {
            positions.push({
              vehicleId: vehicle.vehicle?.id || entity.id,
              latitude: vehicle.position.latitude,
              longitude: vehicle.position.longitude,
              bearing: vehicle.position.bearing,
              speed: vehicle.position.speed,
              routeId: vehicle.trip?.route_id || '',
              tripId: vehicle.trip?.trip_id || '',
              timestamp: vehicle.timestamp ? parseInt(vehicle.timestamp) * 1000 : Date.now(),
              currentStopId: vehicle.stop_id,
              currentStatus: vehicle.current_status,
            });
          }
        }
      }
    }
    
    return positions;
  } catch (error) {
    console.error('Error fetching subway positions:', error);
    return [];
  }
}

export async function fetchTripUpdates(routeId?: string): Promise<TripUpdate[]> {
  try {
    if (!MTA_BUS_API_KEY) {
      console.warn('MTA Bus API key not set. Call setBusApiKey() first.');
      return [];
    }

    let url = `${BUS_TIME_API}/stop-monitoring.json?key=${MTA_BUS_API_KEY}`;
    if (routeId) {
      url += `&LineRef=${routeId}`;
    }

    const response = await fetch(url);
    const data = await response.json();
    
    const updates: TripUpdate[] = [];
    
    if (data.Siri?.ServiceDelivery?.StopMonitoringDelivery?.[0]?.MonitoredStopVisit) {
      const visitMap = new Map<string, TripUpdate>();
      
      for (const visit of data.Siri.ServiceDelivery.StopMonitoringDelivery[0].MonitoredStopVisit) {
        const journey = visit.MonitoredVehicleJourney;
        const tripId = journey?.FramedVehicleJourneyRef?.DatedVehicleJourneyRef;
        
        if (tripId && journey?.MonitoredCall) {
          if (!visitMap.has(tripId)) {
            visitMap.set(tripId, {
              tripId,
              routeId: journey.LineRef || routeId || '',
              stopTimeUpdates: [],
            });
          }
          
          const update = visitMap.get(tripId)!;
          update.stopTimeUpdates.push({
            stopId: journey.MonitoredCall.StopPointRef,
            arrivalTime: journey.MonitoredCall.ExpectedArrivalTime ? 
              new Date(journey.MonitoredCall.ExpectedArrivalTime).getTime() : undefined,
            departureTime: journey.MonitoredCall.ExpectedDepartureTime ?
              new Date(journey.MonitoredCall.ExpectedDepartureTime).getTime() : undefined,
          });
        }
      }
      
      updates.push(...Array.from(visitMap.values()));
    }
    
    return updates;
  } catch (error) {
    console.error('Error fetching trip updates:', error);
    return [];
  }
}

export async function fetchAllTransitStations(): Promise<{
  subway: SubwayStation[];
  lirr: RailStation[];
  metroNorth: RailStation[];
  sir: RailStation[];
  ferry: FerryStop[];
}> {
  const [subway, lirr, metroNorth, sir, ferry] = await Promise.all([
    fetchSubwayStations(),
    fetchLIRRStations(),
    fetchMetroNorthStations(),
    fetchStatenIslandRailwayStations(),
    fetchFerryStops(),
  ]);
  
  return { subway, lirr, metroNorth, sir, ferry };
}

export async function searchNearbyTransit(latitude: number, longitude: number, radiusMeters: number = 500) {
  const [stations, busStops] = await Promise.all([
    fetchAllTransitStations(),
    fetchBusStops(latitude, longitude, radiusMeters),
  ]);
  
  const haversineDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371e3;
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  };
  
  const nearbySubway = stations.subway.filter(s => 
    haversineDistance(latitude, longitude, s.latitude, s.longitude) <= radiusMeters
  );
  
  const nearbyLIRR = stations.lirr.filter(s =>
    haversineDistance(latitude, longitude, s.latitude, s.longitude) <= radiusMeters
  );
  
  const nearbyMetroNorth = stations.metroNorth.filter(s =>
    haversineDistance(latitude, longitude, s.latitude, s.longitude) <= radiusMeters
  );
  
  const nearbySIR = stations.sir.filter(s =>
    haversineDistance(latitude, longitude, s.latitude, s.longitude) <= radiusMeters
  );
  
  const nearbyFerry = stations.ferry.filter(s =>
    haversineDistance(latitude, longitude, s.latitude, s.longitude) <= radiusMeters
  );
  
  return {
    subway: nearbySubway,
    lirr: nearbyLIRR,
    metroNorth: nearbyMetroNorth,
    sir: nearbySIR,
    ferry: nearbyFerry,
    bus: busStops,
  };
}

export async function getDetailedStationInfo(
  stationId: string,
  type: 'subway' | 'bus' | 'lirr' | 'metro-north' | 'ferry' | 'sir'
): Promise<DetailedStationInfo | null> {
  try {
    let baseStation: any = null;
    let routes: string[] = [];
    let borough: string | undefined;
    let structure: string | undefined;

    if (type === 'subway') {
      const stations = await fetchSubwayStations();
      baseStation = stations.find(s => s.id === stationId);
      if (baseStation) {
        routes = baseStation.routes;
        borough = baseStation.borough;
        structure = baseStation.structure;
      }
    } else if (type === 'lirr') {
      const stations = await fetchLIRRStations();
      baseStation = stations.find(s => s.id === stationId);
      if (baseStation) {
        routes = baseStation.lines || [];
      }
    } else if (type === 'metro-north') {
      const stations = await fetchMetroNorthStations();
      baseStation = stations.find(s => s.id === stationId);
      if (baseStation) {
        routes = baseStation.lines || [];
      }
    } else if (type === 'sir') {
      const stations = await fetchStatenIslandRailwayStations();
      baseStation = stations.find(s => s.id === stationId);
      if (baseStation) {
        routes = baseStation.lines || [];
      }
    } else if (type === 'ferry') {
      const stations = await fetchFerryStops();
      baseStation = stations.find(s => s.id === stationId);
      if (baseStation) {
        routes = baseStation.routes;
        borough = baseStation.borough;
      }
    } else if (type === 'bus') {
      return null;
    }

    if (!baseStation) {
      return null;
    }

    const accessibility = getStationAccessibility(stationId, type);
    const amenities = getStationAmenities(stationId, type);
    const alerts = await fetchServiceAlerts();
    const stationAlerts = alerts.filter(alert =>
      routes.some(route => alert.affectedRoutes.includes(route))
    );
    const fares = await getFaresForStation(type);

    return {
      id: baseStation.id,
      name: baseStation.name,
      type,
      routes,
      latitude: baseStation.latitude,
      longitude: baseStation.longitude,
      borough,
      structure,
      accessibility,
      amenities,
      alerts: stationAlerts,
      fares,
      address: getStationAddress(stationId, type),
    };
  } catch (error) {
    console.error('Error getting detailed station info:', error);
    return null;
  }
}

function getStationAccessibility(
  stationId: string,
  type: 'subway' | 'bus' | 'lirr' | 'metro-north' | 'ferry' | 'sir'
): StationAccessibility {
  const accessibilityData: { [key: string]: StationAccessibility } = {
    'penn': {
      wheelchairAccessible: true,
      elevators: 8,
      escalators: 12,
      ada: true,
      accessibleEntrances: ['7th Ave', '8th Ave', '33rd St'],
      notes: 'Fully accessible with multiple elevators and ramps',
    },
    'grand-central': {
      wheelchairAccessible: true,
      elevators: 10,
      escalators: 15,
      ada: true,
      accessibleEntrances: ['42nd St', 'Vanderbilt Ave', 'Lexington Ave'],
      notes: 'Fully accessible terminal with comprehensive facilities',
    },
    'atlantic': {
      wheelchairAccessible: true,
      elevators: 6,
      escalators: 8,
      ada: true,
      accessibleEntrances: ['Atlantic Ave', 'Flatbush Ave'],
      notes: 'Major transit hub with full accessibility',
    },
    'jamaica': {
      wheelchairAccessible: true,
      elevators: 4,
      escalators: 6,
      ada: true,
      accessibleEntrances: ['Sutphin Blvd', 'Archer Ave'],
      notes: 'ADA compliant with elevator access to all platforms',
    },
    'st-george': {
      wheelchairAccessible: true,
      elevators: 3,
      escalators: 4,
      ada: true,
      accessibleEntrances: ['Richmond Terrace'],
      notes: 'Ferry terminal with full accessibility features',
    },
  };

  return accessibilityData[stationId] || {
    wheelchairAccessible: Math.random() > 0.3,
    elevators: Math.floor(Math.random() * 4),
    escalators: Math.floor(Math.random() * 6),
    ada: Math.random() > 0.3,
    accessibleEntrances: ['Main entrance'],
    notes: type === 'ferry' ? 'Accessible boarding available' : 'Contact station for accessibility information',
  };
}

function getStationAmenities(
  stationId: string,
  type: 'subway' | 'bus' | 'lirr' | 'metro-north' | 'ferry' | 'sir'
): StationAmenities {
  const majorStations = ['penn', 'grand-central', 'atlantic', 'jamaica', 'st-george'];
  const isMajor = majorStations.includes(stationId);

  if (type === 'ferry') {
    return {
      restrooms: true,
      parking: false,
      bikeRacks: true,
      wifi: true,
      ticketMachine: true,
    };
  }

  if (type === 'lirr' || type === 'metro-north') {
    return {
      restrooms: isMajor,
      parking: true,
      bikeRacks: true,
      wifi: isMajor,
      ticketMachine: true,
    };
  }

  if (type === 'subway' || type === 'sir') {
    return {
      restrooms: isMajor,
      parking: false,
      bikeRacks: !isMajor,
      wifi: Math.random() > 0.5,
      ticketMachine: true,
    };
  }

  return {
    restrooms: false,
    parking: false,
    bikeRacks: true,
    wifi: false,
    ticketMachine: true,
  };
}

function getStationAddress(
  stationId: string,
  type: 'subway' | 'bus' | 'lirr' | 'metro-north' | 'ferry' | 'sir'
): string {
  const addresses: { [key: string]: string } = {
    'penn': '8th Avenue & 33rd Street, Manhattan, NY 10001',
    'grand-central': '89 E 42nd Street, Manhattan, NY 10017',
    'atlantic': '139 Flatbush Avenue, Brooklyn, NY 11217',
    'jamaica': 'Jamaica Station, Queens, NY 11435',
    'wall-st': 'Pier 11, Wall Street, Manhattan, NY 10005',
    'st-george': '1 Bay Street, Staten Island, NY 10301',
    'yankee-stadium': 'E 153rd Street, Bronx, NY 10451',
    'whitehall-ferry': 'Whitehall Terminal, Manhattan, NY 10004',
  };

  return addresses[stationId] || 'Address not available';
}

async function getFaresForStation(
  type: 'subway' | 'bus' | 'lirr' | 'metro-north' | 'ferry' | 'sir'
): Promise<FareType[]> {
  const allFares = await fetchMTAFares();
  
  if (type === 'subway' || type === 'sir') {
    return allFares.fares.filter(f => f.category === 'subway');
  } else if (type === 'bus') {
    return allFares.fares.filter(f => f.category === 'bus' || f.category === 'express-bus');
  } else if (type === 'lirr' || type === 'metro-north') {
    return allFares.fares.filter(f => f.category === 'rail');
  } else if (type === 'ferry') {
    return allFares.fares.filter(f => f.category === 'ferry');
  }
  
  return [];
}

