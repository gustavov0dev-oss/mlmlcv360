import { createContext, useContext, useState, ReactNode } from 'react';

interface UIContextType {
  sidebarOpen: boolean;
  sidebarCollapsed: boolean;
  setSidebarOpen: (v: boolean) => void;
  setSidebarCollapsed: (v: boolean) => void;
  toggleSidebar: () => void;
}

const UIContext = createContext<UIContextType>({
  sidebarOpen: false, sidebarCollapsed: false,
  setSidebarOpen: () => {}, setSidebarCollapsed: () => {}, toggleSidebar: () => {},
});

export function UIProvider({ children }: { children: ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const toggleSidebar = () => setSidebarCollapsed(v => !v);

  return (
    <UIContext.Provider value={{ sidebarOpen, sidebarCollapsed, setSidebarOpen, setSidebarCollapsed, toggleSidebar }}>
      {children}
    </UIContext.Provider>
  );
}

export function useUIStore() {
  return useContext(UIContext);
}
