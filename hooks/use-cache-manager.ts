import { cacheService } from '@/services/cache-service';
import { useEffect, useState } from 'react';
import { AppState, AppStateStatus } from 'react-native';

export function useCacheManager() {
  const [isInitialized, setIsInitialized] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const initializeCache = async () => {
      try {
        await cacheService.initialize();
        cacheService.backgroundRefreshIfNeeded();
        
        if (isMounted) {
          setIsInitialized(true);
        }
      } catch (error) {
        console.error('Failed to initialize cache:', error);
        if (isMounted) {
          setIsInitialized(true);
        }
      }
    };

    initializeCache();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    let isMounted = true;
    
    const handleAppStateChange = async (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active' && isInitialized && isMounted) {
        cacheService.backgroundRefreshIfNeeded();
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      isMounted = false;
      subscription.remove();
    };
  }, [isInitialized]);

  const manualRefresh = async () => {
    try {
      setIsRefreshing(true);
      await cacheService.fetchAndCacheAllStations();
    } catch (error) {
      console.error('Manual refresh failed:', error);
      throw error;
    } finally {
      setIsRefreshing(false);
    }
  };

  return {
    isInitialized,
    isRefreshing,
    manualRefresh,
  };
}
