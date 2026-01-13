import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { useInteractionDensity, FocusState } from '@/hooks/useInteractionDensity';

export type SemanticMode = 'thinking' | 'scanning' | 'executing';

interface BackgroundContextType {
  semanticMode: SemanticMode;
  focusState: FocusState;
  setSemanticMode: (mode: SemanticMode) => void;
}

const BackgroundContext = createContext<BackgroundContextType | undefined>(undefined);

export const BackgroundProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [semanticMode, setSemanticMode] = useState<SemanticMode>('scanning');
  const { focusState } = useInteractionDensity();

  return (
    <BackgroundContext.Provider value={{ semanticMode, focusState, setSemanticMode }}>
      {children}
    </BackgroundContext.Provider>
  );
};

export const useBackground = () => {
  const context = useContext(BackgroundContext);
  if (!context) {
    throw new Error('useBackground must be used within a BackgroundProvider');
  }
  return context;
};
