import React, { useState, useEffect, useRef } from 'react';
import { 
  Target, 
  Send, 
  Plus, 
  Users, 
  Database, 
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
  Lightbulb, 
  TrendingUp, 
  DollarSign, 
  Flame, 
  ArrowRight,
  Heart,
  Compass,
  FileText,
  Layers,
  ShoppingBag,
  MessageSquare,
  ThumbsUp,
  ThumbsDown,
  Quote,
  Radio,
  Eye,
  History,
  X,
  ImageIcon,
  Trash2,
  MessageCircle,
  ShieldCheck,
  Star,
  Pin,
  Pencil,
  Check
} from 'lucide-react';
import { CombinedPersona, PersonaPsychographics } from '../types';
import { useCompanyContext } from '../context/CompanyContext';
import { useAppConfig } from '../context/AppConfigContext';
import { 
  SQUIRT_SYNTHETIC_DATASET, 
  SQUIRT_DATASET_SUMMARY, 
  SquirtConsumerRecord,
  DR_PEPPER_SYNTHETIC_DATASET 
} from '../data/squirtDataset';
import { 
  callGenAiProxy, 
  extractTextFromResponse, 
  safeJsonParse, 
  groundedSearch,
  generateImage,
  urlToRawBase64
} from '../services/geminiService';

// Default 3 Standard Personas (Optimist, Pessimist, Neutral)
export const DEFAULT_STANDARD_PERSONAS = [
  {
    id: 'default_optimist',
    name: 'The Enthusiastic Optimist',
    personaName: 'Joy Sun',
    status: 'Baseline Control: Optimist',
    lifeEvent: 'Flavor Explorer & Early Adopter',
    location: 'Austin, TX (US Metro)',
    financialHealth: 'Discretionary Spender',
    familySize: 'Young Professional / Roommates',
    bioLifestyleNeeds: 'Enthusiastic and eager to explore refreshing citrus cocktails and trending summer spritzers. Passionate about authentic Mexican Palomas, joyful outdoor gatherings, and uplifting brand energy.',
    coreValues: 'Positivity, Delight, Fun Social Experiences',
    nba: 'Target with seasonal cocktail recipes, Squirt Ruby Red drops, and backyard fiesta inspiration.',
    imagePrompt: 'Smiling cheerful 26-year-old woman holding a refreshing glass of iced Squirt Paloma with lime garnish in bright natural daylight',
    type: 'default_optimist',
    isStandard: true,
    psychographics: {
      personalityTraits: ['Trend-Seeker', 'Social Host', 'Paloma Crafter', 'Joyful Explorer'],
      beverageRituals: 'Weekend afternoon Paloma ritual; custom mixes Squirt Original Grapefruit Soda with tequila blanco, fresh lime juice, and a chili-lime salt rim.',
      flavorAffinity: 'Squirt Original Citrus, Squirt Ruby Red, Mexican Glass Bottle Real Sugar',
      sugarPreference: 'Mixes Both (Flavor-first indulger)',
      shoppingValues: 'Impulse buyer driven by aesthetic cocktail photography, authentic Mexican pairings, and refreshing citrus flavors.',
      mediaHabits: 'TikTok, Instagram Reels, Food & Beverage Podcasts'
    }
  },
  {
    id: 'default_pessimist',
    name: 'The Skeptical Critic',
    personaName: 'Arthur Vance',
    status: 'Baseline Control: Pessimist',
    lifeEvent: 'Quality & Value Guardrail',
    location: 'San Diego, CA (Suburban)',
    financialHealth: 'Value-Conscious Skeptic',
    familySize: 'Mature Household',
    bioLifestyleNeeds: 'Critical consumer who rejects overly sweet sodas and synthetic diet claims. Demands real grapefruit citrus concentrate, zero sugar crashes, and clear value-per-ounce.',
    coreValues: 'Transparency, Authentic Ingredients, Honest Pricing',
    nba: 'Emphasize real citrus concentrate quality, crisp zero-sugar taste, and clean label transparency.',
    imagePrompt: 'Thoughtful serious 52-year-old man inspecting an ice-cold can of Squirt Zero Sugar in everyday modern kitchen setting',
    type: 'default_pessimist',
    isStandard: true,
    psychographics: {
      personalityTraits: ['Discerning Traditionalist', 'Quality Guardrail', 'Value-Conscious', 'Analytical'],
      beverageRituals: 'Daily lunchtime 12 oz can with a grilled chicken salad; strictly drinks ice-cold Squirt Zero Sugar with real citrus bite.',
      flavorAffinity: 'Squirt Zero Sugar, Squirt Original Grapefruit',
      sugarPreference: 'Zero Sugar (Health-conscious & avoids sugar crashes)',
      shoppingValues: 'Seeks bulk club pack value, discounts, and rejects cloying artificial sweeteners.',
      mediaHabits: 'Local News, YouTube Hardware/Repair, Financial Newsletters'
    }
  },
  {
    id: 'default_generalist',
    name: 'The Mainstream Neutral',
    personaName: 'Sam Taylor',
    status: 'Baseline Control: Neutral',
    lifeEvent: 'Convenience Habit',
    location: 'Denver, CO (Suburban)',
    financialHealth: 'Everyday Pragmatist',
    familySize: 'Family of 3',
    bioLifestyleNeeds: 'Everyday casual consumer who drinks what is convenient and familiar. Balances price, taste, and accessibility across grocery stores, gas stations, and drive-thrus.',
    coreValues: 'Convenience, Value for Money, Familiar Flavor',
    nba: 'Ensure frictionless store availability and eye-level shelf placement in grocery beverage aisles.',
    imagePrompt: 'Friendly 35-year-old casual consumer in comfortable weekend casual attire enjoying a cold Squirt soda',
    type: 'default_generalist',
    isStandard: true,
    psychographics: {
      personalityTraits: ['Pragmatic Routine-Seeker', 'Convenience-Driven', 'Family-Focused', 'Easygoing'],
      beverageRituals: 'Weekend family cookouts and road trip gas station grab-and-go 20 oz bottles.',
      flavorAffinity: 'Squirt Original Citrus Grapefruit, Squirt Ruby Red',
      sugarPreference: 'Original Full Sugar',
      shoppingValues: 'Buys 12-packs on grocery multi-buy sales; loyal to reliable thirst-quenching taste.',
      mediaHabits: 'Live Sports, Streaming Video, Suburban Community Groups'
    }
  }
];

// Default 3 Generated Personas for Squirt (Cultural Traditionalist, Modern Mixologist, Nostalgic Flavor Purist)
export const DEFAULT_SQUIRT_GENERATED_PERSONAS = [
  {
    id: 'squirt_gen_traditionalist',
    name: 'The Cultural Traditionalist',
    personaName: 'Mateo Alvarez',
    status: 'Core Anchor: Cultural Traditionalist',
    lifeEvent: 'Multi-generational Family Cookouts & Heritage Celebrations',
    location: 'El Paso, TX (Bilingual Metro)',
    financialHealth: '$40,000 – $85,000 (Value-Conscious Household)',
    ageRange: '21–45',
    incomeRange: '$40,000 – $85,000',
    familySize: 'Multi-generational Household (5)',
    coreValues: 'Cultural continuity, family gathering, authentic heritage',
    whatTheyWant: 'Familiar, authentic staples that pair naturally with traditional food and family celebrations',
    competitorBrands: ['Jarritos Toronja', 'Fresca', 'Peñafiel'],
    recommendedProducts: ['Squirt Original (2L, 12-pack cans)', 'Mexican Squirt (glass bottle with real sugar)'],
    keyCharacteristics: 'High brand loyalty, high household penetration in Hispanic communities, pantry staple',
    brandEngagement: 'High',
    bioLifestyleNeeds: 'Multi-generational home and festive gathering coordinator. Values cultural continuity, family gatherings, and authentic heritage. Needs value-pack bulk availability and cultural resonance. Treats Squirt as an essential pantry staple for Sunday carne asadas, tamale making, and holiday fiestas where it pairs naturally with traditional Latin food.',
    nba: 'Promote multi-pack value deals, Hispanic heritage cookout co-promotions, and Mexican glass bottle displays at local grocers.',
    imagePrompt: 'Photorealistic warm portrait headshot of a smiling 32-year-old Hispanic man holding a chilled glass bottle of Mexican Squirt at a sunny backyard family barbecue cookout, natural sunlight, 4k commercial photography',
    isStandard: false,
    psychographics: {
      personalityTraits: ['Family Anchor', 'Heritage Foodie', 'Loyal Purchaser', 'Social Host'],
      beverageRituals: 'Pantry-stocks 12-packs and 2-liter bottles for weekend cookouts; enjoys an ice-cold Mexican Squirt with lime alongside spicy homemade meals.',
      flavorAffinity: 'Mexican Squirt (Real Sugar Glass Bottle), Squirt Original Grapefruit Soda',
      sugarPreference: 'Original Full Sugar',
      shoppingValues: 'Bulk multi-buy value, authentic glass packaging, and consistent real citrus taste.',
      mediaHabits: 'Facebook family groups, Spanish-language radio, YouTube cooking channels'
    }
  },
  {
    id: 'squirt_gen_mixologist',
    name: 'The Modern Mixologist',
    personaName: 'Sofia Ramirez',
    status: 'Trend Elevator: Modern Mixologist',
    lifeEvent: 'Aesthetic Hosting & Home Cocktail Discovery',
    location: 'Austin, TX (Urban / Sunbelt)',
    financialHealth: '$75,000 – $140,000+ (Discretionary Spender)',
    ageRange: '24–38',
    incomeRange: '$75,000 – $140,000+',
    familySize: 'Young Professional Couple',
    coreValues: 'Elevating social experiences, culinary discovery, aesthetic hosting',
    whatTheyWant: 'Premium yet unpretentious mixer with real grapefruit bite for cocktails (e.g., Palomas)',
    competitorBrands: ['Fever-Tree Pink Grapefruit', 'Q Mixers', 'Topo Chico', 'Fresca Mixed'],
    recommendedProducts: ['Squirt Zero Sugar', 'Ruby Red Squirt', 'Squirt 7.5 oz mini-cans'],
    keyCharacteristics: 'High digital engagement, social sharer (TikTok/Instagram), cocktail-led consumption',
    brandEngagement: 'Medium (High potential via automated dynamic creative)',
    bioLifestyleNeeds: 'Urban/suburban socializer and DIY home bartender. Seeks to elevate social experiences through culinary discovery and aesthetic hosting. Needs cocktail recipes, sleek packaging, and bar-cart aesthetics. Uses Squirt Zero Sugar and Ruby Red as a premium yet unpretentious mixer with real grapefruit bite for handcrafted Palomas.',
    nba: 'Deploy dynamic cocktail video ads, 7.5 oz mini-can bar cart bundles, and influencer Paloma masterclasses on Instagram and TikTok.',
    imagePrompt: 'Chic photorealistic portrait of a stylish 28-year-old woman garnishing an artisanal iced Squirt Paloma cocktail with a fresh ruby grapefruit slice on a modern sunlit patio bar, cinematic aesthetic, golden hour glow',
    isStandard: false,
    psychographics: {
      personalityTraits: ['Social Explorer', 'Cocktail Enthusiast', 'Aesthetic Creator', 'Digital Trendsetter'],
      beverageRituals: 'Friday night happy hours and weekend rooftop cocktail gatherings; shakes or builds Palomas with Squirt Zero Sugar, fresh lime, and sea salt rims.',
      flavorAffinity: 'Squirt Zero Sugar, Squirt Ruby Red, Squirt 7.5 oz Mini-Cans',
      sugarPreference: 'Zero Sugar (Loves flavor without caloric load)',
      shoppingValues: 'Sleek mini-can packaging, premium mixology credentials, and visual bar-cart appeal.',
      mediaHabits: 'Instagram Reels, TikTok food & drink trends, Spotify curated playlists'
    }
  },
  {
    id: 'squirt_gen_purist',
    name: 'The Nostalgic Flavor Purist',
    personaName: 'Gary Miller',
    status: 'Brand Loyalist: Nostalgic Purist',
    lifeEvent: 'Routine-Driven Everyday Refreshment',
    location: 'Columbus, OH (Midwest Suburban)',
    financialHealth: '$45,000 – $95,000 (Practical Budgeter)',
    ageRange: '35–60+',
    incomeRange: '$45,000 – $95,000',
    familySize: 'Married with Grown Children',
    coreValues: 'Comfort in timeless taste, anti-trend reliability, no-nonsense refreshment',
    whatTheyWant: 'Crisp, tart, thirst-quenching citrus flavor that stays consistent over decades',
    competitorBrands: ['Fresca', 'Sun Drop', 'Mountain Dew', 'Sprite'],
    recommendedProducts: ['Squirt Original', 'Squirt Zero Sugar (12-pack, 20 oz bottles)'],
    keyCharacteristics: 'Moderate media consumption, habitual repeat purchaser in traditional retail',
    brandEngagement: 'High',
    bioLifestyleNeeds: 'Practical, routine-driven consumer who has enjoyed Squirt for over 30 years. Seeks comfort in timeless taste, anti-trend reliability, and no-nonsense refreshment. Needs reliable local distribution in supermarkets and C-stores for crisp, tart, thirst-quenching citrus flavor that stays consistent over decades.',
    nba: 'Reinforce reliable retail distribution in supermarkets and convenience store cold coolers, with straightforward multi-pack pricing.',
    imagePrompt: 'Photorealistic portrait of a friendly 49-year-old man taking a refreshing sip from an ice-cold can of Squirt Original next to his pickup truck after yard work on a sunny afternoon, honest authentic commercial style',
    isStandard: false,
    psychographics: {
      personalityTraits: ['Pragmatic Loyalist', 'Anti-Trend', 'Routine-Driven', 'Quality-First'],
      beverageRituals: 'Cracks a cold can from the garage fridge after work or grabs a 20 oz bottle at the local convenience store during road trips.',
      flavorAffinity: 'Squirt Original Grapefruit Soda, Squirt Zero Sugar (12-Packs & 20 oz)',
      sugarPreference: 'Original Full Sugar (Occasional Zero Sugar)',
      shoppingValues: 'Dependable supermarket availability, straightforward pricing, and classic unchanged taste.',
      mediaHabits: 'Local news broadcasts, Major League Baseball, automotive forums'
    }
  }
];

export interface PersonaTestingResponse {
  personaId: string;
  personaName: string;
  archetype: string;
  isStandardDefault?: boolean;
  answer: string;
  sentiment: 'enthusiastic' | 'positive' | 'neutral' | 'skeptical';
  favoriteFlavorMentioned?: string;
  keyReason: string;
}

export interface PersonaTestingRun {
  question: string;
  summary: string;
  consensusPoints: string[];
  divergentPoints: string[];
  responses: PersonaTestingResponse[];
  timestamp: string;
}

export interface StrategyChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  timestamp: string;
  text?: string;
  showDatasetTable?: boolean;
  datasetFilter?: string;
  generatedPersonas?: any[];
  testingResult?: PersonaTestingRun;
  singlePersonaResponse?: PersonaTestingResponse & { personaDetails?: any };
  generatedPersonaAd?: {
    persona: any;
    imageUrl: string;
    prompt: string;
    flavor: string;
    sugar: string;
    hook: string;
    alignmentReason: string;
  };
  strategyReport?: any;
  clarifyingOptions?: {
    question: string;
    options: { label: string; action: string; payload?: any }[];
  };
  error?: string;
}

export interface StrategySessionSummary {
  sessionId: string;
  title: string;
  timestamp: string;
  messageCount: number;
  personaCount?: number;
  lastTestedQuestion?: string;
  activePersonas?: any[];
  isPinned?: boolean;
  messages: StrategyChatMessage[];
}

interface StrategyChatAgentProps {
  personas?: CombinedPersona[];
  setPersonas?: React.Dispatch<React.SetStateAction<CombinedPersona[]>>;
}

export const StrategyChatAgent: React.FC<StrategyChatAgentProps> = ({ personas = [], setPersonas }) => {
  const { name } = useCompanyContext();
  const { config } = useAppConfig();
  const companyName = config?.branding.companyName || name || 'Squirt';
  const accentColor = config?.branding.colors.accent || '#1A73E8';

  const [inputPrompt, setInputPrompt] = useState('');
  const [messages, setMessages] = useState<StrategyChatMessage[]>([]);
  const [sessionsHistory, setSessionsHistory] = useState<StrategySessionSummary[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string>(`session_${Date.now()}`);
  const [showHistoryDrawer, setShowHistoryDrawer] = useState(false);
  const [activePersonas, setActivePersonas] = useState<any[]>(personas);
  const activePersonasRef = useRef<any[]>(personas || []);
  const [isLoading, setIsLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [showPlusMenu, setShowPlusMenu] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [hasLoadedLast, setHasLoadedLast] = useState(false);
  const [datasetSearch, setDatasetSearch] = useState('');
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState<string>('');

  const sortSessions = (sessions: StrategySessionSummary[]): StrategySessionSummary[] => {
    return [...sessions].sort((a, b) => {
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      return 0;
    });
  };

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading, statusMessage]);

  useEffect(() => {
    loadLastStrategySession();
  }, []);

  // Sync external personas prop
  useEffect(() => {
    if (personas && personas.length > 0) {
      setActivePersonas(personas);
      activePersonasRef.current = personas;
    }
  }, [personas]);

  // Keep activePersonasRef in sync with state
  useEffect(() => {
    if (activePersonas && activePersonas.length > 0) {
      activePersonasRef.current = activePersonas;
    }
  }, [activePersonas]);

  // Load last session and history from GCS
  const loadLastStrategySession = async () => {
    try {
      // 1. Load Past Strategy Sessions History from GCS
      try {
        const histRes = await fetch(`/api/load-run/strategy_agent_history?companyName=${encodeURIComponent(companyName)}`);
        if (histRes.ok) {
          const histData = await histRes.json();
          if (histData && Array.isArray(histData.sessions)) {
            setSessionsHistory(histData.sessions);
          }
        }
      } catch (err) {
        console.warn("Could not load strategy sessions history:", err);
      }

      // 2. Load Active Current Session from GCS
      const res = await fetch(`/api/load-run/strategy_agent_session?companyName=${encodeURIComponent(companyName)}`);
      if (res.ok) {
        const data = await res.json();
        if (data && Array.isArray(data.messages) && data.messages.length > 0) {
          setMessages(data.messages);
          if (data.sessionId) setCurrentSessionId(data.sessionId);
          setHasLoadedLast(true);

          // Restore session personas
          if (data.activePersonas && Array.isArray(data.activePersonas) && data.activePersonas.length > 0) {
            setActivePersonas(data.activePersonas);
            activePersonasRef.current = data.activePersonas;
            if (setPersonas) setPersonas(data.activePersonas);
          } else {
            const lastWithPersonas = [...data.messages].reverse().find(m => m.generatedPersonas && m.generatedPersonas.length > 0);
            if (lastWithPersonas && lastWithPersonas.generatedPersonas) {
              setActivePersonas(lastWithPersonas.generatedPersonas);
              activePersonasRef.current = lastWithPersonas.generatedPersonas;
              if (setPersonas) setPersonas(lastWithPersonas.generatedPersonas);
            }
          }
        }
      }
    } catch (err) {
      console.warn("No previous strategy chat session found:", err);
    }
  };

  // Save session to GCS
  const saveStrategySession = async (currentMessages: StrategyChatMessage[], personasToSave?: any[]) => {
    setIsSaving(true);
    const personasRef = personasToSave || activePersonasRef.current || [];
    
    // Derive concise title from existing title or first user query or testing question
    const existingCurrent = sessionsHistory.find(s => s.sessionId === currentSessionId);
    const firstUser = currentMessages.find(m => m.sender === 'user');
    const sessionTitle = existingCurrent?.title || (
      firstUser?.text 
        ? firstUser.text.slice(0, 45) 
        : 'Persona Strategy Session'
    );
    const isPinned = existingCurrent?.isPinned || false;

    const lastWithTesting = [...currentMessages].reverse().find(m => m.testingResult);
    const lastQuestion = lastWithTesting?.testingResult?.question;

    const sessionSummary: StrategySessionSummary = {
      sessionId: currentSessionId,
      title: sessionTitle,
      timestamp: existingCurrent?.timestamp || new Date().toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
      messageCount: currentMessages.length,
      personaCount: personasRef.length,
      lastTestedQuestion: lastQuestion ? (lastQuestion.length > 50 ? lastQuestion.slice(0, 50) + '...' : lastQuestion) : undefined,
      activePersonas: personasRef,
      isPinned,
      messages: currentMessages
    };

    const updatedHistory = sortSessions([
      sessionSummary,
      ...sessionsHistory.filter(s => s.sessionId !== currentSessionId)
    ]).slice(0, 25);
    setSessionsHistory(updatedHistory);

    try {
      // 1. Save Active Current Session
      await fetch(`/api/save-run/strategy_agent_session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyName,
          featureId: 'strategy_agent_session',
          data: {
            sessionId: currentSessionId,
            messages: currentMessages,
            activePersonas: personasRef,
            savedAt: new Date().toISOString()
          }
        })
      });

      // 2. Save Sessions History
      await fetch(`/api/save-run/strategy_agent_history`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyName,
          featureId: 'strategy_agent_history',
          data: {
            sessions: updatedHistory,
            updatedAt: new Date().toISOString()
          }
        })
      });
    } catch (err) {
      console.error("Failed to save strategy chat session:", err);
    } finally {
      setIsSaving(false);
    }
  };

  // Toggle Pin/Star status of a strategy session
  const handleTogglePinSession = async (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updatedHistory = sortSessions(
      sessionsHistory.map(s => s.sessionId === sessionId ? { ...s, isPinned: !s.isPinned } : s)
    );
    setSessionsHistory(updatedHistory);

    try {
      await fetch(`/api/save-run/strategy_agent_history`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyName,
          featureId: 'strategy_agent_history',
          data: {
            sessions: updatedHistory,
            updatedAt: new Date().toISOString()
          }
        })
      });
    } catch (err) {
      console.error("Failed to update pin state in GCS:", err);
    }
  };

  // Rename a session in history
  const handleRenameSession = async (sessionId: string, newTitle: string) => {
    if (!newTitle.trim()) return;
    const updatedHistory = sessionsHistory.map(s => s.sessionId === sessionId ? { ...s, title: newTitle.trim() } : s);
    setSessionsHistory(updatedHistory);

    try {
      await fetch(`/api/save-run/strategy_agent_history`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyName,
          featureId: 'strategy_agent_history',
          data: {
            sessions: updatedHistory,
            updatedAt: new Date().toISOString()
          }
        })
      });
    } catch (err) {
      console.error("Failed to rename strategy session in GCS:", err);
    }
  };

  // Restore a specific past session
  const restorePastSession = (session: StrategySessionSummary) => {
    setCurrentSessionId(session.sessionId);
    setMessages(session.messages || []);
    if (session.activePersonas && Array.isArray(session.activePersonas) && session.activePersonas.length > 0) {
      setActivePersonas(session.activePersonas);
      activePersonasRef.current = session.activePersonas;
      if (setPersonas) setPersonas(session.activePersonas);
    }
    setShowHistoryDrawer(false);
    saveStrategySession(session.messages, session.activePersonas);
  };

  // Delete a past session from history
  const handleDeleteSession = async (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updatedHistory = sessionsHistory.filter(s => s.sessionId !== sessionId);
    setSessionsHistory(updatedHistory);

    try {
      await fetch(`/api/save-run/strategy_agent_history`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyName,
          featureId: 'strategy_agent_history',
          data: {
            sessions: updatedHistory,
            updatedAt: new Date().toISOString()
          }
        })
      });
    } catch (err) {
      console.error("Failed to delete strategy session from GCS:", err);
    }

    // If the active session is deleted, reset the chat panel
    if (sessionId === currentSessionId) {
      handleResetChat();
    }
  };

  // Reset chat for Strategize page only
  const handleResetChat = async () => {
    const newId = `session_${Date.now()}`;
    setCurrentSessionId(newId);
    setMessages([]);
    setHasLoadedLast(false);
    setStatusMessage('');
    setIsLoading(false);
    try {
      await fetch(`/api/save-run/strategy_agent_session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyName,
          featureId: 'strategy_agent_session',
          data: {
            sessionId: newId,
            messages: [],
            activePersonas: activePersonasRef.current || [],
            savedAt: new Date().toISOString()
          }
        })
      });
    } catch (err) {
      console.error("Failed to reset strategy chat session:", err);
    }
  };

  // Load last generated personas from GCS
  const loadLastGeneratedPersonas = async (currentMessages: StrategyChatMessage[]) => {
    setIsLoading(true);
    setStatusMessage('Fetching last generated personas run from GCS...');

    try {
      const res = await fetch(`/api/load-run/strategy_personas_run?companyName=${encodeURIComponent(companyName)}`);
      if (res.ok) {
        const runData = await res.json();
        if (runData && Array.isArray(runData.personas) && runData.personas.length > 0) {
          setActivePersonas(runData.personas);
          if (setPersonas) setPersonas(runData.personas);

          const assistantMsg: StrategyChatMessage = {
            id: `assistant_${Date.now()}`,
            sender: 'assistant',
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            text: `Successfully restored **${runData.personas.length} personas** generated on ${new Date(runData.savedAt || Date.now()).toLocaleDateString()}:`,
            generatedPersonas: runData.personas
          };

          const updated = [...currentMessages, assistantMsg];
          setMessages(updated);
          saveStrategySession(updated);
          return;
        }
      }

      const notFoundMsg: StrategyChatMessage = {
        id: `assistant_${Date.now()}`,
        sender: 'assistant',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        text: `No saved persona runs found for **${companyName}** in storage yet. Would you like me to generate a new set from the Squirt synthetic dataset?`,
        clarifyingOptions: {
          question: "Generate new personas from dataset:",
          options: [
            { label: "🚀 Generate Personas from Squirt Dataset", action: "generate_personas" },
            { label: "📊 View Squirt Synthetic Dataset First", action: "view_dataset" }
          ]
        }
      };
      const updated = [...currentMessages, notFoundMsg];
      setMessages(updated);
      saveStrategySession(updated);

    } catch (err: any) {
      console.error("Failed to load last personas:", err);
      const errorMsg: StrategyChatMessage = {
        id: `assistant_error_${Date.now()}`,
        sender: 'assistant',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        error: `Could not load last personas: ${err.message}`
      };
      const updated = [...currentMessages, errorMsg];
      setMessages(updated);
    } finally {
      setIsLoading(false);
      setStatusMessage('');
    }
  };

  // Display Current Active Personas
  const displayCurrentPersonas = async (currentMessages: StrategyChatMessage[]) => {
    setIsLoading(true);
    setStatusMessage('Loading active personas...');

    try {
      let current = activePersonas;
      if (!current || current.length === 0) {
        const res = await fetch(`/api/load-run/strategy_personas_run?companyName=${encodeURIComponent(companyName)}`);
        if (res.ok) {
          const runData = await res.json();
          if (runData && Array.isArray(runData.personas) && runData.personas.length > 0) {
            current = runData.personas;
            setActivePersonas(current);
            if (setPersonas) setPersonas(current);
          }
        }
      }

      if (current && current.length > 0) {
        const assistantMsg: StrategyChatMessage = {
          id: `assistant_${Date.now()}`,
          sender: 'assistant',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          text: `Here are the **current active personas** (${current.length} generated personas from the Squirt dataset):`,
          generatedPersonas: current,
          clarifyingOptions: {
            question: "Next actions with current personas:",
            options: [
              { label: "💬 Ask a question to the 6-persona panel", action: "test_question", payload: "What flavor of Squirt brand drinks do you like best, and why?" },
              { label: "🚀 Re-generate new personas from dataset", action: "generate_personas" },
              { label: "📊 View Squirt synthetic dataset", action: "view_dataset" }
            ]
          }
        };
        const updated = [...currentMessages, assistantMsg];
        setMessages(updated);
        saveStrategySession(updated);
      } else {
        const notFoundMsg: StrategyChatMessage = {
          id: `assistant_${Date.now()}`,
          sender: 'assistant',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          text: `No active personas are currently loaded in memory. Would you like me to generate them from the Squirt synthetic dataset?`,
          clarifyingOptions: {
            question: "Create personas from dataset:",
            options: [
              { label: "🚀 Generate Personas from Squirt Dataset", action: "generate_personas" },
              { label: "📊 View Squirt Synthetic Dataset First", action: "view_dataset" }
            ]
          }
        };
        const updated = [...currentMessages, notFoundMsg];
        setMessages(updated);
        saveStrategySession(updated);
      }
    } catch (err: any) {
      console.error("Error displaying current personas:", err);
    } finally {
      setIsLoading(false);
      setStatusMessage('');
    }
  };

  // Save and activate personas to GCS and application state
  const saveAndActivatePersonas = async (personasToSave: any[], currentMessages: StrategyChatMessage[]) => {
    setIsLoading(true);
    setStatusMessage('Saving & activating personas to GCS...');

    try {
      setActivePersonas(personasToSave);
      activePersonasRef.current = personasToSave;
      if (setPersonas) setPersonas(personasToSave);

      // Persist to GCS
      await fetch('/api/save-run/strategy_personas_run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyName,
          featureId: 'strategy_personas_run',
          data: {
            personas: personasToSave,
            savedAt: new Date().toISOString()
          }
        })
      });

      const p1 = personasToSave[0]?.personaName || personasToSave[0]?.name || 'Persona 1';
      const p2 = personasToSave[1]?.personaName || personasToSave[1]?.name || 'Persona 2';
      const p3 = personasToSave[2]?.personaName || personasToSave[2]?.name || 'Persona 3';

      const assistantMsg: StrategyChatMessage = {
        id: `assistant_${Date.now()}`,
        sender: 'assistant',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        text: `✅ **Saved & Activated in GCS!**\n\nThe 3 new personas are now saved to persistent storage and activated as the live panel:\n• **${p1}** (${personasToSave[0]?.name || 'Segment 1'})\n• **${p2}** (${personasToSave[1]?.name || 'Segment 2'})\n• **${p3}** (${personasToSave[2]?.name || 'Segment 3'})\n\nTogether with the 3 default personas (*Optimist*, *Pessimist*, *Generalist*), your 6-persona panel is ready for focus group testing. What question would you like to ask them?`,
        generatedPersonas: personasToSave,
        clarifyingOptions: {
          question: "Broadcast a question to the 6-persona panel:",
          options: [
            { 
              label: "💬 Ask: What flavor of Squirt drinks do you like best, and why?", 
              action: "test_question_with_personas", 
              payload: { question: "What flavor of Squirt brand drinks do you like best, and why?", personas: personasToSave } 
            },
            { 
              label: "🍹 Ask: How do you feel about Squirt as the authentic mixer for Palomas?", 
              action: "test_question_with_personas", 
              payload: { question: "How do you feel about Squirt as the authentic mixer for Palomas?", personas: personasToSave } 
            },
            { 
              label: "🥤 Ask: What would make you try Squirt Zero Sugar or Squirt Ruby Red?", 
              action: "test_question_with_personas", 
              payload: { question: "What would make you try Squirt Zero Sugar or Squirt Ruby Red?", personas: personasToSave } 
            }
          ]
        }
      };

      const updated = [...currentMessages, assistantMsg];
      setMessages(updated);
      saveStrategySession(updated);

    } catch (err: any) {
      console.error("Failed to save personas:", err);
      const errorMsg: StrategyChatMessage = {
        id: `assistant_error_${Date.now()}`,
        sender: 'assistant',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        error: `Failed to save personas to GCS: ${err.message}`
      };
      const updated = [...currentMessages, errorMsg];
      setMessages(updated);
    } finally {
      setIsLoading(false);
      setStatusMessage('');
    }
  };

  // Generate Personas from Squirt Synthetic Dataset
  const generatePersonasFromDataset = async (currentMessages: StrategyChatMessage[], customFocus?: string) => {
    setIsLoading(true);
    setStatusMessage('Analyzing Squirt synthetic consumer records with Gemini 3.7 Flash...');

    try {
      const focusInstruction = customFocus ? `Special Focus: ${customFocus}` : `Focus on the 3 core strategic segments: The Cultural Traditionalist, The Modern Mixologist, and The Nostalgic Flavor Purist.`;

      const prompt = `
      You are the Master Marketing Strategist for Squirt and Keurig Dr Pepper.
      Task: Analyze the Squirt Synthetic Consumer Dataset and create exactly 3 distinct, rich, production-ready Audience Segments and Personas calibrated to the following 3 mandatory strategic segments:

      ${focusInstruction}

      MANDATORY STRATEGIC SEGMENTS TO GENERATE:

      1. SEGMENT 1: "The Cultural Traditionalist"
         - Core Value Driver: Cultural continuity, family gathering, authentic heritage
         - What They Want: Familiar, authentic staples that pair naturally with traditional food and family celebrations
         - Competitor Brands Targeting Them: ["Jarritos Toronja", "Fresca", "Peñafiel"]
         - Age Range: 21–45
         - Income Range: $40,000 – $85,000
         - Lifestyle & Needs: Multi-generational homes, festive gatherings; values value-pack availability and cultural resonance
         - Recommended Products: ["Squirt Original (2L, 12-pack cans)", "Mexican Squirt (glass bottle with real sugar)"]
         - Key Characteristics: High brand loyalty, high household penetration in Hispanic communities, pantry staple
         - Brand Engagement: High
         - Representative Persona Name: Mateo Alvarez (or similar authentic Hispanic family host)

      2. SEGMENT 2: "The Modern Mixologist"
         - Core Value Driver: Elevating social experiences, culinary discovery, aesthetic hosting
         - What They Want: Premium yet unpretentious mixer with real grapefruit bite for cocktails (e.g., Palomas)
         - Competitor Brands Targeting Them: ["Fever-Tree Pink Grapefruit", "Q Mixers", "Topo Chico", "Fresca Mixed"]
         - Age Range: 24–38
         - Income Range: $75,000 – $140,000+
         - Lifestyle & Needs: Urban/suburban socializers, DIY bartenders; needs cocktail recipes, sleek packaging, and bar-cart aesthetics
         - Recommended Products: ["Squirt Zero Sugar", "Ruby Red Squirt", "Squirt 7.5 oz mini-cans"]
         - Key Characteristics: High digital engagement, social sharer (TikTok/Instagram), cocktail-led consumption
         - Brand Engagement: Medium (High potential via automated dynamic creative)
         - Representative Persona Name: Sofia Ramirez (or similar aesthetic cocktail creator)

      3. SEGMENT 3: "The Nostalgic Flavor Purist"
         - Core Value Driver: Comfort in timeless taste, anti-trend reliability, no-nonsense refreshment
         - What They Want: Crisp, tart, thirst-quenching citrus flavor that stays consistent over decades
         - Competitor Brands Targeting Them: ["Fresca", "Sun Drop", "Mountain Dew", "Sprite"]
         - Age Range: 35–60+
         - Income Range: $45,000 – $95,000
         - Lifestyle & Needs: Practical, routine-driven routines; needs reliable local distribution in supermarkets and C-stores
         - Recommended Products: ["Squirt Original", "Squirt Zero Sugar (12-pack, 20 oz bottles)"]
         - Key Characteristics: Moderate media consumption, habitual repeat purchaser in traditional retail
         - Brand Engagement: High
         - Representative Persona Name: Gary Miller (or similar dependable 30-year purist)

      SQUIRT SYNTHETIC DATASET:
      ${JSON.stringify(SQUIRT_SYNTHETIC_DATASET, null, 2)}

      For each persona, return a JSON object with:
      - "name": Segment Name ("The Cultural Traditionalist" | "The Modern Mixologist" | "The Nostalgic Flavor Purist")
      - "personaName": Full Realistic Name
      - "status": Archetype Subtitle (e.g. "Core Anchor: Cultural Traditionalist")
      - "lifeEvent": Current Life Stage or Seasonal Driver
      - "location": Region & Living Environment
      - "financialHealth": Mindset & Income Bracket
      - "ageRange": Exact Age Range
      - "incomeRange": Exact Income Range
      - "familySize": Family or Household Structure
      - "coreValues": Core Value Driver
      - "whatTheyWant": What they want from Squirt
      - "competitorBrands": Array of 3-4 competitor brands targeting them
      - "recommendedProducts": Array of recommended Squirt products & pack sizes
      - "keyCharacteristics": Key consumer characteristics
      - "brandEngagement": Engagement level ("High" or "Medium (High potential via automated dynamic creative)")
      - "bioLifestyleNeeds": Rich paragraph describing their lifestyle, beverage rituals, and cultural/aesthetic triggers
      - "nba": Next Best Action for the marketing team
      - "imagePrompt": Detailed photorealistic headshot prompt
      - "psychographics": {
          "personalityTraits": ["Trait 1", "Trait 2", "Trait 3"],
          "beverageRituals": "Daily routine, occasion, and mixology habits",
          "flavorAffinity": "Favorite Squirt flavors and packaging",
          "sugarPreference": "Original Full Sugar" | "Zero Sugar" | "Mixes Both",
          "shoppingValues": "Key purchase drivers and packaging preference",
          "mediaHabits": "Top media and social platforms"
        }

      Return a valid JSON array of exactly 3 objects.
      Do not use markdown code blocks. Output ONLY raw JSON array.
      `;

      const response = await callGenAiProxy("generateContent", {
        model: 'gemini-3.7-flash',
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        config: { 
          responseMimeType: "application/json",
          temperature: 0.2,
          thinkingConfig: { thinkingLevel: "LOW" }
        }
      });

      const text = extractTextFromResponse(response) || "[]";
      let parsed = safeJsonParse(text, []);
      let parsedPersonas: any[] = [];

      if (Array.isArray(parsed)) {
        parsedPersonas = parsed;
      } else if (parsed && typeof parsed === 'object') {
        if (Array.isArray(parsed.personas)) {
          parsedPersonas = parsed.personas;
        } else if (Array.isArray(parsed.segments)) {
          parsedPersonas = parsed.segments;
        } else if (Array.isArray(parsed.audiences)) {
          parsedPersonas = parsed.audiences;
        } else if (Array.isArray(parsed.data)) {
          parsedPersonas = parsed.data;
        } else {
          parsedPersonas = Object.values(parsed).filter((v: any) => v && typeof v === 'object' && (v.name || v.personaName));
        }
      }

      if (!Array.isArray(parsedPersonas) || parsedPersonas.length === 0) {
        console.warn("Gemini returned empty persona structure, using calibrated defaults.");
        parsedPersonas = DEFAULT_SQUIRT_GENERATED_PERSONAS;
      }

      // Normalize persona properties with rich psychographics and user-specified attributes
      const normalizedPersonas = parsedPersonas.map((p, idx) => {
        const fallback = DEFAULT_SQUIRT_GENERATED_PERSONAS[idx] || DEFAULT_SQUIRT_GENERATED_PERSONAS[0];
        return {
          id: p.id || `squirt_gen_${idx}_${Date.now()}`,
          name: p.name || fallback.name,
          personaName: p.personaName || p.name || fallback.personaName,
          status: p.status || fallback.status,
          lifeEvent: p.lifeEvent || fallback.lifeEvent,
          location: p.location || fallback.location,
          financialHealth: p.financialHealth || fallback.financialHealth,
          ageRange: p.ageRange || fallback.ageRange,
          incomeRange: p.incomeRange || fallback.incomeRange,
          familySize: p.familySize || fallback.familySize,
          coreValues: p.coreValues || fallback.coreValues,
          whatTheyWant: p.whatTheyWant || fallback.whatTheyWant,
          competitorBrands: Array.isArray(p.competitorBrands) && p.competitorBrands.length > 0 ? p.competitorBrands : fallback.competitorBrands,
          recommendedProducts: Array.isArray(p.recommendedProducts) && p.recommendedProducts.length > 0 ? p.recommendedProducts : fallback.recommendedProducts,
          keyCharacteristics: p.keyCharacteristics || fallback.keyCharacteristics,
          brandEngagement: p.brandEngagement || fallback.brandEngagement,
          bioLifestyleNeeds: p.bioLifestyleNeeds || p.bio || fallback.bioLifestyleNeeds,
          nba: p.nba || fallback.nba,
          imagePrompt: p.imagePrompt || fallback.imagePrompt,
          imageUrl: p.imageUrl || undefined,
          isStandard: false,
          psychographics: p.psychographics || fallback.psychographics
        };
      });

      // Immediate in-memory sync
      setActivePersonas(normalizedPersonas);
      activePersonasRef.current = normalizedPersonas;
      if (setPersonas) setPersonas(normalizedPersonas);

      const p1 = normalizedPersonas[0]?.personaName || 'Persona 1';
      const p2 = normalizedPersonas[1]?.personaName || 'Persona 2';
      const p3 = normalizedPersonas[2]?.personaName || 'Persona 3';

      const assistantMsg: StrategyChatMessage = {
        id: `assistant_${Date.now()}`,
        sender: 'assistant',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        text: `I have analyzed the **Squirt Synthetic Dataset** and generated **3 new audience personas** with psychographic profiles: **${p1}**, **${p2}**, and **${p3}**.\n\n**Would you like to save these personas to GCS and activate them as your testing panel?**`,
        generatedPersonas: normalizedPersonas,
        clarifyingOptions: {
          question: "Confirm Persona Activation or Start Testing / Visuals:",
          options: [
            { 
              label: "💾 Yes, Save & Activate Personas to GCS", 
              action: "save_and_activate_personas", 
              payload: normalizedPersonas 
            },
            {
              label: `🎨 Generate Tailored Ad Visual for ${p1.split(' ')[0]}`,
              action: "prompt_for_persona_image",
              payload: { persona: normalizedPersonas[0] }
            },
            { 
              label: "💬 Ask New Personas: What flavor of Squirt drinks do you like best, and why?", 
              action: "test_question_with_personas", 
              payload: { question: "What flavor of Squirt brand drinks do you like best, and why?", personas: normalizedPersonas } 
            },
            { 
              label: "🍹 Ask New Personas: How do you prefer to drink Squirt (Straight, over ice, or in a Paloma)?", 
              action: "test_question_with_personas", 
              payload: { question: "How do you prefer to drink Squirt (Straight, over ice, or in a Paloma)?", personas: normalizedPersonas } 
            },
            { 
              label: "🔄 Re-generate Personas with Different Focus", 
              action: "generate_personas" 
            }
          ]
        }
      };

      const updated = [...currentMessages, assistantMsg];
      setMessages(updated);
      saveStrategySession(updated);

    } catch (err: any) {
      console.error("Persona generation error:", err);
      const errorMsg: StrategyChatMessage = {
        id: `assistant_error_${Date.now()}`,
        sender: 'assistant',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        error: `Persona generation failed: ${err.message || 'Check Gemini API Key.'}`
      };
      const updated = [...currentMessages, errorMsg];
      setMessages(updated);
    } finally {
      setIsLoading(false);
      setStatusMessage('');
    }
  };

  // Step 1: Prompt user for Flavor, Sugar, and Visual Hook to catch persona's attention
  const runPromptForPersonaImage = async (persona: any, currentMessages: StrategyChatMessage[]) => {
    const pName = persona.personaName || persona.name || 'Persona';
    const archetype = persona.status || persona.archetype || 'Audience Segment';
    const psy = persona.psychographics;

    const favoriteFlavor = psy?.flavorAffinity?.split(',')[0] || 'Squirt Original Citrus';
    const defaultSugar = psy?.sugarPreference?.includes('Zero') ? 'Zero Sugar' : 'Original Full Sugar';

    const assistantMsg: StrategyChatMessage = {
      id: `assistant_ad_prompt_${Date.now()}`,
      sender: 'assistant',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      text: `Let's generate a targeted commercial ad visual tailored to catch **${pName}**'s attention (${archetype}).\n\n**Persona Flavor Affinity:** ${psy?.flavorAffinity || 'Squirt Original Citrus'}\n**Sugar Preference:** ${psy?.sugarPreference || 'Original'}\n**Ritual Context:** *"${psy?.beverageRituals || 'Daily refreshment'}"*\n\nSelect a visual concept, flavor, and sugar formulation below, or type your custom creative prompt:`,
      clarifyingOptions: {
        question: `Select a targeted visual concept for ${pName}:`,
        options: [
          {
            label: `🍹 Squirt Paloma Cocktail (${defaultSugar}) - Sun-Drenched Patio & Mixology Bar`,
            action: 'generate_persona_ad',
            payload: {
              persona,
              flavor: 'Original Citrus',
              sugar: defaultSugar,
              hook: `A stylish outdoor patio beverage bar setting with an ice-cold glass of Squirt Paloma featuring tequila blanco, coarse sea salt rim, fresh ruby red grapefruit slice, and condensation under bright sunny ambient daylight`
            }
          },
          {
            label: `🌮 Squirt Citrus Soda (${defaultSugar}) - Backyard BBQ & Street Taco Gathering`,
            action: 'generate_persona_ad',
            payload: {
              persona,
              flavor: 'Original Citrus',
              sugar: defaultSugar,
              hook: `A lively sunny backyard cookout scene with friends, an ice-filled galvanized tub with frost-covered Squirt cans, fresh street tacos with lime wedges, and a smoking grill in the background`
            }
          },
          {
            label: `🏃 Squirt Zero Sugar - Active Outdoor Trail & Post-Workout Refreshment`,
            action: 'generate_persona_ad',
            payload: {
              persona,
              flavor: 'Zero Sugar',
              sugar: 'Zero Sugar',
              hook: `A crisp bright mountain hiking trail setting in natural morning sunlight with an ice-cold can of Squirt Zero Sugar with fresh citrus water droplets`
            }
          },
          {
            label: `🌅 Squirt Ruby Red (${defaultSugar}) - Sunset Golden Hour Rooftop Gathering`,
            action: 'generate_persona_ad',
            payload: {
              persona,
              flavor: 'Ruby Red',
              sugar: defaultSugar,
              hook: `A warm sunset rooftop lounge setting with amber golden hour lighting, modern glassware filled with vibrant pink Squirt Ruby Red, fresh grapefruit garnish, and city skyline view`
            }
          }
        ]
      }
    };

    const updated = [...currentMessages, assistantMsg];
    setMessages(updated);
    saveStrategySession(updated);
  };

  // Step 2: Generate the Commercial Ad Catch Image with Gemini 3.1 Flash Lite Image
  const runPersonaAdGeneration = async (
    persona: any,
    hook: string,
    flavor: string,
    sugar: string,
    currentMessages: StrategyChatMessage[]
  ) => {
    setIsLoading(true);
    const pName = persona.personaName || persona.name || 'Persona';
    setStatusMessage(`Generating tailored ad visual for ${pName} with Gemini 3.1 Flash Lite Image...`);

    try {
      const cleanFlavor = flavor.replace(/^Squirt\s*/i, '');
      const fullProductName = `Squirt ${cleanFlavor} ${sugar === 'Zero Sugar' ? 'Zero Sugar' : ''}`.trim();

      const imagePrompt = `
      A premium commercial advertising photograph created specifically to catch the attention of ${pName}, a ${persona.status || 'consumer'} (${persona.location || 'US'}).
      Product: Ice-cold can and beverage glass of ${fullProductName}, covered with crisp, refreshing condensation water droplets.
      Creative Scene & Visual Hook: ${hook}.
      Visual Style: 4K high-end commercial beverage advertising photography, vibrant colors, cinematic commercial studio lighting, ultra-sharp focus on the product, photorealistic packaging.
      `;

      const generatedUrl = await generateImage(
        imagePrompt,
        'gemini-3.1-flash-lite-image',
        '1:1',
        `persona_${pName.toLowerCase().replace(/\s+/g, '_')}_ad`,
        companyName
      );

      if (!generatedUrl) {
        throw new Error("Gemini Image generation returned an empty result.");
      }

      // Update persona with new imageUrl in memory and state
      const updatedPersona = {
        ...persona,
        imageUrl: generatedUrl
      };

      const updatedActivePersonas = activePersonas.map((p: any) => 
        (p.personaName === pName || p.name === pName || p.id === persona.id) ? { ...p, imageUrl: generatedUrl } : p
      );
      setActivePersonas(updatedActivePersonas);
      activePersonasRef.current = updatedActivePersonas;
      if (setPersonas) setPersonas(updatedActivePersonas);

      const alignmentReason = `Designed to resonate with ${pName}'s psychographic profile (${persona.psychographics?.personalityTraits?.[0] || 'core driver'}). The ${cleanFlavor} (${sugar}) formulation and ${hook.slice(0, 50)}... aesthetic directly match their preferred ritual: "${persona.psychographics?.beverageRituals || 'Daily refreshment'}".`;

      const assistantMsg: StrategyChatMessage = {
        id: `assistant_ad_result_${Date.now()}`,
        sender: 'assistant',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        text: `Here is the targeted creative ad visual designed to catch the attention of **${pName}**:`,
        generatedPersonaAd: {
          persona: updatedPersona,
          imageUrl: generatedUrl,
          prompt: imagePrompt,
          flavor: cleanFlavor,
          sugar,
          hook,
          alignmentReason
        },
        clarifyingOptions: {
          question: `Next actions for ${pName}'s tailored ad:`,
          options: [
            {
              label: `💬 Interview ${pName.split(' ')[0]}: What do you think of this ad visual?`,
              action: 'interview_single_persona',
              payload: {
                persona: updatedPersona,
                question: `Looking at this new ad visual for Squirt ${cleanFlavor} (${sugar}) set in ${hook}, does this catch your attention and would it motivate you to purchase?`
              }
            },
            {
              label: `👥 Test this creative concept across the entire 6-Persona Focus Group`,
              action: 'test_question_with_personas',
              payload: {
                question: `How effective is this creative ad concept featuring Squirt ${cleanFlavor} (${sugar}) with a ${hook.slice(0, 45)} theme?`,
                personas: updatedActivePersonas
              }
            },
            {
              label: `🎨 Generate Another Creative Variation for ${pName.split(' ')[0]}`,
              action: 'prompt_for_persona_image',
              payload: { persona: updatedPersona }
            }
          ]
        }
      };

      const updated = [...currentMessages, assistantMsg];
      setMessages(updated);
      saveStrategySession(updated, updatedActivePersonas);

    } catch (err: any) {
      console.error("Persona image generation error:", err);
      const errorMsg: StrategyChatMessage = {
        id: `assistant_error_${Date.now()}`,
        sender: 'assistant',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        error: `Failed to generate persona ad visual: ${err.message || 'Check Gemini API connection.'}`
      };
      const updated = [...currentMessages, errorMsg];
      setMessages(updated);
    } finally {
      setIsLoading(false);
      setStatusMessage('');
    }
  };

  // Broadcast Question to 6 Personas (3 Generated + 3 Defaults: Optimist, Pessimist, Generalist)
  const runSyntheticPersonaTesting = async (
    question: string, 
    currentMessages: StrategyChatMessage[],
    overridePersonas?: any[]
  ) => {
    setIsLoading(true);
    setStatusMessage('Broadcasting question to 6 synthetic personas (3 Squirt Generated + 3 Standards)...');

    try {
      // Robust Persona Resolution
      let gen3: any[] = [];
      if (overridePersonas && Array.isArray(overridePersonas) && overridePersonas.length >= 3) {
        gen3 = overridePersonas.slice(0, 3);
      } else if (activePersonasRef.current && Array.isArray(activePersonasRef.current) && activePersonasRef.current.length >= 3) {
        gen3 = activePersonasRef.current.slice(0, 3);
      } else if (activePersonas && Array.isArray(activePersonas) && activePersonas.length >= 3) {
        gen3 = activePersonas.slice(0, 3);
      } else {
        // Search backwards in conversation history
        const lastMsgWithPersonas = [...currentMessages].reverse().find(m => m.generatedPersonas && m.generatedPersonas.length >= 3);
        if (lastMsgWithPersonas && lastMsgWithPersonas.generatedPersonas) {
          gen3 = lastMsgWithPersonas.generatedPersonas.slice(0, 3);
        } else {
          // Attempt to load from GCS
          try {
            const res = await fetch(`/api/load-run/strategy_personas_run?companyName=${encodeURIComponent(companyName)}`);
            if (res.ok) {
              const runData = await res.json();
              if (runData && Array.isArray(runData.personas) && runData.personas.length >= 3) {
                gen3 = runData.personas.slice(0, 3);
                setActivePersonas(runData.personas);
                activePersonasRef.current = runData.personas;
                if (setPersonas) setPersonas(runData.personas);
              }
            }
          } catch (e) {
            console.warn("Could not fetch saved personas for test:", e);
          }
        }
      }

      // Fallback defaults if no generated personas exist yet
      if (gen3.length < 3) {
        gen3 = DEFAULT_SQUIRT_GENERATED_PERSONAS;
      }

      // Normalize gen3 properties
      const p1 = {
        personaName: gen3[0].personaName || gen3[0].name || DEFAULT_SQUIRT_GENERATED_PERSONAS[0].personaName,
        name: gen3[0].name || gen3[0].status || DEFAULT_SQUIRT_GENERATED_PERSONAS[0].name,
        bio: gen3[0].bioLifestyleNeeds || gen3[0].bio || gen3[0].demographics || DEFAULT_SQUIRT_GENERATED_PERSONAS[0].bioLifestyleNeeds,
        roleTag: 'Generated: Cultural Traditionalist',
        isStandard: false
      };
      const p2 = {
        personaName: gen3[1].personaName || gen3[1].name || DEFAULT_SQUIRT_GENERATED_PERSONAS[1].personaName,
        name: gen3[1].name || gen3[1].status || DEFAULT_SQUIRT_GENERATED_PERSONAS[1].name,
        bio: gen3[1].bioLifestyleNeeds || gen3[1].bio || gen3[1].demographics || DEFAULT_SQUIRT_GENERATED_PERSONAS[1].bioLifestyleNeeds,
        roleTag: 'Generated: Modern Mixologist',
        isStandard: false
      };
      const p3 = {
        personaName: gen3[2].personaName || gen3[2].name || DEFAULT_SQUIRT_GENERATED_PERSONAS[2].personaName,
        name: gen3[2].name || gen3[2].status || DEFAULT_SQUIRT_GENERATED_PERSONAS[2].name,
        bio: gen3[2].bioLifestyleNeeds || gen3[2].bio || gen3[2].demographics || DEFAULT_SQUIRT_GENERATED_PERSONAS[2].bioLifestyleNeeds,
        roleTag: 'Generated: Nostalgic Flavor Purist',
        isStandard: false
      };

      const all6Panel = [
        p1,
        p2,
        p3,
        { ...DEFAULT_STANDARD_PERSONAS[0], roleTag: 'Default: Optimist', isStandard: true },
        { ...DEFAULT_STANDARD_PERSONAS[1], roleTag: 'Default: Pessimist', isStandard: true },
        { ...DEFAULT_STANDARD_PERSONAS[2], roleTag: 'Default: Generalist', isStandard: true }
      ];

      // Detect if there is a relevant ad image in recent message history or personas
      const recentAd = [...currentMessages].reverse().find(m => m.generatedPersonaAd?.imageUrl)?.generatedPersonaAd;
      const targetImageUrl = recentAd?.imageUrl || gen3.find(p => p.imageUrl)?.imageUrl;

      let imageParts: any[] = [];
      let adContextNote = '';

      if (targetImageUrl) {
        try {
          const rawImg = await urlToRawBase64(targetImageUrl);
          if (rawImg && rawImg.data) {
            imageParts.push({
              inlineData: {
                mimeType: rawImg.mimeType || 'image/jpeg',
                data: rawImg.data
              }
            });
            adContextNote = `
      MULTIMODAL CONTEXT - ADVERTISEMENT VISUAL ATTACHED:
      An ad visual image is attached to this focus group testing session.
      ${recentAd?.hook ? `- Creative Concept / Hook: "${recentAd.hook}"` : ''}
      ${recentAd?.flavor ? `- Flavor Featured: "${recentAd.flavor}"` : ''}
      ${recentAd?.sugar ? `- Sugar Formulation: "${recentAd.sugar}"` : ''}
      All 6 personas MUST review this attached visual and factor what they see (the styling, drink appearance, branding, color palette, appetizing qualities, and theme) into their spoken responses.
            `;
          }
        } catch (imgErr) {
          console.warn("Could not load image part for multimodal focus group testing:", imgErr);
        }
      }

      const prompt = `
      You are simulating a live qualitative focus group interview panel of 6 diverse synthetic personas for Squirt and ${companyName}.
      
      QUESTION BROADCAST TO PANEL:
      "${question}"
      ${adContextNote}

      THE 6-PERSONA AUDIENCE PANEL:
      1. [${all6Panel[0].roleTag}] ${all6Panel[0].personaName} (${all6Panel[0].name}): ${all6Panel[0].bio}
      2. [${all6Panel[1].roleTag}] ${all6Panel[1].personaName} (${all6Panel[1].name}): ${all6Panel[1].bio}
      3. [${all6Panel[2].roleTag}] ${all6Panel[2].personaName} (${all6Panel[2].name}): ${all6Panel[2].bio}
      4. [Default Standard: Optimist] Joy Sun (The Enthusiastic Optimist): ${DEFAULT_STANDARD_PERSONAS[0].bioLifestyleNeeds}
      5. [Default Standard: Pessimist] Arthur Vance (The Skeptical Critic): ${DEFAULT_STANDARD_PERSONAS[1].bioLifestyleNeeds}
      6. [Default Standard: Generalist] Sam Taylor (The Mainstream Generalist): ${DEFAULT_STANDARD_PERSONAS[2].bioLifestyleNeeds}

      TASK:
      Simulate each of the 6 personas answering this specific question authentically in their distinct voice, referencing their lifestyle, flavor preferences, and mindset.
      Also provide a high-level executive summary, key consensus points, and divergent viewpoints.

      REQUIRED JSON STRUCTURE:
      {
        "question": "${question}",
        "summary": "Executive synthesis of what the 6 personas shared in the focus group...",
        "consensusPoints": [
          "Points where multiple personas agreed...",
          "Point 2..."
        ],
        "divergentPoints": [
          "Points of strong contrast or debate between optimists/critics/lifestyle segments...",
          "Point 2..."
        ],
        "responses": [
          {
            "personaId": "p1",
            "personaName": "${all6Panel[0].personaName}",
            "archetype": "${all6Panel[0].name}",
            "isStandardDefault": false,
            "answer": "Spoken direct quote in first-person voice explaining their exact thoughts...",
            "sentiment": "enthusiastic",
            "favoriteFlavorMentioned": "Specific flavor or product mentioned (e.g. Squirt Original Citrus, Ruby Red, Zero Sugar)",
            "keyReason": "Core takeaway reason behind their response"
          },
          {
            "personaId": "p2",
            "personaName": "${all6Panel[1].personaName}",
            "archetype": "${all6Panel[1].name}",
            "isStandardDefault": false,
            "answer": "Spoken quote...",
            "sentiment": "enthusiastic",
            "favoriteFlavorMentioned": "...",
            "keyReason": "..."
          },
          {
            "personaId": "p3",
            "personaName": "${all6Panel[2].personaName}",
            "archetype": "${all6Panel[2].name}",
            "isStandardDefault": false,
            "answer": "Spoken quote...",
            "sentiment": "positive",
            "favoriteFlavorMentioned": "...",
            "keyReason": "..."
          },
          {
            "personaId": "default_optimist",
            "personaName": "Joy Sun",
            "archetype": "The Enthusiastic Optimist",
            "isStandardDefault": true,
            "answer": "Spoken quote with optimistic tone...",
            "sentiment": "enthusiastic",
            "favoriteFlavorMentioned": "...",
            "keyReason": "..."
          },
          {
            "personaId": "default_pessimist",
            "personaName": "Arthur Vance",
            "archetype": "The Skeptical Critic",
            "isStandardDefault": true,
            "answer": "Spoken quote with critical/skeptical perspective on value/sugar/quality...",
            "sentiment": "skeptical",
            "favoriteFlavorMentioned": "...",
            "keyReason": "..."
          },
          {
            "personaId": "default_generalist",
            "personaName": "Sam Taylor",
            "archetype": "The Mainstream Generalist",
            "isStandardDefault": true,
            "answer": "Spoken quote with balanced pragmatic tone...",
            "sentiment": "neutral",
            "favoriteFlavorMentioned": "...",
            "keyReason": "..."
          }
        ]
      }
      Do not use markdown code blocks. Output ONLY raw JSON.
      `;

      const response = await callGenAiProxy("generateContent", {
        model: 'gemini-3.7-flash',
        contents: [{ role: "user", parts: [...imageParts, { text: prompt }] }],
        config: { 
          responseMimeType: "application/json",
          temperature: 0.3,
          thinkingConfig: { thinkingLevel: "LOW" }
        }
      });

      const text = extractTextFromResponse(response) || "{}";
      const clean = text.replace(/```json|```/g, '').trim();
      const parsedRun: PersonaTestingRun = JSON.parse(clean);
      parsedRun.timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

      // Persist to GCS
      await fetch('/api/save-run/strategy_testing_run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyName,
          featureId: 'strategy_testing_run',
          data: {
            run: parsedRun,
            savedAt: new Date().toISOString()
          }
        })
      });

      const assistantMsg: StrategyChatMessage = {
        id: `assistant_${Date.now()}`,
        sender: 'assistant',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        text: `Here are the simulated qualitative responses from all **6 personas** (**${p1.personaName}**, **${p2.personaName}**, **${p3.personaName}**, Joy Sun, Arthur Vance, Sam Taylor) for the question:\n\n*"**${question}**"*`,
        testingResult: parsedRun
      };

      const updated = [...currentMessages, assistantMsg];
      setMessages(updated);
      saveStrategySession(updated);

    } catch (err: any) {
      console.error("Synthetic testing error:", err);
      const errorMsg: StrategyChatMessage = {
        id: `assistant_error_${Date.now()}`,
        sender: 'assistant',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        error: `Synthetic persona testing failed: ${err.message || 'Check Gemini API Key.'}`
      };
      const updated = [...currentMessages, errorMsg];
      setMessages(updated);
    } finally {
      setIsLoading(false);
      setStatusMessage('');
    }
  };

  // Helper to gather all 6 active personas (custom generated + 3 default standards)
  const getAllCurrentPersonas = () => {
    const custom = activePersonasRef.current && activePersonasRef.current.length > 0
      ? activePersonasRef.current
      : (activePersonas && activePersonas.length > 0 ? activePersonas : []);
    
    const normalizedCustom = custom.map((p, idx) => ({
      ...p,
      id: p.id || `custom_persona_${idx}`,
      personaName: p.personaName || p.name || `Persona ${idx + 1}`,
      name: p.name || p.status || `Squirt Segment ${idx + 1}`,
      archetype: p.archetype || p.status || p.name || `Consumer Archetype ${idx + 1}`,
      isStandard: false
    }));

    return [...normalizedCustom, ...DEFAULT_STANDARD_PERSONAS];
  };

  // Intelligent Strategy Intent and Persona Classifier with Gemini 3.5 Flash Lite
  const classifyStrategyQuery = async (
    query: string, 
    allPersonas: any[]
  ): Promise<{
    intent: 'direct_answer' | 'single_persona_question' | 'all_personas_question' | 'generate_personas' | 'show_personas' | 'load_personas' | 'view_dataset' | 'prompt_persona_ad' | 'market_strategy' | 'unsupported';
    target_persona_name?: string;
    extracted_question?: string;
    direct_answer_text?: string;
    reasoning?: string;
  }> => {
    try {
      const personaListStr = allPersonas.map(p => `"${p.personaName || p.name}" (${p.name || p.archetype || p.status || 'Role'})`).join(', ');

      const prompt = `
      You are an AI Strategy Agent & Focus Group Dispatcher for ${companyName}.
      Analyze the following user input and determine the exact strategic skill or direct answer:

      USER QUERY: "${query}"

      ACTIVE FOCUS GROUP PERSONAS (${allPersonas.length} TOTAL):
      [${personaListStr}]

      ROUTING DIRECTIVES:
      1. "prompt_persona_ad": The user wants to generate, create, design, or prompt an ad, image, picture, visual, or creative catch for a specific persona (e.g. "generate an image for Joy Sun", "create ad for Arthur", "visual catch for Tyler", "make a picture for Sam", "generate ad for persona").
         -> Set target_persona_name to the matching persona name.
      2. "direct_answer": The user is asking a conversational question, capability inquiry (e.g. "what can you do?", "how does this work?"), or factual data question about the current personas or strategy agent (e.g. "which is the name of the personas, just the names", "who is in the focus group?", "how many personas are there?", "tell me about Arthur").
         -> In "direct_answer_text", write a concise, direct, helpful answer in Simplified Technical English. If they asked for just persona names, list just the names cleanly.
      3. "single_persona_question": The user wants to interview or ask a specific persona a question (e.g. "ask Arthur what soda flavor he prefers", "Arthur, why do you say that?", "Ask Joy about dirty soda", "Ask Chloe about TikTok recipes").
         -> Set target_persona_name to the matching persona name.
         -> Set extracted_question to the clean question to ask that individual.
      4. "all_personas_question": The user is asking a question to ALL PERSONAS / the entire 6-persona focus group (e.g. "What flavor do you like best?", "Broadcast this question: ...", "Which drink would you buy?").
         -> Set extracted_question to the question.
      5. "generate_personas": The user wants to generate, synthesize, or create new consumer personas from the dataset.
      6. "show_personas": The user wants to see, display, or view the 6 persona cards in chat.
      7. "load_personas": The user wants to load previously saved personas from GCS storage.
      8. "view_dataset": The user wants to inspect or browse the Squirt synthetic dataset table.
      9. "market_strategy": Broad industry research, marketing strategy advice, or competitive questions.
      10. "unsupported": The user is asking for something outside the scope of consumer strategy, persona focus groups, persona ad generation, or beverage dataset research (e.g. coding, math, flight booking, weather, ordering groceries, non-strategic tasks).
          -> In "direct_answer_text", start with: "I don't currently know how to do that, but here are some other items I can do:" and list out the core strategy skills.

      Return ONLY raw JSON:
      {
        "intent": "prompt_persona_ad" | "direct_answer" | "single_persona_question" | "all_personas_question" | "generate_personas" | "show_personas" | "load_personas" | "view_dataset" | "market_strategy" | "unsupported",
        "target_persona_name": "Matched Persona Name or null",
        "extracted_question": "Cleaned question text or null",
        "direct_answer_text": "Concise answer if direct_answer or unsupported, else null",
        "reasoning": "Brief rationale"
      }
      Do not use markdown blocks. Output ONLY raw JSON.
      `;

      const response = await callGenAiProxy("generateContent", {
        model: 'gemini-3.5-flash-lite',
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        config: { 
          responseMimeType: "application/json",
          temperature: 0.1
        }
      });

      const text = extractTextFromResponse(response) || "{}";
      const parsed = safeJsonParse(text);
      if (parsed && parsed.intent) {
        return parsed;
      }
    } catch (err) {
      console.warn("Strategy classification fallback:", err);
    }

    // Heuristic Fallback
    const lower = query.toLowerCase();
    const matched = allPersonas.find(p => {
      const pName = (p.personaName || p.name || '').toLowerCase();
      const firstName = pName.split(' ')[0];
      return (pName && lower.includes(pName)) || (firstName && firstName.length > 2 && lower.includes(firstName));
    });

    if (matched && (lower.includes('image') || lower.includes('picture') || lower.includes('ad') || lower.includes('visual') || lower.includes('photo') || lower.includes('generate ad'))) {
      return {
        intent: 'prompt_persona_ad',
        target_persona_name: matched.personaName || matched.name,
        reasoning: 'Heuristic keyword match for persona ad image generation'
      };
    }

    if (matched && (lower.includes('ask') || lower.includes('what') || lower.includes('how') || lower.includes('why') || lower.includes('?'))) {
      return {
        intent: 'single_persona_question',
        target_persona_name: matched.personaName || matched.name,
        extracted_question: query,
        reasoning: 'Heuristic keyword match for single persona'
      };
    }

    if (lower.includes('what can you do') || lower.includes('help') || lower.includes('capabilities') || lower.includes('skills')) {
      return {
        intent: 'direct_answer',
        direct_answer_text: `I am the **Strategy Agent** for **${companyName}**. Here is what I can do:\n\n• **1-on-1 Persona Interviews**: Ask individual consumer personas (like Arthur Vance the Critic, Joy Sun the Optimist, or Sam Taylor the Generalist) direct questions about flavors, packaging, pricing, and habits.\n• **6-Persona Focus Group Broadcast**: Broadcast any strategic question or concept to the entire focus group panel and receive simulated sentiment and quotes.\n• **Persona-Targeted Visual Ad Generation**: Generate customized ad imagery and creative hooks tailored to a specific persona using Gemini 3.1 Flash Lite Image.\n• **Synthesize New Personas from Dataset**: Generate fresh, diverse consumer personas based on the synthetic consumer dataset.\n• **Inspect Synthetic Consumer Dataset**: Browse and filter customer records across demographics, beverage rituals, and purchase habits.`
      };
    }

    if (lower.includes('generate persona') || lower.includes('create persona') || lower.includes('new persona')) {
      return { intent: 'generate_personas', reasoning: 'Heuristic generate personas' };
    }

    if (lower.includes('dataset') || lower.includes('data table')) {
      return { intent: 'view_dataset', reasoning: 'Heuristic view dataset' };
    }

    if (lower.includes('load last') || lower.includes('last persona')) {
      return { intent: 'load_personas', reasoning: 'Heuristic load personas' };
    }

    if (lower.includes('show persona') || lower.includes('view persona') || lower.includes('current persona')) {
      return { intent: 'show_personas', reasoning: 'Heuristic show personas' };
    }

    if (lower.includes('what flavor') || lower.includes('test question') || lower.includes('focus group') || query.endsWith('?')) {
      return { intent: 'all_personas_question', extracted_question: query, reasoning: 'Heuristic broadcast test' };
    }

    if (lower.includes('strategy') || lower.includes('market') || lower.includes('beverage') || lower.includes('brand') || lower.includes('consumer') || lower.includes('trend')) {
      return { intent: 'market_strategy', reasoning: 'Market strategy keyword match' };
    }

    return { 
      intent: 'unsupported', 
      direct_answer_text: `I don't currently know how to do that, but here are some other items I can do:\n\n• **1-on-1 Persona Interviews**: Ask individual consumer personas (like Arthur Vance the Critic, Joy Sun the Optimist, or Sam Taylor the Generalist) direct questions about flavors, packaging, pricing, and habits.\n• **6-Persona Focus Group Broadcast**: Broadcast any strategic question or concept to the entire focus group panel and receive simulated sentiment and quotes.\n• **Persona-Targeted Visual Ad Generation**: Generate customized ad imagery and creative hooks tailored to a specific persona using Gemini 3.1 Flash Lite Image.\n• **Synthesize New Personas from Dataset**: Generate fresh, diverse consumer personas based on the synthetic consumer dataset.\n• **Inspect Synthetic Consumer Dataset**: Browse and filter customer records across demographics, beverage rituals, and purchase habits.`,
      reasoning: 'Default unsupported fallback' 
    };
  };

  // Execute 1-on-1 Interview with a Specific Persona
  const runSinglePersonaInterview = async (
    persona: any,
    question: string,
    currentMessages: StrategyChatMessage[]
  ) => {
    setIsLoading(true);
    const pName = persona.personaName || persona.name || 'Persona';
    const archetype = persona.archetype || persona.status || persona.name || 'Consumer';
    setStatusMessage(`Interviewing ${pName} (${archetype}) in real-time with Gemini 3.7 Flash...`);

    try {
      // Find relevant ad image from persona, option payload, or message history
      const recentAd = [...currentMessages].reverse().find(m => m.generatedPersonaAd?.imageUrl)?.generatedPersonaAd;
      const targetImageUrl = persona.imageUrl || recentAd?.imageUrl;

      let imageParts: any[] = [];
      let adContextNote = '';

      if (targetImageUrl) {
        try {
          const rawImg = await urlToRawBase64(targetImageUrl);
          if (rawImg && rawImg.data) {
            imageParts.push({
              inlineData: {
                mimeType: rawImg.mimeType || 'image/jpeg',
                data: rawImg.data
              }
            });
            adContextNote = `
      MULTIMODAL CONTEXT - ADVERTISEMENT VISUAL ATTACHED:
      An ad visual image is attached to this interview.
      ${recentAd?.hook ? `- Visual Concept / Hook: "${recentAd.hook}"` : ''}
      ${recentAd?.flavor ? `- Flavor Featured: "${recentAd.flavor}"` : ''}
      ${recentAd?.sugar ? `- Sugar Formulation: "${recentAd.sugar}"` : ''}
      You MUST examine what you see in the attached image (the aesthetic, layout, colors, products shown, dirty soda/mixology presentation, lighting, copy) and react to it directly from your persona's perspective and personality traits.
            `;
          }
        } catch (imgErr) {
          console.warn("Could not load image part for multimodal persona interview:", imgErr);
        }
      }

      const prompt = `
      You are roleplaying as an authentic consumer persona participating in a focus group for ${companyName}.
      
      PERSONA PROFILE:
      - Name: ${pName}
      - Archetype: ${archetype}
      - Background / Lifestyle / Needs: ${persona.bioLifestyleNeeds || persona.bio || persona.demographics || 'Regular beverage consumer'}
      - Core Values: ${persona.coreValues || 'Taste, Quality, Value'}
      - Category Association: ${companyName} beverages (Squirt Original Grapefruit Soda, Squirt Zero Sugar, Squirt Ruby Red, Mexican Glass Bottle Real Sugar, Paloma Mixers, etc.)
      ${persona.psychographics ? `- Psychographics: ${JSON.stringify(persona.psychographics)}` : ''}

      INTERVIEW QUESTION:
      "${question}"
      ${adContextNote}

      INSTRUCTIONS:
      1. Stay 100% in character as ${pName}. Speak in your distinctive voice, personality, lifestyle habits, and emotional tone.
      2. If you are Arthur Vance (The Skeptical Critic), be discerning, critical of marketing hype or artificial aftertastes, honest about pricing and quality.
      3. If you are Joy Sun (The Enthusiastic Optimist), be vibrant, social, excited about creative flavors, dirty soda mixes, and joyful moments.
      4. If you are Sam Taylor (The Mainstream Generalist), be balanced, pragmatic, everyday practical, and conscious of convenience.
      5. State your personal perspective, answer the question directly, give your exact flavor preference if relevant, and explain why you feel this way. If an image is attached, provide specific visual critique of what you see.

      Return ONLY a JSON object:
      {
        "personaId": "${persona.id || persona.type || pName.toLowerCase().replace(/\s+/g, '_')}",
        "personaName": "${pName}",
        "archetype": "${archetype}",
        "isStandardDefault": ${Boolean(persona.isStandard || persona.isStandardDefault || persona.type?.startsWith('default'))},
        "answer": "In-character direct spoken quote responding to the question...",
        "sentiment": "enthusiastic" | "positive" | "neutral" | "skeptical",
        "favoriteFlavorMentioned": "Specific favorite Squirt flavor mentioned in response",
        "keyReason": "Concise summary of their core rationale"
      }
      Do not use markdown code blocks. Output ONLY raw JSON.
      `;

      const response = await callGenAiProxy("generateContent", {
        model: 'gemini-3.7-flash',
        contents: [{ role: "user", parts: [...imageParts, { text: prompt }] }],
        config: { 
          responseMimeType: "application/json",
          temperature: 0.3,
          thinkingConfig: { thinkingLevel: "LOW" }
        }
      });

      const text = extractTextFromResponse(response) || "{}";
      const clean = text.replace(/```json|```/g, '').trim();
      const parsedResp: PersonaTestingResponse = JSON.parse(clean);

      const assistantMsg: StrategyChatMessage = {
        id: `assistant_${Date.now()}`,
        sender: 'assistant',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        text: `Here is the direct 1-on-1 interview response from **${pName}** (*${archetype}*):`,
        singlePersonaResponse: {
          ...parsedResp,
          personaDetails: persona
        },
        clarifyingOptions: {
          question: `Follow-up options for ${pName}:`,
          options: [
            {
              label: `💬 Ask all 6 personas this question: "${question}"`,
              action: "test_question",
              payload: question
            },
            {
              label: `👥 Compare with Joy Sun (Optimist) perspective`,
              action: "interview_single_persona",
              payload: { persona: DEFAULT_STANDARD_PERSONAS[0], question }
            },
            {
              label: `🔍 View full persona panel`,
              action: "show_current_personas"
            }
          ]
        }
      };

      const updated = [...currentMessages, assistantMsg];
      setMessages(updated);
      saveStrategySession(updated);

    } catch (err: any) {
      console.error("Single persona interview error:", err);
      const errorMsg: StrategyChatMessage = {
        id: `assistant_error_${Date.now()}`,
        sender: 'assistant',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        error: `Could not complete interview with ${pName}: ${err.message}`
      };
      const updated = [...currentMessages, errorMsg];
      setMessages(updated);
    } finally {
      setIsLoading(false);
      setStatusMessage('');
    }
  };

  // Handle User Sending a Prompt
  const handleSendMessage = async (customPrompt?: string) => {
    const text = (customPrompt || inputPrompt).trim();
    if (!text || isLoading) return;

    const userMessage: StrategyChatMessage = {
      id: `user_${Date.now()}`,
      sender: 'user',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      text
    };

    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInputPrompt('');
    setIsLoading(true);
    setStatusMessage('Analyzing request with Gemini 3.5 Flash Lite...');

    try {
      const allPersonas = getAllCurrentPersonas();
      const classification = await classifyStrategyQuery(text, allPersonas);

      // Route 0: Persona Ad Image Generation Prompt
      if (classification.intent === 'prompt_persona_ad') {
        const targetName = (classification.target_persona_name || '').toLowerCase();
        const targetPersona = allPersonas.find(p => {
          const pName = (p.personaName || p.name || '').toLowerCase();
          const firstName = pName.split(' ')[0];
          return (targetName && (pName.includes(targetName) || targetName.includes(pName))) ||
                 (firstName && firstName.length > 2 && targetName.includes(firstName));
        }) || allPersonas[0];

        await runPromptForPersonaImage(targetPersona, newMessages);
        return;
      }

      // Route 1: Direct Conversational / Capability / Unsupported Fallback
      if (classification.intent === 'direct_answer' || classification.intent === 'unsupported') {
        const responseText = classification.direct_answer_text || `I don't currently know how to do that, but here are some other items I can do:\n\n• **1-on-1 Persona Interviews**: Ask individual consumer personas (like Arthur Vance the Critic, Joy Sun the Optimist, or Sam Taylor the Generalist) direct questions about flavors, packaging, pricing, and habits.\n• **6-Persona Focus Group Broadcast**: Broadcast any strategic question or concept to the entire focus group panel and receive simulated sentiment and quotes.\n• **Persona-Targeted Visual Ad Generation**: Generate customized ad imagery and creative hooks tailored to a specific persona using Gemini 3.1 Flash Lite Image.\n• **Synthesize New Personas from Dataset**: Generate fresh, diverse consumer personas based on the synthetic consumer dataset.\n• **Inspect Synthetic Consumer Dataset**: Browse and filter customer records across demographics, beverage rituals, and purchase habits.`;

        const assistantMsg: StrategyChatMessage = {
          id: `assistant_${Date.now()}`,
          sender: 'assistant',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          text: responseText,
          clarifyingOptions: {
            question: "Next actions with the Strategy Agent:",
            options: [
              { label: "💬 Ask a question to all 6 personas", action: "test_question", payload: "What flavor of dr. pepper brands drinks do you like best, why?" },
              { label: "👥 Show the active 6-persona panel", action: "show_personas" },
              { label: "🚀 Generate new personas from dataset", action: "generate_personas" },
              { label: "🎨 Generate persona ad visual", action: "test_question", payload: "Generate an ad visual for Joy Sun" }
            ]
          }
        };

        const updated = [...newMessages, assistantMsg];
        setMessages(updated);
        saveStrategySession(updated);
        setIsLoading(false);
        setStatusMessage('');
        return;
      }

      // Route 2: Single Persona 1-on-1 Interview
      if (classification.intent === 'single_persona_question') {
        const targetName = (classification.target_persona_name || '').toLowerCase();
        const targetPersona = allPersonas.find(p => {
          const pName = (p.personaName || p.name || '').toLowerCase();
          const firstName = pName.split(' ')[0];
          return (targetName && (pName.includes(targetName) || targetName.includes(pName))) ||
                 (firstName && firstName.length > 2 && targetName.includes(firstName));
        }) || allPersonas[0];

        const qToAsk = classification.extracted_question || text;
        await runSinglePersonaInterview(targetPersona, qToAsk, newMessages);
        return;
      }

      // Route 3: Broadcast to All 6 Personas
      if (classification.intent === 'all_personas_question') {
        const qToAsk = classification.extracted_question || text;
        await runSyntheticPersonaTesting(qToAsk, newMessages);
        return;
      }

      // Route 4: Show / View Active Personas
      if (classification.intent === 'show_personas') {
        await displayCurrentPersonas(newMessages);
        return;
      }

      // Route 5: Generate New Personas from Dataset
      if (classification.intent === 'generate_personas') {
        await generatePersonasFromDataset(newMessages, text);
        return;
      }

      // Route 6: Load Last Saved Personas from GCS
      if (classification.intent === 'load_personas') {
        await loadLastGeneratedPersonas(newMessages);
        return;
      }

      // Route 7: View Dataset Table
      if (classification.intent === 'view_dataset') {
        const assistantMsg: StrategyChatMessage = {
          id: `assistant_${Date.now()}`,
          sender: 'assistant',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          text: `Here is the **Squirt Brands Synthetic Dataset** (${SQUIRT_SYNTHETIC_DATASET.length} customer records across Original Grapefruit Citrus, Zero Sugar, Ruby Red, and Mexican Glass Bottle channels):`,
          showDatasetTable: true
        };

        const updated = [...newMessages, assistantMsg];
        setMessages(updated);
        saveStrategySession(updated);
        setIsLoading(false);
        setStatusMessage('');
        return;
      }

      // Route 8: Market Strategy & Grounded Search (Default)
      setStatusMessage(`Analyzing marketing strategy & competitive landscape for "${text}"...`);
      const searchRes = await groundedSearch(`Squirt citrus soda beverage marketing strategy, Paloma trends, and brand growth: ${text}`, companyName);

      let formattedText = '';
      if (typeof searchRes === 'string') {
        formattedText = searchRes;
      } else if (searchRes && typeof searchRes === 'object') {
        formattedText = [
          searchRes.summary ? `**Strategic Summary:**\n${searchRes.summary}\n` : '',
          searchRes.detailed_report ? `**Market Findings:**\n${searchRes.detailed_report}\n` : '',
          searchRes.recommendations && searchRes.recommendations.length > 0 
            ? `**Next Steps for Squirt Marketing:**\n${searchRes.recommendations.map((r: string) => `• ${r}`).join('\n')}` 
            : ''
        ].filter(Boolean).join('\n');
      }

      const assistantMsg: StrategyChatMessage = {
        id: `assistant_${Date.now()}`,
        sender: 'assistant',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        text: formattedText || `Synthesized strategy findings for "${text}". You can also ask me to **create personas**, **view the dataset**, or **ask specific personas direct questions** at any time.`
      };

      const updated = [...newMessages, assistantMsg];
      setMessages(updated);
      saveStrategySession(updated);
      setIsLoading(false);
      setStatusMessage('');

    } catch (err: any) {
      console.error("Strategy agent execution error:", err);
      const errorMsg: StrategyChatMessage = {
        id: `assistant_error_${Date.now()}`,
        sender: 'assistant',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        error: err.message || "An error occurred while communicating with Gemini."
      };
      const updated = [...newMessages, errorMsg];
      setMessages(updated);
      setIsLoading(false);
      setStatusMessage('');
    }
  };

  // Handle clarifying option click
  const handleOptionClick = async (option: { label: string; action: string; payload?: any }) => {
    if (isLoading) return;

    const userChoiceMsg: StrategyChatMessage = {
      id: `user_${Date.now()}`,
      sender: 'user',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      text: option.label
    };

    const newMessages = [...messages, userChoiceMsg];
    setMessages(newMessages);

    if (option.action === 'prompt_for_persona_image' && option.payload) {
      await runPromptForPersonaImage(option.payload.persona, newMessages);
    } else if (option.action === 'generate_persona_ad' && option.payload) {
      const { persona, hook, flavor, sugar } = option.payload;
      await runPersonaAdGeneration(persona, hook, flavor, sugar, newMessages);
    } else if (option.action === 'interview_single_persona' && option.payload) {
      await runSinglePersonaInterview(option.payload.persona, option.payload.question, newMessages);
    } else if (option.action === 'generate_personas') {
      await generatePersonasFromDataset(newMessages);
    } else if (option.action === 'save_and_activate_personas' && option.payload) {
      await saveAndActivatePersonas(option.payload, newMessages);
    } else if (option.action === 'test_question_with_personas' && option.payload) {
      await runSyntheticPersonaTesting(option.payload.question, newMessages, option.payload.personas);
    } else if (option.action === 'test_question' && option.payload) {
      await runSyntheticPersonaTesting(option.payload, newMessages);
    } else if (option.action === 'show_current_personas') {
      await displayCurrentPersonas(newMessages);
    } else if (option.action === 'view_dataset') {
      const assistantMsg: StrategyChatMessage = {
        id: `assistant_${Date.now()}`,
        sender: 'assistant',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        text: `Here is the **Squirt Brands Synthetic Dataset**:`,
        showDatasetTable: true
      };
      const updated = [...newMessages, assistantMsg];
      setMessages(updated);
      saveStrategySession(updated);
    }
  };

  // Filtered dataset records for table view
  const filteredDataset = SQUIRT_SYNTHETIC_DATASET.filter(item => 
    item.name.toLowerCase().includes(datasetSearch.toLowerCase()) ||
    item.segmentArchetype.toLowerCase().includes(datasetSearch.toLowerCase()) ||
    item.preferredFlavor.toLowerCase().includes(datasetSearch.toLowerCase()) ||
    item.location.toLowerCase().includes(datasetSearch.toLowerCase())
  );

  return (
    <div className="flex flex-col h-full max-w-5xl mx-auto w-full px-2 sm:px-4 py-4">
      {/* Top Controls Header: History Drawer, New Session & Reset */}
      <div className="flex items-center justify-between pb-3 mb-2 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-xl bg-purple-50 text-purple-700">
            <Target size={16} />
          </div>
          <div>
            <span className="font-bold text-sm text-gray-900">Strategize Agent</span>
            <span className="ml-2 text-[10px] font-bold text-purple-700 bg-purple-100 px-2 py-0.5 rounded-full">
              Squirt 6-Persona Panel Ready
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* History Drawer Toggle Button */}
          <button
            onClick={() => setShowHistoryDrawer(!showHistoryDrawer)}
            className="px-3 py-1.5 text-xs font-semibold text-gray-700 hover:text-purple-700 bg-white hover:bg-purple-50 border border-gray-200 hover:border-purple-200 rounded-xl transition-all flex items-center gap-1.5 shadow-2xs"
            title="View Past Strategy Sessions & History"
          >
            <History size={13} className="text-purple-600" />
            <span>History</span>
            {sessionsHistory.length > 0 && (
              <span className="ml-1 px-1.5 py-0.2 bg-purple-100 text-purple-800 text-[10px] font-bold rounded-full">
                {sessionsHistory.length}
              </span>
            )}
          </button>

          <button
            onClick={handleResetChat}
            disabled={isLoading || messages.length === 0}
            className="px-3 py-1.5 text-xs font-semibold text-gray-600 hover:text-red-600 bg-white hover:bg-red-50 border border-gray-200 hover:border-red-200 rounded-xl transition-all flex items-center gap-1.5 shadow-2xs disabled:opacity-40 disabled:cursor-not-allowed"
            title="Start a new Strategy session"
          >
            <Plus size={12} />
            New Session
          </button>
        </div>
      </div>

      {/* Main Conversation Stream */}
      <div className="flex-1 overflow-y-auto space-y-6 pb-36">
        {/* Welcome Section */}
        {messages.length === 0 && (
          <div className="space-y-6 animate-fadeIn pt-2">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-xl bg-gradient-to-tr from-purple-600 via-indigo-600 to-rose-500 text-white shrink-0 shadow-xs">
                <Target size={22} className="fill-white" />
              </div>
              <div className="space-y-1">
                <p className="text-gray-900 text-base sm:text-lg font-semibold leading-snug">
                  Hi, I am the <span className="font-bold text-purple-700">Strategize Agent</span>. Ask me to inspect our Squirt dataset, create audience personas, or test questions across our 6 synthetic personas.
                </p>
                <p className="text-xs text-gray-500 italic">
                  *I automatically route prompts to explore datasets, synthesize buyer segments, or broadcast qualitative focus group tests.
                </p>
              </div>
            </div>

            {/* Suggested Strategy Capabilities Grid */}
            <div className="space-y-3 pt-2">
              <h3 className="text-sm font-bold text-gray-800 flex items-center gap-1.5">
                <TrendingUp size={16} className="text-purple-700" />
                Suggested Strategy Capabilities
              </h3>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <button
                  onClick={() => handleSendMessage("What flavor of Squirt brand drinks do you like best, and why?")}
                  className="p-4 bg-white hover:bg-purple-50/50 border border-gray-200 hover:border-purple-600 rounded-2xl text-left transition-all duration-200 shadow-xs hover:shadow-md flex flex-col justify-between h-32 group"
                >
                  <span className="text-xs sm:text-sm font-bold text-gray-900 group-hover:text-purple-700 transition-colors leading-tight">
                    6-Persona Flavor Test
                  </span>
                  <div className="flex justify-between items-center w-full mt-2">
                    <span className="text-[11px] text-gray-500 line-clamp-2">Broadcast flavor question to all 6 personas.</span>
                    <div className="p-1.5 rounded-full bg-gray-50 group-hover:bg-purple-100 text-gray-400 group-hover:text-purple-700 shrink-0 ml-1">
                      <Lightbulb size={14} />
                    </div>
                  </div>
                </button>

                <button
                  onClick={() => handleSendMessage("Create audience personas from the Squirt dataset")}
                  className="p-4 bg-white hover:bg-purple-50/50 border border-gray-200 hover:border-purple-600 rounded-2xl text-left transition-all duration-200 shadow-xs hover:shadow-md flex flex-col justify-between h-32 group"
                >
                  <span className="text-xs sm:text-sm font-bold text-gray-900 group-hover:text-purple-700 transition-colors leading-tight">
                    Generate Personas
                  </span>
                  <div className="flex justify-between items-center w-full mt-2">
                    <span className="text-[11px] text-gray-500 line-clamp-2">Synthesize 3-4 multi-dimensional buyer clusters.</span>
                    <div className="p-1.5 rounded-full bg-gray-50 group-hover:bg-purple-100 text-gray-400 group-hover:text-purple-700 shrink-0 ml-1">
                      <Lightbulb size={14} />
                    </div>
                  </div>
                </button>

                <button
                  onClick={() => handleSendMessage("Show the Squirt synthetic dataset")}
                  className="p-4 bg-white hover:bg-purple-50/50 border border-gray-200 hover:border-purple-600 rounded-2xl text-left transition-all duration-200 shadow-xs hover:shadow-md flex flex-col justify-between h-32 group"
                >
                  <span className="text-xs sm:text-sm font-bold text-gray-900 group-hover:text-purple-700 transition-colors leading-tight">
                    Squirt Dataset
                  </span>
                  <div className="flex justify-between items-center w-full mt-2">
                    <span className="text-[11px] text-gray-500 line-clamp-2">Inspect consumer records & channel spend.</span>
                    <div className="p-1.5 rounded-full bg-gray-50 group-hover:bg-purple-100 text-gray-400 group-hover:text-purple-700 shrink-0 ml-1">
                      <Lightbulb size={14} />
                    </div>
                  </div>
                </button>

                <button
                  onClick={() => handleSendMessage("What is the market growth strategy for Squirt Zero Sugar and Palomas?")}
                  className="p-4 bg-white hover:bg-purple-50/50 border border-gray-200 hover:border-purple-600 rounded-2xl text-left transition-all duration-200 shadow-xs hover:shadow-md flex flex-col justify-between h-32 group"
                >
                  <span className="text-xs sm:text-sm font-bold text-gray-900 group-hover:text-purple-700 transition-colors leading-tight">
                    Zero Sugar Growth
                  </span>
                  <div className="flex justify-between items-center w-full mt-2">
                    <span className="text-[11px] text-gray-500 line-clamp-2">Analyze health switchers & retail expansion.</span>
                    <div className="p-1.5 rounded-full bg-gray-50 group-hover:bg-purple-100 text-gray-400 group-hover:text-purple-700 shrink-0 ml-1">
                      <Lightbulb size={14} />
                    </div>
                  </div>
                </button>
              </div>

              {/* Action Chips */}
              <div className="flex flex-wrap gap-2 pt-2">
                <button
                  onClick={() => handleSendMessage("Show current personas")}
                  className="px-4 py-2 bg-white hover:bg-gray-50 border border-gray-300 hover:border-purple-600 text-gray-700 hover:text-purple-700 rounded-full text-xs font-semibold shadow-2xs transition-all flex items-center gap-1.5"
                >
                  <Eye size={14} className="text-purple-700" />
                  Show Current Personas
                </button>
                <button
                  onClick={() => handleSendMessage("Create audience personas from the Squirt dataset")}
                  className="px-4 py-2 bg-white hover:bg-gray-50 border border-gray-300 hover:border-purple-600 text-gray-700 hover:text-purple-700 rounded-full text-xs font-semibold shadow-2xs transition-all flex items-center gap-1.5"
                >
                  <Users size={14} className="text-indigo-600" />
                  Create AI Personas
                </button>
                <button
                  onClick={() => handleSendMessage("Show the Squirt synthetic dataset")}
                  className="px-4 py-2 bg-white hover:bg-gray-50 border border-gray-300 hover:border-purple-600 text-gray-700 hover:text-purple-700 rounded-full text-xs font-semibold shadow-2xs transition-all flex items-center gap-1.5"
                >
                  <Database size={14} className="text-emerald-600" />
                  View Dataset Table
                </button>
                <button
                  onClick={() => handleSendMessage("What flavor of Squirt brand drinks do you like best, and why?")}
                  className="px-4 py-2 bg-white hover:bg-gray-50 border border-gray-300 hover:border-purple-600 text-gray-700 hover:text-purple-700 rounded-full text-xs font-semibold shadow-2xs transition-all flex items-center gap-1.5"
                >
                  <MessageSquare size={14} className="text-purple-700" />
                  Test Flavor Question (6 Personas)
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Message Stream */}
        {messages.map((msg) => (
          <div key={msg.id} className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'} space-y-2 animate-fadeIn`}>
            <div className="flex items-start gap-2.5 max-w-[92%] sm:max-w-[85%]">
              {msg.sender === 'assistant' && (
                <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-purple-600 to-indigo-600 text-white flex items-center justify-center shrink-0 shadow-2xs mt-0.5">
                  <Target size={16} className="fill-white" />
                </div>
              )}

              <div className="flex flex-col space-y-1.5 w-full">
                <div
                  className={`px-4 py-3 rounded-2xl text-sm leading-relaxed ${
                    msg.sender === 'user'
                      ? 'bg-purple-700 text-white rounded-br-xs shadow-xs'
                      : 'bg-white border border-gray-200 text-gray-800 rounded-bl-xs shadow-xs w-full'
                  }`}
                >
                  {/* Markdown text rendering */}
                  {msg.text && (
                    <div className="whitespace-pre-wrap prose prose-sm max-w-none">
                      {msg.text.split('\n').map((line, lIdx) => {
                        const parts = line.split(/(\*\*.*?\*\*)/g);
                        return (
                          <p key={lIdx} className="mb-1 last:mb-0">
                            {parts.map((part, pIdx) => {
                              if (part.startsWith('**') && part.endsWith('**')) {
                                return <strong key={pIdx} className={msg.sender === 'user' ? 'text-white' : 'text-gray-900 font-bold'}>{part.slice(2, -2)}</strong>;
                              }
                              return part;
                            })}
                          </p>
                        );
                      })}
                    </div>
                  )}

                  {/* Clarifying Options */}
                  {msg.clarifyingOptions && (
                    <div className="mt-4 pt-3 border-t border-gray-100 space-y-2.5">
                      <p className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                        {msg.clarifyingOptions.question}
                      </p>
                      <div className="flex flex-col gap-2">
                        {msg.clarifyingOptions.options.map((opt, oIdx) => (
                          <button
                            key={oIdx}
                            onClick={() => handleOptionClick(opt)}
                            disabled={isLoading}
                            className="w-full text-left px-3.5 py-2.5 bg-gray-50 hover:bg-purple-50 border border-gray-200 hover:border-purple-600 text-gray-800 hover:text-purple-700 rounded-xl text-xs font-semibold transition-all flex items-center justify-between group shadow-2xs"
                          >
                            <span>{opt.label}</span>
                            <ChevronRight size={14} className="text-gray-400 group-hover:text-purple-700 group-hover:translate-x-0.5 transition-transform" />
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Synthetic Persona Testing Results Panel */}
                  {msg.testingResult && (
                    <div className="mt-4 space-y-4 pt-3 border-t border-gray-100 text-gray-900">
                      {/* Summary Capsule */}
                      <div className="p-4 bg-purple-50/70 border border-purple-200 rounded-2xl space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-black text-purple-900 uppercase tracking-wider flex items-center gap-1.5">
                            <Radio size={14} className="text-purple-600 animate-pulse" />
                            6-Persona Qualitative Feedback Synthesis
                          </span>
                          <span className="text-2xs font-bold bg-purple-200 text-purple-900 px-2 py-0.5 rounded-full">
                            3 Generated + 3 Standards
                          </span>
                        </div>
                        <p className="text-xs text-gray-700 leading-relaxed font-medium">
                          {msg.testingResult.summary}
                        </p>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 border-t border-purple-200/60 text-xs">
                          {msg.testingResult.consensusPoints && msg.testingResult.consensusPoints.length > 0 && (
                            <div className="space-y-1">
                              <span className="font-bold text-emerald-900 flex items-center gap-1">
                                <CheckCircle2 size={12} className="text-emerald-600" /> Key Consensus
                              </span>
                              <ul className="text-gray-700 list-disc pl-4 space-y-0.5 text-[11px]">
                                {msg.testingResult.consensusPoints.map((c, idx) => <li key={idx}>{c}</li>)}
                              </ul>
                            </div>
                          )}

                          {msg.testingResult.divergentPoints && msg.testingResult.divergentPoints.length > 0 && (
                            <div className="space-y-1">
                              <span className="font-bold text-amber-900 flex items-center gap-1">
                                <Flame size={12} className="text-amber-600" /> Polarizing Viewpoints
                              </span>
                              <ul className="text-gray-700 list-disc pl-4 space-y-0.5 text-[11px]">
                                {msg.testingResult.divergentPoints.map((d, idx) => <li key={idx}>{d}</li>)}
                              </ul>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* 6 Persona Response Cards Grid */}
                      <div className="space-y-2">
                        <h4 className="text-xs font-bold text-gray-800 flex items-center gap-1.5">
                          <Users size={14} className="text-purple-700" />
                          Individual Spoken Responses (6 Personas)
                        </h4>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {msg.testingResult.responses.map((resp, rIdx) => {
                            const isEnthusiastic = resp.sentiment === 'enthusiastic';
                            const isSkeptical = resp.sentiment === 'skeptical';

                            return (
                              <div
                                key={rIdx}
                                className={`p-4 rounded-2xl border transition-all flex flex-col justify-between space-y-2.5 shadow-2xs ${
                                  resp.isStandardDefault
                                    ? 'bg-amber-50/40 border-amber-200/80'
                                    : 'bg-white border-gray-200 hover:border-purple-600'
                                }`}
                              >
                                <div>
                                  <div className="flex items-start justify-between gap-2 mb-1.5">
                                    <div>
                                      <div className="flex items-center gap-1.5">
                                        <span className="font-black text-xs text-gray-900">{resp.personaName}</span>
                                        <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${
                                          resp.isStandardDefault ? 'bg-amber-100 text-amber-900' : 'bg-purple-100 text-purple-900'
                                        }`}>
                                          {resp.isStandardDefault ? 'Standard' : 'Dataset'}
                                        </span>
                                      </div>
                                      <p className="text-[11px] text-gray-500 font-medium">{resp.archetype}</p>
                                    </div>

                                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold capitalize ${
                                      isEnthusiastic ? 'bg-emerald-100 text-emerald-800' :
                                      isSkeptical ? 'bg-rose-100 text-rose-800' :
                                      'bg-blue-100 text-blue-800'
                                    }`}>
                                      {resp.sentiment}
                                    </span>
                                  </div>

                                  {/* Direct Quote */}
                                  <div className="p-2.5 bg-white/90 border border-gray-100 rounded-xl space-y-1">
                                    <Quote size={12} className="text-purple-600 shrink-0" />
                                    <p className="text-xs text-gray-800 italic leading-relaxed">
                                      "{resp.answer}"
                                    </p>
                                  </div>
                                </div>

                                <div className="pt-2 space-y-1.5 border-t border-gray-100 text-xs">
                                  <div className="flex items-center gap-1.5 text-[11px]">
                                    <span className="font-bold text-purple-800 shrink-0">🎯 Preferred Flavor:</span>
                                    <span className="font-medium text-gray-800 truncate">{resp.favoriteFlavorMentioned || 'Classic 23 Flavors'}</span>
                                  </div>
                                  {resp.keyReason && (
                                    <div className="p-2 bg-gray-50/90 rounded-lg border border-gray-100 text-[11px] leading-relaxed text-gray-700">
                                      <span className="font-bold text-purple-900 mr-1">Core Rationale:</span>
                                      <span>{resp.keyReason}</span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Targeted Persona Creative Ad Visual Card */}
                  {msg.generatedPersonaAd && (
                    <div className="mt-4 p-4 bg-gradient-to-br from-purple-50/80 via-white to-indigo-50/40 border border-purple-200 rounded-2xl shadow-xs space-y-4 text-gray-900">
                      <div className="flex flex-col md:flex-row gap-4 items-start">
                        {/* Visual Image Thumbnail */}
                        <div className="relative group shrink-0 w-full md:w-60 rounded-xl overflow-hidden border border-gray-200 bg-gray-100 aspect-square shadow-2xs">
                          <img
                            src={msg.generatedPersonaAd.imageUrl}
                            alt={msg.generatedPersonaAd.prompt}
                            className="w-full h-full object-cover rounded-xl transition-transform group-hover:scale-105 duration-300"
                          />
                          <a
                            href={msg.generatedPersonaAd.imageUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="absolute bottom-2 right-2 p-1.5 bg-black/75 hover:bg-black text-white rounded-lg text-xs opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 shadow-md"
                            title="Open Full Resolution Asset"
                          >
                            <Eye size={12} />
                            <span className="text-[10px] font-bold">Zoom</span>
                          </a>
                        </div>

                        {/* Details & Psychographic Alignment */}
                        <div className="flex-1 space-y-2.5 min-w-0">
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-[10px] font-bold text-purple-700 bg-purple-100 px-2 py-0.5 rounded-full border border-purple-200">
                                🎨 Tailored Persona Visual
                              </span>
                              <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                                {msg.generatedPersonaAd.sugar}
                              </span>
                              <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-200">
                                Squirt {msg.generatedPersonaAd.flavor}
                              </span>
                            </div>
                            <h4 className="text-sm font-extrabold text-gray-950 mt-1.5">
                              Targeted Persona: {msg.generatedPersonaAd.persona.personaName} ({msg.generatedPersonaAd.persona.status || msg.generatedPersonaAd.persona.archetype})
                            </h4>
                          </div>

                          <div className="p-2.5 bg-white border border-gray-200 rounded-xl space-y-1 text-xs">
                            <div className="flex items-center gap-1.5 font-bold text-gray-800">
                              <Sparkles size={12} className="text-purple-600" />
                              <span>Visual Concept & Hook:</span>
                            </div>
                            <p className="text-gray-700 text-xs font-medium leading-relaxed">
                              "{msg.generatedPersonaAd.hook}"
                            </p>
                          </div>

                          <div className="p-2.5 bg-purple-50/80 border border-purple-100 rounded-xl space-y-1 text-xs">
                            <span className="text-2xs font-extrabold text-purple-900 uppercase tracking-wider">
                              Psychographic Alignment Reason
                            </span>
                            <p className="text-xs text-purple-950 leading-relaxed font-medium">
                              {msg.generatedPersonaAd.alignmentReason}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Single Persona Direct Interview Card */}
                  {msg.singlePersonaResponse && (
                    <div className="mt-4 space-y-3 pt-3 border-t border-gray-100 text-gray-900">
                      <div className="p-4 bg-purple-50/80 border border-purple-200 rounded-2xl shadow-xs space-y-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2.5">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-purple-600 to-indigo-600 text-white flex items-center justify-center font-black text-sm shadow-2xs">
                              {msg.singlePersonaResponse.personaName.charAt(0)}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-extrabold text-sm text-gray-900">{msg.singlePersonaResponse.personaName}</span>
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-900 border border-purple-200">
                                  {msg.singlePersonaResponse.archetype}
                                </span>
                              </div>
                              <p className="text-[11px] text-gray-500 font-medium">1-on-1 Direct Persona Interview</p>
                            </div>
                          </div>

                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold capitalize ${
                            msg.singlePersonaResponse.sentiment === 'enthusiastic' ? 'bg-emerald-100 text-emerald-800' :
                            msg.singlePersonaResponse.sentiment === 'skeptical' ? 'bg-rose-100 text-rose-800' :
                            'bg-blue-100 text-blue-800'
                          }`}>
                            {msg.singlePersonaResponse.sentiment}
                          </span>
                        </div>

                        {/* Direct In-Character Quote */}
                        <div className="p-3.5 bg-white border border-purple-100 rounded-xl space-y-1.5 shadow-2xs">
                          <Quote size={14} className="text-purple-600" />
                          <p className="text-xs text-gray-800 italic leading-relaxed font-medium">
                            "{msg.singlePersonaResponse.answer}"
                          </p>
                        </div>

                        {/* Key Details & Rationale (Dedicated Full-Width Row) */}
                        <div className="space-y-2 text-xs pt-2 border-t border-purple-200/50">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-purple-900">Preferred Flavor:</span>
                            <span className="text-purple-700 font-bold bg-purple-100/80 px-2 py-0.5 rounded-md border border-purple-200">
                              {msg.singlePersonaResponse.favoriteFlavorMentioned || 'Classic 23 Flavors'}
                            </span>
                          </div>
                          {msg.singlePersonaResponse.keyReason && (
                            <div className="p-2.5 bg-white/95 rounded-xl border border-purple-100 space-y-0.5 leading-relaxed">
                              <span className="font-bold text-purple-900 text-2xs uppercase tracking-wider block">
                                Core Rationale
                              </span>
                              <p className="text-xs text-gray-800 font-medium leading-relaxed">
                                {msg.singlePersonaResponse.keyReason}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Interactive Squirt Dataset Table */}
                  {msg.showDatasetTable && (
                    <div className="mt-4 space-y-3 pt-3 border-t border-gray-100 text-gray-900">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="relative flex-1 max-w-xs">
                          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                          <input
                            type="text"
                            value={datasetSearch}
                            onChange={(e) => setDatasetSearch(e.target.value)}
                            placeholder="Filter by flavor, segment, location..."
                            className="w-full pl-8 pr-3 py-1 text-xs bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:border-purple-600 focus:bg-white text-gray-800"
                          />
                        </div>
                        <button
                          onClick={() => handleSendMessage("Create audience personas from this dataset")}
                          className="px-3 py-1.5 bg-purple-700 hover:bg-purple-800 text-white font-bold text-xs rounded-lg transition-colors flex items-center gap-1.5 shrink-0 shadow-2xs"
                        >
                          <Sparkles size={12} />
                          Generate Personas from Dataset
                        </button>
                      </div>

                      <div className="overflow-x-auto rounded-xl border border-gray-200 max-h-72">
                        <table className="w-full text-left text-xs border-collapse">
                          <thead className="bg-gray-50 border-b border-gray-200 text-gray-700 font-bold sticky top-0">
                            <tr>
                              <th className="p-2.5">Name</th>
                              <th className="p-2.5">Segment / Archetype</th>
                              <th className="p-2.5">Preferred Flavor</th>
                              <th className="p-2.5">Channel</th>
                              <th className="p-2.5">Monthly Spend</th>
                              <th className="p-2.5">Location</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100 bg-white">
                            {filteredDataset.map((item) => (
                              <tr key={item.id} className="hover:bg-purple-50/40 transition-colors">
                                <td className="p-2.5 font-bold text-gray-900">{item.name} ({item.age})</td>
                                <td className="p-2.5 text-gray-700">{item.segmentArchetype}</td>
                                <td className="p-2.5 font-medium text-purple-700">{item.preferredFlavor}</td>
                                <td className="p-2.5 text-gray-600">{item.topChannel}</td>
                                <td className="p-2.5 font-mono text-gray-800">${item.monthlySpend.toFixed(2)}</td>
                                <td className="p-2.5 text-gray-500">{item.location}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* Generated & Baseline Control Personas Grid Cards */}
                  {msg.generatedPersonas && msg.generatedPersonas.length > 0 && (
                    <div className="mt-4 space-y-6 pt-3 border-t border-gray-100 text-gray-900">
                      {/* Section 1: Brand-Specific Generated Personas */}
                      <div className="space-y-2.5">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-purple-950 flex items-center gap-1.5">
                            <Users size={14} className="text-purple-600" />
                            Brand-Specific Audience Segments ({msg.generatedPersonas.length} Generated)
                          </span>
                          <span className="text-[10px] font-semibold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-full border border-purple-100">
                            Squirt Dataset
                          </span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                          {msg.generatedPersonas.map((p: any, pIdx: number) => {
                            const psy = p.psychographics;
                            return (
                              <div key={pIdx} className="p-4 bg-white border border-gray-200 hover:border-purple-600 rounded-2xl shadow-xs transition-all flex flex-col justify-between space-y-3">
                                <div className="space-y-2">
                                  <div className="flex items-start justify-between gap-2">
                                    <div className="min-w-0 flex-1">
                                      <span 
                                        className="text-[10px] font-bold text-purple-700 bg-purple-50 border border-purple-100 px-1.5 py-0.5 rounded-md inline-block max-w-full truncate" 
                                        title={p.status || 'Dataset Persona'}
                                      >
                                        {p.status || 'Dataset Persona'}
                                      </span>
                                      <h4 className="text-sm font-black text-gray-900 leading-tight mt-1 truncate" title={p.personaName || p.name}>
                                        {p.personaName || p.name}
                                      </h4>
                                      {p.name && p.name !== p.personaName && (
                                        <p className="text-[11px] font-medium text-gray-500 truncate mt-0.5" title={p.name}>
                                          {p.name}
                                        </p>
                                      )}
                                    </div>

                                    {p.imageUrl ? (
                                      <img 
                                        src={p.imageUrl} 
                                        alt={p.personaName || p.name} 
                                        className="w-10 h-10 rounded-full object-cover border-2 border-purple-300 shrink-0 shadow-2xs" 
                                      />
                                    ) : (
                                      <div className="w-8 h-8 rounded-full bg-purple-100 text-purple-700 font-black text-xs flex items-center justify-center shrink-0">
                                        {(p.personaName || p.name || 'P').charAt(0)}
                                      </div>
                                    )}
                                  </div>

                                  {/* Demographics & Core Strategic Profile */}
                                  <div className="space-y-1 text-[11px] bg-gray-50 p-2.5 rounded-xl border border-gray-100">
                                    {(p.ageRange || p.incomeRange) && (
                                      <div className="flex items-center justify-between text-[10px]">
                                        <span className="text-gray-500 font-bold">
                                          {p.ageRange ? `Age ${p.ageRange}` : ''} {p.incomeRange ? `• ${p.incomeRange}` : ''}
                                        </span>
                                        {p.brandEngagement && (
                                          <span className="font-bold text-[9px] px-1.5 py-0.2 bg-emerald-50 text-emerald-800 rounded border border-emerald-200">
                                            {p.brandEngagement.includes('High') ? 'High Engagement' : p.brandEngagement}
                                          </span>
                                        )}
                                      </div>
                                    )}
                                    {p.coreValues && (
                                      <div><span className="text-gray-400 font-medium">Core Driver:</span> <span className="font-semibold text-gray-900">{p.coreValues}</span></div>
                                    )}
                                    {p.whatTheyWant && (
                                      <div><span className="text-gray-400 font-medium">Desire:</span> <span className="font-medium text-gray-800 italic">{p.whatTheyWant}</span></div>
                                    )}
                                    <div><span className="text-gray-400">Location:</span> <span className="font-semibold text-gray-800">{p.location || 'US Metro'}</span></div>
                                    
                                    {/* Competitors & Recommended Products */}
                                    {p.competitorBrands && Array.isArray(p.competitorBrands) && p.competitorBrands.length > 0 && (
                                      <div className="pt-1">
                                        <span className="text-[10px] text-gray-400 font-bold block mb-0.5">Competitor Targets:</span>
                                        <div className="flex flex-wrap gap-1">
                                          {p.competitorBrands.map((c: string, cIdx: number) => (
                                            <span key={cIdx} className="text-[9px] bg-rose-50 border border-rose-100 text-rose-800 px-1.5 py-0.2 rounded font-medium">
                                              {c}
                                            </span>
                                          ))}
                                        </div>
                                      </div>
                                    )}

                                    {p.recommendedProducts && Array.isArray(p.recommendedProducts) && p.recommendedProducts.length > 0 && (
                                      <div className="pt-1">
                                        <span className="text-[10px] text-gray-400 font-bold block mb-0.5">Recommended Products:</span>
                                        <div className="flex flex-wrap gap-1">
                                          {p.recommendedProducts.map((prod: string, prodIdx: number) => (
                                            <span key={prodIdx} className="text-[9px] bg-blue-50 border border-blue-100 text-blue-800 px-1.5 py-0.2 rounded font-medium">
                                              {prod}
                                            </span>
                                          ))}
                                        </div>
                                      </div>
                                    )}
                                  </div>

                                  {/* Psychographics Profile Pills */}
                                  {psy && (
                                    <div className="p-2.5 bg-purple-50/50 border border-purple-100/70 rounded-xl space-y-1.5 text-[11px]">
                                      <div>
                                        <span className="text-[10px] font-bold text-purple-900 uppercase tracking-wider block">
                                          Psychographics
                                        </span>
                                      </div>

                                      {/* Drink Choice (Sugar / Zero Sugar / Mixed) */}
                                      {psy.sugarPreference && (
                                        <div className="flex items-center gap-1.5 text-[10px]">
                                          <span className="text-gray-500 font-medium">Drink Choice:</span>
                                          <span className={`font-bold px-1.5 py-0.5 rounded-md inline-block ${
                                            (psy.sugarPreference || '').includes('Zero') ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-900'
                                          }`}>
                                            {psy.sugarPreference}
                                          </span>
                                        </div>
                                      )}

                                      {psy.personalityTraits && Array.isArray(psy.personalityTraits) && (
                                        <div className="flex flex-wrap gap-1 pt-0.5">
                                          {psy.personalityTraits.slice(0, 3).map((trait: string, tIdx: number) => (
                                            <span key={tIdx} className="text-[10px] bg-white border border-purple-100 text-purple-900 px-1.5 py-0.2 rounded-md font-medium">
                                              {trait}
                                            </span>
                                          ))}
                                        </div>
                                      )}

                                      {psy.flavorAffinity && (
                                        <div className="text-[10px] text-gray-700 truncate pt-0.5">
                                          <span className="font-semibold text-purple-800">Affinity:</span> {psy.flavorAffinity}
                                        </div>
                                      )}
                                    </div>
                                  )}

                                  <p className="text-xs text-gray-600 leading-relaxed line-clamp-3">
                                    {p.bioLifestyleNeeds || p.bio}
                                  </p>
                                </div>

                                <div className="space-y-2 pt-1 border-t border-gray-100">
                                  {p.nba && (
                                    <div className="p-2.5 bg-purple-50/70 border border-purple-100 rounded-xl space-y-0.5">
                                      <span className="text-2xs font-bold text-purple-900 uppercase tracking-wider">Next Best Action</span>
                                      <p className="text-xs text-purple-950 font-medium leading-snug">{p.nba}</p>
                                    </div>
                                  )}

                                  <div className="grid grid-cols-2 gap-1.5">
                                    <button
                                      onClick={() => handleSendMessage(`Ask ${p.personaName || p.name}: What is your favorite Squirt flavor and what makes you buy it?`)}
                                      className="w-full py-1.5 px-2 text-[11px] font-bold bg-purple-50 hover:bg-purple-100 text-purple-800 border border-purple-200 rounded-xl transition-colors flex items-center justify-center gap-1 cursor-pointer shadow-2xs"
                                    >
                                      <MessageCircle size={12} />
                                      <span className="truncate">Interview</span>
                                    </button>

                                    <button
                                      onClick={() => handleOptionClick({
                                        label: `🎨 Generate Visual for ${p.personaName || p.name}`,
                                        action: 'prompt_for_persona_image',
                                        payload: { persona: p }
                                      })}
                                      className="w-full py-1.5 px-2 text-[11px] font-bold bg-indigo-50 hover:bg-indigo-100 text-indigo-800 border border-indigo-200 rounded-xl transition-colors flex items-center justify-center gap-1 cursor-pointer shadow-2xs"
                                    >
                                      <Sparkles size={12} className="text-indigo-600" />
                                      <span className="truncate">Generate Ad</span>
                                    </button>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Section 2: Standard Baseline Control Personas (Optimist, Pessimist, Neutral) */}
                      <div className="space-y-2.5 pt-2 border-t border-gray-100">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-gray-900 flex items-center gap-1.5">
                            <ShieldCheck size={14} className="text-[#1A73E8]" />
                            Standard Baseline Control Panel (3 Baseline Controls)
                          </span>
                          <span className="text-[10px] font-semibold text-gray-600 bg-gray-100 px-2 py-0.5 rounded-full border border-gray-200">
                            Persistent Benchmark
                          </span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                          {DEFAULT_STANDARD_PERSONAS.map((sp: any, spIdx: number) => {
                            const isOptimist = sp.id === 'default_optimist';
                            const isPessimist = sp.id === 'default_pessimist';
                            const badgeColor = isOptimist 
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-200' 
                              : isPessimist 
                              ? 'bg-rose-50 text-rose-800 border-rose-200' 
                              : 'bg-blue-50 text-blue-800 border-blue-200';

                            const avatarColor = isOptimist 
                              ? 'bg-emerald-100 text-emerald-700' 
                              : isPessimist 
                              ? 'bg-rose-100 text-rose-700' 
                              : 'bg-blue-100 text-blue-700';

                            const psy = sp.psychographics;

                            return (
                              <div key={spIdx} className="p-4 bg-white border border-gray-200 hover:border-[#1A73E8] rounded-2xl shadow-xs transition-all flex flex-col justify-between space-y-3">
                                <div className="space-y-2">
                                  <div className="flex items-start justify-between gap-2">
                                    <div className="min-w-0 flex-1">
                                      <span className={`text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-md border ${badgeColor} inline-block max-w-full truncate`} title={sp.status}>
                                        {sp.status}
                                      </span>
                                      <h4 className="text-sm font-black text-gray-900 leading-tight mt-1 truncate" title={sp.personaName}>{sp.personaName}</h4>
                                      {sp.name && sp.name !== sp.personaName && (
                                        <p className="text-[11px] font-medium text-gray-500 truncate mt-0.5" title={sp.name}>{sp.name}</p>
                                      )}
                                    </div>

                                    {sp.imageUrl ? (
                                      <img 
                                        src={sp.imageUrl} 
                                        alt={sp.personaName} 
                                        className="w-10 h-10 rounded-full object-cover border-2 border-blue-300 shrink-0 shadow-2xs" 
                                      />
                                    ) : (
                                      <div className={`w-8 h-8 rounded-full ${avatarColor} font-black text-xs flex items-center justify-center shrink-0`}>
                                        {sp.personaName.charAt(0)}
                                      </div>
                                    )}
                                  </div>

                                  <div className="space-y-1 text-[11px] bg-gray-50 p-2 rounded-xl border border-gray-100">
                                    <div><span className="text-gray-400">Location:</span> <span className="font-semibold text-gray-800">{sp.location}</span></div>
                                    <div><span className="text-gray-400">Mindset:</span> <span className="font-semibold text-gray-800">{sp.financialHealth}</span></div>
                                    <div><span className="text-gray-400">Control Driver:</span> <span className="font-semibold text-gray-800">{sp.lifeEvent}</span></div>
                                  </div>

                                  {/* Psychographics Profile Pills */}
                                  {psy && (
                                    <div className="p-2.5 bg-gray-50 border border-gray-100 rounded-xl space-y-1.5 text-[11px]">
                                      <div>
                                        <span className="text-[10px] font-bold text-gray-700 uppercase tracking-wider block">
                                          Psychographics
                                        </span>
                                      </div>

                                      {/* Drink Choice (Sugar / Zero Sugar / Mixed) */}
                                      {psy.sugarPreference && (
                                        <div className="flex items-center gap-1.5 text-[10px]">
                                          <span className="text-gray-500 font-medium">Drink Choice:</span>
                                          <span className={`font-bold px-1.5 py-0.5 rounded-md inline-block ${
                                            (psy.sugarPreference || '').includes('Zero') ? 'bg-emerald-100 text-emerald-800' : 'bg-blue-100 text-blue-900'
                                          }`}>
                                            {psy.sugarPreference}
                                          </span>
                                        </div>
                                      )}

                                      {psy.personalityTraits && (
                                        <div className="flex flex-wrap gap-1 pt-0.5">
                                          {psy.personalityTraits.slice(0, 3).map((trait: string, tIdx: number) => (
                                            <span key={tIdx} className="text-[10px] bg-white border border-gray-200 text-gray-700 px-1.5 py-0.2 rounded-md font-medium">
                                              {trait}
                                            </span>
                                          ))}
                                        </div>
                                      )}
                                    </div>
                                  )}

                                  <p className="text-xs text-gray-600 leading-relaxed line-clamp-3">
                                    {sp.bioLifestyleNeeds}
                                  </p>
                                </div>

                                <div className="space-y-2 pt-1 border-t border-gray-100">
                                  {sp.nba && (
                                    <div className="p-2.5 bg-gray-50 border border-gray-200 rounded-xl space-y-0.5">
                                      <span className="text-2xs font-bold text-gray-700 uppercase tracking-wider">Benchmark Role</span>
                                      <p className="text-xs text-gray-800 font-medium leading-snug">{sp.nba}</p>
                                    </div>
                                  )}

                                  <div className="grid grid-cols-2 gap-1.5">
                                    <button
                                      onClick={() => handleSendMessage(`Ask ${sp.personaName}: What would convince you to buy or switch to Squirt products?`)}
                                      className="w-full py-1.5 px-2 text-[11px] font-bold bg-blue-50 hover:bg-blue-100 text-[#1A73E8] border border-blue-200 rounded-xl transition-colors flex items-center justify-center gap-1 cursor-pointer shadow-2xs"
                                    >
                                      <MessageCircle size={12} />
                                      <span className="truncate">Interview</span>
                                    </button>

                                    <button
                                      onClick={() => handleOptionClick({
                                        label: `🎨 Generate Visual for ${sp.personaName}`,
                                        action: 'prompt_for_persona_image',
                                        payload: { persona: sp }
                                      })}
                                      className="w-full py-1.5 px-2 text-[11px] font-bold bg-indigo-50 hover:bg-indigo-100 text-indigo-800 border border-indigo-200 rounded-xl transition-colors flex items-center justify-center gap-1 cursor-pointer shadow-2xs"
                                    >
                                      <Sparkles size={12} className="text-indigo-600" />
                                      <span className="truncate">Generate Ad</span>
                                    </button>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Error Card */}
                  {msg.error && (
                    <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs space-y-1 mt-2">
                      <div className="flex items-center gap-1.5 font-bold">
                        <AlertCircle size={16} className="text-red-600" />
                        Execution Error
                      </div>
                      <p className="text-gray-700 font-mono text-[11px] break-all">{msg.error}</p>
                    </div>
                  )}
                </div>

                <span className="text-[10px] text-gray-400 px-1">
                  {msg.timestamp}
                </span>
              </div>

              {msg.sender === 'user' && (
                <div 
                  className="w-8 h-8 rounded-full text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs mt-0.5 bg-purple-700"
                >
                  {companyName.charAt(0)}
                </div>
              )}
            </div>
          </div>
        ))}

        {/* Live Loading Indicator */}
        {isLoading && (
          <div className="flex items-start gap-2.5 animate-fadeIn">
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-purple-600 to-indigo-600 text-white flex items-center justify-center shrink-0 shadow-2xs">
              <Loader2 size={16} className="animate-spin" />
            </div>
            <div className="bg-white border border-gray-200 px-4 py-3 rounded-2xl rounded-bl-xs text-xs text-gray-600 shadow-xs flex items-center gap-2">
              <div className="animate-pulse flex items-center gap-2">
                <span className="inline-block w-2 h-2 rounded-full bg-purple-600"></span>
                <span className="font-semibold text-gray-800">{statusMessage || 'Processing with Gemini...'}</span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Slide-in Past Sessions History Drawer */}
      {showHistoryDrawer && (
        <div className="fixed inset-y-0 right-0 w-80 sm:w-96 bg-white border-l border-gray-200 shadow-2xl z-50 flex flex-col animate-slideLeft">
          <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-purple-50/50">
            <div className="flex items-center gap-2">
              <History size={16} className="text-purple-700" />
              <span className="font-bold text-sm text-gray-900">Strategy History</span>
            </div>
            <button 
              onClick={() => setShowHistoryDrawer(false)}
              className="p-1 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100"
            >
              <X size={16} />
            </button>
          </div>

          <div className="p-3 border-b border-gray-100 flex items-center justify-between">
            <span className="text-xs text-gray-500 font-medium">{sessionsHistory.length} Saved Sessions</span>
            <button
              onClick={handleResetChat}
              className="text-xs font-bold text-purple-700 hover:underline flex items-center gap-1"
            >
              <Plus size={13} /> New Session
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
            {sessionsHistory.length === 0 ? (
              <div className="text-center py-12 text-gray-400 text-xs">
                No past strategy sessions recorded yet. Start a persona test or create audiences to save sessions automatically.
              </div>
            ) : (
              sessionsHistory.map((sess) => {
                const isActive = sess.sessionId === currentSessionId;
                const isEditing = editingSessionId === sess.sessionId;
                return (
                  <div
                    key={sess.sessionId}
                    onClick={() => restorePastSession(sess)}
                    className={`group p-3 rounded-2xl border transition-all cursor-pointer flex items-start gap-3 relative ${
                      isActive 
                        ? 'bg-purple-50 border-purple-300 shadow-xs' 
                        : 'bg-white hover:bg-gray-50 border-gray-200 hover:border-purple-300'
                    }`}
                  >
                    <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center shrink-0 relative">
                      <Target size={16} />
                      {sess.isPinned && (
                        <div className="absolute -top-1 -right-1 bg-amber-400 text-amber-950 p-0.5 rounded-full shadow-2xs z-10" title="Pinned to top">
                          <Star size={9} className="fill-amber-950" />
                        </div>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        {isEditing ? (
                          <div className="flex items-center gap-1 w-full" onClick={(e) => e.stopPropagation()}>
                            <input
                              type="text"
                              value={editingTitle}
                              onChange={(e) => setEditingTitle(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  handleRenameSession(sess.sessionId, editingTitle);
                                  setEditingSessionId(null);
                                } else if (e.key === 'Escape') {
                                  setEditingSessionId(null);
                                }
                              }}
                              className="w-full px-2 py-0.5 text-xs font-bold text-gray-900 bg-white border border-purple-400 rounded-md focus:outline-hidden focus:ring-1 focus:ring-purple-500"
                              autoFocus
                            />
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRenameSession(sess.sessionId, editingTitle);
                                setEditingSessionId(null);
                              }}
                              className="p-1 text-purple-700 hover:text-purple-900 hover:bg-purple-100 rounded"
                              title="Save Title"
                            >
                              <Check size={13} />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingSessionId(null);
                              }}
                              className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded"
                              title="Cancel"
                            >
                              <X size={13} />
                            </button>
                          </div>
                        ) : (
                          <>
                            <span className="font-bold text-xs text-gray-900 truncate" title={sess.title}>
                              {sess.title}
                            </span>
                            <div className="flex items-center gap-1 shrink-0">
                              {/* Pin/Star Button */}
                              <button
                                onClick={(e) => handleTogglePinSession(sess.sessionId, e)}
                                className={`p-1 rounded-lg transition-colors ${
                                  sess.isPinned 
                                    ? 'text-amber-500 hover:text-amber-600 bg-amber-50' 
                                    : 'text-gray-300 hover:text-amber-500 opacity-0 group-hover:opacity-100'
                                }`}
                                title={sess.isPinned ? "Unpin session" : "Pin/Star session to top"}
                              >
                                <Star size={13} className={sess.isPinned ? "fill-amber-400 text-amber-500" : ""} />
                              </button>
                              {/* Rename Button */}
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setEditingSessionId(sess.sessionId);
                                  setEditingTitle(sess.title);
                                }}
                                className="text-gray-400 hover:text-purple-700 p-1 rounded-lg hover:bg-purple-50 opacity-0 group-hover:opacity-100 transition-opacity"
                                title="Rename session"
                              >
                                <Pencil size={12} />
                              </button>
                              {/* Delete Button */}
                              <button
                                onClick={(e) => handleDeleteSession(sess.sessionId, e)}
                                className="text-gray-400 hover:text-red-600 p-1 rounded-lg hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-opacity"
                                title="Delete this session from history"
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        {sess.personaCount !== undefined && sess.personaCount > 0 && (
                          <span className="text-[9px] font-bold text-purple-700 bg-purple-100 px-1.5 py-0.2 rounded-md flex items-center gap-0.5">
                            <Users size={9} /> {sess.personaCount} Personas
                          </span>
                        )}
                        {sess.lastTestedQuestion && (
                          <span className="text-[9px] font-medium text-gray-500 truncate max-w-[120px]">
                            {sess.lastTestedQuestion}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center justify-between text-[10px] text-gray-400 mt-1">
                        <div className="flex items-center gap-1.5">
                          <span>{sess.timestamp}</span>
                          {sess.isPinned && (
                            <span className="text-[9px] font-bold text-amber-700 bg-amber-100/80 px-1.5 py-0.2 rounded-full flex items-center gap-0.5">
                              <Star size={8} className="fill-amber-600 text-amber-600" /> Pinned
                            </span>
                          )}
                        </div>
                        <span>{sess.messageCount} msg{sess.messageCount === 1 ? '' : 's'}</span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* Floating Centered Bottom Chat Input Box */}
      <div className="fixed bottom-4 left-0 md:left-72 right-0 max-w-4xl mx-auto px-4 z-30 pointer-events-none">
        <div className="bg-white border border-gray-300 rounded-3xl shadow-xl p-3 sm:p-4 space-y-2 transition-all focus-within:border-purple-600 focus-within:ring-2 focus-within:ring-purple-100 pointer-events-auto">
          <div className="flex items-start gap-2">
            <textarea
              ref={inputRef}
              value={inputPrompt}
              onChange={(e) => setInputPrompt(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
              placeholder="Ask Strategize Agent or test personas (e.g. 'What flavor do you like best, why?')..."
              rows={1}
              className="w-full resize-none border-none outline-none text-sm text-gray-800 placeholder-gray-400 bg-transparent max-h-32 min-h-[2.5rem] py-1"
            />

            <button
              onClick={() => handleSendMessage()}
              disabled={!inputPrompt.trim() || isLoading}
              className="p-2.5 rounded-full bg-purple-700 hover:bg-purple-800 disabled:bg-gray-200 text-white transition-all shadow-xs shrink-0"
              title="Send Prompt"
            >
              <Send size={16} className={inputPrompt.trim() ? "translate-x-0.5" : ""} />
            </button>
          </div>

          {/* Bottom Action Menu Bar */}
          <div className="flex items-center justify-between border-t border-gray-100 pt-2 text-xs text-gray-500">
            <div className="flex items-center gap-1.5 sm:gap-2">
              <div className="relative">
                <button
                  onClick={() => setShowPlusMenu(!showPlusMenu)}
                  className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-600 hover:text-gray-900 transition-colors flex items-center gap-1"
                  title="Quick Actions"
                >
                  <Plus size={16} />
                </button>

                {showPlusMenu && (
                  <div className="absolute bottom-full mb-2 left-0 w-72 bg-white border border-gray-200 rounded-2xl shadow-xl py-2 z-50 text-xs">
                    <button
                      onClick={() => {
                        setShowPlusMenu(false);
                        handleSendMessage("What flavor of Squirt brand drinks do you like best, and why?");
                      }}
                      className="w-full px-3 py-2 text-left hover:bg-purple-50 text-gray-700 flex items-center gap-2"
                    >
                      <MessageSquare size={14} className="text-purple-600" />
                      Test: "What flavor do you like best, why?"
                    </button>
                    <button
                      onClick={() => {
                        setShowPlusMenu(false);
                        handleSendMessage("Show current personas");
                      }}
                      className="w-full px-3 py-2 text-left hover:bg-purple-50 text-gray-700 flex items-center gap-2"
                    >
                      <Eye size={14} className="text-purple-600" />
                      Show Current Personas
                    </button>
                    <button
                      onClick={() => {
                        setShowPlusMenu(false);
                        handleSendMessage("Create audience personas from the Squirt dataset");
                      }}
                      className="w-full px-3 py-2 text-left hover:bg-purple-50 text-gray-700 flex items-center gap-2"
                    >
                      <Users size={14} className="text-indigo-600" />
                      Generate Audience Personas
                    </button>
                    <button
                      onClick={() => {
                        setShowPlusMenu(false);
                        handleSendMessage("Show the Squirt synthetic dataset");
                      }}
                      className="w-full px-3 py-2 text-left hover:bg-purple-50 text-gray-700 flex items-center gap-2"
                    >
                      <Database size={14} className="text-emerald-600" />
                      View Squirt Dataset
                    </button>
                    <button
                      onClick={() => {
                        setShowPlusMenu(false);
                        handleSendMessage("Load last generated personas");
                      }}
                      className="w-full px-3 py-2 text-left hover:bg-purple-50 text-gray-700 flex items-center gap-2"
                    >
                      <RotateCw size={14} className="text-amber-600" />
                      Load Last Personas
                    </button>
                  </div>
                )}
              </div>

              {/* Model Callout Badge in Light Gray */}
              <span className="text-[11px] font-medium text-gray-400 bg-gray-100/90 px-2 py-0.5 rounded-md flex items-center gap-1 border border-gray-200/60 shadow-2xs">
                <Sparkles size={11} className="text-gray-400" />
                gemini-3.7-flash (low)
              </span>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={handleResetChat}
                disabled={isLoading || messages.length === 0}
                className="text-[11px] font-semibold text-gray-500 hover:text-red-600 flex items-center gap-1 disabled:opacity-40 transition-colors"
                title="Reset Strategize Chat to Start"
              >
                <RefreshCw size={12} />
                Reset Chat
              </button>

              <button
                onClick={loadLastStrategySession}
                className="text-[11px] font-semibold text-gray-500 hover:text-purple-700 flex items-center gap-1"
                title="Load Last Saved Session from GCS"
              >
                <RotateCw size={12} />
                Load Last
              </button>

              {isSaving && (
                <span className="text-[10px] text-gray-400 animate-pulse flex items-center gap-1">
                  <Save size={10} /> Saving...
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
