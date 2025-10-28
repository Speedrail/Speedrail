// Web stub for MapView - not supported on web
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

export const MapView = ({ children, ...props }: any) => {
  return (
    <View style={[styles.container, props.style]}>
      <Text style={styles.text}>Map view not available on web</Text>
      {children}
    </View>
  );
};

export const Marker = ({ children, ...props }: any) => {
  return null;
};

export const PROVIDER_GOOGLE = 'google';

export type Region = {
  latitude: number;
  longitude: number;
  latitudeDelta: number;
  longitudeDelta: number;
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
  },
  text: {
    color: '#666',
    fontSize: 16,
  },
});

export default MapView;