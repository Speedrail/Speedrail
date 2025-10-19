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
  ada: boolean;
  adaNorthbound: boolean;
  adaSouthbound: boolean;
}

export interface BusStop {
  id: string;
  name: string;
  routes: string[];
  latitude: number;
  longitude: number;
  direction?: string;
  wheelchairBoarding?: number;
}

export interface RailStation {
  id: string;
  name: string;
  type: 'lirr' | 'metro-north' | 'sir';
  latitude: number;
  longitude: number;
  lines?: string[];
  wheelchairBoarding?: number;
  stopUrl?: string;
}

export interface FerryStop {
  id: string;
  name: string;
  routes: string[];
  latitude: number;
  longitude: number;
  borough?: string;
  wheelchairAccessible?: boolean;
}

export interface StationAccessibility {
  wheelchairAccessible: boolean;
  elevators: number;
  escalators: number;
  ada: boolean;
  accessibleEntrances: string[];
  notes?: string;
  elevatorsAvailable?: boolean;
  escalatorsAvailable?: boolean;
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
const NYC_FERRY_GTFS = 'http://nycferry.connexionz.net/rtt/public/resource/gtfs.zip';
const NYC_FERRY_ALERTS = 'http://nycferry.connexionz.net/rtt/public/utility/gtfsrealtime.aspx/alert';
const NYC_FERRY_TRIP_UPDATES = 'http://nycferry.connexionz.net/rtt/public/utility/gtfsrealtime.aspx/tripupdate';
const SIR_GTFS = 'https://rrgtfsfeeds.s3.amazonaws.com/gtfs_si.zip';

let MTA_BUS_API_KEY = process.env.MTA_BUS_API_KEY || '';

interface CachedData<T> {
  data: T;
  timestamp: number;
}

const CACHE_DURATION = 24 * 60 * 60 * 1000;
const EQUIPMENT_CACHE_DURATION = 60 * 60 * 1000;
const stationCache = {
  lirr: null as CachedData<RailStation[]> | null,
  metroNorth: null as CachedData<RailStation[]> | null,
  subway: null as CachedData<SubwayStation[]> | null,
  sir: null as CachedData<RailStation[]> | null,
  ferry: null as CachedData<FerryStop[]> | null,
};

interface EquipmentData {
  [stationComplexId: string]: {
    elevators: number;
    escalators: number;
    accessibleEntrances: string[];
  };
}

let equipmentCache: CachedData<EquipmentData> | null = null;

export function setBusApiKey(key: string) {
  MTA_BUS_API_KEY = key;
}

async function fetchStationEquipment(): Promise<EquipmentData> {
  if (equipmentCache) {
    const age = Date.now() - equipmentCache.timestamp;
    if (age < EQUIPMENT_CACHE_DURATION) {
      return equipmentCache.data;
    }
  }

  try {
    const response = await fetch('https://api-endpoint.mta.info/Dataservice/mtagtfsfeeds/nyct%2Fnyct_ene_equipments.json');
    const data = await response.json();
    
    const equipmentByStation: EquipmentData = {};
    
    if (Array.isArray(data)) {
      for (const item of data) {
        const stationId = item.stationcomplexid || item.elevatormrn;
        if (!stationId) continue;
        
        if (!equipmentByStation[stationId]) {
          equipmentByStation[stationId] = {
            elevators: 0,
            escalators: 0,
            accessibleEntrances: [],
          };
        }
        
        if (item.equipmenttype === 'EL') {
          equipmentByStation[stationId].elevators++;
          if (item.ADA === 'Y' && item.serving) {
            const entranceDesc = item.serving.split(' to ')[0]?.trim();
            if (entranceDesc && !equipmentByStation[stationId].accessibleEntrances.includes(entranceDesc)) {
              equipmentByStation[stationId].accessibleEntrances.push(entranceDesc);
            }
          }
        } else if (item.equipmenttype === 'ES') {
          equipmentByStation[stationId].escalators++;
        }
      }
    }
    
    equipmentCache = {
      data: equipmentByStation,
      timestamp: Date.now(),
    };
    
    return equipmentByStation;
  } catch (error) {
    console.error('Error fetching station equipment:', error);
    return equipmentCache?.data || {};
  }
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

export async function fetchServiceAlerts(mode?: 'subway' | 'bus' | 'lirr' | 'mnr' | 'ferry'): Promise<ServiceAlert[]> {
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
    } else if (mode === 'ferry') {
      return await fetchFerryAlerts();
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
            id: entity.id || `alert-${Date.now()}-${alerts.length}`,
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

async function fetchFerryAlerts(): Promise<ServiceAlert[]> {
  try {
    const response = await fetch(NYC_FERRY_ALERTS);
    if (!response.ok) {
      throw new Error(`Failed to fetch ferry alerts: ${response.status}`);
    }
    
    const arrayBuffer = await response.arrayBuffer();
    const data = await (await import('gtfs-realtime-bindings')).transit_realtime.FeedMessage.decode(new Uint8Array(arrayBuffer));
    
    const alerts: ServiceAlert[] = [];
    
    if (data.entity && Array.isArray(data.entity)) {
      for (const entity of data.entity) {
        if (entity.alert) {
          const alert = entity.alert;
          const headerText = alert.headerText?.translation?.[0]?.text || 'Ferry Service Alert';
          const descriptionText = alert.descriptionText?.translation?.[0]?.text || '';
          
          const affectedRoutes: string[] = [];
          if (alert.informedEntity && Array.isArray(alert.informedEntity)) {
            for (const informed of alert.informedEntity) {
              if (informed.routeId && !affectedRoutes.includes(informed.routeId)) {
                affectedRoutes.push(informed.routeId);
              }
            }
          }

          let severity: 'warning' | 'info' | 'critical' = 'info';
          if (headerText.toLowerCase().includes('delay') || headerText.toLowerCase().includes('cancelled')) {
            severity = 'warning';
          }
          if (headerText.toLowerCase().includes('no service')) {
            severity = 'critical';
          }

          const activePeriod = alert.activePeriod?.[0] || {};
          
          alerts.push({
            id: entity.id || `ferry-alert-${Date.now()}-${alerts.length}`,
            header: headerText,
            description: descriptionText,
            affectedRoutes,
            severity,
            activePeriod: {
              start: activePeriod.start ? new Date(Number(activePeriod.start) * 1000).toISOString() : new Date().toISOString(),
              end: activePeriod.end ? new Date(Number(activePeriod.end) * 1000).toISOString() : undefined,
            },
          });
        }
      }
    }
    
    return alerts;
  } catch (error) {
    console.error('Error fetching ferry alerts:', error);
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
      id: station.complex_id || station.station_id || station.gtfs_stop_id,
      name: station.stop_name || station.name,
      routes: station.daytime_routes ? station.daytime_routes.trim().split(/\s+/) : (station.line ? station.line.split('-') : []),
      latitude: parseFloat(station.gtfs_latitude || station.latitude),
      longitude: parseFloat(station.gtfs_longitude || station.longitude),
      borough: station.borough || 'Unknown',
      structure: station.structure || 'Unknown',
      ada: station.ada === '1' || station.ada === 1 || station.ada === true,
      adaNorthbound: station.ada_northbound === '1' || station.ada_northbound === 1 || station.ada_northbound === true,
      adaSouthbound: station.ada_southbound === '1' || station.ada_southbound === 1 || station.ada_southbound === true,
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

async function parseGTFSStops(zipUrl: string, type: 'lirr' | 'metro-north' | 'sir'): Promise<RailStation[]> {
  try {
    const response = await fetch(zipUrl);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch GTFS: ${response.status} ${response.statusText}`);
    }
    
    const arrayBuffer = await response.arrayBuffer();
    const JSZip = await import('jszip');
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
    const wheelchairBoardingIndex = headers.indexOf('wheelchair_boarding');
    const stopUrlIndex = headers.indexOf('stop_url');
    
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
          const wheelchairBoarding = wheelchairBoardingIndex !== -1 ? 
            parseInt(values[wheelchairBoardingIndex]) || undefined : undefined;
          const stopUrl = stopUrlIndex !== -1 ? values[stopUrlIndex] : undefined;
          
          stations.push({
            id: values[stopIdIndex],
            name: stopName,
            type,
            latitude: lat,
            longitude: lon,
            wheelchairBoarding,
            stopUrl,
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
  try {
    if (stationCache.sir) {
      const age = Date.now() - stationCache.sir.timestamp;
      if (age < CACHE_DURATION) {
        console.log(`Using cached SIR stations (${Math.round(age / 1000 / 60)} minutes old)`);
        return stationCache.sir.data;
      }
    }

    const stations = await parseGTFSStops(SIR_GTFS, 'sir');
    
    stationCache.sir = {
      data: stations,
      timestamp: Date.now(),
    };
    
    console.log(`Fetched ${stations.length} SIR stations from MTA GTFS`);
    return stations;
  } catch (error) {
    console.error('Error fetching SIR stations from MTA GTFS:', error);
    
    if (stationCache.sir) {
      console.log('Returning stale cached data due to error');
      return stationCache.sir.data;
    }
    
    return [];
  }
}

export async function fetchFerryStops(): Promise<FerryStop[]> {
  try {
    if (stationCache.ferry) {
      const age = Date.now() - stationCache.ferry.timestamp;
      if (age < CACHE_DURATION) {
        console.log(`Using cached ferry stops (${Math.round(age / 1000 / 60)} minutes old)`);
        return stationCache.ferry.data;
      }
    }

    const response = await fetch(NYC_FERRY_GTFS);
    if (!response.ok) {
      throw new Error(`Failed to fetch NYC ferry GTFS: ${response.status}`);
    }
    
    const arrayBuffer = await response.arrayBuffer();
    const JSZip = await import('jszip');
    const zip = await JSZip.loadAsync(arrayBuffer);
    
    const stopsFile = zip.file('stops.txt');
    if (!stopsFile) {
      throw new Error('stops.txt not found in NYC Ferry GTFS zip');
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
    const wheelchairBoardingIndex = headers.indexOf('wheelchair_boarding');
    
    if (stopIdIndex === -1 || stopNameIndex === -1 || stopLatIndex === -1 || stopLonIndex === -1) {
      throw new Error('Invalid stops.txt format');
    }
    
    const routesFile = zip.file('routes.txt');
    let routeNames: { [key: string]: string } = {};
    if (routesFile) {
      const routesText = await routesFile.async('text');
      const routeLines = routesText.trim().split('\n');
      const routeHeaders = routeLines[0].split(',').map((h: string) => h.trim().replace(/"/g, ''));
      const routeIdIdx = routeHeaders.indexOf('route_id');
      const routeNameIdx = routeHeaders.indexOf('route_long_name');
      
      for (let i = 1; i < routeLines.length; i++) {
        const values = routeLines[i].split(',').map((v: string) => v.trim().replace(/"/g, ''));
        if (routeIdIdx !== -1 && routeNameIdx !== -1 && values[routeIdIdx]) {
          routeNames[values[routeIdIdx]] = values[routeNameIdx];
        }
      }
    }
    
    const stops: FerryStop[] = [];
    
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
          values.push(currentValue.trim().replace(/"/g, ''));
          currentValue = '';
        } else {
          currentValue += char;
        }
      }
      values.push(currentValue.trim().replace(/"/g, ''));
      
      const lat = parseFloat(values[stopLatIndex]);
      const lon = parseFloat(values[stopLonIndex]);
      const stopName = values[stopNameIndex];
      
      if (!isNaN(lat) && !isNaN(lon) && stopName && stopName.length > 0) {
        const wheelchairAccessible = wheelchairBoardingIndex !== -1 ? 
          (values[wheelchairBoardingIndex] === '1' || values[wheelchairBoardingIndex] === 'true') : true;
        
        stops.push({
          id: values[stopIdIndex],
          name: stopName,
          routes: [],
          latitude: lat,
          longitude: lon,
          wheelchairAccessible,
        });
      }
    }
    
    stationCache.ferry = {
      data: stops,
      timestamp: Date.now(),
    };
    
    console.log(`Fetched ${stops.length} ferry stops from NYC Ferry GTFS`);
    return stops;
  } catch (error) {
    console.error('Error fetching ferry stops:', error);
    
    if (stationCache.ferry) {
      console.log('Returning stale cached ferry data due to error');
      return stationCache.ferry.data;
    }
    
    return [];
  }
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

    const accessibility = await getStationAccessibility(stationId, type, baseStation);
    const amenities = getStationAmenities(stationId, type, baseStation.name);
    const alerts = await fetchServiceAlerts();
    const stationAlerts = alerts.filter(alert =>
      routes.some(route => alert.affectedRoutes.includes(route))
    );
    const fares = await getFaresForStation(type);
    const address = await getStationAddress(baseStation.latitude, baseStation.longitude, baseStation.name);

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
      address,
    };
  } catch (error) {
    console.error('Error getting detailed station info:', error);
    return null;
  }
}

async function getStationAccessibility(
  stationId: string,
  type: 'subway' | 'bus' | 'lirr' | 'metro-north' | 'ferry' | 'sir',
  baseStation?: any
): Promise<StationAccessibility> {
  let wheelchairAccessible = false;
  let ada = false;
  let elevators = 0;
  let escalators = 0;
  let accessibleEntrances: string[] = [];
  let notes: string | undefined;
  let elevatorsAvailable = false;
  let escalatorsAvailable = false;
  
  if (type === 'subway' && baseStation) {
    wheelchairAccessible = baseStation.ada || baseStation.adaNorthbound || baseStation.adaSouthbound;
    ada = baseStation.ada;
    elevatorsAvailable = true;
    escalatorsAvailable = true;
    
    const equipment = await fetchStationEquipment();
    const stationEquipment = equipment[stationId];
    if (stationEquipment) {
      elevators = stationEquipment.elevators;
      escalators = stationEquipment.escalators;
      accessibleEntrances = stationEquipment.accessibleEntrances;
    }
  } else if ((type === 'lirr' || type === 'metro-north' || type === 'sir') && baseStation) {
    elevatorsAvailable = false;
    escalatorsAvailable = false;
    
    if (baseStation.wheelchairBoarding === 1) {
      wheelchairAccessible = true;
      ada = true;
    } else if (baseStation.wheelchairBoarding === 2) {
      wheelchairAccessible = false;
      ada = false;
      notes = 'Station is not wheelchair accessible';
    } else if (baseStation.wheelchairBoarding === 0) {
      wheelchairAccessible = false;
      ada = false;
      notes = 'No wheelchair accessibility information available';
    }
  } else if (type === 'ferry' && baseStation) {
    wheelchairAccessible = baseStation.wheelchairAccessible === true;
    ada = baseStation.wheelchairAccessible === true;
    elevatorsAvailable = false;
    escalatorsAvailable = false;
  } else {
    notes = 'Accessibility information not available';
  }

  return {
    wheelchairAccessible,
    elevators,
    escalators,
    ada,
    accessibleEntrances,
    notes,
    elevatorsAvailable,
    escalatorsAvailable,
  };
}

function getStationAmenities(
  stationId: string,
  type: 'subway' | 'bus' | 'lirr' | 'metro-north' | 'ferry' | 'sir',
  stationName?: string
): StationAmenities {
  return {
    restrooms: false,
    parking: false,
    bikeRacks: false,
    wifi: false,
    ticketMachine: false,
  };
}

async function getStationAddress(
  latitude: number,
  longitude: number,
  stationName?: string
): Promise<string | undefined> {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`,
      {
        headers: {
          'User-Agent': 'Speedrail Transit App',
        },
      }
    );
    
    if (!response.ok) {
      return undefined;
    }
    
    const data = await response.json();
    
    if (data.address) {
      const parts: string[] = [];
      
      if (data.address.house_number) {
        parts.push(data.address.house_number);
      }
      if (data.address.road) {
        parts.push(data.address.road);
      }
      
      const cityParts: string[] = [];
      if (data.address.neighbourhood || data.address.suburb) {
        cityParts.push(data.address.neighbourhood || data.address.suburb);
      }
      if (data.address.city || data.address.town || data.address.village) {
        cityParts.push(data.address.city || data.address.town || data.address.village);
      }
      if (data.address.state) {
        cityParts.push(data.address.state);
      }
      if (data.address.postcode) {
        cityParts.push(data.address.postcode);
      }
      
      if (parts.length > 0 && cityParts.length > 0) {
        return `${parts.join(' ')}, ${cityParts.join(', ')}`;
      } else if (cityParts.length > 0) {
        return cityParts.join(', ');
      } else if (data.display_name) {
        return data.display_name;
      }
    }
    
    return undefined;
  } catch (error) {
    console.error('Error fetching address:', error);
    return undefined;
  }
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

