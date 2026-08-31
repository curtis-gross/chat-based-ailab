import React, { useState, useEffect } from 'react';
import { brandConfig } from './config';
import { AppMode, CombinedPersona } from './types';
import { Navigation } from './components/Navigation';
import { Home } from './components/Home';
import { CompanyContext } from './components/CompanyContext';
import { InsightsChatAgent } from './components/InsightsChatAgent';
import { StrategyChatAgent } from './components/StrategyChatAgent';
import { CreativeChatAgent } from './components/CreativeChatAgent';
import { AuditChatAgent } from './components/AuditChatAgent';
import { OrchestrationChatAgent } from './components/OrchestrationChatAgent';
import { Admin } from './components/Admin';
import { AppConfigProvider, useAppConfig } from './context/AppConfigContext';
import { CompanyProvider } from './context/CompanyContext';

function App() {
  return (
    <AppConfigProvider>
      <CompanyProvider>
        <AppContent />
      </CompanyProvider>
    </AppConfigProvider>
  );
}

function AppContent() {
  const [mode, setMode] = useState<AppMode>(AppMode.HOME);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [personas, setPersonas] = useState<CombinedPersona[]>([]);
  const { config } = useAppConfig();
  const [startupCheck, setStartupCheck] = useState<any>(null);

  useEffect(() => {
    // Fetch startup checks on application load
    fetch('/api/startup-checks')
      .then(res => res.json())
      .then(data => {
        console.log("[AppContent] Startup checks completed:", data);
        setStartupCheck(data);
      })
      .catch(err => console.error("Failed to load startup checks:", err));
  }, []);

  useEffect(() => {
    if (config?.branding?.companyName) {
      document.title = config.branding.companyName;
    } else {
      document.title = brandConfig.meta.title;
    }

    // Load audiences from the file system explicitly if they exist
    const loadAudiences = async () => {
      try {
        const res = await fetch('/api/load-run/audience_generator');
        if (res.ok) {
          const data = await res.json();
          if (data.personas && Array.isArray(data.personas)) {
            setPersonas(data.personas);
          }
        }
      } catch (err) {
        console.warn("No saved audience run found, starting empty.", err);
      }
    };
    loadAudiences();
  }, [config]);

  const renderContent = () => {
    switch (mode) {
      case AppMode.INSIGHTS:
        return <InsightsChatAgent onNavigateToFullAnalysis={() => setMode(AppMode.INSIGHTS)} />;
      case AppMode.STRATEGIZE:
        return <StrategyChatAgent personas={personas} setPersonas={setPersonas} />;
      case AppMode.CREATIVE:
        return <CreativeChatAgent />;
      case AppMode.AUDIT_AGENT:
        return <AuditChatAgent />;
      case AppMode.ORCHESTRATION:
        return <OrchestrationChatAgent personas={personas} setPersonas={setPersonas} onNavigateToMode={setMode} />;
      case AppMode.COMPANY_CONTEXT:
        return <CompanyContext />;
      case AppMode.ADMIN:
        return <Admin />;
      case AppMode.HOME:
      default:
        return <Home setMode={setMode} startupCheck={startupCheck} />;
    }
  };

  return (
    <div className="app-container font-sans">
      <Navigation
        currentMode={mode}
        setMode={setMode}
        isMobileMenuOpen={isMobileMenuOpen}
        setIsMobileMenuOpen={setIsMobileMenuOpen}
      />

      <main className="main-content p-4 md:p-8 transition-all duration-300 mt-16 md:mt-0">
        {renderContent()}
      </main>
    </div>
  );
}

export default App;
