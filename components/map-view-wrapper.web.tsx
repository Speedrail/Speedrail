import React, { createContext, useContext, useEffect, useMemo, useRef, useState, forwardRef, useImperativeHandle } from 'react';
import { View } from 'react-native';
import { loadGoogleMaps } from '../utils/google-maps-loader.web';

export const PROVIDER_GOOGLE = 'google';

export type Region = {
  latitude: number;
  longitude: number;
  latitudeDelta: number;
  longitudeDelta: number;
};

type MapContextValue = {
  map: google.maps.Map | null;
  gmaps: typeof google | null;
};

const MapContext = createContext<MapContextValue>({ map: null, gmaps: null });

function deltaToZoom(delta: number): number {
  const z = Math.round(Math.log2(360 / Math.max(delta, 1e-6)));
  return Math.min(20, Math.max(3, z));
}

type MapViewProps = {
  region?: Region;
  initialRegion?: Region;
  style?: any;
  provider?: string;
  customMapStyle?: any[];
  minZoomLevel?: number;
  maxZoomLevel?: number;
  showsUserLocation?: boolean;
  showsMyLocationButton?: boolean;
  showsCompass?: boolean;
  loadingEnabled?: boolean;
  loadingIndicatorColor?: string;
  moveOnMarkerPress?: boolean;
  toolbarEnabled?: boolean;
  rotateEnabled?: boolean;
  pitchEnabled?: boolean;
  children?: React.ReactNode;
};

export const MapView = forwardRef<any, MapViewProps>(({ region, initialRegion, style, customMapStyle, minZoomLevel, maxZoomLevel, children }: MapViewProps, ref) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [gmaps, setGmaps] = useState<typeof google | null>(null);

  useEffect(() => {
    let mounted = true;
    loadGoogleMaps().then(() => {
      if (!mounted || !containerRef.current) return;
      const g = window.google;
      setGmaps(g);
      const center = new g.maps.LatLng(
        (initialRegion?.latitude ?? region?.latitude) ?? 40.7128,
        (initialRegion?.longitude ?? region?.longitude) ?? -74.0060
      );
      const m = new g.maps.Map(containerRef.current, {
        center,
        zoom: deltaToZoom((initialRegion?.longitudeDelta ?? region?.longitudeDelta) ?? 0.05),
        clickableIcons: true,
        disableDefaultUI: false,
        mapTypeId: g.maps.MapTypeId.ROADMAP,
        styles: customMapStyle,
        minZoom: minZoomLevel,
        maxZoom: maxZoomLevel,
      });
      setMap(m);
    });
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!map || !gmaps || !region) return;
    map.setCenter(new gmaps.maps.LatLng(region.latitude, region.longitude));
    map.setZoom(deltaToZoom(region.longitudeDelta));
  }, [map, gmaps, region?.latitude, region?.longitude, region?.longitudeDelta]);

  useEffect(() => {
    if (!map) return;
    if (customMapStyle !== undefined) {
      map.setOptions({ styles: customMapStyle as any });
    }
  }, [map, customMapStyle]);

  useImperativeHandle(ref, () => ({
    animateToRegion: (r: Region, _duration?: number) => {
      if (!map || !gmaps) return;
      map.panTo(new gmaps.maps.LatLng(r.latitude, r.longitude));
      map.setZoom(deltaToZoom(r.longitudeDelta));
    },
  }), [map, gmaps]);

  const value = useMemo(() => ({ map, gmaps }), [map, gmaps]);

  return (
    <View style={[{ flex: 1 }, style]}>
      <div ref={containerRef} style={{ width: '100%', height: '100%' }} />
      <MapContext.Provider value={value}>{children}</MapContext.Provider>
    </View>
  );
});

type MarkerProps = {
  coordinate: { latitude: number; longitude: number };
  title?: string;
  description?: string;
  pinColor?: string;
  tracksViewChanges?: boolean;
  onPress?: () => void;
  children?: React.ReactNode;
};

export const Marker = ({ coordinate, title, description, pinColor, onPress }: MarkerProps) => {
  const { map, gmaps } = useContext(MapContext);
  const markerRef = useRef<google.maps.Marker | null>(null);

  useEffect(() => {
    if (!map || !gmaps) return;
    if (!markerRef.current) {
      markerRef.current = new gmaps.maps.Marker({
        map,
        position: { lat: coordinate.latitude, lng: coordinate.longitude },
        title: title || undefined,
      });
    }
    markerRef.current.setPosition({ lat: coordinate.latitude, lng: coordinate.longitude });
    if (title) markerRef.current.setTitle(title);
    if (pinColor && (markerRef.current as any).setIcon) {
      (markerRef.current as any).setIcon({
        path: gmaps.maps.SymbolPath.CIRCLE,
        scale: 6,
        fillColor: pinColor,
        fillOpacity: 1,
        strokeColor: '#fff',
        strokeWeight: 2,
      });
    }
    gmaps.maps.event.clearListeners(markerRef.current, 'click');
    const info = description ? new gmaps.maps.InfoWindow({ content: description }) : null;
    if (onPress) {
      markerRef.current.addListener('click', () => onPress());
    } else if (info) {
      markerRef.current.addListener('click', () => info.open({ map, anchor: markerRef.current! }));
    }
    return () => {
      if (markerRef.current) {
        markerRef.current.setMap(null);
        markerRef.current = null;
      }
    };
  }, [map, gmaps, coordinate.latitude, coordinate.longitude, title, description, pinColor]);

  return null;
};

type PolylineProps = {
  coordinates: Array<{ latitude: number; longitude: number }>;
  strokeWidth?: number;
  strokeColor?: string;
};

export const Polyline = ({ coordinates, strokeWidth = 4, strokeColor = '#6a99e3' }: PolylineProps) => {
  const { map, gmaps } = useContext(MapContext);
  const polyRef = useRef<google.maps.Polyline | null>(null);

  useEffect(() => {
    if (!map || !gmaps) return;
    if (!polyRef.current) {
      polyRef.current = new gmaps.maps.Polyline({ map });
    }
    const path = coordinates.map((c) => ({ lat: c.latitude, lng: c.longitude }));
    polyRef.current.setOptions({
      map,
      path,
      strokeColor,
      strokeOpacity: 1,
      strokeWeight: strokeWidth,
    });
    return () => {
      if (polyRef.current) {
        polyRef.current.setMap(null);
        polyRef.current = null;
      }
    };
  }, [map, gmaps, coordinates, strokeWidth, strokeColor]);

  return null;
};

export default MapView;