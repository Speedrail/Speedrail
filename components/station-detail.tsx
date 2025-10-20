import { type DetailedStationInfo } from '@/services/mta-api';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import React from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  View,
} from 'react-native';

interface StationDetailProps {
  stationInfo: DetailedStationInfo | null;
  loading: boolean;
}

export default function StationDetail({ stationInfo, loading }: StationDetailProps) {
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6a99e3" />
        <Text style={styles.loadingText}>Loading station details...</Text>
      </View>
    );
  }

  if (!stationInfo) {
    return (
      <View style={styles.emptyContainer}>
        <MaterialCommunityIcons name="map-marker-off" size={48} color="#687076" />
        <Text style={styles.emptyText}>No station information available</Text>
      </View>
    );
  }

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'subway': return 'Subway Station';
      case 'bus': return 'Bus Stop';
      case 'lirr': return 'LIRR Station';
      case 'metro-north': return 'Metro-North Station';
      case 'ferry': return 'NYC Ferry Stop';
      case 'sir': return 'Staten Island Railway';
      default: return 'Transit Station';
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'subway': return '#6a99e3';
      case 'bus': return '#4CAF50';
      case 'lirr': return '#FF9800';
      case 'metro-north': return '#E91E63';
      case 'ferry': return '#00BCD4';
      case 'sir': return '#9C27B0';
      default: return '#6a99e3';
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return '#f44336';
      case 'warning': return '#ff9800';
      case 'info': return '#2196f3';
      default: return '#687076';
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <View style={[styles.typeBadge, { backgroundColor: getTypeColor(stationInfo.type) }]}>
            <Text style={styles.typeBadgeText}>{getTypeLabel(stationInfo.type)}</Text>
          </View>
        </View>
        <Text style={styles.stationName}>{stationInfo.name}</Text>
        {stationInfo.address && (
          <View style={styles.addressRow}>
            <MaterialCommunityIcons name="map-marker" size={16} color="#687076" />
            <Text style={styles.address}>{stationInfo.address}</Text>
          </View>
        )}
        {stationInfo.borough && (
          <Text style={styles.borough}>{stationInfo.borough}</Text>
        )}
      </View>

      {stationInfo.routes && stationInfo.routes.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <MaterialCommunityIcons name="train" size={20} color="#222" />
            <Text style={styles.sectionTitle}>Lines & Routes</Text>
          </View>
          <View style={styles.routesContainer}>
            {stationInfo.routes.map((route, index) => (
              <View key={index} style={[styles.routeBadge, { backgroundColor: getTypeColor(stationInfo.type) }]}>
                <Text style={styles.routeText}>{route}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <MaterialCommunityIcons name="wheelchair-accessibility" size={20} color="#222" />
          <Text style={styles.sectionTitle}>Accessibility</Text>
        </View>
        <View style={styles.accessibilityGrid}>
          <View style={styles.accessibilityItem}>
            <MaterialCommunityIcons 
              name={stationInfo.accessibility.wheelchairAccessible ? 'check-circle' : 'close-circle'} 
              size={24} 
              color={stationInfo.accessibility.wheelchairAccessible ? '#4CAF50' : '#f44336'} 
            />
            <Text style={styles.accessibilityLabel}>Wheelchair Accessible</Text>
          </View>
          <View style={styles.accessibilityItem}>
            <MaterialCommunityIcons 
              name={stationInfo.accessibility.ada ? 'check-circle' : 'close-circle'} 
              size={24} 
              color={stationInfo.accessibility.ada ? '#4CAF50' : '#f44336'} 
            />
            <Text style={styles.accessibilityLabel}>ADA Compliant</Text>
          </View>
          <View style={[styles.accessibilityItem, !stationInfo.accessibility.elevatorsAvailable && styles.unavailableItem]}>
            <MaterialCommunityIcons 
              name="elevator" 
              size={24} 
              color={stationInfo.accessibility.elevatorsAvailable ? '#6a99e3' : '#ccc'} 
            />
            <Text style={[
              styles.accessibilityLabel, 
              !stationInfo.accessibility.elevatorsAvailable && styles.unavailableText
            ]}>
              {stationInfo.accessibility.elevatorsAvailable 
                ? `${stationInfo.accessibility.elevators} Elevator${stationInfo.accessibility.elevators !== 1 ? 's' : ''}`
                : 'Elevator data unavailable'
              }
            </Text>
          </View>
          <View style={[styles.accessibilityItem, !stationInfo.accessibility.escalatorsAvailable && styles.unavailableItem]}>
            <MaterialCommunityIcons 
              name="stairs" 
              size={24} 
              color={stationInfo.accessibility.escalatorsAvailable ? '#6a99e3' : '#ccc'} 
            />
            <Text style={[
              styles.accessibilityLabel,
              !stationInfo.accessibility.escalatorsAvailable && styles.unavailableText
            ]}>
              {stationInfo.accessibility.escalatorsAvailable
                ? `${stationInfo.accessibility.escalators} Escalator${stationInfo.accessibility.escalators !== 1 ? 's' : ''}`
                : 'Escalator data unavailable'
              }
            </Text>
          </View>
        </View>
        {(!stationInfo.accessibility.elevatorsAvailable || !stationInfo.accessibility.escalatorsAvailable) && (
          <View style={styles.dataUnavailableNote}>
            <MaterialCommunityIcons name="information-outline" size={16} color="#ff9800" />
            <Text style={styles.dataUnavailableText}>
              Equipment counts are only available for subway stations from MTA&apos;s real-time data feed.
            </Text>
          </View>
        )}
        {stationInfo.accessibility.accessibleEntrances.length > 0 && (
          <View style={styles.entrancesContainer}>
            <Text style={styles.entrancesTitle}>Accessible Entrances:</Text>
            {stationInfo.accessibility.accessibleEntrances.map((entrance, index) => (
              <View key={index} style={styles.entranceItem}>
                <MaterialCommunityIcons name="door-open" size={16} color="#687076" />
                <Text style={styles.entranceText}>{entrance}</Text>
              </View>
            ))}
          </View>
        )}
        {stationInfo.accessibility.notes && (
          <View style={styles.notesContainer}>
            <MaterialCommunityIcons name="information" size={16} color="#2196f3" />
            <Text style={styles.notesText}>{stationInfo.accessibility.notes}</Text>
          </View>
        )}
      </View>

      {stationInfo.fares && stationInfo.fares.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <MaterialCommunityIcons name="credit-card" size={20} color="#222" />
            <Text style={styles.sectionTitle}>Fares</Text>
          </View>
          {stationInfo.fares.map((fare, index) => (
            <View key={index} style={styles.fareItem}>
              <View style={styles.fareInfo}>
                <Text style={styles.fareName}>{fare.name}</Text>
                <Text style={styles.fareDescription}>{fare.description}</Text>
              </View>
              <Text style={styles.farePrice}>${fare.price.toFixed(2)}</Text>
            </View>
          ))}
        </View>
      )}

      {stationInfo.alerts && stationInfo.alerts.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <MaterialCommunityIcons name="alert" size={20} color="#222" />
            <Text style={styles.sectionTitle}>Service Alerts</Text>
          </View>
          {stationInfo.alerts.map((alert, index) => (
            <View key={index} style={[styles.alertItem, { borderLeftColor: getSeverityColor(alert.severity) }]}>
              <View style={styles.alertHeader}>
                <MaterialCommunityIcons 
                  name={alert.severity === 'critical' ? 'alert-circle' : alert.severity === 'warning' ? 'alert' : 'information'} 
                  size={20} 
                  color={getSeverityColor(alert.severity)} 
                />
                <Text style={styles.alertTitle}>{alert.header}</Text>
              </View>
              {alert.description && (
                <Text style={styles.alertDescription}>{alert.description}</Text>
              )}
              {alert.affectedRoutes.length > 0 && (
                <View style={styles.affectedRoutes}>
                  <Text style={styles.affectedLabel}>Affected routes: </Text>
                  <Text style={styles.affectedText}>{alert.affectedRoutes.join(', ')}</Text>
                </View>
              )}
            </View>
          ))}
        </View>
      )}

      {stationInfo.structure && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <MaterialCommunityIcons name="home-city" size={20} color="#222" />
            <Text style={styles.sectionTitle}>Station Structure</Text>
          </View>
          <Text style={styles.structureText}>{stationInfo.structure}</Text>
        </View>
      )}

      <View style={styles.bottomPadding} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: '#687076',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
    gap: 12,
  },
  emptyText: {
    fontSize: 14,
    color: '#687076',
  },
  header: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e8f0f9',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  typeBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  typeBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
  },
  stationName: {
    fontSize: 24,
    fontWeight: '700',
    color: '#222',
    marginTop: 8,
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
  },
  address: {
    fontSize: 14,
    color: '#687076',
    flex: 1,
  },
  borough: {
    fontSize: 14,
    color: '#687076',
    marginTop: 4,
    fontWeight: '500',
  },
  section: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e8f0f9',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#222',
  },
  routesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  routeBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    minWidth: 40,
    alignItems: 'center',
  },
  routeText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
  },
  accessibilityGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  accessibilityItem: {
    width: '45%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
  },
  accessibilityLabel: {
    fontSize: 13,
    color: '#222',
    fontWeight: '500',
    flex: 1,
  },
  unavailableItem: {
    opacity: 0.6,
  },
  unavailableText: {
    color: '#999',
    textDecorationLine: 'line-through',
  },
  dataUnavailableNote: {
    marginTop: 12,
    flexDirection: 'row',
    gap: 8,
    padding: 12,
    backgroundColor: '#fff3e0',
    borderRadius: 12,
    borderLeftWidth: 3,
    borderLeftColor: '#ff9800',
  },
  dataUnavailableText: {
    fontSize: 12,
    color: '#e65100',
    flex: 1,
    lineHeight: 16,
  },
  entrancesContainer: {
    marginTop: 16,
    padding: 12,
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
  },
  entrancesTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#222',
    marginBottom: 8,
  },
  entranceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 4,
  },
  entranceText: {
    fontSize: 13,
    color: '#687076',
  },
  notesContainer: {
    marginTop: 12,
    flexDirection: 'row',
    gap: 8,
    padding: 12,
    backgroundColor: '#e3f2fd',
    borderRadius: 12,
  },
  notesText: {
    fontSize: 13,
    color: '#1976d2',
    flex: 1,
  },
  fareItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    marginBottom: 8,
  },
  fareInfo: {
    flex: 1,
  },
  fareName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#222',
    marginBottom: 4,
  },
  fareDescription: {
    fontSize: 12,
    color: '#687076',
  },
  farePrice: {
    fontSize: 18,
    fontWeight: '700',
    color: '#6a99e3',
    marginLeft: 12,
  },
  alertItem: {
    padding: 16,
    backgroundColor: '#fff9e6',
    borderRadius: 12,
    marginBottom: 12,
    borderLeftWidth: 4,
  },
  alertHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  alertTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#222',
    flex: 1,
  },
  alertDescription: {
    fontSize: 13,
    color: '#687076',
    marginBottom: 8,
    lineHeight: 18,
  },
  affectedRoutes: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  affectedLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#687076',
  },
  affectedText: {
    fontSize: 12,
    color: '#687076',
  },
  structureText: {
    fontSize: 14,
    color: '#687076',
    lineHeight: 20,
  },
  bottomPadding: {
    height: 40,
  },
});
