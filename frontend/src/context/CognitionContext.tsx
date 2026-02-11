import React, { createContext, useContext, type ReactNode } from 'react';
import { useCognition } from '../hooks/useCognition';

type CognitionContextType = ReturnType<typeof useCognition>;

const CognitionContext = createContext<CognitionContextType | undefined>(undefined);

export const CognitionProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const cognition = useCognition();
  return (
    <CognitionContext.Provider value={cognition}>
      {children}
    </CognitionContext.Provider>
  );
};

export const useCognitionContext = () => {
  const context = useContext(CognitionContext);
  if (context === undefined) {
    throw new Error('useCognitionContext must be used within a CognitionProvider');
  }
  return context;
};
