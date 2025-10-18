export interface FareType {
  id: string;
  name: string;
  price: number;
  description: string;
  category: 'subway' | 'bus' | 'express-bus' | 'rail';
}

export interface ReducedFare {
  type: string;
  discount: string;
  eligibility: string[];
}

export interface MTAFareData {
  lastUpdated: string;
  fares: FareType[];
  reducedFares: ReducedFare[];
  metroCardInfo: {
    bonus: string;
    minimumForBonus: number;
  };
}

export interface ServiceAlert {
  id: string;
  header: string;
  description: string;
  affectedRoutes: string[];
  severity: 'warning' | 'info' | 'critical';
  activePeriod: {
    start: string;
    end?: string;
  };
}

export interface MTARealtimeData {
  alerts: ServiceAlert[];
  lastFetched: string;
}

const MTA_API_BASE = 'https://api-endpoint.mta.info/Dataservice/mtagtfsfeeds';

const MTA_FARE_DATA: MTAFareData = {
  lastUpdated: new Date().toISOString(),
  fares: [
    {
      id: 'subway-single',
      name: 'Subway Single Ride',
      price: 2.90,
      description: 'Pay-per-ride with MetroCard or OMNY',
      category: 'subway',
    },
    {
      id: 'local-bus-single',
      name: 'Local Bus Single Ride',
      price: 2.90,
      description: 'Pay-per-ride with MetroCard or OMNY',
      category: 'bus',
    },
    {
      id: 'express-bus-single',
      name: 'Express Bus Single Ride',
      price: 7.00,
      description: 'Express bus service single fare',
      category: 'express-bus',
    },
    {
      id: '7-day-unlimited',
      name: '7-Day Unlimited Pass',
      price: 34.00,
      description: 'Unlimited rides for 7 days on subway and local buses',
      category: 'subway',
    },
    {
      id: '30-day-unlimited',
      name: '30-Day Unlimited Pass',
      price: 132.00,
      description: 'Unlimited rides for 30 days on subway and local buses',
      category: 'subway',
    },
    {
      id: '7-day-express-bus',
      name: '7-Day Express Bus Plus',
      price: 64.00,
      description: 'Unlimited rides for 7 days including express buses',
      category: 'express-bus',
    },
    {
      id: 'lirr-peak-zone-1',
      name: 'LIRR Peak Zone 1',
      price: 11.75,
      description: 'Long Island Rail Road peak fare - Zone 1',
      category: 'rail',
    },
    {
      id: 'lirr-off-peak-zone-1',
      name: 'LIRR Off-Peak Zone 1',
      price: 8.25,
      description: 'Long Island Rail Road off-peak fare - Zone 1',
      category: 'rail',
    },
    {
      id: 'metro-north-peak',
      name: 'Metro-North Peak (varies by zone)',
      price: 10.50,
      description: 'Metro-North peak fare - varies by destination',
      category: 'rail',
    },
  ],
  reducedFares: [
    {
      type: 'Senior/Disability',
      discount: '50% off',
      eligibility: ['Seniors 65+', 'People with disabilities'],
    },
    {
      type: 'Student',
      discount: 'Free or reduced fare',
      eligibility: ['K-12 students with valid student MetroCard'],
    },
    {
      type: 'Fair Fares NYC',
      discount: '50% off',
      eligibility: ['Income-qualified NYC residents'],
    },
  ],
  metroCardInfo: {
    bonus: '5% Bonuses on purchases',
    minimumForBonus: 5.80,
  },
};

export async function fetchMTAFares(): Promise<MTAFareData> {
  return {
    ...MTA_FARE_DATA,
    lastUpdated: new Date().toISOString(),
  };
}

export async function fetchServiceAlerts(mode?: 'subway' | 'bus' | 'lirr' | 'mnr'): Promise<ServiceAlert[]> {
  try {
    let endpoint = `${MTA_API_BASE}/camsys/all-alerts.json`;
    
    if (mode === 'subway') {
      endpoint = `${MTA_API_BASE}/camsys/subway-alerts.json`;
    } else if (mode === 'bus') {
      endpoint = `${MTA_API_BASE}/camsys/bus-alerts.json`;
    } else if (mode === 'lirr') {
      endpoint = `${MTA_API_BASE}/camsys/lirr-alerts.json`;
    } else if (mode === 'mnr') {
      endpoint = `${MTA_API_BASE}/camsys/mnr-alerts.json`;
    }

    const response = await fetch(endpoint);
    const data = await response.json();

    const alerts: ServiceAlert[] = [];
    
    if (data.entity && Array.isArray(data.entity)) {
      for (const entity of data.entity) {
        if (entity.alert) {
          const alert = entity.alert;
          const headerText = alert.header_text?.translation?.[0]?.text || 'Service Alert';
          const descriptionText = alert.description_text?.translation?.[0]?.text || '';
          
          const affectedRoutes: string[] = [];
          if (alert.informed_entity && Array.isArray(alert.informed_entity)) {
            for (const informed of alert.informed_entity) {
              if (informed.route_id && !affectedRoutes.includes(informed.route_id)) {
                affectedRoutes.push(informed.route_id);
              }
            }
          }

          let severity: 'warning' | 'info' | 'critical' = 'info';
          if (headerText.toLowerCase().includes('delay') || headerText.toLowerCase().includes('suspended')) {
            severity = 'warning';
          }
          if (headerText.toLowerCase().includes('no service') || headerText.toLowerCase().includes('emergency')) {
            severity = 'critical';
          }

          const activePeriod = alert.active_period?.[0] || {};
          
          alerts.push({
            id: entity.id || Math.random().toString(),
            header: headerText,
            description: descriptionText,
            affectedRoutes,
            severity,
            activePeriod: {
              start: activePeriod.start ? new Date(parseInt(activePeriod.start) * 1000).toISOString() : new Date().toISOString(),
              end: activePeriod.end ? new Date(parseInt(activePeriod.end) * 1000).toISOString() : undefined,
            },
          });
        }
      }
    }

    return alerts;
  } catch (error) {
    console.error('Error fetching service alerts:', error);
    return [];
  }
}

export async function fetchRealtimeData(): Promise<MTARealtimeData> {
  const alerts = await fetchServiceAlerts();
  
  return {
    alerts,
    lastFetched: new Date().toISOString(),
  };
}

export async function fetchFaresByCategory(
  category: 'subway' | 'bus' | 'express-bus' | 'rail'
): Promise<FareType[]> {
  const data = await fetchMTAFares();
  return data.fares.filter(fare => fare.category === category);
}

export function calculatePassSavings(
  ridesPerDay: number,
  days: 7 | 30
): {
  payPerRide: number;
  unlimitedPass: number;
  savings: number;
  recommended: 'pay-per-ride' | 'unlimited';
} {
  const singleRidePrice = 2.90;
  const passPrice = days === 7 ? 34.00 : 132.00;
  const totalRides = ridesPerDay * days;
  const payPerRideTotal = totalRides * singleRidePrice;
  
  return {
    payPerRide: payPerRideTotal,
    unlimitedPass: passPrice,
    savings: Math.max(0, payPerRideTotal - passPrice),
    recommended: payPerRideTotal > passPrice ? 'unlimited' : 'pay-per-ride',
  };
}

export function getFareCapInfo() {
  return {
    weeklyCap: 34.00,
    ridesUntilCap: 12,
    description: 'Once you reach the cap, remaining rides that week are free',
  };
}
