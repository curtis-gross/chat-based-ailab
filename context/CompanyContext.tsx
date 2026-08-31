import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface CompanyContextType {
  name: string;
  description: string;
  setName: (name: string) => void;
  setDescription: (description: string) => void;
  saveContext: (name: string, description: string) => Promise<void>;
  loadLast: () => Promise<void>;
  isLoaded: boolean;
}

const CompanyContext = createContext<CompanyContextType | undefined>(undefined);

export const CompanyProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [name, setName] = useState<string>('');
  const [description, setDescription] = useState<string>('');

  const [isLoaded, setIsLoaded] = useState(false);

  // Load from filesystem on mount
  useEffect(() => {
    loadLast();
  }, []);

  const loadLast = async () => {
    try {
      const response = await fetch('/api/load-run/company_context');
      if (response.ok) {
        const data = await response.json();
        if (data.name) setName(data.name);
        if (data.description) setDescription(data.description);
      }
    } catch (e) {
      console.error("Error loading company context from filesystem:", e);
    } finally {
      setIsLoaded(true);
    }
  };

  const saveContext = async (newName: string, newDesc: string) => {
    try {
      const response = await fetch('/api/save-run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          featureId: 'company_context',
          data: { name: newName, description: newDesc }
        })
      });
      if (response.ok) {
        setName(newName);
        setDescription(newDesc);
      } else {
        throw new Error("Failed to save company context");
      }
    } catch (e) {
      console.error("Error saving company context to filesystem:", e);
      throw e;
    }
  };

  return (
    <CompanyContext.Provider value={{ 
      name, 
      description, 
      setName, 
      setDescription, 
      saveContext, 
      loadLast,
      isLoaded 
    }}>
      {children}
    </CompanyContext.Provider>
  );
};

export const useCompanyContext = () => {
  const context = useContext(CompanyContext);
  if (context === undefined) {
    throw new Error('useCompanyContext must be used within a CompanyProvider');
  }
  return context;
};
