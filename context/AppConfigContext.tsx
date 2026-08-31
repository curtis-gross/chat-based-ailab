import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export interface AppConfig {
  branding: {
    companyName: string;
    logo: string;
    colors: {
      primary: string;
      secondary: string;
      accent: string;
    };
    logoHeight?: number;
    metaTitle: string;
    industryType?: string;
  };
  navigation: {
    id: string;
    label: string;
    icon: string;
  }[];
  pages: {
    MARKETING_BRIEF?: {
      defaultGoal?: string;
      heroImage?: string;
    };
    CONTENT_STUDIO?: {
      primaryProductImage?: string;
      secondaryStyleReference?: string;
      multiImageReferences?: string[];
      productSpinReferences?: string[];
      contentVersioningReference?: string;
      sketchToRealityReference?: string;
      youtubeBannerTemplate?: string;
      disabledTabs?: string[];
      multiImagePersona?: string;
      multiImageProduct?: string;
      multiImageLocations?: string[];
    };
    [key: string]: any;
  };
  adAnalysisVideos?: {
    id: string;
    title: string;
    url: string;
    description: string;
  }[];
  metadataVideos?: {
    id: string;
    title: string;
    url: string;
    description: string;
  }[];
}

interface AppConfigContextType {
  config: AppConfig | null;
  updateConfig: (newConfig: AppConfig) => Promise<void>;
  isLoading: boolean;
  refreshConfig: () => Promise<void>;
}

const AppConfigContext = createContext<AppConfigContextType | undefined>(undefined);

export const AppConfigProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshConfig = async () => {
    try {
      const response = await fetch('/api/admin/config');
      if (response.ok) {
        const data = await response.json();
        setConfig(data);
      }
    } catch (e) {
      console.error("Error loading app config:", e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refreshConfig();
  }, []);

  const updateConfig = async (newConfig: AppConfig) => {
    try {
      const response = await fetch('/api/admin/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newConfig)
      });
      if (response.ok) {
        setConfig(newConfig);
      } else {
        throw new Error("Failed to save config");
      }
    } catch (e) {
      console.error("Error saving config:", e);
      throw e;
    }
  };

  return (
    <AppConfigContext.Provider value={{ config, updateConfig, isLoading, refreshConfig }}>
      {children}
    </AppConfigContext.Provider>
  );
};

export const useAppConfig = () => {
  const context = useContext(AppConfigContext);
  if (context === undefined) {
    throw new Error('useAppConfig must be used within an AppConfigProvider');
  }
  return context;
};
