import React, { createContext, useContext } from 'react';
import { useProfile } from './useProfile';

interface FarmContextType {
  farmOwnerId: string;
  farmDetails: any;
  loading: boolean;
}

const FarmContext = createContext<FarmContextType>({
  farmOwnerId: 'savanna_default_owner',
  farmDetails: {
    farmName: "SAVANNA FARM",
    location: "SAVANNA RIFT VALLEY",
    sizeAcres: 1200,
    primaryProduction: "Dairy Production",
    estimatedCattle: 450,
    waterSource: "Borehole",
    phone: "+254 700 123 456",
    ownerName: "SAVANNA OWNER",
    ownerPhone: "+254 700 123 456",
    ownerEmail: "owner@savanna.pro",
    ownerDesignation: "Farm Owner",
  },
  loading: true
});

export const FarmProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { profile, loading } = useProfile();

  const farmOwnerId = profile?.farmId || profile?.uid || 'savanna_default_owner';
  const farmDetails = profile?.farmDetails || {
    farmName: "SAVANNA FARM",
    location: "SAVANNA RIFT VALLEY",
    sizeAcres: 1200,
    primaryProduction: "Dairy Production",
    estimatedCattle: 450,
    waterSource: "Borehole",
    phone: "+254 700 123 456",
    ownerName: "SAVANNA OWNER",
    ownerPhone: "+254 700 123 456",
    ownerEmail: "owner@savanna.pro",
    ownerDesignation: "Farm Owner",
  };

  return (
    <FarmContext.Provider value={{ farmOwnerId, farmDetails, loading }}>
      {children}
    </FarmContext.Provider>
  );
};

export const useFarm = () => useContext(FarmContext);
