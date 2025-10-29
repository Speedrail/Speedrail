import { Colors } from '@/constants/theme';
import { useTheme } from '@/contexts/theme-context';
import Feather from '@expo/vector-icons/Feather';
import React from 'react';
import {
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { TransitRoute } from '../services/google-maps-api';

interface RouteOptionProps {
  route: TransitRoute;
  routeNumber: number;
  onSelect: () => void;
}

export default function RouteOption({ route, routeNumber, onSelect }: RouteOptionProps) {
  const { actualTheme } = useTheme();
  const colors = Colors[actualTheme];
  const leg = route.legs?.[0];
  
  if (!leg) {
    return null; // or return a placeholder component
  }

  let transfers = 0;
  const modes: string[] = [];

  leg.steps?.forEach((step) => {
    if (step.travel_mode === 'TRANSIT' && step.transit_details) {
      const vehicleType = step.transit_details?.line?.vehicle?.type;
      const lineName = step.transit_details?.line?.short_name || step.transit_details?.line?.name;
      
      if (vehicleType === 'SUBWAY') {
        modes.push(`Subway ${lineName || ''}`);
      } else if (vehicleType === 'BUS') {
        modes.push(`Bus ${lineName || ''}`);
      } else {
        modes.push(lineName || 'Transit');
      }
      transfers++;
    }
  });

  const modesSummary = modes.length > 0 ? modes.join(' → ') : 'No transit info';
  const transferCount = Math.max(0, transfers - 1);
  const arrivalTime = leg.arrival_time?.text || '';

  return (
    <TouchableOpacity style={[styles.container, { 
      backgroundColor: colors.card,
      borderColor: colors.cardBorder,
      borderWidth: 1,
    }]} onPress={onSelect}>
      <View style={styles.header}>
        <View style={styles.routeNumberContainer}>
          <Text style={[styles.routeNumber, { color: colors.text }]}>Route {routeNumber}</Text>
        </View>
        <View style={[styles.durationContainer, { 
          backgroundColor: actualTheme === 'dark' ? '#1E3A5F' : '#e8f0f9' 
        }]}>
          <Feather name="clock" size={16} color={colors.accentBlue || '#6a99e3'} />
          <Text style={[styles.duration, { color: colors.accentBlue || '#6a99e3' }]}>{leg.duration?.text || 'Unknown'}</Text>
        </View>
      </View>

      <View style={styles.modeContainer}>
        <Text style={[styles.modeText, { color: colors.text }]} numberOfLines={1}>
          {modesSummary}
        </Text>
      </View>

      <View style={styles.detailsRow}>
        <View style={styles.detailItem}>
          <Feather name="shuffle" size={14} color={colors.secondaryText || colors.icon} />
          <Text style={[styles.detailText, { color: colors.secondaryText || colors.icon }]}>
            {transferCount} {transferCount === 1 ? 'transfer' : 'transfers'}
          </Text>
        </View>
        {leg.arrival_time && (
          <View style={styles.detailItem}>
            <Feather name="target" size={14} color={colors.secondaryText || colors.icon} />
            <Text style={[styles.detailText, { color: colors.secondaryText || colors.icon }]}>Arrive {arrivalTime}</Text>
          </View>
        )}
      </View>

      {route.fare && (
        <View style={[styles.fareContainer, { borderTopColor: colors.cardBorder }]}>
          <Text style={[styles.fareText, { color: colors.text }]}>{route.fare.text}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  routeNumberContainer: {
    flex: 1,
  },
  routeNumber: {
    fontSize: 18,
    fontWeight: '700',
  },
  durationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  duration: {
    fontSize: 15,
    fontWeight: '600',
    marginLeft: 6,
  },
  modeContainer: {
    marginBottom: 12,
  },
  modeText: {
    fontSize: 14,
    fontWeight: '500',
  },
  detailsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  detailText: {
    fontSize: 13,
    marginLeft: 6,
  },
  fareContainer: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
  },
  fareText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
