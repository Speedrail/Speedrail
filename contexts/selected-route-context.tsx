import { TransitRoute } from '@/services/google-maps-api';
import React, { createContext, ReactNode, useContext, useState } from 'react';

interface SelectedRouteContextType {
  selectedRoute: TransitRoute | null;
  setSelectedRoute: (route: TransitRoute | null) => void;
}

const SelectedRouteContext = createContext<SelectedRouteContextType | undefined>(undefined);

export function SelectedRouteProvider({ children }: { children: ReactNode }) {
  const [selectedRoute, setSelectedRoute] = useState<TransitRoute | null>(null);

  return (
    <SelectedRouteContext.Provider value={{ selectedRoute, setSelectedRoute }}>
      {children}
    </SelectedRouteContext.Provider>
  );
}

export function useSelectedRoute() {
  const context = useContext(SelectedRouteContext);
  if (context === undefined) {
    throw new Error('useSelectedRoute must be used within a SelectedRouteProvider');
  }
  return context;
}

