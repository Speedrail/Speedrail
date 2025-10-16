import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import MapView, { PROVIDER_GOOGLE } from 'react-native-maps';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function NavigationPage() {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }}>
      <View style={styles.container}>
        <Text style={styles.title}>Navigation</Text>
        <MapView style={styles.map} provider={PROVIDER_GOOGLE} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 27,
    fontWeight: '700',
    color: '#222',
    padding: 24,
    textAlign: 'left',
    flexWrap: 'wrap',
    width: '100%',
  },
  map: {
    width: '100%',
    height: '100%',
  },
});