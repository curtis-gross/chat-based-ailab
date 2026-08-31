import React, { useState, useEffect, useRef } from 'react';
import { 
  ShieldCheck, 
  Send, 
  Plus, 
  Upload, 
  Image as ImageIcon, 
  Sparkles, 
  CheckCircle2, 
  AlertTriangle, 
  AlertCircle, 
  RotateCw, 
  Loader2, 
  ChevronRight, 
  RefreshCw, 
  Save, 
  Lightbulb, 
  TrendingUp,
  Download, 
  ExternalLink, 
  Maximize2,
  Trash2,
  History,
  Clock,
  ArrowRight,
  FolderHeart,
  X,
  FileCheck,
  Award,
  Layers,
  Tag,
  Check,
  Info,
  Scale,
  ShieldAlert,
  Gavel,
  ShoppingBag,
  Trophy,
  Target,
  BarChart3,
  Flame,
  Zap,
  Store,
  Star,
  Pin,
  Pencil,
  Film,
  Video,
  Play
} from 'lucide-react';
import { useCompanyContext } from '../context/CompanyContext';
import { useAppConfig } from '../context/AppConfigContext';
import { callGenAiProxy, extractTextFromResponse, safeJsonParse, saveImageToGCS, urlToRawBase64, analyzeCreatorPartnerVideo, getVideoId } from '../services/geminiService';

export interface CompetitiveInsights {
  bigNameMatchup: {
    rivals: string[];
    advantage: string;
    vulnerability: string;
    verdict: string;
  };
  houseBrandMatchup: {
    rivals: string[];
    premiumSeparation: string;
    designDefensibility: string;
    verdict: string;
  };
  challengerMatchup?: {
    rivals: string[];
    modernAestheticAppeal: string;
    verdict: string;
  };
  shelfEyeShare?: string;
  retailReadinessRating?: string;
}

export interface ImageAuditScorecard {
  overallScore: number;
  verdict: 'PASSED' | 'CAUTION' | 'NEEDS_REVISION';
  description: string;
  auditLens?: string;
  categoryScores: {
    visualHierarchy: number;
    brandIdentity: number;
    lightingAndPalette: number;
    commercialAppeal: number;
  };
  categoryLabels?: {
    visualHierarchy?: string;
    brandIdentity?: string;
    lightingAndPalette?: string;
    commercialAppeal?: string;
  };
  metadataTags: string[];
  pros: string[];
  cons: string[];
  actionableRecommendations: string[];
  competitiveInsights?: CompetitiveInsights;
}

export interface AuditGalleryItem {
  id: string;
  urlOrBase64: string;
  title: string;
  score?: number;
  verdict?: string;
  timestamp: string;
}

export interface AuditSessionSummary {
  sessionId: string;
  title: string;
  timestamp: string;
  messageCount: number;
  previewImage?: string;
  lastScore?: number;
  currentReferenceImage?: string | null;
  isPinned?: boolean;
  messages: AuditChatMessage[];
}

export interface AuditChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  timestamp: string;
  text?: string;
  uploadedImageBase64?: string;
  auditResult?: ImageAuditScorecard;
  videoAuditResult?: any;
  videoInfo?: {
    videoId: string;
    videoUrl: string;
    title?: string;
  };
  clarifyingOptions?: {
    question: string;
    options: { label: string; action: string; payload?: any }[];
  };
  error?: string;
}

export const extractYouTubeInfo = (text: string): { url: string; videoId: string } | null => {
  if (!text || typeof text !== 'string') return null;
  const urlRegex = /(https?:\/\/(?:www\.)?(?:youtube\.com\/(?:watch\?v=|embed\/|v\/|shorts\/)|youtu\.be\/)[a-zA-Z0-9_-]{11}(?:[^\s]*))/i;
  const match = text.match(urlRegex);
  if (match) {
    const url = match[0];
    const idMatch = url.match(/(?:v=|embed\/|v\/|shorts\/|youtu\.be\/)([a-zA-Z0-9_-]{11})/i);
    return { url, videoId: idMatch ? idMatch[1] : '' };
  }

  const idRegex = /\b([a-zA-Z0-9_-]{11})\b/;
  const idOnlyMatch = text.match(idRegex);
  if (idOnlyMatch && (text.toLowerCase().includes('video') || text.toLowerCase().includes('youtube') || text.toLowerCase().includes('creator'))) {
    return { url: `https://www.youtube.com/watch?v=${idOnlyMatch[1]}`, videoId: idOnlyMatch[1] };
  }

  return null;
};

const formatImageSrc = (src?: string | null): string => {
  if (!src) return '';
  if (src.startsWith('data:') || src.startsWith('blob:')) {
    return src;
  }
  if ((src.startsWith('http://') || src.startsWith('https://') || src.startsWith('/') || src.startsWith('./')) && src.length < 1000) {
    return src;
  }
  return `data:image/jpeg;base64,${src.replace(/^data:image\/\w+;base64,/, '')}`;
};

const openImageInNewTab = (base64OrUrl: string) => {
  const formattedUrl = formatImageSrc(base64OrUrl);
  try {
    const newWindow = window.open();
    if (newWindow) {
      newWindow.document.write(`
        <html>
          <head>
            <title>Audit Image Preview</title>
            <style>
              body {
                margin: 0;
                background-color: #0e0e10;
                display: flex;
                justify-content: center;
                align-items: center;
                height: 100vh;
                font-family: system-ui, -apple-system, sans-serif;
              }
              img {
                max-width: 95%;
                max-height: 95%;
                object-fit: contain;
                box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
                border-radius: 8px;
              }
            </style>
          </head>
          <body>
            <img src="${formattedUrl}" alt="Audit Preview" />
          </body>
        </html>
      `);
      newWindow.document.close();
    }
  } catch (e) {
    window.open(formattedUrl, '_blank');
  }
};

export const AuditChatAgent: React.FC = () => {
  const { name } = useCompanyContext();
  const { config } = useAppConfig();
  const companyName = config?.branding.companyName || name || 'Brand';

  const [inputPrompt, setInputPrompt] = useState('');
  const [messages, setMessages] = useState<AuditChatMessage[]>([]);
  const [currentReferenceImage, setCurrentReferenceImage] = useState<string | null>(null);
  const [gallery, setGallery] = useState<AuditGalleryItem[]>([]);
  const [sessionsHistory, setSessionsHistory] = useState<AuditSessionSummary[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string>(`session_${Date.now()}`);
  
  const [showHistoryDrawer, setShowHistoryDrawer] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [showPlusMenu, setShowPlusMenu] = useState(false);
  const [showVideoModal, setShowVideoModal] = useState(false);
  const [videoUrlInput, setVideoUrlInput] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState<string>('');

  const sortSessions = (sessions: AuditSessionSummary[]): AuditSessionSummary[] => {
    return [...sessions].sort((a, b) => {
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      return 0;
    });
  };

  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading, statusMessage]);

  useEffect(() => {
    initAuditAgent();
  }, []);

  // Initialize: load last active session, past uploaded gallery, and session history
  const initAuditAgent = async () => {
    try {
      // 1. Load Past Gallery Assets
      const galleryRes = await fetch(`/api/load-run/audit_agent_gallery?companyName=${encodeURIComponent(companyName)}`);
      if (galleryRes.ok) {
        const galData = await galleryRes.json();
        if (galData && Array.isArray(galData.items) && galData.items.length > 0) {
          setGallery(galData.items);
        }
      }
    } catch (e) {
      console.warn("Could not load audit gallery:", e);
    }

    try {
      // 2. Load Sessions History List
      const historyRes = await fetch(`/api/load-run/audit_agent_history?companyName=${encodeURIComponent(companyName)}`);
      if (historyRes.ok) {
        const histData = await historyRes.json();
        if (histData && Array.isArray(histData.sessions) && histData.sessions.length > 0) {
          setSessionsHistory(histData.sessions);
        }
      }
    } catch (e) {
      console.warn("Could not load audit sessions history:", e);
    }

    try {
      // 3. Load Last Active Session
      const sessionRes = await fetch(`/api/load-run/audit_agent_session?companyName=${encodeURIComponent(companyName)}`);
      if (sessionRes.ok) {
        const sessData = await sessionRes.json();
        if (sessData && Array.isArray(sessData.messages) && sessData.messages.length > 0) {
          setMessages(sessData.messages);
          if (sessData.currentReferenceImage) {
            setCurrentReferenceImage(sessData.currentReferenceImage);
          }
          if (sessData.sessionId) {
            setCurrentSessionId(sessData.sessionId);
          }
        }
      }
    } catch (e) {
      console.warn("Could not load last active audit session:", e);
    }
  };

  // Helper: Persist gallery item to GCS
  const addGalleryItem = async (item: AuditGalleryItem) => {
    const updated = [item, ...gallery.filter(g => g.id !== item.id)].slice(0, 30);
    setGallery(updated);
    try {
      await fetch(`/api/save-run/audit_agent_gallery`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyName,
          featureId: 'audit_agent_gallery',
          data: {
            items: updated,
            updatedAt: new Date().toISOString()
          }
        })
      });
    } catch (e) {
      console.error("Failed to persist audit gallery to GCS:", e);
    }
  };

  // Helper: Delete asset from past audits gallery and GCS
  const handleDeleteGalleryItem = async (itemId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = gallery.filter(g => g.id !== itemId);
    setGallery(updated);
    try {
      await fetch(`/api/save-run/audit_agent_gallery`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyName,
          featureId: 'audit_agent_gallery',
          data: {
            items: updated,
            updatedAt: new Date().toISOString()
          }
        })
      });
    } catch (e) {
      console.error("Failed to delete audit gallery item from GCS:", e);
    }
  };

  // Helper: Persist session checkpoint to active session & history list in GCS
  const saveAuditSession = async (currentMessages: AuditChatMessage[], refImg?: string | null) => {
    setIsSaving(true);
    const activeImg = refImg !== undefined ? refImg : currentReferenceImage;

    // Find latest audited score
    let latestScore: number | undefined;
    const lastWithAudit = [...currentMessages].reverse().find(m => m.auditResult);
    if (lastWithAudit && lastWithAudit.auditResult) {
      latestScore = lastWithAudit.auditResult.overallScore;
    }

    const existingCurrent = sessionsHistory.find(s => s.sessionId === currentSessionId);
    const sessionTitle = existingCurrent?.title || (
      currentMessages.length > 0 && currentMessages[0].text
        ? currentMessages[0].text.slice(0, 45)
        : 'Image Audit Session'
    );
    const isPinned = existingCurrent?.isPinned || false;

    const sessionSummary: AuditSessionSummary = {
      sessionId: currentSessionId,
      title: sessionTitle,
      timestamp: existingCurrent?.timestamp || new Date().toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
      messageCount: currentMessages.length,
      previewImage: activeImg || undefined,
      lastScore: latestScore,
      currentReferenceImage: activeImg,
      isPinned,
      messages: currentMessages
    };

    // Update session list with pinned sorting
    const updatedHistory = sortSessions([
      sessionSummary,
      ...sessionsHistory.filter(s => s.sessionId !== currentSessionId)
    ]).slice(0, 25);
    setSessionsHistory(updatedHistory);

    try {
      // 1. Save Active Current Session
      await fetch(`/api/save-run/audit_agent_session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyName,
          featureId: 'audit_agent_session',
          data: {
            sessionId: currentSessionId,
            messages: currentMessages,
            currentReferenceImage: activeImg,
            savedAt: new Date().toISOString()
          }
        })
      });

      // 2. Save Sessions History
      await fetch(`/api/save-run/audit_agent_history`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyName,
          featureId: 'audit_agent_history',
          data: {
            sessions: updatedHistory,
            updatedAt: new Date().toISOString()
          }
        })
      });
    } catch (err) {
      console.error("Failed to save audit session:", err);
    } finally {
      setIsSaving(false);
    }
  };

  // Toggle Pin/Star status of an audit session
  const handleTogglePinSession = async (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updatedHistory = sortSessions(
      sessionsHistory.map(s => s.sessionId === sessionId ? { ...s, isPinned: !s.isPinned } : s)
    );
    setSessionsHistory(updatedHistory);

    try {
      await fetch(`/api/save-run/audit_agent_history`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyName,
          featureId: 'audit_agent_history',
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
      await fetch(`/api/save-run/audit_agent_history`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyName,
          featureId: 'audit_agent_history',
          data: {
            sessions: updatedHistory,
            updatedAt: new Date().toISOString()
          }
        })
      });
    } catch (err) {
      console.error("Failed to rename audit session in GCS:", err);
    }
  };

  // Restore a specific past session
  const restorePastSession = (session: AuditSessionSummary) => {
    setCurrentSessionId(session.sessionId);
    setMessages(session.messages || []);
    setCurrentReferenceImage(session.currentReferenceImage || null);
    setShowHistoryDrawer(false);
    saveAuditSession(session.messages, session.currentReferenceImage);
  };

  // Delete a past session from history
  const handleDeleteSession = async (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updatedHistory = sessionsHistory.filter(s => s.sessionId !== sessionId);
    setSessionsHistory(updatedHistory);

    try {
      await fetch(`/api/save-run/audit_agent_history`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyName,
          featureId: 'audit_agent_history',
          data: {
            sessions: updatedHistory,
            updatedAt: new Date().toISOString()
          }
        })
      });
    } catch (err) {
      console.error("Failed to delete audit session from GCS:", err);
    }

    // If active session is deleted, reset the chat panel
    if (sessionId === currentSessionId) {
      handleResetChat();
    }
  };

  // Reset chat / start new audit session
  const handleResetChat = async () => {
    const newId = `session_${Date.now()}`;
    setCurrentSessionId(newId);
    setMessages([]);
    setCurrentReferenceImage(null);
    setStatusMessage('');
    setIsLoading(false);

    try {
      await fetch(`/api/save-run/audit_agent_session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyName,
          featureId: 'audit_agent_session',
          data: {
            sessionId: newId,
            messages: [],
            currentReferenceImage: null,
            savedAt: new Date().toISOString()
          }
        })
      });
    } catch (err) {
      console.error("Failed to reset audit session:", err);
    }
  };

  // Handle image upload from disk
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = async () => {
      const raw = reader.result as string;
      const base64 = raw.split(',')[1] || raw;
      
      // Save image to GCS
      let savedUrl: string | null = null;
      try {
        savedUrl = await saveImageToGCS(base64, 'audit_upload', companyName);
      } catch (err) {
        console.warn("GCS save failed, using base64:", err);
      }

      const imgRef = savedUrl || base64;
      handleNewImageUploaded(imgRef, file.name);
    };
    reader.readAsDataURL(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Ingest image & prompt user or run audit
  const handleNewImageUploaded = async (imageRef: string, fileName?: string) => {
    setCurrentReferenceImage(imageRef);

    const userUploadMsg: AuditChatMessage = {
      id: `user_${Date.now()}`,
      sender: 'user',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      text: `Uploaded Image for Audit: ${fileName || 'Product Marketing Asset'}`,
      uploadedImageBase64: imageRef
    };

    const thread = [...messages, userUploadMsg];
    setMessages(thread);

    // Automatically trigger comprehensive image audit
    await runImageAudit(imageRef, thread, fileName);
  };

  // Comprehensive Multimodal Image Audit Engine (gemini-3.7-flash)
  const runImageAudit = async (
    imageBase64OrUrl: string, 
    currentMessages: AuditChatMessage[],
    fileName?: string,
    customFocus?: string
  ) => {
    setIsLoading(true);

    const isFtcLens = !!(customFocus && (customFocus.toLowerCase().includes('ftc') || customFocus.toLowerCase().includes('legal') || customFocus.toLowerCase().includes('claims') || customFocus.toLowerCase().includes('disclosure')));
    const isCompetitorLens = !!(customFocus && (customFocus.toLowerCase().includes('competitor') || customFocus.toLowerCase().includes('retail') || customFocus.toLowerCase().includes('benchmark') || customFocus.toLowerCase().includes('shelf')));

    let promptFocusInstructions = '';
    let reportTitle = `Here is the comprehensive **Visual & Brand Audit Report** for the evaluated asset:`;
    let lensName = 'Visual & Brand Standards';

    if (isFtcLens) {
      reportTitle = `Here is the **Strict FTC & Legal Advertising Compliance Audit**:`;
      lensName = 'Strict FTC & Legal Compliance';
      promptFocusInstructions = `
      PRIMARY AUDIT LENS: STRICT FTC, LEGAL ADVERTISING & CLAIMS COMPLIANCE.
      You MUST evaluate this marketing image with strict adherence to FTC guidelines, Truth-in-Advertising laws, and regulatory compliance.
      Evaluate:
      1. Disclosure & Disclaimer Visibility: Are necessary asterisks, terms, eligibility, or nutritional/health disclaimers legible, clear, and conspicuous? (0 to 10.0)
      2. Trademark, Brand & Packaging Legal Fidelity: Are logos, registered trademarks (®/™), official packaging elements authentic and free of infringement? (0 to 10.0)
      3. Claims Accuracy & Substantiation: Are product claims (e.g. flavor counts, zero sugar, calorie counts, premium benefits, superlatives) honest, substantiated, and non-deceptive? (0 to 10.0)
      4. Regulatory & FTC Compliance Risk: Overall evaluation of FTC deceptive advertising risk, omission risks, endorsements/pricing clarity. (0 to 10.0)

      In categoryLabels provide:
      "visualHierarchy": "Disclosures & Disclaimers",
      "brandIdentity": "Trademarks & IP Fidelity",
      "lightingAndPalette": "Claims Substantiation",
      "commercialAppeal": "FTC Compliance Score"
      `;
    } else if (isCompetitorLens) {
      reportTitle = `Here is the **Competitor Retail Benchmark & Category Matchup Audit**:`;
      lensName = 'Competitor & Retail Benchmark';
      promptFocusInstructions = `
      PRIMARY AUDIT LENS: COMPETITOR BENCHMARK & RETAIL STANDARDS.
      You MUST evaluate how this culinary retail marketing image performs head-to-head against:
      1. Premium Culinary Specialists (e.g. Sur La Table, Crate & Barrel, Le Creuset, All-Clad, Staub).
      2. Department Store & Mass Retailers (e.g. Target Figmint, Amazon Basics Kitchen, Macy's Tools of the Trade).
      3. Modern Direct-to-Consumer Kitchen Brands (e.g. Caraway, Made In, Our Place, Great Jones).

      Evaluate:
      1. Shelf & PDP Visual Cut-Through: Eye-flow dominance, contrast, and instant recognition in a crowded retail aisle or e-commerce grid. (0 to 10.0)
      2. Competitive Brand Distinctiveness: How clearly this asset stands out against rival culinary brands without visual confusion. (0 to 10.0)
      3. Retail Packaging Pop & Mobile Legibility: How well the product branding, heirloom materials, and key culinary features read at small mobile app thumbnail scales. (0 to 10.0)
      4. Conversion & Add-to-Cart Appeal: Commercial shopper motivation, appetite appeal, and purchase trigger power compared to competitors. (0 to 10.0)

      In categoryLabels provide:
      "visualHierarchy": "PDP Shelf Cut-Through",
      "brandIdentity": "Brand Distinctiveness",
      "lightingAndPalette": "Mobile Legibility",
      "commercialAppeal": "Add-to-Cart Appeal"

      YOU MUST ALSO POPULATE the "competitiveInsights" object in the JSON output:
      "competitiveInsights": {
        "bigNameMatchup": {
          "rivals": ["Sur La Table", "Crate & Barrel", "Le Creuset"],
          "advantage": "Specific visual/culinary storytelling advantage over luxury kitchen specialists (e.g., artisanal French enameled finish, rich culinary heritage, professional chef-grade styling).",
          "vulnerability": "Where luxury competitors hold entrenched lifestyle aesthetics or boutique showroom familiarity.",
          "verdict": "DOMINATES" // "DOMINATES" | "COMPETITIVE" | "LAGGING"
        },
        "houseBrandMatchup": {
          "rivals": ["Target Figmint", "Amazon Basics Kitchen", "Macy's Tools of the Trade"],
          "premiumSeparation": "How the heirloom craftsmanship, heavy-gauge clad stainless, and typography visually command a luxury price tier and avoid generic private-label look-alike perception.",
          "designDefensibility": "Why a mass retail brand cannot easily clone or cheapen this Williams-Sonoma culinary heritage.",
          "verdict": "STRONG_SEPARATION" // "STRONG_SEPARATION" | "MODERATE" | "RISK_OF_BLENDING"
        },
        "challengerMatchup": {
          "rivals": ["Caraway", "Made In", "Our Place"],
          "modernAestheticAppeal": "Assessment of how modern, functional, and social-first the culinary styling is against viral direct-to-consumer cookware brands.",
          "verdict": "TREND_FORWARD" // "TREND_FORWARD" | "BALANCED" | "NEEDS_MODERNIZATION"
        },
        "shelfEyeShare": "Top 10% Visual Dominance",
        "retailReadinessRating": "A+ (E-Commerce PDP & Luxury Retail Dominant)"
      }
      `;
    } else if (customFocus) {
      reportTitle = `Here is the Custom Focused Audit (**${customFocus}**):`;
      lensName = customFocus;
      promptFocusInstructions = `
      PRIMARY AUDIT LENS: ${customFocus}
      Thoroughly inspect and tailor all category scores, description, pros, cons, and recommendations to directly address: ${customFocus}.
      `;
    }

    setStatusMessage(`Evaluating ${lensName} with Gemini 3.7 Flash...`);

    try {
      const { data: rawBase64, mimeType } = await urlToRawBase64(imageBase64OrUrl);

      const auditPrompt = `
      You are the Master Visual & Brand Compliance Auditor for ${companyName}.
      Task: Perform a rigorous, specialized audit of the provided marketing image asset under the specified evaluation lens.

      ${promptFocusInstructions}

      Return ONLY a valid JSON object:
      {
        "overallScore": 9.1,
        "verdict": "PASSED", // "PASSED" (>= 8.5), "CAUTION" (7.0 - 8.4), "NEEDS_REVISION" (< 7.0)
        "auditLens": "${lensName}",
        "description": "Comprehensive 2-3 sentence visual description detailing what is shown in the image, the subject, environment, materials, and specific compliance/retail findings.",
        "categoryScores": {
          "visualHierarchy": 9.3,
          "brandIdentity": 9.4,
          "lightingAndPalette": 8.8,
          "commercialAppeal": 8.9
        },
        "categoryLabels": {
          "visualHierarchy": "${isFtcLens ? 'Disclosures & Disclaimers' : isCompetitorLens ? 'PDP Shelf Cut-Through' : 'Hierarchy & Focus'}",
          "brandIdentity": "${isFtcLens ? 'Trademarks & IP Fidelity' : isCompetitorLens ? 'Brand Distinctiveness' : 'Brand Identity'}",
          "lightingAndPalette": "${isFtcLens ? 'Claims Substantiation' : isCompetitorLens ? 'Mobile Legibility' : 'Lighting & Texture'}",
          "commercialAppeal": "${isFtcLens ? 'FTC Compliance Score' : isCompetitorLens ? 'Add-to-Cart Appeal' : 'Commercial Appeal'}"
        },
        "metadataTags": [
          "Category: Ready-to-Drink Beverage",
          "Subject: Product Focal",
          "Lens: ${lensName}",
          "Setting: Lifestyle Context",
          "Composition: Hero Center Focal",
          "Style: Commercial Advertising"
        ],
        "pros": [
          "Key compliance/visual advantage 1 specifically relating to ${lensName}",
          "Key compliance/visual advantage 2 specifically relating to ${lensName}",
          "Key compliance/visual advantage 3 specifically relating to ${lensName}"
        ],
        "cons": [
          "Specific observation or risk 1 relating to ${lensName}",
          "Specific observation or risk 2 relating to ${lensName}"
        ],
        "actionableRecommendations": [
          "Actionable recommendation 1 tailored to ${lensName}",
          "Actionable recommendation 2 tailored to ${lensName}"
        ]
        ${isCompetitorLens ? `,
        "competitiveInsights": {
          "bigNameMatchup": {
            "rivals": ["Sur La Table", "Crate & Barrel", "Le Creuset"],
            "advantage": "string",
            "vulnerability": "string",
            "verdict": "DOMINATES"
          },
          "houseBrandMatchup": {
            "rivals": ["Target Figmint", "Amazon Basics Kitchen", "Macy's Tools of the Trade"],
            "premiumSeparation": "string",
            "designDefensibility": "string",
            "verdict": "STRONG_SEPARATION"
          },
          "challengerMatchup": {
            "rivals": ["Caraway", "Made In", "Our Place"],
            "modernAestheticAppeal": "string",
            "verdict": "TREND_FORWARD"
          },
          "shelfEyeShare": "Top 10% Visual Dominance",
          "retailReadinessRating": "A+ (E-Commerce PDP & Luxury Retail Dominant)"
        }` : ''}
      }
      `;

      const response = await callGenAiProxy("generateContent", {
        model: 'gemini-3.7-flash',
        contents: [
          {
            role: 'user',
            parts: [
              {
                inlineData: {
                  mimeType: mimeType || 'image/jpeg',
                  data: rawBase64
                }
              },
              {
                text: auditPrompt
              }
            ]
          }
        ],
        config: {
          responseMimeType: "application/json",
          temperature: 0.2,
          thinkingConfig: { thinkingLevel: "LOW" }
        }
      });

      const text = extractTextFromResponse(response) || "{}";
      const cleanJson = text.replace(/```json|```/gi, '').trim();
      const parsedScorecard: ImageAuditScorecard = JSON.parse(cleanJson);
      if (!parsedScorecard.auditLens) {
        parsedScorecard.auditLens = lensName;
      }

      // Add to gallery
      addGalleryItem({
        id: `audit_${Date.now()}`,
        urlOrBase64: imageBase64OrUrl,
        title: fileName || `${lensName} - Asset`,
        score: parsedScorecard.overallScore,
        verdict: parsedScorecard.verdict,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      });

      const nextOptions = [
        ...(isFtcLens ? [
          {
            label: "🎨 Run Standard 4-Pillar Visual & Brand Audit",
            action: "re_audit_focus",
            payload: { focus: "" }
          },
          {
            label: "📊 Audit Against Competitor Retail Standards",
            action: "re_audit_focus",
            payload: { focus: "Retail benchmark comparison against category market leaders" }
          }
        ] : isCompetitorLens ? [
          {
            label: "🎨 Run Standard 4-Pillar Visual & Brand Audit",
            action: "re_audit_focus",
            payload: { focus: "" }
          },
          {
            label: "⚖️ Evaluate with Strict FTC & Legal Advertising Lens",
            action: "re_audit_focus",
            payload: { focus: "Strict FTC disclosures, legal compliance, and claims accuracy" }
          }
        ] : [
          {
            label: "⚖️ Evaluate with Strict FTC & Legal Advertising Lens",
            action: "re_audit_focus",
            payload: { focus: "Strict FTC disclosures, legal compliance, and claims accuracy" }
          },
          {
            label: "📊 Audit Against Competitor Retail Standards",
            action: "re_audit_focus",
            payload: { focus: "Retail benchmark comparison against category market leaders" }
          }
        ]),
        {
          label: "📁 Upload Another Asset for Audit",
          action: "trigger_upload"
        }
      ];

      const assistantMsg: AuditChatMessage = {
        id: `assistant_audit_${Date.now()}`,
        sender: 'assistant',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        text: reportTitle,
        auditResult: parsedScorecard,
        clarifyingOptions: {
          question: "Next Audit & Optimization Actions:",
          options: nextOptions
        }
      };

      const updated = [...currentMessages, assistantMsg];
      setMessages(updated);
      saveAuditSession(updated, imageBase64OrUrl);

    } catch (err: any) {
      console.error("Image audit failed:", err);
      const errorMsg: AuditChatMessage = {
        id: `assistant_error_${Date.now()}`,
        sender: 'assistant',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        error: `Visual audit failed: ${err.message || 'Check Gemini API access.'}`
      };
      const updated = [...currentMessages, errorMsg];
      setMessages(updated);
    } finally {
      setIsLoading(false);
      setStatusMessage('');
    }
  };

  // Load the most recent audit scorecard from session history or cloud storage
  const handleLoadLastAudit = async () => {
    if (sessionsHistory.length > 0) {
      restorePastSession(sessionsHistory[0]);
      return;
    }
    if (gallery.length > 0) {
      await handleNewImageUploaded(gallery[0].urlOrBase64, gallery[0].title);
      return;
    }
    // Attempt loading from GCS directly
    try {
      setIsLoading(true);
      setStatusMessage('Loading last audit scorecard from GCS...');
      const res = await fetch(`/api/load-run/audit_agent_session?companyName=${encodeURIComponent(companyName)}`);
      if (res.ok) {
        const sessData = await res.json();
        if (sessData && Array.isArray(sessData.messages) && sessData.messages.length > 0) {
          setMessages(sessData.messages);
          if (sessData.currentReferenceImage) setCurrentReferenceImage(sessData.currentReferenceImage);
          if (sessData.sessionId) setCurrentSessionId(sessData.sessionId);
        }
      }
    } catch (e) {
      console.warn("Could not load last audit from GCS:", e);
    } finally {
      setIsLoading(false);
      setStatusMessage('');
    }
  };

  // Intelligent Past Audits Retrieval with Gemini 3.5 Flash
  const runPastAuditsQuery = async (query: string, currentMessages: AuditChatMessage[]) => {
    setIsLoading(true);
    setStatusMessage('Searching past visual audits & scorecards with Gemini 3.5 Flash...');

    try {
      const allAuditRecords: any[] = [];

      sessionsHistory.forEach((sess) => {
        const lastAuditMsg = [...(sess.messages || [])].reverse().find(m => m.auditResult);
        if (lastAuditMsg && lastAuditMsg.auditResult) {
          allAuditRecords.push({
            type: 'session',
            sessionId: sess.sessionId,
            title: sess.title,
            timestamp: sess.timestamp,
            score: lastAuditMsg.auditResult.overallScore,
            verdict: lastAuditMsg.auditResult.verdict,
            lens: lastAuditMsg.auditResult.auditLens || 'Visual & Brand Compliance',
            description: lastAuditMsg.auditResult.description,
            pros: lastAuditMsg.auditResult.pros,
            cons: lastAuditMsg.auditResult.cons,
            imageUrl: sess.previewImage || sess.currentReferenceImage,
            sessionRef: sess
          });
        }
      });

      gallery.forEach((galItem) => {
        if (!allAuditRecords.some(r => r.imageUrl === galItem.urlOrBase64)) {
          allAuditRecords.push({
            type: 'gallery_asset',
            title: galItem.title,
            timestamp: galItem.timestamp,
            score: galItem.score,
            verdict: galItem.verdict,
            imageUrl: galItem.urlOrBase64
          });
        }
      });

      if (allAuditRecords.length === 0) {
        const noAuditsMsg: AuditChatMessage = {
          id: `assistant_${Date.now()}`,
          sender: 'assistant',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          text: `You do not have any past audit scorecards in memory or cloud storage yet. Upload an image to run your first visual audit!`,
          clarifyingOptions: {
            question: "Get started with an audit:",
            options: [
              { label: "📁 Upload Image from Computer", action: "trigger_upload" },
              { label: "🥤 Load Sample Product Asset", action: "use_sample_image" }
            ]
          }
        };
        const updated = [...currentMessages, noAuditsMsg];
        setMessages(updated);
        saveAuditSession(updated);
        return;
      }

      const prompt = `
      You are the Audit Retrieval Intelligence for ${companyName}.
      The user is asking a question or search request to locate, pull up, review, or inspect past marketing visual audits.

      USER QUERY: "${query}"

      PAST AUDIT RECORDS IN STORAGE (${allAuditRecords.length} records available):
      ${JSON.stringify(allAuditRecords.map((r, i) => ({
        index: i,
        title: r.title,
        timestamp: r.timestamp,
        score: r.score,
        verdict: r.verdict,
        lens: r.lens,
        description: r.description,
        pros: r.pros?.slice(0, 2),
        cons: r.cons?.slice(0, 2)
      })), null, 2)}

      TASK:
      1. Analyze the user's inquiry (e.g. "show past audits", "pull up the last audit", "find audit for Strawberries & Cream", "show highest scoring audit", "what were the compliance issues?").
      2. Identify the matching audit records by index (ranked by relevance).
      3. Generate a concise, Zinsser-style brief summary response in Simplified Technical English explaining the audit findings.

      Return ONLY a JSON object:
      {
        "explanation": "Clear, friendly markdown summary detailing the matching audit(s) found, their overall score, key findings, and date...",
        "matchedIndices": [0, 1]
      }
      Do not use markdown code blocks. Output ONLY raw JSON.
      `;

      const response = await callGenAiProxy("generateContent", {
        model: 'gemini-3.5-flash',
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        config: { 
          responseMimeType: "application/json",
          temperature: 0.1
        }
      });

      const text = extractTextFromResponse(response) || "{}";
      const parsed = safeJsonParse(text);

      let matchedItems: any[] = [];
      if (parsed && Array.isArray(parsed.matchedIndices) && parsed.matchedIndices.length > 0) {
        matchedItems = parsed.matchedIndices.map((idx: number) => allAuditRecords[idx]).filter(Boolean);
      } else {
        matchedItems = allAuditRecords.slice(0, 3);
      }

      const explanation = parsed?.explanation || `Here are the matching past audit records from cloud storage:`;

      const options = matchedItems.map((item) => ({
        label: `📂 Load Audit: ${item.title} (${item.score !== undefined ? `${item.score.toFixed(1)}/10` : 'Audited'})`,
        action: "restore_selected_audit",
        payload: { item }
      }));

      const assistantMsg: AuditChatMessage = {
        id: `assistant_past_audits_${Date.now()}`,
        sender: 'assistant',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        text: explanation,
        clarifyingOptions: {
          question: "Click to load and inspect any past audit scorecard:",
          options: [
            ...options,
            { label: "✨ Load Most Recent Audit", action: "load_last_audit" },
            { label: "📁 Upload New Asset for Audit", action: "trigger_upload" }
          ]
        }
      };

      const updated = [...currentMessages, assistantMsg];
      setMessages(updated);
      saveAuditSession(updated);

    } catch (err: any) {
      console.error("Past audits query failed:", err);
      const lastSession = sessionsHistory[0];
      if (lastSession) {
        restorePastSession(lastSession);
      }
    } finally {
      setIsLoading(false);
      setStatusMessage('');
    }
  };

  // 10-Point Creator Partner Video Compliance Audit Engine (gemini-3.7-flash)
  const runCreatorVideoAudit = async (
    videoUrl: string,
    videoId: string,
    currentMessages: AuditChatMessage[],
    customFocus?: string
  ) => {
    setIsLoading(true);
    setStatusMessage(`Ingesting YouTube video [${videoId}] and evaluating 10-point creator compliance with Gemini 3.7 Flash...`);

    try {
      const fullUrl = videoUrl.startsWith('http') ? videoUrl : `https://www.youtube.com/watch?v=${videoId}`;
      const result = await analyzeCreatorPartnerVideo(fullUrl, companyName, customFocus);

      if (!result || Object.keys(result).length === 0) {
        throw new Error("Received empty compliance scorecard from Gemini multimodal video analyzer.");
      }

      setStatusMessage('Saving compliance scorecard and indexing creator review...');

      // Persist to backend / GCS
      try {
        const analysisId = `creator_audit_${videoId}_${Date.now()}`;
        await fetch('/api/insights/analysis', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            companyName,
            analysisId,
            result: {
              ...result,
              videoId,
              videoUrl: fullUrl,
              type: 'creator_partner',
              timestamp: new Date().toISOString()
            }
          })
        });
      } catch (saveErr) {
        console.warn("GCS save for video audit encountered notice:", saveErr);
      }

      // Add thumbnail / video to gallery
      const thumbnailUrl = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
      const galleryItem: AuditGalleryItem = {
        id: `vid_${videoId}_${Date.now()}`,
        urlOrBase64: thumbnailUrl,
        title: `${result.metadata?.creator_handle || '@creator_partner'} - ${result.metadata?.campaign_name || 'Creator Video'}`,
        score: result.compliance_score ? Number((result.compliance_score / 10).toFixed(1)) : 9.0,
        verdict: result.final_decision || 'APPROVED',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      await addGalleryItem(galleryItem);

      const assistantMsg: AuditChatMessage = {
        id: `assistant_${Date.now()}`,
        sender: 'assistant',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        text: `Here is the **Official Creator Video Review Sign-Off Sheet** for YouTube Video [${videoId}] (${result.metadata?.creator_handle || '@creator_partner'}):`,
        videoAuditResult: result,
        videoInfo: {
          videoId,
          videoUrl: fullUrl,
          title: result.metadata?.campaign_name || `${companyName} Creator Partner Video`
        },
        clarifyingOptions: {
          question: "Next actions for this creator video audit:",
          options: [
            { label: "⏱️ Check FTC Opening 5-Second Disclosure", action: "audit_ftc_timing" },
            { label: "🏷️ Verify Product Names & Formats", action: "audit_product_naming" },
            { label: "📋 Audit Another Creator Video", action: "prompt_video_audit" },
            { label: "🔍 Run Image Asset Audit", action: "trigger_upload" }
          ]
        }
      };

      const updated = [...currentMessages, assistantMsg];
      setMessages(updated);
      saveAuditSession(updated, thumbnailUrl);
    } catch (err: any) {
      console.error("Creator video audit failed:", err);
      const errorMsg: AuditChatMessage = {
        id: `assistant_error_${Date.now()}`,
        sender: 'assistant',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        error: `Failed to audit creator video (${videoId}): ${err.message || 'Check Gemini API Key and video availability.'}`,
        clarifyingOptions: {
          question: "Would you like to try again or choose another action?",
          options: [
            { label: "🔄 Retry Video Audit", action: "retry_video_audit", payload: { videoUrl, videoId } },
            { label: "🎥 Select Another Creator Video", action: "prompt_video_audit" },
            { label: "📁 Upload Image Asset Instead", action: "trigger_upload" }
          ]
        }
      };
      const updated = [...currentMessages, errorMsg];
      setMessages(updated);
      saveAuditSession(updated);
    } finally {
      setIsLoading(false);
      setStatusMessage('');
    }
  };

  // Intelligent Audit Intent & Skill Classification with Gemini 3.5 Flash Lite
  const classifyAuditQuery = async (
    query: string,
    hasActiveImage: boolean,
    lastAuditScore?: number
  ): Promise<{
    intent: 'query_past_audits' | 'load_last' | 'direct_answer' | 'audit_image' | 'audit_video' | 'upload_prompt' | 'unsupported';
    direct_answer_text?: string;
    extracted_audit_focus?: string;
    extracted_query?: string;
    reasoning?: string;
  }> => {
    // 0. Immediate regex check for direct YouTube URL
    const ytMatch = extractYouTubeInfo(query);
    if (ytMatch && ytMatch.videoId) {
      return {
        intent: 'audit_video',
        extracted_query: ytMatch.url,
        extracted_audit_focus: query.replace(ytMatch.url, '').trim() || undefined,
        reasoning: 'Direct YouTube URL detected'
      };
    }

    try {
      const prompt = `
      You are an AI Compliance & Quality Audit Agent for ${companyName}.
      Analyze the following user input and determine the exact audit skill or direct response:

      USER QUERY: "${query}"
      ACTIVE ASSET STATE:
      - Has Active Image: ${hasActiveImage ? 'Yes' : 'No'}
      - Last Audit Score: ${lastAuditScore ? `${lastAuditScore}/100` : 'None in memory'}

      ROUTING DIRECTIVES:
      1. "audit_video": The user provides a YouTube link or asks to audit a creator video, sponsored video, influencer video, or evaluate creator partner compliance (e.g. "audit this video", "scan youtube video", "creator partner compliance", "check sponsored post", "audit youtube link").
         -> Set "extracted_query" to the YouTube link or query.
      2. "query_past_audits": The user is asking to find, search, view, list, recall, or pull up past audits or previous scorecards (e.g. "pull up past audits", "show me the audit for Dr Pepper", "what was my score on the can?", "find previous audits", "show audit history", "get the audit with score 9.1", "pull up the last audit").
         -> Set "extracted_query" to the search terms or criteria.
      3. "load_last": The user explicitly wants to restore or load the last audit scorecard (e.g. "load last", "load last audit", "restore previous audit", "get the last one").
      4. "direct_answer": The user is asking a conversational question, capability inquiry (e.g. "what can you do?", "what are the 4 audit categories?", "how does scoring work?"), or asking about general audit guidelines.
         -> In "direct_answer_text", write a concise, direct, helpful answer in Simplified Technical English explaining:
            - 4-Pillar Visual & Brand Audit (Hierarchy 40pts, Brand Identity 30pts, Lighting 15pts, Commercial 15pts)
            - 10-Point Creator Partner Video Compliance Audit (FTC Disclosures, Product Naming, Claims, Safe Usage, etc.)
            - Competitor Head-to-Head & Past Audits Search
      5. "audit_image": The user wants to audit, evaluate, inspect, or grade the current marketing image asset (or a specific focus like "check lighting", "evaluate FTC compliance", "check brand logo").
         -> Set "extracted_audit_focus" to the custom focus area if specified.
      6. "upload_prompt": The user wants to start an audit or provides an ad instruction, but needs to upload an image first.
      7. "unsupported": The user is asking for something outside the scope of marketing visual audit, video compliance, and brand governance (e.g. coding, math, flight booking, weather, ordering groceries).
         -> In "direct_answer_text", start with: "I don't currently know how to do that, but here are some other items I can do:" and list out the core audit skills.

      Return ONLY raw JSON:
      {
        "intent": "query_past_audits" | "load_last" | "direct_answer" | "audit_image" | "audit_video" | "upload_prompt" | "unsupported",
        "extracted_query": "Specific search query or video URL or null",
        "extracted_audit_focus": "Specific audit criteria focus or null",
        "direct_answer_text": "Concise answer if direct_answer or unsupported, else null",
        "reasoning": "Brief rationale"
      }
      Do not use markdown code blocks. Output ONLY raw JSON.
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
    } catch (e) {
      console.warn("Audit classification fallback:", e);
    }

    // Heuristic Fallback
    const lower = query.toLowerCase();
    if (lower.includes('youtube.com') || lower.includes('youtu.be') || lower.includes('creator video') || lower.includes('audit video') || lower.includes('video compliance') || lower.includes('influencer video') || lower.includes('sponsored video') || lower.includes('creator partner')) {
      const info = extractYouTubeInfo(query);
      return { 
        intent: 'audit_video', 
        extracted_query: info ? info.url : query, 
        reasoning: 'Video audit keywords' 
      };
    }
    if (lower.includes('load last') || lower.includes('last audit') || lower.includes('restore last') || lower.includes('load the last') || lower.includes('get last')) {
      return { intent: 'load_last', reasoning: 'Load last keywords' };
    }
    if (lower.includes('past audit') || lower.includes('previous audit') || lower.includes('history') || lower.includes('show audits') || lower.includes('find audit') || lower.includes('pull up') || lower.includes('list audits') || lower.includes('all audits')) {
      return { intent: 'query_past_audits', extracted_query: query, reasoning: 'Past audits query keywords' };
    }
    if (lower.includes('what can you do') || lower.includes('help') || lower.includes('capabilities') || lower.includes('skills') || lower.includes('categories') || lower.includes('criteria') || lower.includes('how does') || lower.includes('explain')) {
      return {
        intent: 'direct_answer',
        direct_answer_text: `I am the **Audit Agent** for **${companyName}**. Here is what I can do:\n\n• **10-Point Creator Partner Video Compliance Audit**: Paste any YouTube video link to scan for FTC disclosures, claims substantiation, product naming, and brand safety.\n• **4-Pillar Visual & Brand Compliance Audit**: Score marketing visuals across Visual Hierarchy (40 pts), Brand Identity (30 pts), Lighting & Palette (15 pts), and Commercial Appeal (15 pts).\n• **Focused Criteria Check**: Audit specific visual elements like logo prominence, package geometry, color harmony, or legal disclosures.\n• **Competitor Head-to-Head Analysis**: Compare your asset against Big-Name rivals, house brands, or functional challenger brands.\n• **Search & Recall Past Audits**: Query previous audit scorecards by product, score, or keyword.\n• **Load Last Saved Audit**: Restore the most recent audit run and scorecard instantly.`
      };
    }
    if (hasActiveImage) {
      return { intent: 'audit_image', extracted_audit_focus: query, reasoning: 'Audit active image' };
    }
    return { 
      intent: 'unsupported', 
      direct_answer_text: `I don't currently know how to do that, but here are some other items I can do:\n\n• **10-Point Creator Partner Video Compliance Audit**: Paste any YouTube video link to scan for FTC disclosures, claims substantiation, product naming, and brand safety.\n• **4-Pillar Visual & Brand Compliance Audit**: Upload any marketing visual to score it across Visual Hierarchy (40 pts), Brand Identity (30 pts), Lighting & Palette (15 pts), and Commercial Appeal (15 pts).\n• **Focused Criteria Check**: Audit specific visual elements like logo prominence, package geometry, color harmony, or legal disclosures.\n• **Competitor Head-to-Head Analysis**: Compare your asset against Big-Name rivals, house brands, or functional challenger brands.\n• **Search & Recall Past Audits**: Query previous audit scorecards by product, score, or keyword.\n• **Load Last Saved Audit**: Restore the most recent audit run and scorecard instantly.`,
      reasoning: 'Default unsupported fallback' 
    };
  };

  // Handle Sending a Message
  const handleSendMessage = async (customPrompt?: string) => {
    const text = (customPrompt || inputPrompt).trim();
    if (!text || isLoading) return;

    const userMessage: AuditChatMessage = {
      id: `user_${Date.now()}`,
      sender: 'user',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      text
    };

    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInputPrompt('');
    setIsLoading(true);
    setStatusMessage('Analyzing intent with Gemini 3.5 Flash Lite...');

    try {
      const lastScore = messages.filter(m => m.auditResult).slice(-1)[0]?.auditResult?.overallScore;
      const classification = await classifyAuditQuery(text, !!currentReferenceImage, lastScore);

      // Route 0: Load Last Audit
      if (classification.intent === 'load_last') {
        await handleLoadLastAudit();
        return;
      }

      // Route 1: Query Past Audits Retrieval
      if (classification.intent === 'query_past_audits') {
        await runPastAuditsQuery(classification.extracted_query || text, newMessages);
        return;
      }

      // Route 2: Video Audit / Creator Partner Compliance
      if (classification.intent === 'audit_video') {
        const ytInfo = extractYouTubeInfo(classification.extracted_query || text);
        if (ytInfo && ytInfo.videoId) {
          await runCreatorVideoAudit(ytInfo.url, ytInfo.videoId, newMessages, classification.extracted_audit_focus);
        } else {
          setShowVideoModal(true);
          const askVideoMsg: AuditChatMessage = {
            id: `assistant_${Date.now()}`,
            sender: 'assistant',
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            text: `Please enter a YouTube video URL to scan for Creator Partner compliance:`,
            clarifyingOptions: {
              question: "Or select a sample creator video to audit:",
              options: [
                { label: "🥤 Squirt Citrus - Creator Review", action: "audit_sample_video", payload: { url: "https://www.youtube.com/watch?v=MrJOCtA_w68" } },
                { label: "🍹 Squirt Paloma - Mixology Ritual", action: "audit_sample_video", payload: { url: "https://www.youtube.com/watch?v=QVhwdWr1i-Y" } },
                { label: "✨ Keurig Dr Pepper - Spotlight", action: "audit_sample_video", payload: { url: "https://www.youtube.com/watch?v=P97KpyVHxXo" } }
              ]
            }
          };
          const updated = [...newMessages, askVideoMsg];
          setMessages(updated);
          saveAuditSession(updated);
          setIsLoading(false);
          setStatusMessage('');
        }
        return;
      }

      // Route 3: Direct Conversational / Capability / Unsupported Fallback
      if (classification.intent === 'direct_answer' || classification.intent === 'unsupported') {
        const responseText = classification.direct_answer_text || `I don't currently know how to do that, but here are some other items I can do:\n\n• **10-Point Creator Partner Video Compliance Audit**: Paste any YouTube video link to scan for FTC disclosures, claims substantiation, product naming, and brand safety.\n• **4-Pillar Visual & Brand Compliance Audit**: Upload any marketing visual to score it across Visual Hierarchy (40 pts), Brand Identity (30 pts), Lighting & Palette (15 pts), and Commercial Appeal (15 pts).\n• **Focused Criteria Check**: Audit specific visual elements like logo prominence, package geometry, color harmony, or legal disclosures.\n• **Competitor Head-to-Head Analysis**: Compare your asset against Big-Name rivals, house brands, or functional challenger brands.\n• **Search & Recall Past Audits**: Query previous audit scorecards by product, score, or keyword.\n• **Load Last Saved Audit**: Restore the most recent audit run and scorecard instantly.`;
        
        const assistantMsg: AuditChatMessage = {
          id: `assistant_${Date.now()}`,
          sender: 'assistant',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          text: responseText,
          clarifyingOptions: {
            question: "Next actions with the Audit Agent:",
            options: [
              { label: "🎥 Audit Creator Video (YouTube)", action: "prompt_video_audit" },
              { label: "🔍 Run Full 4-Pillar Visual Audit", action: "trigger_upload" },
              { label: "📂 Pull Up Past Audits", action: "query_past_audits" },
              { label: "🥤 Load Sample Product Asset", action: "use_sample_image" },
              { label: "🔄 Load Last Saved Audit", action: "load_last_audit" }
            ]
          }
        };

        const updated = [...newMessages, assistantMsg];
        setMessages(updated);
        saveAuditSession(updated, currentReferenceImage);
        setIsLoading(false);
        setStatusMessage('');
        return;
      }

      // Route 4: Run Image Audit
      if (classification.intent === 'audit_image') {
        if (currentReferenceImage) {
          await runImageAudit(currentReferenceImage, newMessages, undefined, classification.extracted_audit_focus || text);
        } else {
          const askUploadMsg: AuditChatMessage = {
            id: `assistant_${Date.now()}`,
            sender: 'assistant',
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            text: `Please upload or select an image asset first so I can perform a comprehensive visual criteria audit!`,
            clarifyingOptions: {
              question: "How would you like to provide an image or video?",
              options: [
                { label: "🎥 Audit Creator YouTube Video", action: "prompt_video_audit" },
                { label: "📁 Upload Image from Computer", action: "trigger_upload" },
                { label: "🥤 Load Sample Product Asset", action: "use_sample_image" }
              ]
            }
          };
          setMessages([...newMessages, askUploadMsg]);
          saveAuditSession([...newMessages, askUploadMsg]);
        }
        setIsLoading(false);
        setStatusMessage('');
        return;
      }

      // Route 5: Upload Prompt
      const askUploadMsg: AuditChatMessage = {
        id: `assistant_${Date.now()}`,
        sender: 'assistant',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        text: `Please upload a marketing visual or enter a YouTube link to begin your compliance audit:`,
        clarifyingOptions: {
          question: "How would you like to proceed?",
          options: [
            { label: "🎥 Audit Creator Video (YouTube)", action: "prompt_video_audit" },
            { label: "📁 Upload Image from Computer", action: "trigger_upload" },
            { label: "📂 Pull Up Past Audits", action: "query_past_audits" },
            { label: "🥤 Load Sample Product Asset", action: "use_sample_image" }
          ]
        }
      };
      setMessages([...newMessages, askUploadMsg]);
      saveAuditSession([...newMessages, askUploadMsg]);
    } catch (err: any) {
      console.error("Audit dispatch error:", err);
    } finally {
      setIsLoading(false);
      setStatusMessage('');
    }
  };

  // Handle Clarifying Options
  const handleOptionClick = async (option: { label: string; action: string; payload?: any }) => {
    if (isLoading) return;

    const userChoiceMsg: AuditChatMessage = {
      id: `user_${Date.now()}`,
      sender: 'user',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      text: option.label
    };
    const thread = [...messages, userChoiceMsg];
    setMessages(thread);

    if (option.action === 're_audit_focus') {
      if (currentReferenceImage) {
        await runImageAudit(currentReferenceImage, thread, undefined, option.payload?.focus);
      }
    } else if (option.action === 'query_past_audits') {
      await runPastAuditsQuery("all past audits", thread);
    } else if (option.action === 'load_last_audit') {
      await handleLoadLastAudit();
    } else if (option.action === 'restore_selected_audit') {
      const item = option.payload?.item;
      if (item && item.sessionRef) {
        restorePastSession(item.sessionRef);
      } else if (item && item.imageUrl) {
        await handleNewImageUploaded(item.imageUrl, item.title);
      }
    } else if (option.action === 'trigger_upload') {
      fileInputRef.current?.click();
    } else if (option.action === 'use_sample_image') {
      try {
        const sampleUrl = '/images/drpepper_sample_ad.jpg';
        handleNewImageUploaded(sampleUrl, 'drpepper_sample_ad.jpg');
      } catch (e) {
        console.error("Failed to load sample image:", e);
      }
    } else if (option.action === 'prompt_video_audit') {
      setShowVideoModal(true);
    } else if (option.action === 'audit_sample_video' && option.payload?.url) {
      const info = extractYouTubeInfo(option.payload.url);
      if (info && info.videoId) {
        await runCreatorVideoAudit(info.url, info.videoId, thread);
      } else {
        await handleSendMessage(option.payload.url);
      }
    } else if (option.action === 'retry_video_audit' && option.payload?.videoUrl) {
      const info = extractYouTubeInfo(option.payload.videoUrl);
      if (info && info.videoId) {
        await runCreatorVideoAudit(info.url, info.videoId, thread);
      }
    } else if (option.action === 'audit_ftc_timing') {
      await handleSendMessage("Analyze the exact timestamp, visual prominence, and audio timing of the opening FTC sponsorship disclosure");
    } else if (option.action === 'audit_product_naming') {
      await handleSendMessage("Audit all verbal and visual product names, beverage formats, and flavor claims against brand standards");
    }
  };

  return (
    <div className="flex flex-col h-full max-w-5xl mx-auto w-full px-2 sm:px-4 py-4 relative">
      {/* Hidden file input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileUpload}
        accept="image/*"
        className="hidden"
      />

      {/* Header Bar */}
      <div className="flex items-center justify-between pb-3 mb-2 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-xl bg-emerald-50 text-emerald-700">
            <ShieldCheck size={16} />
          </div>
          <div>
            <span className="font-bold text-sm text-gray-900">Audit Agent</span>
            <span className="ml-2 text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
              Visual Criteria & Brand Compliance
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* History Drawer Toggle Button */}
          <button
            onClick={() => setShowHistoryDrawer(!showHistoryDrawer)}
            className="px-3 py-1.5 text-xs font-semibold text-gray-700 hover:text-emerald-700 bg-white hover:bg-emerald-50 border border-gray-200 hover:border-emerald-200 rounded-xl transition-all flex items-center gap-1.5 shadow-2xs"
            title="View Past Audit Sessions & History"
          >
            <History size={13} className="text-emerald-600" />
            <span>History</span>
            {sessionsHistory.length > 0 && (
              <span className="ml-1 px-1.5 py-0.2 bg-emerald-100 text-emerald-800 text-[10px] font-bold rounded-full">
                {sessionsHistory.length}
              </span>
            )}
          </button>

          <button
            onClick={() => fileInputRef.current?.click()}
            className="px-3 py-1.5 text-xs font-semibold text-gray-700 hover:text-emerald-700 bg-white hover:bg-emerald-50 border border-gray-200 hover:border-emerald-200 rounded-xl transition-all flex items-center gap-1.5 shadow-2xs"
            title="Upload Image for Audit"
          >
            <Upload size={12} />
            Upload Image
          </button>

          <button
            onClick={handleResetChat}
            disabled={isLoading || messages.length === 0}
            className="px-3 py-1.5 text-xs font-semibold text-gray-600 hover:text-red-600 bg-white hover:bg-red-50 border border-gray-200 hover:border-red-200 rounded-xl transition-all flex items-center gap-1.5 shadow-2xs disabled:opacity-40 disabled:cursor-not-allowed"
            title="Start New Audit Session"
          >
            <Plus size={12} />
            New Session
          </button>
        </div>
      </div>

      {/* RECENT AUDITS BAR AT TOP OF PAGE WITH HOVER 'LOAD LAST' OPTION */}
      {(gallery.length > 0 || sessionsHistory.length > 0) && (
        <div className="group/bar relative mb-3 px-3 py-2 bg-gradient-to-r from-emerald-50/60 via-white to-emerald-50/40 border border-emerald-150 hover:border-emerald-300 rounded-2xl shadow-2xs transition-all flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 overflow-x-auto py-0.5 scrollbar-none flex-1">
            <span className="text-[10px] font-extrabold text-emerald-800 uppercase tracking-wider shrink-0 flex items-center gap-1">
              <Clock size={12} className="text-emerald-600" />
              Recent Audits:
            </span>

            {/* Recent Audit Item Chips */}
            {(gallery.length > 0 ? gallery.slice(0, 6) : sessionsHistory.slice(0, 6).map(s => ({
              id: s.sessionId,
              urlOrBase64: s.previewImage || '',
              title: s.title,
              score: s.lastScore,
              timestamp: s.timestamp
            }))).map((item, idx) => (
              <div
                key={item.id || idx}
                onClick={() => {
                  const matchedSession = sessionsHistory.find(s => s.sessionId === item.id || s.previewImage === item.urlOrBase64);
                  if (matchedSession) {
                    restorePastSession(matchedSession);
                  } else if (item.urlOrBase64) {
                    handleNewImageUploaded(item.urlOrBase64, item.title);
                  }
                }}
                className="group/chip relative flex items-center gap-1.5 px-2.5 py-1 bg-white hover:bg-emerald-100/60 border border-emerald-200/80 hover:border-emerald-500 rounded-xl cursor-pointer shadow-2xs transition-all shrink-0"
                title={`Click to load "${item.title}"`}
              >
                {item.urlOrBase64 && (
                  <img
                    src={formatImageSrc(item.urlOrBase64)}
                    alt={item.title}
                    className="w-4 h-4 rounded-md object-contain bg-gray-100 shrink-0"
                  />
                )}
                <span className="text-[11px] font-semibold text-gray-800 group-hover/chip:text-emerald-900 max-w-[120px] truncate">
                  {item.title}
                </span>
                {item.score !== undefined && (
                  <span className="text-[10px] font-mono font-bold px-1.5 py-0.2 bg-emerald-100 text-emerald-800 rounded-md shrink-0">
                    {item.score.toFixed(1)}
                  </span>
                )}
              </div>
            ))}
          </div>

          {/* Prominent "Load Last" button on hover & direct click */}
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={handleLoadLastAudit}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white rounded-xl text-xs font-bold shadow-xs hover:shadow-sm transition-all flex items-center gap-1.5 group-hover/bar:ring-2 group-hover/bar:ring-emerald-400/50"
              title="Restore and view the most recent audit scorecard"
            >
              <RotateCw size={12} className="group-hover/bar:rotate-45 transition-transform" />
              <span>Load Last</span>
            </button>
          </div>
        </div>
      )}

      {/* Main Conversation Stream */}
      <div className="flex-1 overflow-y-auto space-y-6 pb-36">
        {/* Welcome Screen when messages are empty */}
        {messages.length === 0 && (
          <div className="space-y-6 animate-fadeIn pt-2">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white shrink-0 shadow-xs">
                <ShieldCheck size={22} className="fill-white" />
              </div>
              <div className="space-y-1">
                <p className="text-gray-900 text-base sm:text-lg font-semibold leading-snug">
                  Hi, I am the <span className="font-bold text-emerald-700">Audit Agent</span>. Upload any product visual or marketing creative, and I will evaluate it against rigorous criteria to provide an <span className="font-bold text-gray-900">overall score</span>, <span className="font-bold text-gray-900">visual metadata</span>, <span className="font-bold text-gray-900">scene description</span>, and <span className="font-bold text-gray-900">pros & cons</span>.
                </p>
                <p className="text-xs text-gray-500 italic">
                  *Audits evaluate Visual Hierarchy, Brand Packaging Fidelity, Lighting Quality, and Multi-channel Commercial Conversion Readiness.
                </p>
              </div>
            </div>

            {/* PREVIOUSLY AUDITED ASSETS GALLERY */}
            {gallery.length > 0 && (
              <div className="space-y-2.5 p-4 bg-white border border-gray-200 rounded-2xl shadow-2xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-gray-800">
                    <FolderHeart size={15} className="text-emerald-600" />
                    <span>Past Audited Marketing Assets</span>
                    <span className="text-[10px] font-bold text-gray-400">({gallery.length} in Cloud)</span>
                  </div>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="text-xs font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1"
                  >
                    <Plus size={12} /> Audit New
                  </button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-2.5 max-h-48 overflow-y-auto pt-1">
                  {gallery.slice(0, 12).map((item) => (
                    <div 
                      key={item.id}
                      onClick={() => handleNewImageUploaded(item.urlOrBase64, item.title)}
                      className="group relative rounded-xl border border-gray-200 hover:border-emerald-600 overflow-hidden cursor-pointer bg-gray-50 transition-all aspect-square flex items-center justify-center p-1 shadow-2xs hover:shadow-xs"
                      title={`Click to re-audit "${item.title}"`}
                    >
                      <img 
                        src={formatImageSrc(item.urlOrBase64)}
                        alt={item.title}
                        className="max-w-full max-h-full object-contain group-hover:scale-105 transition-transform"
                      />
                      {item.score !== undefined && (
                        <div className="absolute top-1.5 right-1.5 bg-black/75 text-white text-[10px] font-mono font-bold px-1.5 py-0.2 rounded-md">
                          {item.score.toFixed(1)}
                        </div>
                      )}
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center p-1 text-center">
                        <span className="text-[10px] font-bold text-white leading-tight line-clamp-2">
                          {item.title}
                        </span>
                        <span className="text-[9px] font-extrabold text-emerald-300 uppercase mt-0.5">
                          View Audit
                        </span>
                      </div>
                      <button
                        onClick={(e) => handleDeleteGalleryItem(item.id, e)}
                        className="absolute top-1.5 left-1.5 p-1 rounded-md bg-black/70 hover:bg-red-600 text-white opacity-0 group-hover:opacity-100 transition-all z-20 shadow-xs"
                        title="Delete from past audited assets"
                      >
                        <Trash2 size={11} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Quick Upload Drop Area */}
            <div 
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-gray-300 hover:border-emerald-500 rounded-3xl p-6 text-center bg-white hover:bg-emerald-50/30 transition-all cursor-pointer shadow-xs group"
            >
              <div className="flex flex-col items-center gap-2">
                <div className="p-3 bg-emerald-50 group-hover:bg-emerald-100 text-emerald-600 rounded-2xl transition-colors">
                  <Upload size={24} />
                </div>
                <span className="text-sm font-bold text-gray-800 group-hover:text-emerald-700 transition-colors">
                  Click to Upload Image for Audit
                </span>
                <span className="text-xs text-gray-500">
                  Supports JPG, PNG, WEBP (Instant multi-criteria evaluation with Gemini 3.7 Flash)
                </span>
              </div>
            </div>

            {/* Suggested Audit Criteria Grid */}
            <div className="space-y-3 pt-1">
              <h3 className="text-sm font-bold text-gray-800 flex items-center gap-1.5">
                <TrendingUp size={16} className="text-emerald-700" />
                Evaluation Criteria & Capabilities
              </h3>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-4 bg-white border border-gray-200 rounded-2xl text-left shadow-xs flex flex-col justify-between h-32">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-gray-900 leading-tight">Visual Hierarchy</span>
                    <Award size={14} className="text-emerald-600" />
                  </div>
                  <span className="text-[11px] text-gray-500">Rule of thirds, balance, subject focal clarity & eye flow.</span>
                </div>

                <div className="p-4 bg-white border border-gray-200 rounded-2xl text-left shadow-xs flex flex-col justify-between h-32">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-gray-900 leading-tight">Brand Identity</span>
                    <ShieldCheck size={14} className="text-indigo-600" />
                  </div>
                  <span className="text-[11px] text-gray-500">Packaging accuracy, logo visibility, color palette fidelity.</span>
                </div>

                <div className="p-4 bg-white border border-gray-200 rounded-2xl text-left shadow-xs flex flex-col justify-between h-32">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-gray-900 leading-tight">Lighting & Texture</span>
                    <Sparkles size={14} className="text-amber-500" />
                  </div>
                  <span className="text-[11px] text-gray-500">Commercial grade highlights, shadows, tactile materials.</span>
                </div>

                <div className="p-4 bg-white border border-gray-200 rounded-2xl text-left shadow-xs flex flex-col justify-between h-32">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-gray-900 leading-tight">Commercial Polish</span>
                    <FileCheck size={14} className="text-purple-600" />
                  </div>
                  <span className="text-[11px] text-gray-500">Retail conversion readiness, uncluttered layout.</span>
                </div>
              </div>

              {/* Action Chips */}
              <div className="flex flex-wrap gap-2 pt-2">
                <button
                  onClick={() => setShowVideoModal(true)}
                  className="px-4 py-2 bg-white hover:bg-gray-50 border border-gray-300 hover:border-emerald-600 text-gray-700 hover:text-emerald-700 rounded-full text-xs font-semibold shadow-2xs transition-all flex items-center gap-1.5"
                >
                  <Film size={14} className="text-purple-600" />
                  Audit Creator Video (YouTube)
                </button>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="px-4 py-2 bg-white hover:bg-gray-50 border border-gray-300 hover:border-emerald-600 text-gray-700 hover:text-emerald-700 rounded-full text-xs font-semibold shadow-2xs transition-all flex items-center gap-1.5"
                >
                  <Upload size={14} className="text-emerald-600" />
                  Upload Image for Audit
                </button>
                <button
                  onClick={() => handleOptionClick({ label: "Audit Sample Ad", action: "use_sample_image" })}
                  className="px-4 py-2 bg-white hover:bg-gray-50 border border-gray-300 hover:border-emerald-600 text-gray-700 hover:text-emerald-700 rounded-full text-xs font-semibold shadow-2xs transition-all flex items-center gap-1.5"
                >
                  <ImageIcon size={14} className="text-indigo-600" />
                  Load Sample Product Asset
                </button>
                {sessionsHistory.length > 0 && (
                  <button
                    onClick={() => setShowHistoryDrawer(true)}
                    className="px-4 py-2 bg-white hover:bg-gray-50 border border-gray-300 hover:border-emerald-600 text-gray-700 hover:text-emerald-700 rounded-full text-xs font-semibold shadow-2xs transition-all flex items-center gap-1.5"
                  >
                    <History size={14} className="text-amber-600" />
                    Browse {sessionsHistory.length} Past Audits
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Message Thread */}
        {messages.map((msg) => (
          <div key={msg.id} className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'} space-y-2 animate-fadeIn`}>
            <div className="flex items-start gap-2.5 max-w-[95%] sm:max-w-[90%]">
              {msg.sender === 'assistant' && (
                <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-emerald-600 to-teal-600 text-white flex items-center justify-center shrink-0 shadow-2xs mt-0.5">
                  <ShieldCheck size={16} className="fill-white" />
                </div>
              )}

              <div className="flex flex-col space-y-1.5 w-full">
                <div
                  className={`px-4 py-3 rounded-2xl text-sm leading-relaxed ${
                    msg.sender === 'user'
                      ? 'bg-emerald-700 text-white rounded-br-xs shadow-xs'
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

                  {/* Uploaded Image Thumbnail Card */}
                  {msg.uploadedImageBase64 && (
                    <div className="mt-3 relative rounded-xl overflow-hidden border border-gray-200 bg-gray-50 max-w-xs">
                      <img 
                        src={formatImageSrc(msg.uploadedImageBase64)} 
                        alt="Audit Target Asset" 
                        className="w-full h-44 object-contain cursor-pointer hover:scale-105 transition-transform"
                        onClick={() => openImageInNewTab(msg.uploadedImageBase64!)}
                        title="Click to view full size"
                      />
                      <div className="p-2 bg-white border-t border-gray-100 flex items-center justify-between text-[11px] text-gray-500">
                        <span className="font-semibold text-gray-700">Audit Target Visual</span>
                        <span className="text-emerald-600 font-bold">Evaluated</span>
                      </div>
                    </div>
                  )}

                  {/* COMPREHENSIVE IMAGE AUDIT SCORECARD */}
                  {msg.auditResult && (() => {
                    const isFtcLens = Boolean(
                      msg.auditResult.auditLens?.toLowerCase().includes('ftc') || 
                      msg.auditResult.auditLens?.toLowerCase().includes('legal') || 
                      msg.auditResult.auditLens?.toLowerCase().includes('compliance') ||
                      msg.auditResult.categoryLabels?.commercialAppeal?.includes('FTC') ||
                      msg.auditResult.categoryLabels?.visualHierarchy?.includes('Disclosures')
                    );

                    if (isFtcLens) {
                      return (
                        <div className="mt-4 space-y-4 p-5 rounded-3xl bg-gradient-to-br from-[#0B1120] via-[#0F172A] to-[#1E1B4B] border-2 border-cyan-500/70 shadow-2xl text-slate-100 ring-1 ring-cyan-400/30">
                          {/* Regulatory Header Badge */}
                          <div className="flex items-center justify-between pb-2 border-b border-cyan-500/20">
                            <div className="flex items-center gap-2">
                              <div className="p-1.5 rounded-lg bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                                <Scale size={16} />
                              </div>
                              <div>
                                <span className="text-xs font-black uppercase tracking-wider text-cyan-300">
                                  Official FTC & Legal Advertising Audit
                                </span>
                                <span className="block text-[10px] text-slate-400 font-mono">
                                  Truth-in-Advertising • Disclosures • Claims Substantiation
                                </span>
                              </div>
                            </div>
                            <span className="px-2.5 py-0.5 text-[10px] font-mono font-bold bg-cyan-950 text-cyan-300 border border-cyan-500/40 rounded-full">
                              REGULATORY COMPLIANCE
                            </span>
                          </div>

                          {/* Top Score Banner - FTC Dark Theme */}
                          <div className={`p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                            msg.auditResult.overallScore >= 8.5 
                              ? 'bg-slate-900/90 border-emerald-500/50 shadow-emerald-950/40 shadow-inner' 
                              : msg.auditResult.overallScore >= 7.0 
                              ? 'bg-slate-900/90 border-amber-500/50 shadow-amber-950/40 shadow-inner' 
                              : 'bg-slate-900/90 border-red-500/50 shadow-red-950/40 shadow-inner'
                          }`}>
                            <div className="flex items-center gap-3">
                              <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-black text-xl shadow-lg ring-2 ${
                                msg.auditResult.overallScore >= 8.5 
                                  ? 'bg-gradient-to-tr from-emerald-600 to-teal-500 text-white ring-emerald-400/60' 
                                  : msg.auditResult.overallScore >= 7.0 
                                  ? 'bg-gradient-to-tr from-amber-600 to-orange-500 text-white ring-amber-400/60' 
                                  : 'bg-gradient-to-tr from-red-600 to-rose-500 text-white ring-red-400/60'
                              }`}>
                                {msg.auditResult.overallScore.toFixed(1)}
                              </div>
                              <div>
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="text-sm font-extrabold text-white">FTC Compliance Score</span>
                                  <span className={`px-2.5 py-0.5 text-[10px] font-black rounded-full uppercase tracking-wider ${
                                    msg.auditResult.overallScore >= 8.5 
                                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400' 
                                      : msg.auditResult.overallScore >= 7.0 
                                      ? 'bg-amber-500/20 text-amber-300 border border-amber-400' 
                                      : 'bg-red-500/20 text-red-300 border border-red-400'
                                  }`}>
                                    {msg.auditResult.verdict}
                                  </span>
                                  {msg.auditResult.auditLens && (
                                    <span className="text-[10px] font-bold text-cyan-300 bg-cyan-950/80 px-2 py-0.5 rounded-full border border-cyan-600/60">
                                      {msg.auditResult.auditLens}
                                    </span>
                                  )}
                                </div>
                                <p className="text-xs text-slate-300 mt-0.5">
                                  {msg.auditResult.overallScore >= 8.5 
                                    ? 'High regulatory compliance, clear disclosures, and zero deceptive claims detected.' 
                                    : msg.auditResult.overallScore >= 7.0 
                                    ? 'Minor disclosure clarification recommended before wide public broadcast.' 
                                    : 'Significant regulatory or disclosure risk identified.'}
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center gap-2 self-end sm:self-auto">
                              <span className="text-xs font-mono font-bold text-cyan-300/80">Benchmark: 10.0</span>
                            </div>
                          </div>

                          {/* Visual Description Card - FTC Theme */}
                          <div className="p-3.5 bg-slate-900/80 border border-indigo-900/80 rounded-2xl space-y-1.5">
                            <span className="text-2xs font-extrabold text-cyan-300 uppercase tracking-wider flex items-center gap-1">
                              <Scale size={13} className="text-cyan-400" />
                              FTC Disclosures & Legal Audit Findings
                            </span>
                            <p className="text-xs text-slate-200 leading-relaxed">
                              {msg.auditResult.description}
                            </p>
                          </div>

                          {/* 4 Category Sub-Scores Grid - FTC Dark Slate Theme */}
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                            <div className="p-3 bg-slate-900/90 border border-slate-800 rounded-xl space-y-1 shadow-md">
                              <span className="text-[10px] font-bold text-cyan-200/90 uppercase block truncate">
                                {msg.auditResult.categoryLabels?.visualHierarchy || "Disclosures & Disclaimers"}
                              </span>
                              <div className="flex items-baseline justify-between">
                                <span className="text-base font-black text-white">{msg.auditResult.categoryScores.visualHierarchy.toFixed(1)}</span>
                                <span className="text-[10px] text-slate-400 font-mono">/ 10</span>
                              </div>
                              <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                                <div className="bg-cyan-400 h-full rounded-full" style={{ width: `${(msg.auditResult.categoryScores.visualHierarchy / 10) * 100}%` }}></div>
                              </div>
                            </div>

                            <div className="p-3 bg-slate-900/90 border border-slate-800 rounded-xl space-y-1 shadow-md">
                              <span className="text-[10px] font-bold text-cyan-200/90 uppercase block truncate">
                                {msg.auditResult.categoryLabels?.brandIdentity || "Trademarks & IP Fidelity"}
                              </span>
                              <div className="flex items-baseline justify-between">
                                <span className="text-base font-black text-white">{msg.auditResult.categoryScores.brandIdentity.toFixed(1)}</span>
                                <span className="text-[10px] text-slate-400 font-mono">/ 10</span>
                              </div>
                              <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                                <div className="bg-indigo-400 h-full rounded-full" style={{ width: `${(msg.auditResult.categoryScores.brandIdentity / 10) * 100}%` }}></div>
                              </div>
                            </div>

                            <div className="p-3 bg-slate-900/90 border border-slate-800 rounded-xl space-y-1 shadow-md">
                              <span className="text-[10px] font-bold text-cyan-200/90 uppercase block truncate">
                                {msg.auditResult.categoryLabels?.lightingAndPalette || "Claims Substantiation"}
                              </span>
                              <div className="flex items-baseline justify-between">
                                <span className="text-base font-black text-white">{msg.auditResult.categoryScores.lightingAndPalette.toFixed(1)}</span>
                                <span className="text-[10px] text-slate-400 font-mono">/ 10</span>
                              </div>
                              <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                                <div className="bg-amber-400 h-full rounded-full" style={{ width: `${(msg.auditResult.categoryScores.lightingAndPalette / 10) * 100}%` }}></div>
                              </div>
                            </div>

                            <div className="p-3 bg-slate-900/90 border border-slate-800 rounded-xl space-y-1 shadow-md">
                              <span className="text-[10px] font-bold text-cyan-200/90 uppercase block truncate">
                                {msg.auditResult.categoryLabels?.commercialAppeal || "FTC Compliance Score"}
                              </span>
                              <div className="flex items-baseline justify-between">
                                <span className="text-base font-black text-white">{msg.auditResult.categoryScores.commercialAppeal.toFixed(1)}</span>
                                <span className="text-[10px] text-slate-400 font-mono">/ 10</span>
                              </div>
                              <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                                <div className="bg-purple-400 h-full rounded-full" style={{ width: `${(msg.auditResult.categoryScores.commercialAppeal / 10) * 100}%` }}></div>
                              </div>
                            </div>
                          </div>

                          {/* AI Visual Metadata Tags - FTC Theme */}
                          {msg.auditResult.metadataTags && msg.auditResult.metadataTags.length > 0 && (
                            <div className="space-y-1.5">
                              <span className="text-2xs font-extrabold text-cyan-300 uppercase tracking-wider flex items-center gap-1">
                                <Tag size={12} className="text-cyan-400" />
                                Regulatory & Category Metadata
                              </span>
                              <div className="flex flex-wrap gap-1.5">
                                {msg.auditResult.metadataTags.map((tag, tIdx) => (
                                  <span 
                                    key={tIdx} 
                                    className="px-2.5 py-1 bg-slate-900/90 border border-indigo-700/60 text-cyan-200 rounded-lg text-xs font-mono font-medium shadow-xs"
                                  >
                                    {tag}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Pros & Cons - FTC Theme */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                            <div className="p-4 bg-emerald-950/40 border border-emerald-500/60 rounded-2xl space-y-2">
                              <div className="flex items-center gap-1.5 text-xs font-extrabold text-emerald-300 uppercase tracking-wider">
                                <CheckCircle2 size={15} className="text-emerald-400" />
                                Compliance Strengths
                              </div>
                              <div className="space-y-1.5">
                                {msg.auditResult.pros.map((pro, pIdx) => (
                                  <div key={pIdx} className="text-xs text-emerald-100 flex items-start gap-1.5">
                                    <Check size={13} className="text-emerald-400 shrink-0 mt-0.5" />
                                    <span>{pro}</span>
                                  </div>
                                ))}
                              </div>
                            </div>

                            <div className="p-4 bg-amber-950/40 border border-amber-500/60 rounded-2xl space-y-2">
                              <div className="flex items-center gap-1.5 text-xs font-extrabold text-amber-300 uppercase tracking-wider">
                                <AlertTriangle size={15} className="text-amber-400" />
                                Regulatory Risks & Required Disclosures
                              </div>
                              <div className="space-y-1.5">
                                {msg.auditResult.cons.map((con, cIdx) => (
                                  <div key={cIdx} className="text-xs text-amber-100 flex items-start gap-1.5">
                                    <span className="text-amber-400 font-bold shrink-0 mt-0.5">•</span>
                                    <span>{con}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>

                          {/* Actionable Recommendations - FTC Theme */}
                          {msg.auditResult.actionableRecommendations && msg.auditResult.actionableRecommendations.length > 0 && (
                            <div className="p-3.5 bg-indigo-950/60 border border-cyan-500/50 rounded-2xl space-y-1.5">
                              <span className="text-2xs font-extrabold text-cyan-300 uppercase tracking-wider flex items-center gap-1">
                                <Gavel size={13} className="text-cyan-400" />
                                Legal & Regulatory Clearance Recommendations
                              </span>
                              <div className="space-y-1 text-xs text-cyan-100">
                                {msg.auditResult.actionableRecommendations.map((rec, rIdx) => (
                                  <p key={rIdx}>
                                    <strong>{rIdx + 1}.</strong> {rec}
                                  </p>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    }

                    const isCompetitorLens = Boolean(
                      msg.auditResult.auditLens?.toLowerCase().includes('competitor') || 
                      msg.auditResult.auditLens?.toLowerCase().includes('retail') || 
                      msg.auditResult.auditLens?.toLowerCase().includes('benchmark') ||
                      msg.auditResult.categoryLabels?.visualHierarchy?.includes('Shelf') ||
                      msg.auditResult.categoryLabels?.brandIdentity?.includes('Distinctiveness')
                    );

                    if (isCompetitorLens) {
                      const insights = msg.auditResult.competitiveInsights;
                      return (
                        <div className="mt-4 space-y-4 p-5 rounded-3xl bg-gradient-to-br from-amber-50/80 via-white to-blue-50/70 border-2 border-amber-300 shadow-xl text-gray-900 ring-1 ring-amber-400/30">
                          {/* Retail Benchmark Header */}
                          <div className="flex items-center justify-between pb-2 border-b border-amber-200">
                            <div className="flex items-center gap-2">
                              <div className="p-1.5 rounded-lg bg-amber-500 text-white shadow-xs">
                                <Store size={16} />
                              </div>
                              <div>
                                <span className="text-xs font-black uppercase tracking-wider text-amber-950">
                                  Competitor Retail Benchmark & Category Matchup
                                </span>
                                <span className="block text-[10px] text-gray-500 font-mono">
                                  Big Name Rivals • Store Brands / Private Label • Modern Functional Challengers
                                </span>
                              </div>
                            </div>
                            <span className="px-2.5 py-0.5 text-[10px] font-mono font-bold bg-amber-100 text-amber-900 border border-amber-300 rounded-full">
                              RETAIL BENCHMARK
                            </span>
                          </div>

                          {/* Top Score Banner - Retail Theme */}
                          <div className="p-4 rounded-2xl bg-white border border-amber-200/90 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div className="flex items-center gap-3">
                              <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-black text-xl shadow-xs text-white ${
                                msg.auditResult.overallScore >= 8.5 
                                  ? 'bg-amber-600' 
                                  : msg.auditResult.overallScore >= 7.0 
                                  ? 'bg-blue-600' 
                                  : 'bg-red-600'
                              }`}>
                                {msg.auditResult.overallScore.toFixed(1)}
                              </div>
                              <div>
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="text-sm font-extrabold text-gray-900">Retail Competitiveness Score</span>
                                  <span className={`px-2.5 py-0.5 text-[10px] font-black rounded-full uppercase tracking-wider ${
                                    msg.auditResult.overallScore >= 8.5 
                                      ? 'bg-amber-100 text-amber-900 border border-amber-300' 
                                      : msg.auditResult.overallScore >= 7.0 
                                      ? 'bg-blue-100 text-blue-900 border border-blue-300' 
                                      : 'bg-red-100 text-red-900 border border-red-300'
                                  }`}>
                                    {msg.auditResult.verdict}
                                  </span>
                                  {insights?.retailReadinessRating && (
                                    <span className="text-[10px] font-bold text-blue-800 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
                                      {insights.retailReadinessRating}
                                    </span>
                                  )}
                                  {insights?.shelfEyeShare && (
                                    <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                                      👁️ {insights.shelfEyeShare}
                                    </span>
                                  )}
                                </div>
                                <p className="text-xs text-gray-600 mt-0.5">
                                  {msg.auditResult.overallScore >= 8.5 
                                    ? 'Exceptional PDP shelf cut-through; commands premium separation over store brands.' 
                                    : msg.auditResult.overallScore >= 7.0 
                                    ? 'Competitive retail presentation with strong brand recognition.' 
                                    : 'At risk of blending into commodity store brands or losing shelf attention.'}
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center gap-2 self-end sm:self-auto">
                              <span className="text-xs font-mono font-bold text-gray-500">Benchmark: 10.0</span>
                            </div>
                          </div>

                          {/* Visual Description Card */}
                          <div className="p-3.5 bg-white/90 border border-gray-200 rounded-2xl space-y-1.5 shadow-2xs">
                            <span className="text-2xs font-extrabold text-amber-800 uppercase tracking-wider flex items-center gap-1">
                              <Info size={13} className="text-amber-600" />
                              Retail Shelf Findings & Placement Context
                            </span>
                            <p className="text-xs text-gray-700 leading-relaxed">
                              {msg.auditResult.description}
                            </p>
                          </div>

                          {/* 4 Category Sub-Scores Grid */}
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                            <div className="p-3 bg-white border border-gray-200 rounded-xl space-y-1 shadow-2xs">
                              <span className="text-[10px] font-bold text-gray-500 uppercase block truncate">
                                {msg.auditResult.categoryLabels?.visualHierarchy || "PDP Shelf Cut-Through"}
                              </span>
                              <div className="flex items-baseline justify-between">
                                <span className="text-base font-black text-gray-900">{msg.auditResult.categoryScores.visualHierarchy.toFixed(1)}</span>
                                <span className="text-[10px] text-gray-400 font-mono">/ 10</span>
                              </div>
                              <div className="w-full bg-gray-100 h-1.5 rounded-full overflow-hidden">
                                <div className="bg-amber-500 h-full rounded-full" style={{ width: `${(msg.auditResult.categoryScores.visualHierarchy / 10) * 100}%` }}></div>
                              </div>
                            </div>

                            <div className="p-3 bg-white border border-gray-200 rounded-xl space-y-1 shadow-2xs">
                              <span className="text-[10px] font-bold text-gray-500 uppercase block truncate">
                                {msg.auditResult.categoryLabels?.brandIdentity || "Brand Distinctiveness"}
                              </span>
                              <div className="flex items-baseline justify-between">
                                <span className="text-base font-black text-gray-900">{msg.auditResult.categoryScores.brandIdentity.toFixed(1)}</span>
                                <span className="text-[10px] text-gray-400 font-mono">/ 10</span>
                              </div>
                              <div className="w-full bg-gray-100 h-1.5 rounded-full overflow-hidden">
                                <div className="bg-blue-600 h-full rounded-full" style={{ width: `${(msg.auditResult.categoryScores.brandIdentity / 10) * 100}%` }}></div>
                              </div>
                            </div>

                            <div className="p-3 bg-white border border-gray-200 rounded-xl space-y-1 shadow-2xs">
                              <span className="text-[10px] font-bold text-gray-500 uppercase block truncate">
                                {msg.auditResult.categoryLabels?.lightingAndPalette || "Mobile Legibility"}
                              </span>
                              <div className="flex items-baseline justify-between">
                                <span className="text-base font-black text-gray-900">{msg.auditResult.categoryScores.lightingAndPalette.toFixed(1)}</span>
                                <span className="text-[10px] text-gray-400 font-mono">/ 10</span>
                              </div>
                              <div className="w-full bg-gray-100 h-1.5 rounded-full overflow-hidden">
                                <div className="bg-indigo-500 h-full rounded-full" style={{ width: `${(msg.auditResult.categoryScores.lightingAndPalette / 10) * 100}%` }}></div>
                              </div>
                            </div>

                            <div className="p-3 bg-white border border-gray-200 rounded-xl space-y-1 shadow-2xs">
                              <span className="text-[10px] font-bold text-gray-500 uppercase block truncate">
                                {msg.auditResult.categoryLabels?.commercialAppeal || "Add-to-Cart Appeal"}
                              </span>
                              <div className="flex items-baseline justify-between">
                                <span className="text-base font-black text-gray-900">{msg.auditResult.categoryScores.commercialAppeal.toFixed(1)}</span>
                                <span className="text-[10px] text-gray-400 font-mono">/ 10</span>
                              </div>
                              <div className="w-full bg-gray-100 h-1.5 rounded-full overflow-hidden">
                                <div className="bg-emerald-600 h-full rounded-full" style={{ width: `${(msg.auditResult.categoryScores.commercialAppeal / 10) * 100}%` }}></div>
                              </div>
                            </div>
                          </div>

                          {/* COMPETITIVE MATCHUP MATRIX: Big Names, House Brands, Modern Challengers */}
                          <div className="space-y-3 pt-2">
                            <div className="flex items-center gap-2">
                              <Trophy size={15} className="text-amber-600" />
                              <h4 className="text-xs font-black uppercase tracking-wider text-gray-900">
                                Head-to-Head Beverage Matchups & Competitive Insights
                              </h4>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                              {/* 1. Big Name Giants Matchup */}
                              <div className="p-3.5 bg-white border border-blue-200 rounded-2xl space-y-2 shadow-2xs">
                                <div className="flex items-center justify-between">
                                  <span className="text-[11px] font-extrabold text-blue-900 uppercase tracking-wide flex items-center gap-1">
                                    <Award size={13} className="text-blue-600" />
                                    Big Name Giants
                                  </span>
                                  <span className="text-[9px] font-black uppercase px-2 py-0.5 bg-blue-100 text-blue-800 rounded-md">
                                    {insights?.bigNameMatchup?.verdict || "COMPETITIVE"}
                                  </span>
                                </div>
                                <div className="flex flex-wrap gap-1">
                                  {(insights?.bigNameMatchup?.rivals || ["Coca-Cola", "Pepsi", "Dr Pepper"]).map((r, i) => (
                                    <span key={i} className="text-[10px] font-semibold bg-gray-100 text-gray-700 px-1.5 py-0.5 rounded">
                                      vs {r}
                                    </span>
                                  ))}
                                </div>
                                <div className="space-y-1 text-xs text-gray-700">
                                  <p><strong className="text-blue-950 font-bold">Advantage:</strong> {insights?.bigNameMatchup?.advantage || "Distinct flavor identity and rich condensation appetite appeal."}</p>
                                  <p><strong className="text-gray-600 font-bold">Watchout:</strong> {insights?.bigNameMatchup?.vulnerability || "Legacy leaders possess universal logo equity."}</p>
                                </div>
                              </div>

                              {/* 2. House & Store Brands Matchup */}
                              <div className="p-3.5 bg-white border border-amber-200 rounded-2xl space-y-2 shadow-2xs">
                                <div className="flex items-center justify-between">
                                  <span className="text-[11px] font-extrabold text-amber-900 uppercase tracking-wide flex items-center gap-1">
                                    <ShoppingBag size={13} className="text-amber-600" />
                                    House & Store Brands
                                  </span>
                                  <span className="text-[9px] font-black uppercase px-2 py-0.5 bg-amber-100 text-amber-900 rounded-md">
                                    {insights?.houseBrandMatchup?.verdict || "STRONG SEPARATION"}
                                  </span>
                                </div>
                                <div className="flex flex-wrap gap-1">
                                  {(insights?.houseBrandMatchup?.rivals || ["Great Value", "Good & Gather", "Kirkland"]).map((r, i) => (
                                    <span key={i} className="text-[10px] font-semibold bg-gray-100 text-gray-700 px-1.5 py-0.5 rounded">
                                      vs {r}
                                    </span>
                                  ))}
                                </div>
                                <div className="space-y-1 text-xs text-gray-700">
                                  <p><strong className="text-amber-950 font-bold">Premium Separation:</strong> {insights?.houseBrandMatchup?.premiumSeparation || "Premium lighting and bespoke can typography command higher ASP without look-alike commodity risk."}</p>
                                  <p><strong className="text-gray-600 font-bold">Defensibility:</strong> {insights?.houseBrandMatchup?.designDefensibility || "High custom brand assets resist private-label imitation."}</p>
                                </div>
                              </div>

                              {/* 3. Modern DTC / Functional Challengers */}
                              <div className="p-3.5 bg-white border border-emerald-200 rounded-2xl space-y-2 shadow-2xs">
                                <div className="flex items-center justify-between">
                                  <span className="text-[11px] font-extrabold text-emerald-900 uppercase tracking-wide flex items-center gap-1">
                                    <Zap size={13} className="text-emerald-600" />
                                    Modern Challengers
                                  </span>
                                  <span className="text-[9px] font-black uppercase px-2 py-0.5 bg-emerald-100 text-emerald-900 rounded-md">
                                    {insights?.challengerMatchup?.verdict || "TREND FORWARD"}
                                  </span>
                                </div>
                                <div className="flex flex-wrap gap-1">
                                  {(insights?.challengerMatchup?.rivals || ["Poppi", "Olipop", "Celsius"]).map((r, i) => (
                                    <span key={i} className="text-[10px] font-semibold bg-gray-100 text-gray-700 px-1.5 py-0.5 rounded">
                                      vs {r}
                                    </span>
                                  ))}
                                </div>
                                <div className="space-y-1 text-xs text-gray-700">
                                  <p><strong className="text-emerald-950 font-bold">Modern Aesthetic:</strong> {insights?.challengerMatchup?.modernAestheticAppeal || "Vibrant flavor cues and fresh color styling resonate strongly with younger demographic shoppers."}</p>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* AI Visual Metadata Tags */}
                          {msg.auditResult.metadataTags && msg.auditResult.metadataTags.length > 0 && (
                            <div className="space-y-1.5">
                              <span className="text-2xs font-extrabold text-gray-500 uppercase tracking-wider flex items-center gap-1">
                                <Tag size={12} className="text-amber-600" />
                                Category & Retail Metadata Tags
                              </span>
                              <div className="flex flex-wrap gap-1.5">
                                {msg.auditResult.metadataTags.map((tag, tIdx) => (
                                  <span 
                                    key={tIdx} 
                                    className="px-2.5 py-1 bg-white border border-gray-200 text-gray-700 rounded-lg text-xs font-mono font-medium shadow-2xs"
                                  >
                                    {tag}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Pros & Cons */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                            <div className="p-4 bg-emerald-50/60 border border-emerald-200 rounded-2xl space-y-2">
                              <div className="flex items-center gap-1.5 text-xs font-extrabold text-emerald-800 uppercase tracking-wider">
                                <CheckCircle2 size={15} className="text-emerald-600" />
                                Retail & Shelf Advantages
                              </div>
                              <div className="space-y-1.5">
                                {msg.auditResult.pros.map((pro, pIdx) => (
                                  <div key={pIdx} className="text-xs text-gray-800 flex items-start gap-1.5">
                                    <Check size={13} className="text-emerald-600 shrink-0 mt-0.5" />
                                    <span>{pro}</span>
                                  </div>
                                ))}
                              </div>
                            </div>

                            <div className="p-4 bg-amber-50/60 border border-amber-200 rounded-2xl space-y-2">
                              <div className="flex items-center gap-1.5 text-xs font-extrabold text-amber-800 uppercase tracking-wider">
                                <AlertTriangle size={15} className="text-amber-600" />
                                Retail Merchandising Vulnerabilities
                              </div>
                              <div className="space-y-1.5">
                                {msg.auditResult.cons.map((con, cIdx) => (
                                  <div key={cIdx} className="text-xs text-gray-800 flex items-start gap-1.5">
                                    <span className="text-amber-600 font-bold shrink-0 mt-0.5">•</span>
                                    <span>{con}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>

                          {/* Actionable Recommendations */}
                          {msg.auditResult.actionableRecommendations && msg.auditResult.actionableRecommendations.length > 0 && (
                            <div className="p-3.5 bg-blue-50/60 border border-blue-200 rounded-2xl space-y-1.5">
                              <span className="text-2xs font-extrabold text-blue-900 uppercase tracking-wider flex items-center gap-1">
                                <Lightbulb size={13} className="text-blue-600" />
                                Strategic Retail Optimization Next Steps
                              </span>
                              <div className="space-y-1 text-xs text-blue-950">
                                {msg.auditResult.actionableRecommendations.map((rec, rIdx) => (
                                  <p key={rIdx}>
                                    <strong>{rIdx + 1}.</strong> {rec}
                                  </p>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    }

                    // Standard 4-Pillar Visual & Brand Compliance Scorecard
                    return (
                      <div className="mt-4 space-y-4 pt-3 border-t border-gray-100 text-gray-900">
                        {/* Top Score Banner */}
                        <div className={`p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                          msg.auditResult.overallScore >= 8.5 
                            ? 'bg-emerald-50/70 border-emerald-200' 
                            : msg.auditResult.overallScore >= 7.0 
                            ? 'bg-amber-50/70 border-amber-200' 
                            : 'bg-red-50/70 border-red-200'
                        }`}>
                          <div className="flex items-center gap-3">
                            <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-black text-xl shadow-xs ${
                              msg.auditResult.overallScore >= 8.5 
                                ? 'bg-emerald-600 text-white' 
                                : msg.auditResult.overallScore >= 7.0 
                                ? 'bg-amber-500 text-white' 
                                : 'bg-red-600 text-white'
                            }`}>
                              {msg.auditResult.overallScore.toFixed(1)}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-extrabold text-gray-900">Overall Audit Score</span>
                                <span className={`px-2 py-0.5 text-[10px] font-black rounded-full uppercase tracking-wider ${
                                  msg.auditResult.overallScore >= 8.5 
                                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' 
                                    : msg.auditResult.overallScore >= 7.0 
                                    ? 'bg-amber-100 text-amber-800 border border-amber-300' 
                                    : 'bg-red-100 text-red-800 border border-red-300'
                                }`}>
                                  {msg.auditResult.verdict}
                                </span>
                                {msg.auditResult.auditLens && (
                                  <span className="text-[10px] font-bold text-gray-700 bg-gray-100 px-2 py-0.5 rounded-full border border-gray-200">
                                    {msg.auditResult.auditLens}
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-gray-600 mt-0.5">
                                {msg.auditResult.overallScore >= 8.5 
                                  ? 'Exemplary visual hierarchy and high commercial polish.' 
                                  : msg.auditResult.overallScore >= 7.0 
                                  ? 'Strong asset with minor optimization opportunities.' 
                                  : 'Needs visual revisions before commercial deployment.'}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 self-end sm:self-auto">
                            <span className="text-xs font-mono font-bold text-gray-500">Benchmark: 10.0</span>
                          </div>
                        </div>

                        {/* Visual Description Card */}
                        <div className="p-3.5 bg-gray-50 border border-gray-200 rounded-2xl space-y-1.5">
                          <span className="text-2xs font-extrabold text-gray-500 uppercase tracking-wider flex items-center gap-1">
                            <Info size={13} className="text-emerald-600" />
                            Visual Description & Lens Findings
                          </span>
                          <p className="text-xs text-gray-700 leading-relaxed">
                            {msg.auditResult.description}
                          </p>
                        </div>

                        {/* 4 Category Sub-Scores Grid */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                          <div className="p-3 bg-white border border-gray-200 rounded-xl space-y-1 shadow-2xs">
                            <span className="text-[10px] font-bold text-gray-500 uppercase block truncate">
                              {msg.auditResult.categoryLabels?.visualHierarchy || "Hierarchy & Focus"}
                            </span>
                            <div className="flex items-baseline justify-between">
                              <span className="text-base font-black text-gray-900">{msg.auditResult.categoryScores.visualHierarchy.toFixed(1)}</span>
                              <span className="text-[10px] text-gray-400 font-mono">/ 10</span>
                            </div>
                            <div className="w-full bg-gray-100 h-1.5 rounded-full overflow-hidden">
                              <div className="bg-emerald-600 h-full rounded-full" style={{ width: `${(msg.auditResult.categoryScores.visualHierarchy / 10) * 100}%` }}></div>
                            </div>
                          </div>

                          <div className="p-3 bg-white border border-gray-200 rounded-xl space-y-1 shadow-2xs">
                            <span className="text-[10px] font-bold text-gray-500 uppercase block truncate">
                              {msg.auditResult.categoryLabels?.brandIdentity || "Brand Identity"}
                            </span>
                            <div className="flex items-baseline justify-between">
                              <span className="text-base font-black text-gray-900">{msg.auditResult.categoryScores.brandIdentity.toFixed(1)}</span>
                              <span className="text-[10px] text-gray-400 font-mono">/ 10</span>
                            </div>
                            <div className="w-full bg-gray-100 h-1.5 rounded-full overflow-hidden">
                              <div className="bg-indigo-600 h-full rounded-full" style={{ width: `${(msg.auditResult.categoryScores.brandIdentity / 10) * 100}%` }}></div>
                            </div>
                          </div>

                          <div className="p-3 bg-white border border-gray-200 rounded-xl space-y-1 shadow-2xs">
                            <span className="text-[10px] font-bold text-gray-500 uppercase block truncate">
                              {msg.auditResult.categoryLabels?.lightingAndPalette || "Lighting & Texture"}
                            </span>
                            <div className="flex items-baseline justify-between">
                              <span className="text-base font-black text-gray-900">{msg.auditResult.categoryScores.lightingAndPalette.toFixed(1)}</span>
                              <span className="text-[10px] text-gray-400 font-mono">/ 10</span>
                            </div>
                            <div className="w-full bg-gray-100 h-1.5 rounded-full overflow-hidden">
                              <div className="bg-amber-500 h-full rounded-full" style={{ width: `${(msg.auditResult.categoryScores.lightingAndPalette / 10) * 100}%` }}></div>
                            </div>
                          </div>

                          <div className="p-3 bg-white border border-gray-200 rounded-xl space-y-1 shadow-2xs">
                            <span className="text-[10px] font-bold text-gray-500 uppercase block truncate">
                              {msg.auditResult.categoryLabels?.commercialAppeal || "Commercial Appeal"}
                            </span>
                            <div className="flex items-baseline justify-between">
                              <span className="text-base font-black text-gray-900">{msg.auditResult.categoryScores.commercialAppeal.toFixed(1)}</span>
                              <span className="text-[10px] text-gray-400 font-mono">/ 10</span>
                            </div>
                            <div className="w-full bg-gray-100 h-1.5 rounded-full overflow-hidden">
                              <div className="bg-purple-600 h-full rounded-full" style={{ width: `${(msg.auditResult.categoryScores.commercialAppeal / 10) * 100}%` }}></div>
                            </div>
                          </div>
                        </div>

                        {/* AI Visual Metadata Tags */}
                        {msg.auditResult.metadataTags && msg.auditResult.metadataTags.length > 0 && (
                          <div className="space-y-1.5">
                            <span className="text-2xs font-extrabold text-gray-500 uppercase tracking-wider flex items-center gap-1">
                              <Tag size={12} className="text-emerald-600" />
                              AI Visual Metadata Tags
                            </span>
                            <div className="flex flex-wrap gap-1.5">
                              {msg.auditResult.metadataTags.map((tag, tIdx) => (
                                <span 
                                  key={tIdx} 
                                  className="px-2.5 py-1 bg-white border border-gray-200 text-gray-700 rounded-lg text-xs font-mono font-medium shadow-2xs"
                                >
                                  {tag}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Pros & Cons Side-by-Side Comparison */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                          {/* Pros / Strengths */}
                          <div className="p-4 bg-emerald-50/60 border border-emerald-200 rounded-2xl space-y-2">
                            <div className="flex items-center gap-1.5 text-xs font-extrabold text-emerald-800 uppercase tracking-wider">
                              <CheckCircle2 size={15} className="text-emerald-600" />
                              Strengths (Brand Compliant)
                            </div>
                            <div className="space-y-1.5">
                              {msg.auditResult.pros.map((pro, pIdx) => (
                                <div key={pIdx} className="text-xs text-gray-800 flex items-start gap-1.5">
                                  <Check size={13} className="text-emerald-600 shrink-0 mt-0.5" />
                                  <span>{pro}</span>
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* Cons / Areas for Improvement */}
                          <div className="p-4 bg-amber-50/60 border border-amber-200 rounded-2xl space-y-2">
                            <div className="flex items-center gap-1.5 text-xs font-extrabold text-amber-800 uppercase tracking-wider">
                              <AlertTriangle size={15} className="text-amber-600" />
                              Areas for Optimization (Cons)
                            </div>
                            <div className="space-y-1.5">
                              {msg.auditResult.cons.map((con, cIdx) => (
                                <div key={cIdx} className="text-xs text-gray-800 flex items-start gap-1.5">
                                  <span className="text-amber-600 font-bold shrink-0 mt-0.5">•</span>
                                  <span>{con}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>

                        {/* Actionable Recommendations */}
                        {msg.auditResult.actionableRecommendations && msg.auditResult.actionableRecommendations.length > 0 && (
                          <div className="p-3.5 bg-indigo-50/50 border border-indigo-150 rounded-2xl space-y-1.5">
                            <span className="text-2xs font-extrabold text-indigo-800 uppercase tracking-wider flex items-center gap-1">
                              <Lightbulb size={13} className="text-indigo-600" />
                              Strategic Next Steps
                            </span>
                            <div className="space-y-1 text-xs text-indigo-950">
                              {msg.auditResult.actionableRecommendations.map((rec, rIdx) => (
                                <p key={rIdx}>
                                  <strong>{rIdx + 1}.</strong> {rec}
                                </p>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })()}

                  {/* CREATOR PARTNER VIDEO COMPLIANCE AUDIT SIGN-OFF SHEET */}
                  {msg.videoAuditResult && (() => {
                    const videoAnalysis = msg.videoAuditResult;
                    const finalDecision = (videoAnalysis.final_decision || 'APPROVED').toUpperCase();
                    const isApproved = finalDecision.includes('APPROVED');
                    const isRevisions = finalDecision.includes('REVISIONS');
                    const creatorHandle = videoAnalysis.metadata?.creator_handle || '@creator_partner';
                    const campaignName = videoAnalysis.metadata?.campaign_name || `${companyName} Creator Growth Campaign`;
                    const reviewerName = videoAnalysis.metadata?.reviewer_name || 'AI Brand Auditor';
                    const reviewDate = videoAnalysis.metadata?.review_date || new Date().toLocaleDateString();
                    const complianceScore = videoAnalysis.compliance_score ?? 90;
                    const reviewRows = videoAnalysis.review_table || [];
                    const productMentions = videoAnalysis.product_mentions || [];
                    const auditFlags = videoAnalysis.audit_flags || [];
                    const recommendations = videoAnalysis.recommendations || [];

                    return (
                      <div className="mt-4 space-y-5 p-4 sm:p-5 rounded-3xl bg-white border-2 border-indigo-200 shadow-xl text-gray-900 ring-1 ring-indigo-50">
                        {/* Video Player Embed / Preview */}
                        {msg.videoInfo?.videoId && (
                          <div className="rounded-2xl overflow-hidden border border-gray-200 bg-black aspect-video relative group shadow-sm">
                            <iframe
                              src={`https://www.youtube.com/embed/${msg.videoInfo.videoId}`}
                              title={msg.videoInfo.title || "Creator Partner Video"}
                              className="w-full h-full"
                              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                              allowFullScreen
                            />
                          </div>
                        )}

                        {/* Sign-Off Header Card */}
                        <div className="bg-slate-50 border border-slate-200 p-4 sm:p-5 rounded-2xl space-y-4">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200">
                            <div className="flex items-center gap-2.5">
                              <div className="p-2 rounded-xl bg-indigo-100 text-indigo-700 border border-indigo-200">
                                <ShieldCheck size={20} />
                              </div>
                              <div>
                                <h4 className="text-base font-extrabold text-gray-900">
                                  {companyName}: Creator Video Review Sign-Off Sheet
                                </h4>
                                <p className="text-xs text-gray-500 font-mono">
                                  Official 10-Point Legal, FTC & Brand Compliance Audit
                                </p>
                              </div>
                            </div>

                            {/* Final Decision Badge */}
                            <div className="flex flex-col items-start sm:items-end">
                              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-gray-400 mb-0.5">Approval Decision</span>
                              <span className={`px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider border shadow-xs flex items-center gap-1.5 ${
                                isApproved 
                                  ? 'bg-emerald-100 text-emerald-800 border-emerald-300' 
                                  : isRevisions 
                                  ? 'bg-amber-100 text-amber-800 border-amber-300' 
                                  : 'bg-rose-100 text-rose-800 border-rose-300'
                              }`}>
                                {isApproved && <CheckCircle2 size={14} className="text-emerald-700" />}
                                {isRevisions && <AlertTriangle size={14} className="text-amber-700" />}
                                {!isApproved && !isRevisions && <AlertCircle size={14} className="text-rose-700" />}
                                {isApproved ? '[✓] APPROVED' : isRevisions ? '[!] REVISIONS REQUIRED' : '[✕] REJECTED'}
                              </span>
                            </div>
                          </div>

                          {/* Campaign Metadata Grid */}
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs font-mono">
                            <div className="p-2.5 bg-white rounded-xl border border-slate-200">
                              <span className="text-gray-400 block mb-0.5 text-[10px] uppercase font-bold">Campaign</span>
                              <strong className="text-gray-900 truncate block" title={campaignName}>{campaignName}</strong>
                            </div>
                            <div className="p-2.5 bg-white rounded-xl border border-slate-200">
                              <span className="text-gray-400 block mb-0.5 text-[10px] uppercase font-bold">Creator Handle</span>
                              <strong className="text-gray-900 truncate block" title={creatorHandle}>{creatorHandle}</strong>
                            </div>
                            <div className="p-2.5 bg-white rounded-xl border border-slate-200">
                              <span className="text-gray-400 block mb-0.5 text-[10px] uppercase font-bold">Review Date</span>
                              <strong className="text-gray-900 truncate block">{reviewDate}</strong>
                            </div>
                            <div className="p-2.5 bg-indigo-50 rounded-xl border border-indigo-200 text-indigo-900">
                              <span className="text-indigo-600 block mb-0.5 text-[10px] uppercase font-bold">Compliance Score</span>
                              <strong className="text-indigo-950 text-sm font-black">{complianceScore}%</strong>
                            </div>
                          </div>
                        </div>

                        {/* 10-Point Review Criteria Table */}
                        <div className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden">
                          <div className="p-3.5 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
                            <h5 className="font-bold text-gray-900 text-xs sm:text-sm flex items-center gap-1.5">
                              <ShieldCheck className="text-indigo-600" size={16} /> 10-Point Review Criteria Table
                            </h5>
                            <span className="text-xs font-mono text-gray-500 font-medium">
                              Passing: <strong className="text-emerald-600">{reviewRows.filter((r: any) => (r.status || '').toUpperCase() === 'PASS').length}</strong> / {reviewRows.length || 10}
                            </span>
                          </div>

                          <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs border-collapse">
                              <thead>
                                <tr className="bg-gray-100/80 border-b border-gray-200 text-gray-700 font-bold uppercase tracking-wider font-mono text-[10.5px]">
                                  <th className="p-2.5 w-10 text-center">#</th>
                                  <th className="p-2.5 w-40 sm:w-44">Review Criteria</th>
                                  <th className="p-2.5 w-44 sm:w-48">Focus Area</th>
                                  <th className="p-2.5 w-24 text-center">Status</th>
                                  <th className="p-2.5">Review Notes & Required Fixes</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-gray-100">
                                {reviewRows.map((row: any, idx: number) => {
                                  const statusStr = (row.status || 'PASS').toUpperCase();
                                  return (
                                    <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                                      <td className="p-2.5 text-center font-mono font-bold text-gray-400">{row.id || idx + 1}</td>
                                      <td className="p-2.5 font-bold text-gray-900">{row.criteria}</td>
                                      <td className="p-2.5 text-gray-500 text-[11px] leading-snug">{row.focus_area}</td>
                                      <td className="p-2.5 text-center">
                                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase font-mono border ${
                                          statusStr === 'PASS' 
                                            ? 'bg-emerald-100 text-emerald-800 border-emerald-300' 
                                            : statusStr === 'PARTIAL' 
                                            ? 'bg-amber-100 text-amber-800 border-amber-300' 
                                            : 'bg-rose-100 text-rose-800 border-rose-300'
                                        }`}>
                                          {statusStr}
                                        </span>
                                      </td>
                                      <td className="p-2.5 text-gray-700 font-medium leading-relaxed">{row.notes || 'Meets brand guidelines.'}</td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        </div>

                        {/* Product Mentions & Audit Flags Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {/* Product Mentions */}
                          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
                            <h5 className="font-bold text-gray-900 text-xs mb-3 flex items-center gap-1.5">
                              <Tag className="text-indigo-600" size={15} /> Featured Product Mentions & Demos
                            </h5>
                            {productMentions.length > 0 ? (
                              <div className="space-y-2 max-h-[220px] overflow-y-auto">
                                {productMentions.map((p: any, pIdx: number) => (
                                  <div key={pIdx} className="p-2.5 bg-white rounded-xl border border-slate-200 text-xs">
                                    <div className="flex justify-between items-center mb-0.5 font-semibold text-gray-900">
                                      <span>{p.name}</span>
                                      {p.timestamp && (
                                        <span className="bg-indigo-100 text-indigo-800 font-mono text-[10px] px-1.5 py-0.2 rounded">
                                          {p.timestamp}
                                        </span>
                                      )}
                                    </div>
                                    <p className="text-gray-600 text-[11px] leading-snug">{p.description}</p>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <p className="text-xs text-gray-500 italic">No specific product demos or mentions isolated in video.</p>
                            )}
                          </div>

                          {/* Compliance Flags & Strategic Recommendations */}
                          <div className="space-y-4">
                            {auditFlags.length > 0 && (
                              <div className="bg-rose-50/70 p-4 rounded-2xl border border-rose-200">
                                <h5 className="font-bold text-rose-900 text-xs mb-2 flex items-center gap-1.5">
                                  <AlertCircle size={15} className="text-rose-600" /> Compliance & Audit Flags
                                </h5>
                                <ul className="space-y-1.5 text-xs text-rose-800 list-disc pl-4">
                                  {auditFlags.map((flag: string, fIdx: number) => (
                                    <li key={fIdx}>{flag}</li>
                                  ))}
                                </ul>
                              </div>
                            )}

                            {recommendations.length > 0 && (
                              <div className="bg-indigo-50/70 p-4 rounded-2xl border border-indigo-200">
                                <h5 className="font-bold text-indigo-900 text-xs mb-2 flex items-center gap-1.5">
                                  <Sparkles size={15} className="text-indigo-600" /> Recommendations for Approval
                                </h5>
                                <ul className="space-y-1.5 text-xs text-indigo-900 list-disc pl-4">
                                  {recommendations.map((rec: string, rIdx: number) => (
                                    <li key={rIdx}>{rec}</li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Summary */}
                        {videoAnalysis.summary && (
                          <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 text-xs text-gray-700 leading-relaxed">
                            <span className="font-bold text-gray-900 block mb-1 uppercase font-mono text-[10px]">Auditor Executive Summary</span>
                            {videoAnalysis.summary}
                          </div>
                        )}
                      </div>
                    );
                  })()}

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
                            className="w-full text-left px-3.5 py-2.5 bg-gray-50 hover:bg-emerald-50 border border-gray-200 hover:border-emerald-600 text-gray-800 hover:text-emerald-700 rounded-xl text-xs font-semibold transition-all flex items-center justify-between group shadow-2xs"
                          >
                            <span>{opt.label}</span>
                            <ChevronRight size={14} className="text-gray-400 group-hover:text-emerald-700 group-hover:translate-x-0.5 transition-transform" />
                          </button>
                        ))}
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
                  className="w-8 h-8 rounded-full text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs mt-0.5 bg-emerald-700"
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
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-emerald-600 to-teal-600 text-white flex items-center justify-center shrink-0 shadow-2xs">
              <Loader2 size={16} className="animate-spin" />
            </div>
            <div className="bg-white border border-gray-200 px-4 py-3 rounded-2xl rounded-bl-xs text-xs text-gray-600 shadow-xs flex items-center gap-2">
              <div className="animate-pulse flex items-center gap-2">
                <span className="inline-block w-2 h-2 rounded-full bg-emerald-600"></span>
                <span className="font-semibold text-gray-800">{statusMessage || 'Auditing image asset with Gemini...'}</span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Slide-in Past Sessions History Drawer */}
      {showHistoryDrawer && (
        <div className="fixed inset-y-0 right-0 w-80 sm:w-96 bg-white border-l border-gray-200 shadow-2xl z-50 flex flex-col animate-slideLeft">
          <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-emerald-50/50">
            <div className="flex items-center gap-2">
              <History size={16} className="text-emerald-700" />
              <span className="font-bold text-sm text-gray-900">Audit History</span>
            </div>
            <button 
              onClick={() => setShowHistoryDrawer(false)}
              className="p-1 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100"
            >
              <X size={16} />
            </button>
          </div>

          <div className="p-3 border-b border-gray-100 flex items-center justify-between">
            <span className="text-xs text-gray-500 font-medium">{sessionsHistory.length} Saved Audits</span>
            <button
              onClick={handleResetChat}
              className="text-xs font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1"
            >
              <Plus size={13} /> New Audit
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
            {sessionsHistory.length === 0 ? (
              <div className="text-center py-12 text-gray-400 text-xs">
                No past audits recorded yet. Upload an image to evaluate and save audits automatically.
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
                        ? 'bg-emerald-50 border-emerald-300 shadow-xs' 
                        : 'bg-white hover:bg-gray-50 border-gray-200 hover:border-emerald-300'
                    }`}
                  >
                    {sess.previewImage ? (
                      <div className="w-12 h-12 rounded-xl bg-gray-100 border border-gray-200 overflow-hidden shrink-0 flex items-center justify-center relative">
                        <img 
                          src={formatImageSrc(sess.previewImage)}
                          alt="Thumbnail"
                          className="max-w-full max-h-full object-cover"
                        />
                        {sess.isPinned && (
                          <div className="absolute top-0.5 right-0.5 bg-amber-400 text-amber-950 p-0.5 rounded-full shadow-2xs" title="Pinned to top">
                            <Star size={9} className="fill-amber-950" />
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 relative">
                        <ImageIcon size={18} />
                        {sess.isPinned && (
                          <div className="absolute top-0.5 right-0.5 bg-amber-400 text-amber-950 p-0.5 rounded-full shadow-2xs" title="Pinned to top">
                            <Star size={9} className="fill-amber-950" />
                          </div>
                        )}
                      </div>
                    )}

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
                              className="w-full px-2 py-0.5 text-xs font-bold text-gray-900 bg-white border border-emerald-400 rounded-md focus:outline-hidden focus:ring-1 focus:ring-emerald-500"
                              autoFocus
                            />
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRenameSession(sess.sessionId, editingTitle);
                                setEditingSessionId(null);
                              }}
                              className="p-1 text-emerald-700 hover:text-emerald-900 hover:bg-emerald-100 rounded"
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
                              {sess.lastScore !== undefined && (
                                <span className="text-[10px] font-extrabold text-emerald-700 bg-emerald-100 px-1.5 py-0.2 rounded-md">
                                  {sess.lastScore.toFixed(1)}
                                </span>
                              )}
                              {/* Pin/Star Button */}
                              <button
                                onClick={(e) => handleTogglePinSession(sess.sessionId, e)}
                                className={`p-1 rounded-lg transition-colors ${
                                  sess.isPinned 
                                    ? 'text-amber-500 hover:text-amber-600 bg-amber-50' 
                                    : 'text-gray-300 hover:text-amber-500 opacity-0 group-hover:opacity-100'
                                }`}
                                title={sess.isPinned ? "Unpin audit" : "Pin/Star audit to top"}
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
                                className="text-gray-400 hover:text-emerald-700 p-1 rounded-lg hover:bg-emerald-50 opacity-0 group-hover:opacity-100 transition-opacity"
                                title="Rename audit"
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

      {/* Creator Partner YouTube Video Audit Modal */}
      {showVideoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl border border-gray-200 overflow-hidden flex flex-col p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-purple-100 text-purple-700">
                  <Film size={18} />
                </div>
                <div>
                  <h3 className="font-extrabold text-gray-900 text-sm">Audit Creator Partner Video</h3>
                  <p className="text-[11px] text-gray-500 font-mono">10-Point Legal, FTC & Brand Safety Compliance</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowVideoModal(false);
                  setVideoUrlInput('');
                }}
                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100"
              >
                <X size={16} />
              </button>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-700 block">
                YouTube Video URL
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={videoUrlInput}
                  onChange={(e) => setVideoUrlInput(e.target.value)}
                  placeholder="https://www.youtube.com/watch?v=..."
                  className="flex-1 px-3.5 py-2.5 rounded-xl border border-gray-300 text-xs text-gray-900 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 focus:border-transparent font-mono"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && videoUrlInput.trim()) {
                      const url = videoUrlInput.trim();
                      setShowVideoModal(false);
                      setVideoUrlInput('');
                      handleSendMessage(url);
                    }
                  }}
                />
                <button
                  onClick={() => {
                    if (videoUrlInput.trim()) {
                      const url = videoUrlInput.trim();
                      setShowVideoModal(false);
                      setVideoUrlInput('');
                      handleSendMessage(url);
                    }
                  }}
                  disabled={!videoUrlInput.trim()}
                  className="px-4 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 disabled:bg-gray-200 text-white font-bold text-xs shadow-xs transition-colors shrink-0"
                >
                  Audit
                </button>
              </div>
            </div>

            {/* Quick Sample Creator Videos */}
            <div className="space-y-2 pt-2 border-t border-gray-100">
              <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400 block font-mono">
                Sample Brand Creator Videos
              </span>
              <div className="space-y-1.5">
                {[
                  { title: "Squirt Citrus - Creator Review & Taste Test", url: "https://www.youtube.com/watch?v=MrJOCtA_w68" },
                  { title: "Squirt Paloma - Mixology Ritual & Recipe", url: "https://www.youtube.com/watch?v=QVhwdWr1i-Y" },
                  { title: "Keurig Dr Pepper - Brand Spotlight & Refreshment", url: "https://www.youtube.com/watch?v=P97KpyVHxXo" }
                ].map((sample, sIdx) => (
                  <button
                    key={sIdx}
                    onClick={() => {
                      setShowVideoModal(false);
                      setVideoUrlInput('');
                      handleSendMessage(sample.url);
                    }}
                    className="w-full p-2.5 rounded-xl border border-gray-200 hover:border-purple-300 hover:bg-purple-50/60 text-left flex items-center justify-between text-xs transition-all group"
                  >
                    <div className="flex items-center gap-2">
                      <Play size={13} className="text-purple-600 group-hover:scale-110 transition-transform" />
                      <span className="font-medium text-gray-800">{sample.title}</span>
                    </div>
                    <span className="text-[10px] font-mono text-gray-400">Sample</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Floating Centered Bottom Chat Input Box */}
      <div className="fixed bottom-4 left-0 md:left-72 right-0 max-w-4xl mx-auto px-4 z-30 pointer-events-none">
        <div className="bg-white border border-gray-300 rounded-3xl shadow-xl p-3 sm:p-4 space-y-2 transition-all focus-within:border-emerald-600 focus-within:ring-2 focus-within:ring-emerald-100 pointer-events-auto">
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
              placeholder="Ask Audit Agent (e.g. 'Audit visual', 'Paste YouTube link for creator compliance', 'FTC check')..."
              rows={1}
              className="w-full resize-none border-none outline-none text-sm text-gray-800 placeholder-gray-400 bg-transparent max-h-32 min-h-[2.5rem] py-1"
            />

            <button
              onClick={() => handleSendMessage()}
              disabled={!inputPrompt.trim() || isLoading}
              className="p-2.5 rounded-full bg-emerald-700 hover:bg-emerald-800 disabled:bg-gray-200 text-white transition-all shadow-xs shrink-0"
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
                        setShowVideoModal(true);
                      }}
                      className="w-full px-3 py-2 text-left hover:bg-emerald-50 text-gray-700 flex items-center gap-2"
                    >
                      <Film size={14} className="text-purple-600" />
                      Audit Creator Video (YouTube)
                    </button>
                    <button
                      onClick={() => {
                        setShowPlusMenu(false);
                        fileInputRef.current?.click();
                      }}
                      className="w-full px-3 py-2 text-left hover:bg-emerald-50 text-gray-700 flex items-center gap-2"
                    >
                      <Upload size={14} className="text-emerald-600" />
                      Upload New Image for Audit
                    </button>
                    <button
                      onClick={() => {
                        setShowPlusMenu(false);
                        handleOptionClick({ label: "Use Sample Ad", action: "use_sample_image" });
                      }}
                      className="w-full px-3 py-2 text-left hover:bg-emerald-50 text-gray-700 flex items-center gap-2"
                    >
                      <ImageIcon size={14} className="text-indigo-600" />
                      Audit Sample Product Ad
                    </button>
                    <button
                      onClick={() => {
                        setShowPlusMenu(false);
                        handleSendMessage("Evaluate FTC advertising compliance and claims accuracy");
                      }}
                      className="w-full px-3 py-2 text-left hover:bg-emerald-50 text-gray-700 flex items-center gap-2"
                    >
                      <FileCheck size={14} className="text-amber-600" />
                      FTC Advertising Compliance Audit
                    </button>
                    {sessionsHistory.length > 0 && (
                      <button
                        onClick={() => {
                          setShowPlusMenu(false);
                          setShowHistoryDrawer(true);
                        }}
                        className="w-full px-3 py-2 text-left hover:bg-emerald-50 text-gray-700 flex items-center gap-2"
                      >
                        <History size={14} className="text-purple-600" />
                        Browse Audit History ({sessionsHistory.length})
                      </button>
                    )}
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
                onClick={() => setShowHistoryDrawer(!showHistoryDrawer)}
                className="text-[11px] font-semibold text-gray-500 hover:text-emerald-700 flex items-center gap-1 transition-colors"
                title="View Past Audits"
              >
                <History size={12} />
                History ({sessionsHistory.length})
              </button>

              <button
                onClick={handleResetChat}
                disabled={isLoading || messages.length === 0}
                className="text-[11px] font-semibold text-gray-500 hover:text-red-600 flex items-center gap-1 disabled:opacity-40 transition-colors"
                title="New Audit Session"
              >
                <Plus size={12} />
                New Audit
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
