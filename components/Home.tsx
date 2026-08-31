import React from 'react';
import { AppMode } from '../types';
import { brandConfig } from '../config';
import { 
  Zap, 
  Sparkles, 
  Layers, 
  Target, 
  ArrowRight,
  RotateCw,
  Film,
  Users,
  FileText,
  Palette,
  Layout,
  MessageSquare,
  ShieldCheck,
  Cpu,
  Database,
  TrendingUp,
  Globe,
  Compass,
  BarChart3,
  CheckCircle2
} from 'lucide-react';
import { useCompanyContext } from '../context/CompanyContext';
import { useAppConfig } from '../context/AppConfigContext';

interface HomeProps {
  setMode: (mode: AppMode) => void;
  startupCheck?: any;
}

export const Home: React.FC<HomeProps> = ({ setMode, startupCheck: initialStartupCheck }) => {
  const { name } = useCompanyContext();
  const { config } = useAppConfig();
  const [startupCheck, setStartupCheck] = React.useState<any>(initialStartupCheck);
  const [checking, setChecking] = React.useState(false);
  const [bypass, setBypass] = React.useState(false);
  const companyName = config?.branding.companyName || name || 'Brand';
  const accentColor = config?.branding.colors.accent || '#1A73E8';

  React.useEffect(() => {
    if (initialStartupCheck) {
      setStartupCheck(initialStartupCheck);
    }
  }, [initialStartupCheck]);

  const runChecks = async () => {
    setChecking(true);
    try {
      const res = await fetch('/api/startup-checks');
      const data = await res.json();
      setStartupCheck(data);
    } catch (e) {
      console.error("Failed to run startup checks:", e);
    } finally {
      setChecking(false);
    }
  };

  const isSetupRequired = startupCheck && startupCheck.success === false && !bypass;

  // Setup Wizard Screen if initial GCP checks fail
  if (isSetupRequired) {
    const { checks } = startupCheck;
    return (
      <div className="max-w-5xl mx-auto px-4 py-12 animate-fadeIn">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-50 border border-amber-100 text-amber-800 font-semibold text-sm mb-6 shadow-xs animate-pulse">
            <Zap size={16} className="fill-amber-500 stroke-amber-600" />
            System Setup Required
          </div>
          <h1 className="text-4xl md:text-5xl font-black text-gray-900 tracking-tight mb-4">
            Configure Your AI Lab Workspace
          </h1>
          <p className="max-w-2xl mx-auto text-gray-600 leading-relaxed text-sm">
            Welcome to your containerized AI Lab environment. To unlock multimodal video pipelines and cloud persistence, please complete the startup checklist below.
          </p>
        </div>

        {/* Checklist Cards */}
        <div className="grid md:grid-cols-3 gap-6 mb-10">
          <div className={`p-6 rounded-2xl border bg-white shadow-xs flex flex-col h-full justify-between transition-all ${checks.gemini.status === 'failed' ? 'border-red-200' : 'border-green-200'}`}>
            <div>
              <div className="flex justify-between items-start mb-4">
                <div className={`px-2.5 py-1 rounded-md text-2xs font-extrabold tracking-wider uppercase ${checks.gemini.status === 'failed' ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
                  {checks.gemini.status === 'failed' ? 'Action Required' : 'Active'}
                </div>
                <Sparkles className={checks.gemini.status === 'failed' ? 'text-red-500' : 'text-green-500'} size={20} />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">Gemini API Activation</h3>
              <p className="text-xs text-gray-500 leading-relaxed mb-4 font-medium">{checks.gemini.message}</p>
            </div>
            {checks.gemini.status === 'failed' && (
              <div className="mt-auto">
                <span className="block text-3xs font-extrabold text-gray-400 uppercase mb-1 tracking-wider">Quick Fix</span>
                <code className="block p-2 bg-gray-50 border border-gray-200 text-2xs font-mono text-gray-700 rounded-lg select-all break-all">
                  export GEMINI_API_KEY="your_key"
                </code>
              </div>
            )}
          </div>

          <div className={`p-6 rounded-2xl border bg-white shadow-xs flex flex-col h-full justify-between transition-all ${checks.gcs.status === 'failed' ? 'border-red-200' : 'border-green-200'}`}>
            <div>
              <div className="flex justify-between items-start mb-4">
                <div className={`px-2.5 py-1 rounded-md text-2xs font-extrabold tracking-wider uppercase ${checks.gcs.status === 'failed' ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
                  {checks.gcs.status === 'failed' ? 'Action Required' : 'Active'}
                </div>
                <Layers className={checks.gcs.status === 'failed' ? 'text-red-500' : 'text-green-500'} size={20} />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">GCS Cloud Connection</h3>
              <p className="text-xs text-gray-500 leading-relaxed mb-4 font-medium">{checks.gcs.message}</p>
            </div>
            {checks.gcs.status === 'failed' && (
              <div className="mt-auto">
                <span className="block text-3xs font-extrabold text-gray-400 uppercase mb-1 tracking-wider">Authentication Command</span>
                <code className="block p-2 bg-gray-50 border border-gray-200 text-2xs font-mono text-gray-700 rounded-lg select-all break-all">
                  gcloud auth application-default login
                </code>
              </div>
            )}
          </div>

          <div className={`p-6 rounded-2xl border bg-white shadow-xs flex flex-col h-full justify-between transition-all ${checks.company.status === 'failed' ? 'border-amber-200' : 'border-green-200'}`}>
            <div>
              <div className="flex justify-between items-start mb-4">
                <div className={`px-2.5 py-1 rounded-md text-2xs font-extrabold tracking-wider uppercase ${checks.company.status === 'failed' ? 'bg-amber-50 text-amber-800' : 'bg-green-50 text-green-700'}`}>
                  {checks.company.status === 'failed' ? 'Recommended' : 'Tailored'}
                </div>
                <Target className={checks.company.status === 'failed' ? 'text-amber-600' : 'text-green-500'} size={20} />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">Active Brand Context</h3>
              <p className="text-xs text-gray-500 leading-relaxed mb-4 font-medium">{checks.company.message}</p>
            </div>
            {checks.company.status === 'failed' && (
              <div className="mt-auto">
                <button 
                  onClick={() => setMode(AppMode.ADMIN)} 
                  className="w-full py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl transition-colors shadow-xs flex items-center justify-center gap-1.5"
                >
                  Configure Branding <ArrowRight size={12} />
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center max-w-md mx-auto">
          <button
            onClick={runChecks}
            disabled={checking}
            className="w-full py-3 bg-[#1A73E8] hover:bg-[#1557b0] disabled:bg-blue-300 text-white font-bold rounded-xl transition-all shadow-xs flex items-center justify-center gap-2"
          >
            {checking ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white"></div>
                Re-running Checks...
              </>
            ) : (
              "Re-run System Checks"
            )}
          </button>
          <button
            onClick={() => setBypass(true)}
            className="w-full py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl transition-colors flex items-center justify-center gap-2 border border-gray-200 shadow-xs"
          >
            Enter Demo Sandbox Anyway
          </button>
        </div>
      </div>
    );
  }

  // 5 Conversational Chat Agents Catalog
  const capabilities = [
    {
      mode: AppMode.INSIGHTS,
      title: "Trends & Insights Conversational Agent",
      subtitle: "Multimodal Video & Market Intelligence",
      description: "Chat with the agent to evaluate YouTube ad commercials via ABCD framework, extract YouTube and Reddit comment sentiment, analyze landing pages, and generate cross-campaign intelligence reports.",
      icon: Sparkles,
      badge: "Interactive Agent",
      color: "from-blue-600 to-indigo-600"
    },
    {
      mode: AppMode.STRATEGIZE,
      title: "Strategize Conversational Agent",
      subtitle: "Synthetic Personas & Consumer Rituals",
      description: "Chat with the Strategize Agent to inspect calibrated synthetic personas (The Cultural Traditionalist, The Modern Mixologist, The Nostalgic Flavor Purist), conduct 1-on-1 interviews, and broadcast test messaging.",
      icon: Target,
      badge: "Strategy Agent",
      color: "from-purple-600 to-indigo-600"
    },
    {
      mode: AppMode.CREATIVE,
      title: "Creative Production Agent",
      subtitle: "Multi-Aspect Ratio Versioning & Video Editor",
      description: "Upload product or campaign visuals to generate 9 production aspect ratio variations (1:1, 16:9, 9:16, 4:3, etc.), edit images with prompts, and generate 5-step video storyboards.",
      icon: Palette,
      badge: "Creative Agent",
      color: "from-pink-600 to-rose-600"
    },
    {
      mode: AppMode.AUDIT_AGENT,
      title: "Audit Conversational Agent",
      subtitle: "Visual Scoring, Metadata & Creator Compliance",
      description: "Upload any marketing visual or product shot to evaluate visual hierarchy, packaging fidelity, lighting, and commercial polish with scorecards, pros/cons, and 10-point creator partner compliance checks.",
      icon: ShieldCheck,
      badge: "Audit Agent",
      color: "from-emerald-600 to-teal-600"
    },
    {
      mode: AppMode.ORCHESTRATION,
      title: "Campaign Orchestration Agent",
      subtitle: "Google Ads Campaign Builder & Editor Export",
      description: "Ask qualifying questions, ground strategies in synthetic personas, and generate character-bounded Responsive Search Ads, keywords with match types, sitelinks, audience signals, and Google Ads Editor CSV exports.",
      icon: Zap,
      badge: "Orchestration Agent",
      color: "from-amber-500 to-orange-600"
    }
  ];

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-12 animate-fadeIn">
      {/* Hero Welcome Header */}
      <div className="text-center space-y-4 max-w-3xl mx-auto pt-4">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-50 border border-blue-200 text-[#1A73E8] font-bold text-xs shadow-2xs">
          <Sparkles size={14} className="fill-[#1A73E8]" />
          Enterprise Multimodal Marketing Platform
        </div>
        <h1 className="text-4xl sm:text-5xl font-black text-gray-900 tracking-tight">
          Welcome to <span style={{ color: accentColor }}>{companyName} AI Lab</span>
        </h1>
        <p className="text-base text-gray-600 leading-relaxed">
          An end-to-end agentic marketing suite powered by Gemini 3.7 Flash multimodal intelligence. From market trend discovery and video ABCD scoring to synthetic persona testing and compliance auditing.
        </p>
        <div className="flex justify-center gap-3 pt-2">
          <button
            onClick={() => setMode(AppMode.INSIGHTS)}
            className="px-6 py-3 bg-[#1A73E8] hover:bg-[#1557b0] text-white font-bold text-sm rounded-2xl transition-all shadow-md flex items-center gap-2"
          >
            Launch Insights Chat Agent <ArrowRight size={16} />
          </button>
          <button
            onClick={() => setMode(AppMode.ADMIN)}
            className="px-5 py-3 bg-white hover:bg-gray-50 text-gray-700 font-bold text-sm rounded-2xl border border-gray-200 shadow-xs transition-colors"
          >
            Configure Brand Settings
          </button>
        </div>
      </div>

      {/* 4-Step Guided End-to-End Workflow */}
      <div className="bg-white border border-gray-200 rounded-3xl p-6 sm:p-8 shadow-xs">
        <h2 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
          <Compass size={20} className="text-[#1A73E8]" />
          The {companyName} AI Workflow Lifecycle
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="p-4 bg-gray-50 border border-gray-200 rounded-2xl space-y-2">
            <div className="w-7 h-7 rounded-xl bg-blue-100 text-[#1A73E8] flex items-center justify-center font-bold text-xs">1</div>
            <h3 className="font-bold text-gray-900 text-sm">Gather Insights</h3>
            <p className="text-xs text-gray-500 leading-relaxed">
              Analyze YouTube ads, comment sentiment, Reddit chatter, and emerging market trends.
            </p>
          </div>
          <div className="p-4 bg-gray-50 border border-gray-200 rounded-2xl space-y-2">
            <div className="w-7 h-7 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-xs">2</div>
            <h3 className="font-bold text-gray-900 text-sm">Personas & Brief</h3>
            <p className="text-xs text-gray-500 leading-relaxed">
              Resolve shopper profiles, generate synthetic personas, and construct strategic briefs.
            </p>
          </div>
          <div className="p-4 bg-gray-50 border border-gray-200 rounded-2xl space-y-2">
            <div className="w-7 h-7 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center font-bold text-xs">3</div>
            <h3 className="font-bold text-gray-900 text-sm">Produce & Tailor</h3>
            <p className="text-xs text-gray-500 leading-relaxed">
              Generate multichannel lifestyle media, video cut-downs, and 1-to-1 personalized copy.
            </p>
          </div>
          <div className="p-4 bg-gray-50 border border-gray-200 rounded-2xl space-y-2">
            <div className="w-7 h-7 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-xs">4</div>
            <h3 className="font-bold text-gray-900 text-sm">Test & Audit</h3>
            <p className="text-xs text-gray-500 leading-relaxed">
              Run simulated focus groups with personas and execute full cross-pipeline audits.
            </p>
          </div>
        </div>
      </div>

      {/* Grid of Capabilities */}
      <div className="space-y-4">
        <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
          <BarChart3 size={20} className="text-[#1A73E8]" />
          Platform Capabilities & Agent Modules
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {capabilities.map((cap, idx) => {
            const Icon = cap.icon;
            return (
              <div
                key={idx}
                onClick={() => setMode(cap.mode)}
                className="p-6 bg-white hover:bg-gray-50/80 border border-gray-200 hover:border-[#1A73E8] rounded-3xl transition-all duration-200 cursor-pointer shadow-xs hover:shadow-lg flex flex-col justify-between group h-full"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="p-3 rounded-2xl bg-gray-50 group-hover:bg-blue-50 text-[#1A73E8] transition-colors">
                      <Icon size={22} />
                    </div>
                    <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-gray-100 group-hover:bg-blue-100 text-gray-700 group-hover:text-[#1A73E8] transition-colors">
                      {cap.badge}
                    </span>
                  </div>

                  <div>
                    <h3 className="text-base font-bold text-gray-900 group-hover:text-[#1A73E8] transition-colors">
                      {cap.title}
                    </h3>
                    <p className="text-xs font-semibold text-gray-400 mt-0.5">{cap.subtitle}</p>
                  </div>

                  <p className="text-xs text-gray-600 leading-relaxed">
                    {cap.description}
                  </p>
                </div>

                <div className="pt-4 mt-2 border-t border-gray-100 flex items-center justify-between text-xs font-bold text-[#1A73E8]">
                  <span>Open Experience</span>
                  <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
