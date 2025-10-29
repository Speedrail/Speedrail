import AsyncStorage from '@react-native-async-storage/async-storage';
import {
    fetchAllTransitStations,
    getDetailedStationInfo,
    type BusStop,
    type DetailedStationInfo,
    type FerryStop,
    type RailStation,
    type SubwayStation
} from './mta-api';

const CACHE_VERSION = '1.0';
const CACHE_KEYS = {
  VERSION: '@speedrail_cache_version',
  SUBWAY_STATIONS: '@speedrail_subway_stations',
  LIRR_STATIONS: '@speedrail_lirr_stations',
  METRO_NORTH_STATIONS: '@speedrail_metro_north_stations',
  SIR_STATIONS: '@speedrail_sir_stations',
  FERRY_STOPS: '@speedrail_ferry_stops',
  BUS_STOPS: '@speedrail_bus_stops',
  STATION_DETAILS: '@speedrail_station_details',
  LAST_FETCH: '@speedrail_last_fetch',
};

const CACHE_EXPIRY_DAYS = 30;
const CACHE_EXPIRY_MS = CACHE_EXPIRY_DAYS * 24 * 60 * 60 * 1000;

interface CachedData<T> {
  data: T;
  timestamp: number;
  version: string;
}

interface LastFetchData {
  timestamp: number;
  version: string;
}

class CacheService {
  private memoryCache: Map<string, any> = new Map();
  private isInitialized = false;
  private refreshInProgress = false;
  private fetchInProgress = false;
  private fetchPromise: Promise<any> | null = null;

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      const version = await AsyncStorage.getItem(CACHE_KEYS.VERSION);
      if (version !== CACHE_VERSION) {
        await this.clearAllCache();
        await AsyncStorage.setItem(CACHE_KEYS.VERSION, CACHE_VERSION);
      }
      this.isInitialized = true;
    } catch (error) {
      console.error('Failed to initialize cache service:', error);
    }
  }

  async clearAllCache(): Promise<void> {
    try {
      const keys = Object.values(CACHE_KEYS);
      await AsyncStorage.multiRemove(keys);
      this.memoryCache.clear();
    } catch (error) {
      console.error('Failed to clear cache:', error);
    }
  }

  private async saveToCache<T>(key: string, data: T): Promise<void> {
    try {
      const cachedData: CachedData<T> = {
        data,
        timestamp: Date.now(),
        version: CACHE_VERSION,
      };
      await AsyncStorage.setItem(key, JSON.stringify(cachedData));
      this.memoryCache.set(key, cachedData);
    } catch (error) {
      console.error(`Failed to save to cache (${key}):`, error);
    }
  }

  private async getFromCache<T>(key: string): Promise<T | null> {
    try {
      if (this.memoryCache.has(key)) {
        const cached = this.memoryCache.get(key) as CachedData<T>;
        const age = Date.now() - cached.timestamp;
        if (age < CACHE_EXPIRY_MS && cached.version === CACHE_VERSION) {
          return cached.data;
        }
      }

      const stored = await AsyncStorage.getItem(key);
      if (!stored) return null;

      const cached: CachedData<T> = JSON.parse(stored);
      const age = Date.now() - cached.timestamp;

      if (age >= CACHE_EXPIRY_MS || cached.version !== CACHE_VERSION) {
        await AsyncStorage.removeItem(key);
        return null;
      }

      this.memoryCache.set(key, cached);
      return cached.data;
    } catch (error) {
      console.error(`Failed to get from cache (${key}):`, error);
      return null;
    }
  }

  async getLastFetchTimestamp(): Promise<number | null> {
    try {
      const cached = await this.getFromCache<LastFetchData>(CACHE_KEYS.LAST_FETCH);
      return cached ? cached.timestamp : null;
    } catch (error) {
      console.error('Failed to get last fetch timestamp:', error);
      return null;
    }
  }

  async shouldRefetchData(): Promise<boolean> {
    const lastFetch = await this.getLastFetchTimestamp();
    if (!lastFetch) return true;

    const age = Date.now() - lastFetch;
    return age >= CACHE_EXPIRY_MS;
  }

  async getSubwayStations(): Promise<SubwayStation[] | null> {
    return await this.getFromCache<SubwayStation[]>(CACHE_KEYS.SUBWAY_STATIONS);
  }

  async getLIRRStations(): Promise<RailStation[] | null> {
    return await this.getFromCache<RailStation[]>(CACHE_KEYS.LIRR_STATIONS);
  }

  async getMetroNorthStations(): Promise<RailStation[] | null> {
    return await this.getFromCache<RailStation[]>(CACHE_KEYS.METRO_NORTH_STATIONS);
  }

  async getSIRStations(): Promise<RailStation[] | null> {
    return await this.getFromCache<RailStation[]>(CACHE_KEYS.SIR_STATIONS);
  }

  async getFerryStops(): Promise<FerryStop[] | null> {
    return await this.getFromCache<FerryStop[]>(CACHE_KEYS.FERRY_STOPS);
  }

  async getBusStops(latitude: number, longitude: number): Promise<BusStop[] | null> {
    const key = `${CACHE_KEYS.BUS_STOPS}_${latitude.toFixed(4)}_${longitude.toFixed(4)}`;
    return await this.getFromCache<BusStop[]>(key);
  }

  async getStationDetails(stationId: string): Promise<DetailedStationInfo | null> {
    const key = `${CACHE_KEYS.STATION_DETAILS}_${stationId}`;
    return await this.getFromCache<DetailedStationInfo>(key);
  }

  async saveSubwayStations(data: SubwayStation[]): Promise<void> {
    await this.saveToCache(CACHE_KEYS.SUBWAY_STATIONS, data);
  }

  async saveLIRRStations(data: RailStation[]): Promise<void> {
    await this.saveToCache(CACHE_KEYS.LIRR_STATIONS, data);
  }

  async saveMetroNorthStations(data: RailStation[]): Promise<void> {
    await this.saveToCache(CACHE_KEYS.METRO_NORTH_STATIONS, data);
  }

  async saveSIRStations(data: RailStation[]): Promise<void> {
    await this.saveToCache(CACHE_KEYS.SIR_STATIONS, data);
  }

  async saveFerryStops(data: FerryStop[]): Promise<void> {
    await this.saveToCache(CACHE_KEYS.FERRY_STOPS, data);
  }

  async saveBusStops(latitude: number, longitude: number, data: BusStop[]): Promise<void> {
    const key = `${CACHE_KEYS.BUS_STOPS}_${latitude.toFixed(4)}_${longitude.toFixed(4)}`;
    await this.saveToCache(key, data);
  }

  async saveStationDetails(stationId: string, data: DetailedStationInfo): Promise<void> {
    const key = `${CACHE_KEYS.STATION_DETAILS}_${stationId}`;
    await this.saveToCache(key, data);
  }

  async updateLastFetch(): Promise<void> {
    const lastFetchData: LastFetchData = {
      timestamp: Date.now(),
      version: CACHE_VERSION,
    };
    await this.saveToCache(CACHE_KEYS.LAST_FETCH, lastFetchData);
  }

  async fetchAndCacheAllStations(userLocation?: { latitude: number; longitude: number }): Promise<{
    subway: SubwayStation[];
    lirr: RailStation[];
    metroNorth: RailStation[];
    sir: RailStation[];
    ferry: FerryStop[];
    bus?: BusStop[];
  }> {
    if (this.fetchInProgress && this.fetchPromise) {
      return this.fetchPromise;
    }

    this.fetchInProgress = true;
    this.fetchPromise = (async () => {
      try {
        const data = await fetchAllTransitStations();

        await Promise.all([
          this.saveSubwayStations(data.subway),
          this.saveLIRRStations(data.lirr),
          this.saveMetroNorthStations(data.metroNorth),
          this.saveSIRStations(data.sir),
          this.saveFerryStops(data.ferry),
        ]);

        await this.updateLastFetch();

        return {
          ...data,
          bus: undefined,
        };
      } catch (error) {
        console.error('Failed to fetch and cache all stations:', error);
        throw error;
      } finally {
        this.fetchInProgress = false;
        this.fetchPromise = null;
      }
    })();

    return this.fetchPromise;
  }

  async getAllStations(): Promise<{
    subway: SubwayStation[];
    lirr: RailStation[];
    metroNorth: RailStation[];
    sir: RailStation[];
    ferry: FerryStop[];
  }> {
    const [subway, lirr, metroNorth, sir, ferry] = await Promise.all([
      this.getSubwayStations(),
      this.getLIRRStations(),
      this.getMetroNorthStations(),
      this.getSIRStations(),
      this.getFerryStops(),
    ]);

    if (!subway || !lirr || !metroNorth || !sir || !ferry) {
      const fetched = await this.fetchAndCacheAllStations();
      return {
        subway: fetched.subway,
        lirr: fetched.lirr,
        metroNorth: fetched.metroNorth,
        sir: fetched.sir,
        ferry: fetched.ferry,
      };
    }

    return {
      subway,
      lirr,
      metroNorth,
      sir,
      ferry,
    };
  }

  async getOrFetchStationDetails(
    stationId: string,
    type: 'subway' | 'bus' | 'lirr' | 'metro-north' | 'ferry' | 'sir'
  ): Promise<DetailedStationInfo | null> {
    const cached = await this.getStationDetails(stationId);
    if (cached) return cached;

    try {
      const originalId = stationId.replace(`${type}-`, '');
      const details = await getDetailedStationInfo(originalId, type);
      if (details) {
        await this.saveStationDetails(stationId, details);
      }
      return details;
    } catch (error) {
      console.error('Failed to fetch station details:', error);
      return null;
    }
  }

  async backgroundRefreshIfNeeded(): Promise<void> {
    if (this.refreshInProgress || this.fetchInProgress) {
      return;
    }
    
    const shouldRefresh = await this.shouldRefetchData();
    if (shouldRefresh) {
      try {
        this.refreshInProgress = true;
        await this.fetchAndCacheAllStations();
      } catch (error) {
        console.error('Background refresh failed:', error);
      } finally {
        this.refreshInProgress = false;
      }
    }
  }

  getCacheAgeInDays(): Promise<number | null> {
    return this.getLastFetchTimestamp().then(timestamp => {
      if (!timestamp) return null;
      const age = Date.now() - timestamp;
      return Math.floor(age / (24 * 60 * 60 * 1000));
    });
  }
}

export const cacheService = new CacheService();
