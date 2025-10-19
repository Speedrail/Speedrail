import {
    fetchAllTransitStations,
    fetchRealtimeVehiclePositions,
    fetchServiceAlerts,
    fetchSubwayRealtimePositions,
    searchNearbyTransit,
    setBusApiKey,
    type FerryStop,
    type RailStation,
    type ServiceAlert,
    type SubwayStation,
    type VehiclePosition,
} from '@/services/mta-api';
import { useEffect, useState } from 'react';

export function useTransitData() {
  const [subwayStations, setSubwayStations] = useState<SubwayStation[]>([]);
  const [lirrStations, setLirrStations] = useState<RailStation[]>([]);
  const [metroNorthStations, setMetroNorthStations] = useState<RailStation[]>([]);
  const [sirStations, setSirStations] = useState<RailStation[]>([]);
  const [ferryStops, setFerryStops] = useState<FerryStop[]>([]);
  const [alerts, setAlerts] = useState<ServiceAlert[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    try {
      setLoading(true);
      
      const stations = await fetchAllTransitStations();
      setSubwayStations(stations.subway);
      setLirrStations(stations.lirr);
      setMetroNorthStations(stations.metroNorth);
      setSirStations(stations.sir);
      setFerryStops(stations.ferry);

      const serviceAlerts = await fetchServiceAlerts();
      setAlerts(serviceAlerts);
    } catch (error) {
      console.error('Error loading transit data:', error);
    } finally {
      setLoading(false);
    }
  };

  return {
    subwayStations,
    lirrStations,
    metroNorthStations,
    sirStations,
    ferryStops,
    alerts,
    loading,
    reload: loadAllData,
  };
}

export function useNearbyTransit(latitude?: number, longitude?: number, radiusMeters: number = 500) {
  const [nearby, setNearby] = useState<{
    subway: SubwayStation[];
    lirr: RailStation[];
    metroNorth: RailStation[];
    sir: RailStation[];
    ferry: FerryStop[];
    bus: any[];
  } | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (latitude && longitude) {
      loadNearby();
    }
  }, [latitude, longitude, radiusMeters]);

  const loadNearby = async () => {
    if (!latitude || !longitude) return;

    try {
      setLoading(true);
      const result = await searchNearbyTransit(latitude, longitude, radiusMeters);
      setNearby(result);
    } catch (error) {
      console.error('Error loading nearby transit:', error);
    } finally {
      setLoading(false);
    }
  };

  return { nearby, loading, reload: loadNearby };
}

export function useRealtimeBuses(routeId?: string) {
  const [vehicles, setVehicles] = useState<VehiclePosition[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadVehicles();
    const interval = setInterval(loadVehicles, 30000);
    return () => clearInterval(interval);
  }, [routeId]);

  const loadVehicles = async () => {
    try {
      setLoading(true);
      const positions = await fetchRealtimeVehiclePositions(routeId);
      setVehicles(positions);
    } catch (error) {
      console.error('Error loading bus positions:', error);
    } finally {
      setLoading(false);
    }
  };

  return { vehicles, loading, reload: loadVehicles };
}

export function useRealtimeSubways(feedId?: string) {
  const [trains, setTrains] = useState<VehiclePosition[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadTrains();
    const interval = setInterval(loadTrains, 30000);
    return () => clearInterval(interval);
  }, [feedId]);

  const loadTrains = async () => {
    try {
      setLoading(true);
      const positions = await fetchSubwayRealtimePositions(feedId || 'gtfs');
      setTrains(positions);
    } catch (error) {
      console.error('Error loading subway positions:', error);
    } finally {
      setLoading(false);
    }
  };

  return { trains, loading, reload: loadTrains };
}

export function useServiceAlerts(mode?: 'subway' | 'bus' | 'lirr' | 'mnr') {
  const [alerts, setAlerts] = useState<ServiceAlert[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadAlerts();
    const interval = setInterval(loadAlerts, 60000);
    return () => clearInterval(interval);
  }, [mode]);

  const loadAlerts = async () => {
    try {
      setLoading(true);
      const serviceAlerts = await fetchServiceAlerts(mode);
      setAlerts(serviceAlerts);
    } catch (error) {
      console.error('Error loading alerts:', error);
    } finally {
      setLoading(false);
    }
  };

  return { alerts, loading, reload: loadAlerts };
}

export function initializeMTABusAPI(apiKey: string) {
  setBusApiKey(apiKey);
}
