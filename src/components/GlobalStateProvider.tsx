"use client";

import { createContext, useContext, useState, useEffect } from "react";
import LoadingScreen from "./LoadingScreen";

interface GlobalStateContextType {
  isLoading: boolean;
  setIsLoading: (v: boolean) => void;
}

const GlobalStateContext = createContext<GlobalStateContextType | undefined>(undefined);

export function GlobalStateProvider({ children }: { children: React.ReactNode }) {
  // Let initial loading state be true to simulate Phase 0 connection/auth resolution
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Simulate initial loading sequence
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 2000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <GlobalStateContext.Provider value={{ isLoading, setIsLoading }}>
      <LoadingScreen isLoading={isLoading} />
      {children}
    </GlobalStateContext.Provider>
  );
}

export const useGlobalState = () => {
  const context = useContext(GlobalStateContext);
  if (!context) throw new Error("useGlobalState must be used within GlobalStateProvider");
  return context;
};
