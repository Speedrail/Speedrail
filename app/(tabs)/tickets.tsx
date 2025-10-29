import { Colors } from '@/constants/theme';
import { useTheme } from '@/contexts/theme-context';
import {
  calculatePassSavings,
  fetchMTAFares,
  fetchServiceAlerts,
  getFareCapInfo,
  type MTAFareData,
  type ServiceAlert
} from '@/services/mta-api';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function TicketsPage() {
  const { actualTheme } = useTheme();
  const colors = Colors[actualTheme];
  const [fareData, setFareData] = useState<MTAFareData | null>(null);
  const [alerts, setAlerts] = useState<ServiceAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'subway' | 'bus' | 'express-bus' | 'rail' | 'ferry' | 'sir'>('all');

  const loadFareData = async () => {
    try {
      const [fareDataResult, alertsResult] = await Promise.all([
        fetchMTAFares(),
        fetchServiceAlerts()
      ]);
      setFareData(fareDataResult);
      setAlerts(alertsResult.slice(0, 5));
    } catch (error) {
      console.error('Error fetching MTA data:', error);
      Alert.alert('Error', 'Failed to load MTA information');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadFareData();
    
    const interval = setInterval(() => {
      fetchServiceAlerts().then(alertsResult => {
        setAlerts(alertsResult.slice(0, 5));
      }).catch(console.error);
    }, 60000);

    return () => clearInterval(interval);
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    loadFareData();
  };

  const filteredFares = fareData?.fares.filter(
    fare => selectedCategory === 'all' || fare.category === selectedCategory
  );

  const fareCapInfo = getFareCapInfo();
  const savings7Day = calculatePassSavings(2, 7);
  const savings30Day = calculatePassSavings(2, 30);

  if (loading) {
    return (
      <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: colors.background }}>
        <View style={[styles.container, styles.centered]}>
          <ActivityIndicator size="large" color={colors.buttonPrimary} />
          <Text style={[styles.loadingText, { color: colors.secondaryText }]}>Loading fare information...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={[styles.header, { backgroundColor: colors.background, borderBottomColor: colors.border }]}>
        <Text style={[styles.title, { color: colors.text }]}>Fares & Tickets</Text>
        <Text style={[styles.lastUpdated, { color: colors.metaText }]}>
          Last updated: {new Date(fareData?.lastUpdated || '').toLocaleTimeString()}
        </Text>
      </View>
      <ScrollView 
        style={[styles.container, { backgroundColor: colors.background }]}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Fare Capping Info */}
        <View style={[styles.fareCapCard, { backgroundColor: colors.infoBoxBg, borderColor: colors.borderLight }]}>
          <Text style={[styles.fareCapTitle, { color: colors.buttonPrimary }]}>IMPORTANT: Fare Capping</Text>
          <Text style={[styles.fareCapDescription, { color: colors.text }]}>
            After {fareCapInfo.ridesUntilCap} rides in 7 days, remaining rides are free for the rest of that week
          </Text>
        </View>

        {alerts.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Service Alerts</Text>
            {alerts.map((alert) => (
              <View 
                key={alert.id} 
                style={[
                  styles.alertCard,
                  { backgroundColor: colors.alertBackground, borderColor: colors.alertBorder },
                  alert.severity === 'critical' && styles.alertCardCritical,
                  alert.severity === 'critical' && { backgroundColor: colors.alertCriticalBg, borderLeftColor: colors.alertCriticalBorder },
                  alert.severity === 'warning' && styles.alertCardWarning,
                  alert.severity === 'warning' && { backgroundColor: colors.alertWarningBg, borderLeftColor: colors.alertWarningBorder },
                ]}
              >
                <View style={styles.alertHeader}>
                  <Text style={[
                    styles.alertTitle,
                    { color: colors.text },
                    alert.severity === 'critical' && styles.alertTitleCritical,
                    alert.severity === 'critical' && { color: colors.alertCriticalText },
                    alert.severity === 'warning' && styles.alertTitleWarning,
                    alert.severity === 'warning' && { color: colors.alertWarningText },
                  ]}>
                    {alert.header}
                  </Text>
                  {alert.affectedRoutes.length > 0 && (
                    <View style={styles.routeBadges}>
                      {alert.affectedRoutes.slice(0, 3).map((route, idx) => (
                        <View key={idx} style={[styles.routeBadge, { backgroundColor: colors.buttonPrimary }]}>
                          <Text style={styles.routeBadgeText}>{route}</Text>
                        </View>
                      ))}
                      {alert.affectedRoutes.length > 3 && (
                        <Text style={[styles.moreRoutes, { color: colors.secondaryText }]}>+{alert.affectedRoutes.length - 3}</Text>
                      )}
                    </View>
                  )}
                </View>
                {alert.description && (
                  <Text style={[styles.alertDescription, { color: colors.secondaryText }]} numberOfLines={3}>
                    {alert.description}
                  </Text>
                )}
              </View>
            ))}
          </View>
        )}

        {/* Category Filter */}
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          style={styles.categoryContainer}
          contentContainerStyle={styles.categoryContent}
        >
          {['all', 'subway', 'bus', 'express-bus', 'rail'].map((category) => (
            <TouchableOpacity
              key={category}
              style={[
                styles.categoryButton,
                { backgroundColor: colors.filterInactive, borderColor: colors.border },
                selectedCategory === category && styles.categoryButtonActive,
                selectedCategory === category && { backgroundColor: colors.buttonPrimary, borderColor: colors.buttonPrimary }
              ]}
              onPress={() => setSelectedCategory(category as any)}
            >
              <Text style={[
                styles.categoryButtonText,
                { color: colors.secondaryText },
                selectedCategory === category && styles.categoryButtonTextActive
              ]}>
                {category === 'all' ? 'All' : 
                 category === 'subway' ? 'Subway' :
                 category === 'bus' ? 'Bus' :
                 category === 'express-bus' ? 'Express Bus' : 'Rail'}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Fares List */}
        <View style={styles.faresContainer}>
          {filteredFares?.map((fare) => (
            <View key={fare.id} style={[styles.fareCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={styles.fareHeader}>
                <Text style={[styles.fareName, { color: colors.text }]}>{fare.name}</Text>
                <Text style={[styles.farePrice, { color: colors.buttonPrimary }]}>${fare.price.toFixed(2)}</Text>
              </View>
              <Text style={[styles.fareDescription, { color: colors.secondaryText }]}>{fare.description}</Text>
              <View style={[styles.categoryBadge, { backgroundColor: colors.buttonSecondary }]}>
                <Text style={[styles.categoryBadgeText, { color: colors.buttonPrimary }]}>
                  {fare.category.replace('-', ' ').toUpperCase()}
                </Text>
              </View>
            </View>
          ))}
        </View>

        {/* Reduced Fares */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Reduced Fares</Text>
          {fareData?.reducedFares.map((reduced, index) => (
            <View key={index} style={[styles.reducedFareCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.reducedFareType, { color: colors.text }]}>{reduced.type}</Text>
              <Text style={styles.reducedFareDiscount}>{reduced.discount}</Text>
              <Text style={[styles.reducedFareEligibility, { color: colors.secondaryText }]}>
                Eligible: {reduced.eligibility.join(', ')}
              </Text>
            </View>
          ))}
        </View>

        {/* MetroCard Bonus Info */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>MetroCard Bonus</Text>
          <View style={[styles.bonusCard, { backgroundColor: colors.alertWarningBg, borderColor: actualTheme === 'dark' ? colors.alertWarningBorder : '#ffe9b3' }]}>
            <Text style={[styles.bonusText, { color: colors.alertWarningText }]}>
              {fareData?.metroCardInfo.bonus}
            </Text>
            <Text style={[styles.bonusSubtext, { color: colors.secondaryText }]}>
              Minimum purchase: ${fareData?.metroCardInfo.minimumForBonus.toFixed(2)}
            </Text>
          </View>
        </View>

        {/* Savings Calculator */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Is an Unlimited Pass Worth It?</Text>
          <Text style={[styles.calculatorNote, { color: colors.secondaryText }]}>Based on 2 rides per day:</Text>
          
          <View style={[styles.savingsCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.savingsTitle, { color: colors.text }]}>7-Day Pass</Text>
            <Text style={[styles.savingsAmount, { color: colors.secondaryText }]}>
              Pay-per-ride: ${savings7Day.payPerRide.toFixed(2)}
            </Text>
            <Text style={[styles.savingsAmount, { color: colors.secondaryText }]}>
              Unlimited: ${savings7Day.unlimitedPass.toFixed(2)}
            </Text>
            <Text style={[styles.savingsRecommendation, { color: colors.secondaryText }, savings7Day.savings > 0 && styles.savingsPositive]}>
              {savings7Day.savings > 0 
                ? `Save $${savings7Day.savings.toFixed(2)} with unlimited pass`
                : `Pay-per-ride is cheaper`}
            </Text>
          </View>

          <View style={[styles.savingsCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.savingsTitle, { color: colors.text }]}>30-Day Pass</Text>
            <Text style={[styles.savingsAmount, { color: colors.secondaryText }]}>
              Pay-per-ride: ${savings30Day.payPerRide.toFixed(2)}
            </Text>
            <Text style={[styles.savingsAmount, { color: colors.secondaryText }]}>
              Unlimited: ${savings30Day.unlimitedPass.toFixed(2)}
            </Text>
            <Text style={[styles.savingsRecommendation, { color: colors.secondaryText }, savings30Day.savings > 0 && styles.savingsPositive]}>
              {savings30Day.savings > 0 
                ? `Save $${savings30Day.savings.toFixed(2)} with unlimited pass`
                : `Pay-per-ride is cheaper`}
            </Text>
          </View>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 20,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: 27,
    fontWeight: '700',
    marginBottom: 4,
  },
  lastUpdated: {
    fontSize: 12,
  },
  fareCapCard: {
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 12,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  fareCapTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 6,
  },
  fareCapDescription: {
    fontSize: 14,
    lineHeight: 20,
  },
  alertCard: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
  },
  alertCardWarning: {
    borderLeftWidth: 4,
  },
  alertCardCritical: {
    borderLeftWidth: 4,
  },
  alertHeader: {
    marginBottom: 8,
  },
  alertTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 6,
  },
  alertTitleWarning: {
  },
  alertTitleCritical: {
  },
  alertDescription: {
    fontSize: 14,
    lineHeight: 20,
  },
  routeBadges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 4,
  },
  routeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  routeBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#fff',
  },
  moreRoutes: {
    fontSize: 12,
    fontWeight: '500',
    alignSelf: 'center',
  },
  categoryContainer: {
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 8,
  },
  categoryContent: {
    paddingVertical: 8,
  },
  categoryButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 1,
  },
  categoryButtonActive: {
  },
  categoryButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  categoryButtonTextActive: {
    color: '#fff',
  },
  faresContainer: {
    padding: 16,
  },
  fareCard: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
  },
  fareHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  fareName: {
    fontSize: 17,
    fontWeight: '600',
    flex: 1,
  },
  farePrice: {
    fontSize: 22,
    fontWeight: '700',
  },
  fareDescription: {
    fontSize: 14,
    marginBottom: 8,
    lineHeight: 20,
  },
  categoryBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  categoryBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  section: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 12,
    marginTop: 8,
  },
  reducedFareCard: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
  },
  reducedFareType: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  reducedFareDiscount: {
    fontSize: 18,
    fontWeight: '700',
    color: '#00933C',
    marginBottom: 8,
  },
  reducedFareEligibility: {
    fontSize: 13,
    lineHeight: 18,
  },
  bonusCard: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  bonusText: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 4,
  },
  bonusSubtext: {
    fontSize: 13,
  },
  calculatorNote: {
    fontSize: 13,
    marginBottom: 12,
  },
  savingsCard: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
  },
  savingsTitle: {
    fontSize: 17,
    fontWeight: '600',
    marginBottom: 8,
  },
  savingsAmount: {
    fontSize: 14,
    marginBottom: 4,
  },
  savingsRecommendation: {
    fontSize: 15,
    fontWeight: '600',
    marginTop: 8,
  },
  savingsPositive: {
    color: '#00933C',
  },
  footer: {
    padding: 24,
    paddingBottom: 32,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 12,
    color: '#9eadba',
    textAlign: 'center',
  },
});