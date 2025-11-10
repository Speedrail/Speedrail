import type { Region as RegionNative } from 'react-native-maps';
import MapViewNative, { Marker as MarkerNative, Polyline as PolylineNative, PROVIDER_GOOGLE as PROVIDER_GOOGLE_NATIVE } from 'react-native-maps';

export const MapView = MapViewNative;
export const Marker = MarkerNative;
export const Polyline = PolylineNative;
export const PROVIDER_GOOGLE = PROVIDER_GOOGLE_NATIVE;
export type Region = RegionNative;

export default MapView;