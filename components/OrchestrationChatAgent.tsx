import React, { useState, useEffect, useRef } from 'react';
import { 
  Workflow, 
  Send, 
  Plus, 
  Sparkles, 
  CheckCircle2, 
  AlertCircle, 
  RotateCw, 
  Loader2, 
  ChevronRight, 
  Table, 
  Search, 
  RefreshCw, 
  Save, 
  Download, 
  Copy, 
  Check, 
  Eye, 
  Target, 
  DollarSign, 
  Sliders, 
  Layers, 
  History, 
  X, 
  Smartphone, 
  Monitor, 
  Tag, 
  ExternalLink, 
  Zap, 
  ArrowRight, 
  Users, 
  ShieldCheck, 
  Flame, 
  Palette,
  TrendingUp
} from 'lucide-react';
import { 
  AppMode, 
  CombinedPersona, 
  GoogleAdsCampaignPackage, 
  GoogleAdsAdGroup, 
  GoogleAdsKeyword, 
  GoogleAdsAdAsset 
} from '../types';
import { useCompanyContext } from '../context/CompanyContext';
import { useAppConfig } from '../context/AppConfigContext';
import { 
  DEFAULT_WSI_GENERATED_PERSONAS, 
  DEFAULT_STANDARD_PERSONAS 
} from './StrategyChatAgent';
import { WSI_SYNTHETIC_DATASET, WSI_DATASET_SUMMARY } from '../data/wsiDataset';
import { generateGoogleAdsCampaign } from '../services/geminiService';

export interface OrchestrationChatMessage {
  id: string;
  sender: 'user' | 'orchestrator';
  text: string;
  timestamp: string;
  options?: Array<{ label: string; action: () => void; icon?: string }>;
  campaignPackage?: GoogleAdsCampaignPackage;
  isThinking?: boolean;
  error?: string;
}

interface OrchestrationChatAgentProps {
  personas?: CombinedPersona[];
  setPersonas?: React.Dispatch<React.SetStateAction<CombinedPersona[]>>;
  onNavigateToMode?: (mode: AppMode) => void;
}

export const OrchestrationChatAgent: React.FC<OrchestrationChatAgentProps> = ({
  personas = [],
  setPersonas,
  onNavigateToMode
}) => {
  const { name: companyContextName } = useCompanyContext();
  const { config } = useAppConfig();
  const activeBrandName = companyContextName || config?.branding?.companyName || 'WSI (Williams-Sonoma)';

  // Chat State
  const [messages, setMessages] = useState<OrchestrationChatMessage[]>([]);
  const [inputPrompt, setInputPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Active Campaign & View State
  const [activeCampaign, setActiveCampaign] = useState<GoogleAdsCampaignPackage | null>(null);
  const [activeTab, setActiveTab] = useState<'ads' | 'keywords' | 'extensions' | 'audiences' | 'mockup'>('ads');
  const [selectedAdGroupFilter, setSelectedAdGroupFilter] = useState<string>('all');
  const [previewDevice, setPreviewDevice] = useState<'mobile' | 'desktop'>('desktop');
  const [previewHeadlineIdx, setPreviewHeadlineIdx] = useState(0);

  // History & Storage
  const [savedRuns, setSavedRuns] = useState<Array<{ id: string; timestamp: string; campaignName: string; budget: number }>>([]);
  const [showHistoryDrawer, setShowHistoryDrawer] = useState(false);
  const [lastSavedTime, setLastSavedTime] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Active target personas to pull from
  const effectivePersonas = personas.length > 0 ? personas : DEFAULT_WSI_GENERATED_PERSONAS;

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  // Initial welcome message
  useEffect(() => {
    if (messages.length === 0) {
      initWelcomeChat();
    }
  }, []);

  const initWelcomeChat = () => {
    const welcomeMsg: OrchestrationChatMessage = {
      id: 'welcome_msg',
      sender: 'orchestrator',
      text: `Hello! I am the **Campaign Orchestration Agent** for **${activeBrandName}**.\n\nI synthesize your brand's synthetic personas (*The Heirloom Culinary Traditionalist*, *The Aesthetic Host & Mixologist*, *The Gourmet Kitchen Purist*, and baseline controls) with retail telemetry to architect complete, ready-to-execute **Google Ads Campaigns**.\n\nSelect an instant campaign preset below, or describe your marketing objective:`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      options: [
        {
          label: '🍳 Heirloom Dutch Oven & Cookware ($250/day)',
          action: () => handleExecutePreset('cookware')
        },
        {
          label: '☕ Smart Electrics & Espresso ($200/day)',
          action: () => handleExecutePreset('espresso')
        },
        {
          label: '🍷 Tabletop & Modern Entertaining ($150/day)',
          action: () => handleExecutePreset('entertaining')
        },
        {
          label: '🎯 Omnichannel Registry & Luxury Portfolio ($500/day)',
          action: () => handleExecutePreset('fullportfolio')
        }
      ]
    };
    setMessages([welcomeMsg]);
  };

  // Copy helper
  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Preset dispatcher
  const handleExecutePreset = (presetType: 'cookware' | 'espresso' | 'entertaining' | 'fullportfolio') => {
    let promptText = '';
    let productFocus = '';
    let budgetDaily = 250;
    let monthlyBudget = 7500;
    let geo = 'California, New York, Texas, Illinois, Florida, Massachusetts, Washington';
    let goal = '';

    switch (presetType) {
      case 'cookware':
        promptText = 'Build a Google Ads Search & Performance Max campaign for Williams-Sonoma Signature Cast Iron & Thermo-Clad Cookware targeting Heirloom Home Chefs with a $250/day budget.';
        productFocus = 'Le Creuset Signature Round Dutch Oven and Williams-Sonoma Thermo-Clad 10-Piece Cookware Set';
        budgetDaily = 250;
        monthlyBudget = 7500;
        goal = 'High-Intent Heirloom Cookware Search & Le Creuset Dutch Oven Positioning';
        break;
      case 'espresso':
        promptText = 'Build a Google Ads Search & Shopping campaign for Breville Smart Espresso Machines & Vitamix Blenders targeting Gourmet Kitchen Purists with a $200/day budget.';
        productFocus = 'Breville Barista Touch Impress Espresso Machine and Vitamix A3500 Smart Blender';
        budgetDaily = 200;
        monthlyBudget = 6000;
        goal = 'Precision Kitchen Electrics Trial & Espresso Machine Upgrade Cycle';
        break;
      case 'entertaining':
        promptText = 'Build a Google Ads campaign for Williams-Sonoma Dorset Crystal Glassware, Marble Bar Carts, and Artisan Pantry Gifting targeting Entertaining Hosts with a $150/day budget.';
        productFocus = 'Dorset Crystal Cocktail Coupes, Marble Entertaining Trays, and Williams-Sonoma Reserve Olive Oil';
        budgetDaily = 150;
        monthlyBudget = 4500;
        goal = 'Entertaining & Bar-Cart Discovery with Aesthetic Home Styling';
        break;
      case 'fullportfolio':
      default:
        promptText = 'Build a comprehensive 3-AdGroup Google Ads campaign covering Cookware, Precision Electrics, and Tabletop Entertaining across all 3 synthetic segments.';
        productFocus = 'Full Williams-Sonoma Portfolio (Le Creuset, Thermo-Clad, Breville, Dorset Glassware, Peppermint Bark)';
        budgetDaily = 500;
        monthlyBudget = 15000;
        goal = 'Omnichannel Category Dominance & Wedding Registry Acquisition';
        break;
    }

    // Append user message
    const userMsg: OrchestrationChatMessage = {
      id: `user_${Date.now()}`,
      sender: 'user',
      text: promptText,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    setMessages(prev => [...prev, userMsg]);

    executeCampaignGeneration({
      productFocus,
      budgetDaily,
      monthlyBudget,
      geoFocus: geo,
      campaignGoal: goal,
      userCustomInstructions: promptText
    });
  };

  // Main execution
  const executeCampaignGeneration = async (params: {
    productFocus: string;
    budgetDaily: number;
    monthlyBudget: number;
    geoFocus: string;
    campaignGoal: string;
    userCustomInstructions?: string;
  }) => {
    setIsLoading(true);
    setLoadingStep('1/4: Analyzing synthetic personas & purchase triggers...');

    const thinkingMsgId = `thinking_${Date.now()}`;
    const thinkingMsg: OrchestrationChatMessage = {
      id: thinkingMsgId,
      sender: 'orchestrator',
      text: `Synthesizing campaign for **${activeBrandName}**...\n- Product Focus: *${params.productFocus}*\n- Daily Budget: *$${params.budgetDaily}/day* ($${params.monthlyBudget.toLocaleString()}/mo)\n- Grounded in 3 calibrated personas: *The Heirloom Culinary Traditionalist*, *The Aesthetic Host & Mixologist*, *The Gourmet Kitchen Purist*.`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      isThinking: true
    };
    setMessages(prev => [...prev, thinkingMsg]);

    try {
      setLoadingStep('2/4: Grounding in Williams-Sonoma telemetry & luxury cookware conquesting...');
      await new Promise(r => setTimeout(r, 600));

      setLoadingStep('3/4: Drafting 15 RSA headlines (≤30 char) & match-typed keywords...');
      
      const campaignPkg = await generateGoogleAdsCampaign({
        brandContext: activeBrandName,
        productFocus: params.productFocus,
        budgetDaily: params.budgetDaily,
        monthlyBudget: params.monthlyBudget,
        geoFocus: params.geoFocus,
        campaignGoal: params.campaignGoal,
        userCustomInstructions: params.userCustomInstructions,
        targetPersonas: effectivePersonas.map(p => ({
          name: p.name,
          personaName: p.personaName,
          coreValues: p.coreValues || p.status,
          whatTheyWant: (p as any).whatTheyWant || p.bioLifestyleNeeds,
          competitorBrands: (p as any).competitorBrands || ['Sur La Table', 'Crate & Barrel', 'Le Creuset'],
          recommendedProducts: (p as any).recommendedProducts || ['Williams-Sonoma Thermo-Clad Set', 'Le Creuset Dutch Oven'],
          ageRange: (p as any).ageRange || '28-60',
          incomeRange: (p as any).incomeRange || '$85,000 - $250,000+',
          lifestyle: p.bioLifestyleNeeds,
          keyCharacteristics: (p as any).keyCharacteristics
        }))
      });

      setLoadingStep('4/4: Validating Google Ads Editor schema and saving to GCS...');
      setActiveCampaign(campaignPkg);

      // Auto-save to GCS
      await autoSaveCampaign(campaignPkg);

      // Replace thinking message with final package
      const finalMsg: OrchestrationChatMessage = {
        id: `campaign_${Date.now()}`,
        sender: 'orchestrator',
        text: `### Google Ads Campaign Architecture Ready! 🎯\n\nI have structured **${campaignPkg.campaignName}** across **${campaignPkg.adGroups.length} specialized Ad Groups**, complete with character-verified headlines (≤30 chars), descriptions (≤90 chars), match-typed keywords, sitelinks, and audience signals.\n\nExplore the interactive table below or download the **Google Ads Editor CSV** for 1-click import:`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        campaignPackage: campaignPkg
      };

      setMessages(prev => prev.filter(m => m.id !== thinkingMsgId).concat(finalMsg));
    } catch (err: any) {
      console.error('Campaign generation failed:', err);
      const errorMsg: OrchestrationChatMessage = {
        id: `err_${Date.now()}`,
        sender: 'orchestrator',
        text: `### ⚠️ Campaign Generation Failed\n\n**Error:** ${err?.message || 'Unknown network or Gemini API error.'}\n\nPlease check your internet connection or try again:`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        error: String(err?.message || err),
        options: [
          {
            label: '🔄 Retry Campaign Generation',
            action: () => executeCampaignGeneration(params)
          },
          {
            label: '📂 Load Cached WSI Campaign Run',
            action: () => handleLoadLastRun()
          }
        ]
      };
      setMessages(prev => prev.filter(m => m.id !== thinkingMsgId).concat(errorMsg));
    } finally {
      setIsLoading(false);
      setLoadingStep('');
    }
  };

  // Manual send prompt handler
  const handleSendMessage = (textToSend?: string) => {
    const text = (textToSend || inputPrompt).trim();
    if (!text || isLoading) return;

    const userMsg: OrchestrationChatMessage = {
      id: `user_${Date.now()}`,
      sender: 'user',
      text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    setMessages(prev => [...prev, userMsg]);
    setInputPrompt('');

    // Parse input or run dynamic generation
    let budgetDaily = 150;
    let monthlyBudget = 4500;
    const budgetMatch = text.match(/\$?(\d+[\d,]*)\s*(k|thousand|\/mo|\/day|dollars)?/i);
    if (budgetMatch) {
      const val = parseInt(budgetMatch[1].replace(/,/g, ''), 10);
      if (val > 1000) {
        monthlyBudget = val;
        budgetDaily = Math.round(val / 30);
      } else if (val > 0) {
        budgetDaily = val;
        monthlyBudget = val * 30;
      }
    }

    executeCampaignGeneration({
      productFocus: text.toLowerCase().includes('cookware') ? 'Williams-Sonoma Thermo-Clad Cookware' : text.toLowerCase().includes('espresso') ? 'Breville Smart Espresso Machines' : 'Williams-Sonoma Heirloom Cookware & Tabletop',
      budgetDaily,
      monthlyBudget,
      geoFocus: 'Top Metro & Culinary Markets (CA, NY, TX, IL, FL, MA, WA)',
      campaignGoal: 'Google Search & PMax Conversion Drive',
      userCustomInstructions: text
    });
  };

  // GCS Save
  const autoSaveCampaign = async (pkg: GoogleAdsCampaignPackage) => {
    try {
      const res = await fetch('/api/save-run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          featureId: 'orchestration_campaign_run',
          companyName: activeBrandName,
          data: {
            campaign: pkg,
            savedAt: new Date().toISOString()
          }
        })
      });
      if (res.ok) {
        setLastSavedTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
      }
    } catch (e) {
      console.warn('Could not auto-save orchestration campaign to GCS:', e);
    }
  };

  // Load Last Run from GCS / Local
  const handleLoadLastRun = async () => {
    setIsLoading(true);
    setLoadingStep('Loading last saved campaign run from storage...');
    try {
      const res = await fetch(`/api/load-run/orchestration_campaign_run?companyName=${encodeURIComponent(activeBrandName)}`);
      let data: any = null;
      if (res.ok) {
        data = await res.json();
      }

      // Fallback to static seed if needed
      if (!data || !data.campaign) {
        const seedRes = await fetch('/data/configuration/runs/Williams_Sonoma/orchestration_campaign_run.json');
        if (seedRes.ok) {
          data = await seedRes.json();
        }
      }

      if (data && data.campaign) {
        const loadedCampaign = data.campaign as GoogleAdsCampaignPackage;
        setActiveCampaign(loadedCampaign);
        setLastSavedTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));

        const loadedMsg: OrchestrationChatMessage = {
          id: `loaded_${Date.now()}`,
          sender: 'orchestrator',
          text: `### Restored Previous Campaign Run 💾\n\nSuccessfully loaded **${loadedCampaign.campaignName}** from storage.\n- Daily Budget: **$${loadedCampaign.dailyBudget}/day** ($${loadedCampaign.monthlyBudget.toLocaleString()}/mo)\n- Ad Groups: **${loadedCampaign.adGroups.length} groups**\n- Grounded Segments: *${loadedCampaign.personasInvolved.join(', ')}*`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          campaignPackage: loadedCampaign
        };
        setMessages(prev => [...prev, loadedMsg]);
      } else {
        alert('No previous campaign run found in storage.');
      }
    } catch (e) {
      console.error('Failed to load last campaign run:', e);
      alert('Could not load campaign run. Check console logs.');
    } finally {
      setIsLoading(false);
      setLoadingStep('');
    }
  };

  // CSV Export for Google Ads Editor
  const handleExportCSV = () => {
    if (!activeCampaign) return;

    const rows: string[][] = [
      // Standard Google Ads Editor CSV Header
      ['Campaign', 'Ad Group', 'Keyword', 'Criterion Type', 'Headline 1', 'Headline 2', 'Headline 3', 'Description 1', 'Description 2', 'Final URL', 'Campaign Daily Budget', 'Bid Strategy Type']
    ];

    // For each Ad Group, output keywords and Responsive Search Ads
    activeCampaign.adGroups.forEach(ag => {
      const h1 = ag.headlines[0]?.text || '';
      const h2 = ag.headlines[1]?.text || '';
      const h3 = ag.headlines[2]?.text || '';
      const d1 = ag.descriptions[0]?.text || '';
      const d2 = ag.descriptions[1]?.text || '';
      const finalUrl = 'https://www.williams-sonoma.com';

      // 1. Output the Ad record
      rows.push([
        activeCampaign.campaignName,
        ag.name,
        '', // Keyword blank for ad row
        '', // Criterion Type blank
        `"${h1.replace(/"/g, '""')}"`,
        `"${h2.replace(/"/g, '""')}"`,
        `"${h3.replace(/"/g, '""')}"`,
        `"${d1.replace(/"/g, '""')}"`,
        `"${d2.replace(/"/g, '""')}"`,
        finalUrl,
        activeCampaign.dailyBudget.toString(),
        activeCampaign.biddingStrategy
      ]);

      // 2. Output each Keyword row
      ag.keywords.forEach(kw => {
        rows.push([
          activeCampaign.campaignName,
          ag.name,
          `"${kw.keyword.replace(/"/g, '""')}"`,
          kw.matchType,
          '', '', '', '', '', '', '', ''
        ]);
      });
    });

    const csvContent = rows.map(r => r.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `google_ads_${activeBrandName.toLowerCase()}_campaign.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Copy for Google Ads Editor (TSV format)
  const handleCopyForEditor = () => {
    if (!activeCampaign) return;

    const tsvHeaders = ['Campaign', 'Ad Group', 'Keyword', 'Criterion Type', 'Headline 1', 'Headline 2', 'Headline 3', 'Description 1', 'Description 2', 'Final URL'];
    const lines: string[] = [tsvHeaders.join('\t')];

    activeCampaign.adGroups.forEach(ag => {
      const h1 = ag.headlines[0]?.text || '';
      const h2 = ag.headlines[1]?.text || '';
      const h3 = ag.headlines[2]?.text || '';
      const d1 = ag.descriptions[0]?.text || '';
      const d2 = ag.descriptions[1]?.text || '';
      const url = 'https://www.williams-sonoma.com';

      // Ad row
      lines.push([activeCampaign.campaignName, ag.name, '', '', h1, h2, h3, d1, d2, url].join('\t'));

      // Keyword rows
      ag.keywords.forEach(kw => {
        lines.push([activeCampaign.campaignName, ag.name, kw.keyword, kw.matchType, '', '', '', '', '', ''].join('\t'));
      });
    });

    handleCopy(lines.join('\n'), 'editor_tsv');
  };

  // Filter Ad Groups
  const filteredAdGroups = activeCampaign 
    ? (selectedAdGroupFilter === 'all' 
        ? activeCampaign.adGroups 
        : activeCampaign.adGroups.filter(ag => ag.id === selectedAdGroupFilter))
    : [];

  return (
    <div className="flex flex-col h-[calc(100vh-5rem)] max-w-7xl mx-auto bg-gray-50/50 rounded-2xl border border-gray-200 overflow-hidden shadow-xs">
      
      {/* Top Orchestration Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-600 to-amber-500 flex items-center justify-center text-white shadow-sm">
            <Workflow size={22} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-gray-900 tracking-tight">Campaign Orchestration Agent</h1>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-200">
                <Sparkles size={11} /> Gemini 3.7 Flash
              </span>
            </div>
            <p className="text-xs text-gray-500">
              Google Ads Campaign Architecture • Grounded in {activeBrandName} Personas & Telemetry
            </p>
          </div>
        </div>

        {/* Header Actions */}
        <div className="flex items-center gap-2">
          {lastSavedTime && (
            <span className="hidden sm:inline-flex items-center gap-1 text-xs text-emerald-600 font-medium mr-2">
              <CheckCircle2 size={13} /> Saved {lastSavedTime}
            </span>
          )}

          <button
            onClick={handleLoadLastRun}
            disabled={isLoading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 text-xs font-semibold text-gray-700 transition-colors shadow-2xs"
            title="Load most recent campaign run from GCS"
          >
            <RotateCw size={13} className={isLoading ? "animate-spin" : ""} />
            Load Last Run
          </button>

          <button
            onClick={() => {
              setActiveCampaign(null);
              setMessages([]);
              setTimeout(initWelcomeChat, 50);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 text-xs font-semibold text-gray-700 transition-colors shadow-2xs"
          >
            <RefreshCw size={13} />
            New Campaign
          </button>
        </div>
      </header>

      {/* Main Workspace Layout */}
      <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">
        
        {/* Chat History Messages */}
        {messages.map((msg) => (
          <div key={msg.id} className="space-y-4">
            {/* User Message */}
            {msg.sender === 'user' ? (
              <div className="flex justify-end">
                <div className="max-w-2xl bg-amber-700 text-white rounded-2xl rounded-tr-xs px-5 py-3 shadow-xs text-sm leading-relaxed">
                  <p className="font-medium">{msg.text}</p>
                  <span className="block text-right text-[10px] text-amber-200 mt-1">{msg.timestamp}</span>
                </div>
              </div>
            ) : (
              /* Orchestrator Message */
              <div className="flex gap-3 max-w-4xl">
                <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center shrink-0 mt-1">
                  <Workflow size={18} />
                </div>
                <div className="flex-1 space-y-4">
                  <div className="bg-white border border-gray-200 rounded-2xl rounded-tl-xs p-5 shadow-xs text-sm text-gray-800 leading-relaxed">
                    
                    {/* Markdown / Text */}
                    <div className="prose prose-sm max-w-none prose-headings:text-gray-900 prose-headings:font-bold">
                      {msg.text.split('\n').map((line, idx) => {
                        if (line.startsWith('### ')) {
                          return <h3 key={idx} className="text-base font-bold text-gray-900 mt-3 mb-2">{line.replace('### ', '')}</h3>;
                        }
                        if (line.startsWith('- ')) {
                          return <li key={idx} className="ml-4 list-disc text-gray-700">{line.replace('- ', '')}</li>;
                        }
                        if (line.trim() === '') return <br key={idx} />;
                        return <p key={idx} className="mb-2">{line}</p>;
                      })}
                    </div>

                    {/* Thinking Progress Bar */}
                    {msg.isThinking && (
                      <div className="mt-4 p-3 bg-amber-50 rounded-xl border border-amber-200 flex items-center gap-3">
                        <Loader2 size={18} className="animate-spin text-amber-700" />
                        <div>
                          <span className="text-xs font-bold text-amber-900">{loadingStep || 'Processing campaign architecture...'}</span>
                          <p className="text-[11px] text-amber-700">Synthesizing Google Ads parameters & synthetic persona vectors</p>
                        </div>
                      </div>
                    )}

                    {/* Quick Preset Action Chips */}
                    {msg.options && msg.options.length > 0 && !isLoading && (
                      <div className="mt-4 pt-3 border-t border-gray-100 space-y-2">
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Fast-Track Campaign Presets:</p>
                        <div className="flex flex-wrap gap-2">
                          {msg.options.map((opt, oIdx) => (
                            <button
                              key={oIdx}
                              onClick={opt.action}
                              className="px-3 py-2 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200/80 text-xs font-semibold transition-all flex items-center gap-1.5 shadow-2xs hover:shadow-xs active:scale-98"
                            >
                              <Zap size={13} className="text-amber-600" />
                              {opt.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    <span className="block text-right text-[10px] text-gray-400 mt-2">{msg.timestamp}</span>
                  </div>

                  {/* If this message contains a generated campaign package, render the interactive table card */}
                  {msg.campaignPackage && (
                    <div className="animate-fadeIn">
                      {/* Campaign Summary Banner */}
                      <div className="bg-gradient-to-r from-amber-800 to-amber-900 rounded-2xl p-5 text-white shadow-md mb-4">
                        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-amber-700/60 pb-4">
                          <div>
                            <span className="text-[10px] font-bold uppercase tracking-widest text-amber-300">Active Google Ads Campaign</span>
                            <h2 className="text-xl font-black tracking-tight">{msg.campaignPackage.campaignName}</h2>
                          </div>
                          
                          {/* Action Buttons */}
                          <div className="flex items-center gap-2">
                            <button
                              onClick={handleCopyForEditor}
                              className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white border border-white/20 text-xs font-semibold transition-all flex items-center gap-1.5"
                              title="Copy Tab-Separated Values for Google Ads Editor Paste (Ctrl+Shift+I)"
                            >
                              {copiedId === 'editor_tsv' ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
                              {copiedId === 'editor_tsv' ? 'Copied for Editor!' : 'Copy for Ads Editor'}
                            </button>

                            <button
                              onClick={handleExportCSV}
                              className="px-3.5 py-1.5 rounded-lg bg-amber-400 hover:bg-amber-300 text-amber-950 font-bold text-xs transition-all flex items-center gap-1.5 shadow-xs"
                              title="Download complete Google Ads Editor compatible CSV"
                            >
                              <Download size={13} />
                              Export CSV
                            </button>
                          </div>
                        </div>

                        {/* Telemetry Metrics Row */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 text-xs">
                          <div>
                            <span className="text-amber-300 block font-medium">Daily Budget</span>
                            <span className="text-base font-bold">${msg.campaignPackage.dailyBudget.toFixed(2)}/day</span>
                            <span className="text-[10px] text-amber-200 block">(${msg.campaignPackage.monthlyBudget.toLocaleString()}/mo)</span>
                          </div>
                          <div>
                            <span className="text-amber-300 block font-medium">Bidding Strategy</span>
                            <span className="text-sm font-semibold">{msg.campaignPackage.biddingStrategy}</span>
                          </div>
                          <div>
                            <span className="text-amber-300 block font-medium">Target Geos</span>
                            <span className="text-sm font-semibold truncate block">{msg.campaignPackage.targetGeos.join(', ')}</span>
                          </div>
                          <div>
                            <span className="text-amber-300 block font-medium">Ad Groups</span>
                            <span className="text-base font-bold">{msg.campaignPackage.adGroups.length} Calibrated</span>
                          </div>
                        </div>

                        {/* Strategic Rationale */}
                        <div className="mt-3 pt-3 border-t border-amber-700/40 text-xs text-amber-100 flex items-start gap-2">
                          <Target size={14} className="text-amber-300 shrink-0 mt-0.5" />
                          <p><strong className="text-white">Persona Rationale:</strong> {msg.campaignPackage.strategicRationale}</p>
                        </div>
                      </div>

                      {/* Interactive Tabs Card */}
                      <div className="bg-white border border-gray-200 rounded-2xl shadow-xs overflow-hidden">
                        
                        {/* Tab Bar Navigation */}
                        <div className="flex flex-wrap items-center justify-between border-b border-gray-200 bg-gray-50/70 px-4 pt-2">
                          <div className="flex gap-1 overflow-x-auto pb-2">
                            <button
                              onClick={() => setActiveTab('ads')}
                              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                                activeTab === 'ads' 
                                  ? 'bg-amber-600 text-white shadow-2xs' 
                                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                              }`}
                            >
                              <Table size={13} />
                              Responsive Ads & Copy ({msg.campaignPackage.adGroups.reduce((acc, g) => acc + g.headlines.length, 0)} Headlines)
                            </button>

                            <button
                              onClick={() => setActiveTab('keywords')}
                              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                                activeTab === 'keywords' 
                                  ? 'bg-amber-600 text-white shadow-2xs' 
                                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                              }`}
                            >
                              <Search size={13} />
                              Keywords & Match Types ({msg.campaignPackage.adGroups.reduce((acc, g) => acc + g.keywords.length, 0)})
                            </button>

                            <button
                              onClick={() => setActiveTab('extensions')}
                              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                                activeTab === 'extensions' 
                                  ? 'bg-amber-600 text-white shadow-2xs' 
                                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                              }`}
                            >
                              <Layers size={13} />
                              Extensions & Assets
                            </button>

                            <button
                              onClick={() => setActiveTab('audiences')}
                              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                                activeTab === 'audiences' 
                                  ? 'bg-amber-600 text-white shadow-2xs' 
                                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                              }`}
                            >
                              <Users size={13} />
                              Audience Signals ({msg.campaignPackage.audienceSignals.length})
                            </button>

                            <button
                              onClick={() => setActiveTab('mockup')}
                              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                                activeTab === 'mockup' 
                                  ? 'bg-amber-600 text-white shadow-2xs' 
                                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                              }`}
                            >
                              <Eye size={13} />
                              Live SERP Preview
                            </button>
                          </div>

                          {/* Ad Group Selector Filter */}
                          <div className="flex items-center gap-2 pb-2">
                            <span className="text-[11px] font-semibold text-gray-500">Ad Group:</span>
                            <select
                              value={selectedAdGroupFilter}
                              onChange={e => setSelectedAdGroupFilter(e.target.value)}
                              className="text-xs bg-white border border-gray-200 rounded-lg px-2.5 py-1 text-gray-800 font-medium focus:ring-2 focus:ring-amber-500"
                            >
                              <option value="all">All Ad Groups ({msg.campaignPackage.adGroups.length})</option>
                              {msg.campaignPackage.adGroups.map(ag => (
                                <option key={ag.id} value={ag.id}>{ag.name}</option>
                              ))}
                            </select>
                          </div>
                        </div>

                        {/* TAB 1: Responsive Ads & Copy Table */}
                        {activeTab === 'ads' && (
                          <div className="p-4 space-y-6">
                            {filteredAdGroups.map(ag => (
                              <div key={ag.id} className="border border-gray-200 rounded-xl overflow-hidden shadow-2xs">
                                
                                {/* Ad Group Header */}
                                <div className="bg-amber-50/70 border-b border-gray-200 px-4 py-3 flex flex-wrap items-center justify-between gap-2">
                                  <div>
                                    <div className="flex items-center gap-2">
                                      <h4 className="font-bold text-sm text-gray-900">{ag.name}</h4>
                                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-200 text-amber-900">
                                        Target: {ag.targetPersona}
                                      </span>
                                    </div>
                                    <p className="text-xs text-gray-600 mt-0.5">{ag.coreAngle}</p>
                                  </div>

                                  <div className="text-right text-xs">
                                    <span className="text-gray-500 block text-[10px]">Target CPA Bid</span>
                                    <span className="font-bold text-amber-800">{ag.recommendedBidCpa}</span>
                                  </div>
                                </div>

                                {/* Headlines Subtable */}
                                <div className="p-3">
                                  <h5 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-2 flex items-center justify-between">
                                    <span>Headlines (Max 30 Chars)</span>
                                    <span className="text-[11px] font-normal text-gray-400">Strict Google Ads Compliance</span>
                                  </h5>

                                  <div className="overflow-x-auto">
                                    <table className="w-full text-xs text-left">
                                      <thead className="bg-gray-50 text-gray-500 border-y border-gray-100 font-semibold">
                                        <tr>
                                          <th className="py-2 px-3">#</th>
                                          <th className="py-2 px-3">Headline Copy</th>
                                          <th className="py-2 px-3 text-center">Chars</th>
                                          <th className="py-2 px-3 text-center">Pin</th>
                                          <th className="py-2 px-3">Persona Trigger</th>
                                          <th className="py-2 px-3 text-right">Action</th>
                                        </tr>
                                      </thead>
                                      <tbody className="divide-y divide-gray-100">
                                        {ag.headlines.map((h, hIdx) => {
                                          const isNearMax = h.charCount >= 28;
                                          return (
                                            <tr key={hIdx} className="hover:bg-gray-50/80 transition-colors">
                                              <td className="py-2 px-3 text-gray-400 font-mono text-[11px]">{hIdx + 1}</td>
                                              <td className="py-2 px-3 font-medium text-gray-900">
                                                {h.text}
                                              </td>
                                              <td className="py-2 px-3 text-center">
                                                <span className={`inline-block px-1.5 py-0.5 rounded font-mono text-[10px] font-bold ${
                                                  h.charCount > 30 
                                                    ? 'bg-red-100 text-red-700' 
                                                    : isNearMax 
                                                      ? 'bg-amber-100 text-amber-800' 
                                                      : 'bg-emerald-50 text-emerald-700'
                                                }`}>
                                                  {h.charCount}/30
                                                </span>
                                              </td>
                                              <td className="py-2 px-3 text-center">
                                                <span className="px-1.5 py-0.5 rounded bg-gray-100 text-gray-600 font-mono text-[10px]">
                                                  {h.pinnedPosition === 'any' ? 'Unpinned' : `Pos ${h.pinnedPosition}`}
                                                </span>
                                              </td>
                                              <td className="py-2 px-3 text-gray-500">
                                                <span className="inline-flex items-center gap-1 text-[11px]">
                                                  <Tag size={10} className="text-amber-600" />
                                                  {h.personaAlignment}
                                                </span>
                                              </td>
                                              <td className="py-2 px-3 text-right">
                                                <button
                                                  onClick={() => handleCopy(h.text, `hl_${ag.id}_${hIdx}`)}
                                                  className="p-1 rounded hover:bg-gray-200 text-gray-500 hover:text-gray-900 transition-colors"
                                                  title="Copy headline"
                                                >
                                                  {copiedId === `hl_${ag.id}_${hIdx}` ? <Check size={13} className="text-emerald-600" /> : <Copy size={13} />}
                                                </button>
                                              </td>
                                            </tr>
                                          );
                                        })}
                                      </tbody>
                                    </table>
                                  </div>

                                  {/* Descriptions Subtable */}
                                  <h5 className="text-xs font-bold uppercase tracking-wider text-gray-500 mt-4 mb-2">
                                    Descriptions (Max 90 Chars)
                                  </h5>
                                  <div className="overflow-x-auto">
                                    <table className="w-full text-xs text-left">
                                      <thead className="bg-gray-50 text-gray-500 border-y border-gray-100 font-semibold">
                                        <tr>
                                          <th className="py-2 px-3">#</th>
                                          <th className="py-2 px-3">Description Copy</th>
                                          <th className="py-2 px-3 text-center">Chars</th>
                                          <th className="py-2 px-3">Persona Target</th>
                                          <th className="py-2 px-3 text-right">Action</th>
                                        </tr>
                                      </thead>
                                      <tbody className="divide-y divide-gray-100">
                                        {ag.descriptions.map((d, dIdx) => (
                                          <tr key={dIdx} className="hover:bg-gray-50/80 transition-colors">
                                            <td className="py-2 px-3 text-gray-400 font-mono text-[11px]">{dIdx + 1}</td>
                                            <td className="py-2 px-3 text-gray-800 leading-relaxed font-medium">
                                              {d.text}
                                            </td>
                                            <td className="py-2 px-3 text-center">
                                              <span className={`inline-block px-1.5 py-0.5 rounded font-mono text-[10px] font-bold ${
                                                d.charCount > 90 ? 'bg-red-100 text-red-700' : 'bg-emerald-50 text-emerald-700'
                                              }`}>
                                                {d.charCount}/90
                                              </span>
                                            </td>
                                            <td className="py-2 px-3 text-gray-500">
                                              <span className="text-[11px]">{d.personaAlignment}</span>
                                            </td>
                                            <td className="py-2 px-3 text-right">
                                              <button
                                                onClick={() => handleCopy(d.text, `desc_${ag.id}_${dIdx}`)}
                                                className="p-1 rounded hover:bg-gray-200 text-gray-500 hover:text-gray-900 transition-colors"
                                                title="Copy description"
                                              >
                                                {copiedId === `desc_${ag.id}_${dIdx}` ? <Check size={13} className="text-emerald-600" /> : <Copy size={13} />}
                                              </button>
                                            </td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  </div>

                                </div>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* TAB 2: Keywords & Match Types Table */}
                        {activeTab === 'keywords' && (
                          <div className="p-4 space-y-6">
                            {filteredAdGroups.map(ag => (
                              <div key={ag.id} className="border border-gray-200 rounded-xl overflow-hidden shadow-2xs">
                                
                                <div className="bg-amber-50/70 border-b border-gray-200 px-4 py-2.5 flex items-center justify-between">
                                  <h4 className="font-bold text-sm text-gray-900">{ag.name} — Keywords</h4>
                                  <span className="text-xs text-gray-500">{ag.keywords.length} Target Keywords</span>
                                </div>

                                <div className="overflow-x-auto">
                                  <table className="w-full text-xs text-left">
                                    <thead className="bg-gray-50 text-gray-500 border-b border-gray-200 font-semibold">
                                      <tr>
                                        <th className="py-2.5 px-4">Formatted Keyword</th>
                                        <th className="py-2.5 px-3">Match Type</th>
                                        <th className="py-2.5 px-3">Search Intent</th>
                                        <th className="py-2.5 px-3">Avg Est. CPC</th>
                                        <th className="py-2.5 px-3">Search Volume</th>
                                        <th className="py-2.5 px-3">Persona Alignment Trigger</th>
                                        <th className="py-2.5 px-4 text-right">Copy</th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                      {ag.keywords.map((kw, kIdx) => (
                                        <tr key={kIdx} className="hover:bg-gray-50/80 transition-colors">
                                          <td className="py-2.5 px-4 font-mono font-bold text-gray-900">
                                            {kw.formattedText}
                                          </td>
                                          <td className="py-2.5 px-3">
                                            <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                              kw.matchType === 'Exact' 
                                                ? 'bg-purple-100 text-purple-800' 
                                                : kw.matchType === 'Phrase' 
                                                  ? 'bg-blue-100 text-blue-800' 
                                                  : 'bg-gray-100 text-gray-700'
                                            }`}>
                                              {kw.matchType}
                                            </span>
                                          </td>
                                          <td className="py-2.5 px-3 font-medium text-gray-700">
                                            <span className={`inline-block px-2 py-0.5 rounded text-[10px] ${
                                              kw.searchIntent === 'Competitor Conquesting'
                                                ? 'bg-rose-100 text-rose-800 font-bold'
                                                : kw.searchIntent === 'Transactional'
                                                  ? 'bg-emerald-100 text-emerald-800 font-bold'
                                                  : 'bg-gray-100 text-gray-700'
                                            }`}>
                                              {kw.searchIntent}
                                            </span>
                                          </td>
                                          <td className="py-2.5 px-3 font-mono font-semibold text-gray-900">
                                            {kw.estimatedCpc}
                                          </td>
                                          <td className="py-2.5 px-3 text-gray-500 text-[11px]">
                                            {kw.monthlyVolumeTier}
                                          </td>
                                          <td className="py-2.5 px-3 text-gray-600">
                                            {kw.personaTrigger}
                                          </td>
                                          <td className="py-2.5 px-4 text-right">
                                            <button
                                              onClick={() => handleCopy(kw.formattedText, `kw_${ag.id}_${kIdx}`)}
                                              className="p-1 rounded hover:bg-gray-200 text-gray-500 hover:text-gray-900 transition-colors"
                                              title="Copy keyword syntax"
                                            >
                                              {copiedId === `kw_${ag.id}_${kIdx}` ? <Check size={13} className="text-emerald-600" /> : <Copy size={13} />}
                                            </button>
                                          </td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>

                                {/* Negative Keywords */}
                                {ag.negativeKeywords && ag.negativeKeywords.length > 0 && (
                                  <div className="bg-red-50/50 border-t border-gray-200 p-3 text-xs flex items-center gap-2">
                                    <span className="font-bold text-red-800 shrink-0">Negative Keywords:</span>
                                    <div className="flex flex-wrap gap-1.5">
                                      {ag.negativeKeywords.map((neg, nIdx) => (
                                        <span key={nIdx} className="px-2 py-0.5 rounded bg-white text-red-700 border border-red-200 text-[11px] font-mono">
                                          -{neg}
                                        </span>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}

                        {/* TAB 3: Extensions & Assets */}
                        {activeTab === 'extensions' && (
                          <div className="p-4 space-y-6">
                            {/* Sitelinks */}
                            <div className="border border-gray-200 rounded-xl p-4">
                              <h4 className="font-bold text-sm text-gray-900 mb-3 flex items-center gap-2">
                                <ExternalLink size={14} className="text-amber-600" /> Sitelink Assets (Max 25 char link / 35 char lines)
                              </h4>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {msg.campaignPackage.sitelinks.map((sl, slIdx) => (
                                  <div key={slIdx} className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-xs space-y-1">
                                    <div className="flex items-center justify-between">
                                      <span className="font-bold text-blue-700 text-sm hover:underline cursor-pointer">{sl.linkText}</span>
                                      <span className="text-[10px] text-gray-400 font-mono">{sl.linkText.length}/25</span>
                                    </div>
                                    <p className="text-gray-600">{sl.line1}</p>
                                    <p className="text-gray-500">{sl.line2}</p>
                                    <span className="text-[10px] text-gray-400 block truncate">{sl.url}</span>
                                  </div>
                                ))}
                              </div>
                            </div>

                            {/* Callouts */}
                            <div className="border border-gray-200 rounded-xl p-4">
                              <h4 className="font-bold text-sm text-gray-900 mb-3">Callout Extensions (Max 25 char)</h4>
                              <div className="flex flex-wrap gap-2">
                                {msg.campaignPackage.callouts.map((c, cIdx) => (
                                  <span key={cIdx} className="px-3 py-1.5 rounded-lg bg-gray-50 border border-gray-200 text-xs font-semibold text-gray-800 flex items-center gap-1.5">
                                    <CheckCircle2 size={12} className="text-emerald-600" />
                                    {c}
                                    <span className="text-[10px] text-gray-400 font-mono ml-1">({c.length}/25)</span>
                                  </span>
                                ))}
                              </div>
                            </div>

                            {/* Structured Snippets */}
                            <div className="border border-gray-200 rounded-xl p-4">
                              <h4 className="font-bold text-sm text-gray-900 mb-2">Structured Snippet: {msg.campaignPackage.structuredSnippets.header}</h4>
                              <div className="flex flex-wrap gap-2">
                                {msg.campaignPackage.structuredSnippets.values.map((v, vIdx) => (
                                  <span key={vIdx} className="px-2.5 py-1 rounded bg-amber-50 border border-amber-200 text-xs font-medium text-amber-900">
                                    {v}
                                  </span>
                                ))}
                              </div>
                            </div>
                          </div>
                        )}

                        {/* TAB 4: Audience Signals */}
                        {activeTab === 'audiences' && (
                          <div className="p-4">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                              {msg.campaignPackage.audienceSignals.map((aud, aIdx) => (
                                <div key={aIdx} className="bg-gray-50 border border-gray-200 rounded-xl p-4 space-y-2">
                                  <div className="flex items-center justify-between">
                                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-900">
                                      {aud.category}
                                    </span>
                                    <span className="text-[11px] text-gray-500 font-medium">Mapped to: {aud.personaLink}</span>
                                  </div>
                                  <h5 className="font-bold text-sm text-gray-900">{aud.name}</h5>
                                  <p className="text-xs text-gray-600 leading-relaxed">{aud.details}</p>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* TAB 5: Live Google SERP Mockup */}
                        {activeTab === 'mockup' && (
                          <div className="p-6 bg-gray-100 flex flex-col items-center">
                            
                            {/* Device Switcher */}
                            <div className="flex items-center gap-2 mb-6 bg-white p-1 rounded-xl border border-gray-200 shadow-2xs">
                              <button
                                onClick={() => setPreviewDevice('desktop')}
                                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                                  previewDevice === 'desktop' ? 'bg-amber-600 text-white' : 'text-gray-600 hover:bg-gray-100'
                                }`}
                              >
                                <Monitor size={14} /> Desktop SERP
                              </button>
                              <button
                                onClick={() => setPreviewDevice('mobile')}
                                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                                  previewDevice === 'mobile' ? 'bg-amber-600 text-white' : 'text-gray-600 hover:bg-gray-100'
                                }`}
                              >
                                <Smartphone size={14} /> Mobile SERP
                              </button>
                            </div>

                            {/* Google SERP Simulated Container */}
                            <div className={`bg-white rounded-2xl border border-gray-300 shadow-sm p-6 transition-all ${
                              previewDevice === 'mobile' ? 'max-w-sm w-full' : 'max-w-2xl w-full'
                            }`}>
                              
                              {/* Sponsored Label & Display URL */}
                              <div className="flex items-center gap-2 mb-1">
                                <span className="font-bold text-xs text-gray-900">Sponsored</span>
                                <span className="text-gray-400 text-xs">•</span>
                                <div className="flex items-center gap-1 text-xs text-gray-600">
                                  <div className="w-4 h-4 rounded-full bg-slate-900 text-white text-[9px] flex items-center justify-center font-bold">W</div>
                                  <span className="font-medium text-gray-800">Williams-Sonoma</span>
                                  <span className="text-gray-400">https://www.williams-sonoma.com/official</span>
                                </div>
                              </div>

                              {/* Google Ads Dynamic Headline */}
                              <h3 className="text-lg text-[#1a0dab] hover:underline cursor-pointer font-medium leading-snug">
                                {msg.campaignPackage.adGroups[0]?.headlines[0]?.text || 'Williams-Sonoma Official'} | {msg.campaignPackage.adGroups[0]?.headlines[1]?.text || 'Heirloom Cookware & Luxury Kitchenware'} | Official Store
                              </h3>

                              {/* Description Snippet */}
                              <p className="text-sm text-[#4d5156] mt-1.5 leading-relaxed">
                                {msg.campaignPackage.adGroups[0]?.descriptions[0]?.text || 'Discover heirloom cookware, artisan cutlery, and luxury kitchen electrics. Free shipping on eligible orders.'}
                              </p>

                              {/* Callouts inline */}
                              <div className="flex flex-wrap gap-2 text-xs text-gray-500 mt-2 font-medium">
                                {msg.campaignPackage.callouts.slice(0, 3).map((c, idx) => (
                                  <span key={idx}>• {c}</span>
                                ))}
                              </div>

                              {/* Sitelinks 2x2 Grid */}
                              <div className="grid grid-cols-2 gap-3 mt-4 pt-3 border-t border-gray-100">
                                {msg.campaignPackage.sitelinks.slice(0, 4).map((sl, sIdx) => (
                                  <div key={sIdx} className="space-y-0.5">
                                    <span className="text-xs font-medium text-[#1a0dab] hover:underline cursor-pointer block">{sl.linkText}</span>
                                    <span className="text-[11px] text-[#4d5156] block">{sl.line1}</span>
                                  </div>
                                ))}
                              </div>

                            </div>

                            {/* Handoff to Creative Agent */}
                            {onNavigateToMode && (
                              <div className="mt-6 flex items-center gap-3">
                                <button
                                  onClick={() => onNavigateToMode(AppMode.CREATIVE)}
                                  className="px-4 py-2 rounded-xl bg-pink-50 hover:bg-pink-100 text-pink-700 border border-pink-200 text-xs font-bold transition-all flex items-center gap-2 shadow-2xs"
                                >
                                  <Palette size={14} />
                                  Generate Matching Creative Assets in Creative Agent
                                  <ArrowRight size={13} />
                                </button>
                              </div>
                            )}

                          </div>
                        )}

                      </div>
                    </div>
                  )}

                </div>
              </div>
            )}
          </div>
        ))}

        <div ref={messagesEndRef} />
      </div>

      {/* Bottom Conversational Input Bar */}
      <div className="p-4 bg-white border-t border-gray-200">
        <div className="max-w-4xl mx-auto flex items-center gap-2 bg-gray-50 border border-gray-300 rounded-2xl px-4 py-2 focus-within:ring-2 focus-within:ring-amber-500 focus-within:border-amber-500 transition-all shadow-2xs">
          
          <input
            type="text"
            value={inputPrompt}
            onChange={e => setInputPrompt(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage();
              }
            }}
            placeholder="Ask the Orchestration Agent (e.g. 'Build a $20k Paloma Search campaign targeting young mixologists in Austin')..."
            className="flex-1 bg-transparent text-sm text-gray-900 placeholder-gray-500 focus:outline-none"
            disabled={isLoading}
          />

          <button
            onClick={() => handleSendMessage()}
            disabled={!inputPrompt.trim() || isLoading}
            className="w-8 h-8 rounded-xl bg-amber-600 hover:bg-amber-700 disabled:bg-gray-200 text-white flex items-center justify-center transition-all shrink-0 shadow-2xs disabled:cursor-not-allowed"
            title="Send Campaign Request"
          >
            {isLoading ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
          </button>
        </div>

        {/* Footnote on Synthetic Grounding */}
        <p className="text-[11px] text-center text-gray-400 mt-2">
          Grounded in {activeBrandName} Synthetic Dataset (Mateo Alvarez, Sofia Ramirez, Gary Miller) & Baseline Controls
        </p>
      </div>

    </div>
  );
};
