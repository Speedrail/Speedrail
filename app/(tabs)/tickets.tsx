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
      <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: '#fff' }}>
        <View style={[styles.container, styles.centered]}>
          <ActivityIndicator size="large" color="#6a99e3" />
          <Text style={styles.loadingText}>Loading fare information...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: '#fff' }}>
      <View style={styles.header}>
        <Text style={styles.title}>Fares & Tickets</Text>
        <Text style={styles.lastUpdated}>
          Last updated: {new Date(fareData?.lastUpdated || '').toLocaleTimeString()}
        </Text>
      </View>
      <ScrollView 
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Fare Capping Info */}
        <View style={styles.fareCapCard}>
          <Text style={styles.fareCapTitle}>IMPORTANT: Fare Capping</Text>
          <Text style={styles.fareCapDescription}>
            After {fareCapInfo.ridesUntilCap} rides in 7 days, remaining rides are free for the rest of that week
          </Text>
        </View>

        {alerts.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Service Alerts</Text>
            {alerts.map((alert) => (
              <View 
                key={alert.id} 
                style={[
                  styles.alertCard,
                  alert.severity === 'critical' && styles.alertCardCritical,
                  alert.severity === 'warning' && styles.alertCardWarning,
                ]}
              >
                <View style={styles.alertHeader}>
                  <Text style={[
                    styles.alertTitle,
                    alert.severity === 'critical' && styles.alertTitleCritical,
                    alert.severity === 'warning' && styles.alertTitleWarning,
                  ]}>
                    {alert.header}
                  </Text>
                  {alert.affectedRoutes.length > 0 && (
                    <View style={styles.routeBadges}>
                      {alert.affectedRoutes.slice(0, 3).map((route, idx) => (
                        <View key={idx} style={styles.routeBadge}>
                          <Text style={styles.routeBadgeText}>{route}</Text>
                        </View>
                      ))}
                      {alert.affectedRoutes.length > 3 && (
                        <Text style={styles.moreRoutes}>+{alert.affectedRoutes.length - 3}</Text>
                      )}
                    </View>
                  )}
                </View>
                {alert.description && (
                  <Text style={styles.alertDescription} numberOfLines={3}>
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
                selectedCategory === category && styles.categoryButtonActive
              ]}
              onPress={() => setSelectedCategory(category as any)}
            >
              <Text style={[
                styles.categoryButtonText,
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
            <View key={fare.id} style={styles.fareCard}>
              <View style={styles.fareHeader}>
                <Text style={styles.fareName}>{fare.name}</Text>
                <Text style={styles.farePrice}>${fare.price.toFixed(2)}</Text>
              </View>
              <Text style={styles.fareDescription}>{fare.description}</Text>
              <View style={styles.categoryBadge}>
                <Text style={styles.categoryBadgeText}>
                  {fare.category.replace('-', ' ').toUpperCase()}
                </Text>
              </View>
            </View>
          ))}
        </View>

        {/* Reduced Fares */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Reduced Fares</Text>
          {fareData?.reducedFares.map((reduced, index) => (
            <View key={index} style={styles.reducedFareCard}>
              <Text style={styles.reducedFareType}>{reduced.type}</Text>
              <Text style={styles.reducedFareDiscount}>{reduced.discount}</Text>
              <Text style={styles.reducedFareEligibility}>
                Eligible: {reduced.eligibility.join(', ')}
              </Text>
            </View>
          ))}
        </View>

        {/* MetroCard Bonus Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>MetroCard Bonus</Text>
          <View style={styles.bonusCard}>
            <Text style={styles.bonusText}>
              {fareData?.metroCardInfo.bonus}
            </Text>
            <Text style={styles.bonusSubtext}>
              Minimum purchase: ${fareData?.metroCardInfo.minimumForBonus.toFixed(2)}
            </Text>
          </View>
        </View>

        {/* Savings Calculator */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Is an Unlimited Pass Worth It?</Text>
          <Text style={styles.calculatorNote}>Based on 2 rides per day:</Text>
          
          <View style={styles.savingsCard}>
            <Text style={styles.savingsTitle}>7-Day Pass</Text>
            <Text style={styles.savingsAmount}>
              Pay-per-ride: ${savings7Day.payPerRide.toFixed(2)}
            </Text>
            <Text style={styles.savingsAmount}>
              Unlimited: ${savings7Day.unlimitedPass.toFixed(2)}
            </Text>
            <Text style={[styles.savingsRecommendation, savings7Day.savings > 0 && styles.savingsPositive]}>
              {savings7Day.savings > 0 
                ? `Save $${savings7Day.savings.toFixed(2)} with unlimited pass`
                : `Pay-per-ride is cheaper`}
            </Text>
          </View>

          <View style={styles.savingsCard}>
            <Text style={styles.savingsTitle}>30-Day Pass</Text>
            <Text style={styles.savingsAmount}>
              Pay-per-ride: ${savings30Day.payPerRide.toFixed(2)}
            </Text>
            <Text style={styles.savingsAmount}>
              Unlimited: ${savings30Day.unlimitedPass.toFixed(2)}
            </Text>
            <Text style={[styles.savingsRecommendation, savings30Day.savings > 0 && styles.savingsPositive]}>
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
    backgroundColor: '#fff',
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
    color: '#666',
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e8ecf1',
  },
  title: {
    fontSize: 27,
    fontWeight: '700',
    color: '#222',
    marginBottom: 4,
  },
  lastUpdated: {
    fontSize: 12,
    color: '#9eadba',
  },
  fareCapCard: {
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 12,
    padding: 16,
    backgroundColor: '#f0f9ff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#bae6fd',
  },
  fareCapTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0369a1',
    marginBottom: 6,
  },
  fareCapDescription: {
    fontSize: 14,
    color: '#075985',
    lineHeight: 20,
  },
  alertCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e8ecf1',
  },
  alertCardWarning: {
    borderLeftWidth: 4,
    borderLeftColor: '#f59e0b',
    backgroundColor: '#fffbf0',
  },
  alertCardCritical: {
    borderLeftWidth: 4,
    borderLeftColor: '#ef4444',
    backgroundColor: '#fff5f5',
  },
  alertHeader: {
    marginBottom: 8,
  },
  alertTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#222',
    marginBottom: 6,
  },
  alertTitleWarning: {
    color: '#d97706',
  },
  alertTitleCritical: {
    color: '#dc2626',
  },
  alertDescription: {
    fontSize: 14,
    color: '#556070',
    lineHeight: 20,
  },
  routeBadges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 4,
  },
  routeBadge: {
    backgroundColor: '#6a99e3',
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
    color: '#556070',
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
    backgroundColor: '#f3f4f6',
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#e8ecf1',
  },
  categoryButtonActive: {
    backgroundColor: '#6a99e3',
    borderColor: '#6a99e3',
  },
  categoryButtonText: {
    fontSize: 14,
    color: '#556070',
    fontWeight: '600',
  },
  categoryButtonTextActive: {
    color: '#fff',
  },
  faresContainer: {
    padding: 16,
  },
  fareCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e8ecf1',
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
    color: '#222',
    flex: 1,
  },
  farePrice: {
    fontSize: 22,
    fontWeight: '700',
    color: '#6a99e3',
  },
  fareDescription: {
    fontSize: 14,
    color: '#556070',
    marginBottom: 8,
    lineHeight: 20,
  },
  categoryBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#f0f5ff',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  categoryBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#6a99e3',
    textTransform: 'uppercase',
  },
  section: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#222',
    marginBottom: 12,
    marginTop: 8,
  },
  reducedFareCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e8ecf1',
  },
  reducedFareType: {
    fontSize: 16,
    fontWeight: '600',
    color: '#222',
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
    color: '#556070',
    lineHeight: 18,
  },
  bonusCard: {
    backgroundColor: '#fffbf0',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#ffe9b3',
  },
  bonusText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#d97706',
    marginBottom: 4,
  },
  bonusSubtext: {
    fontSize: 13,
    color: '#556070',
  },
  calculatorNote: {
    fontSize: 13,
    color: '#556070',
    marginBottom: 12,
  },
  savingsCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e8ecf1',
  },
  savingsTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#222',
    marginBottom: 8,
  },
  savingsAmount: {
    fontSize: 14,
    color: '#556070',
    marginBottom: 4,
  },
  savingsRecommendation: {
    fontSize: 15,
    fontWeight: '600',
    color: '#556070',
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