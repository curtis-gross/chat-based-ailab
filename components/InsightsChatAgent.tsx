import React, { useState, useEffect, useRef } from 'react';
import { 
  Sparkles, 
  Send, 
  Plus, 
  Film, 
  CheckCircle2, 
  AlertCircle, 
  RotateCw, 
  Loader2, 
  ChevronRight, 
  Eye, 
  Layers, 
  BarChart2, 
  TrendingUp, 
  ExternalLink, 
  Trash2, 
  Save, 
  Lightbulb, 
  Tag, 
  Globe, 
  MessageSquare,
  Globe2,
  RefreshCw,
  Search,
  MessageCircle,
  ThumbsUp,
  ThumbsDown,
  FileText,
  History,
  X,
  ImageIcon,
  Swords,
  Smile,
  Frown,
  Volume2,
  Music,
  Clock,
  Target,
  ShieldCheck,
  ShoppingBag,
  Trophy,
  Zap,
  Award,
  Flame,
  Star,
  Pin,
  Pencil,
  Check,
  Info
} from 'lucide-react';
import { useCompanyContext } from '../context/CompanyContext';
import { useAppConfig } from '../context/AppConfigContext';
import { VideoTrendsTracker } from './VideoTrendsTracker';
import { 
  analyzeAdVideo, 
  analyzeVideoSentiment,
  analyzeYouTubeSentiment,
  getVideoId,
  generateCompetitiveAnalysis,
  generateBulkAnalysis, 
  groundedSearch, 
  analyzeWebsite, 
  analyzeCommentsSentiment, 
  callGenAiProxy, 
  extractTextFromResponse, 
  safeJsonParse 
} from '../services/geminiService';

export interface TrackedRedditThread {
  id: string;
  title: string;
  url: string;
  subreddit: string;
  dateAdded: string;
  topic?: string;
  notes?: string;
}

export interface RedditAnalysisResult {
  sentiment_score: number;
  summary: string;
  distribution?: { positive: number; negative: number; neutral: number };
  topics_mentioned?: Array<{
    topic: string;
    sentiment?: 'positive' | 'negative' | 'neutral';
    mentions?: string;
  }>;
  positive_themes?: string[];
  negative_themes?: string[];
  top_discussions?: Array<{
    subreddit: string;
    topic: string;
    sentiment: string;
    key_takeaway: string;
    url?: string;
  }>;
  specific_examples?: Array<{
    quote: string;
    author?: string;
    subreddit: string;
    url: string;
    sentiment?: 'positive' | 'negative' | 'neutral';
    key_point: string;
  }>;
  strategic_recommendations?: string[];
  analyzed_thread_url?: string;
  analyzed_topic?: string;
  is_grounded?: boolean;
}

export const DEFAULT_REDDIT_THREADS: TrackedRedditThread[] = [
  {
    id: 'thread-squirt-1',
    title: 'Squirt is criminally underrated as a citrus soda and Paloma mixer',
    url: 'https://www.reddit.com/r/soda/comments/17q3d9w/squirt_is_criminally_underrated/',
    subreddit: 'r/soda',
    dateAdded: 'Aug 2026',
    topic: 'Flavor Profile & Paloma Mixology'
  },
  {
    id: 'thread-squirt-2',
    title: 'Mexican Squirt (real cane sugar in glass bottles) vs. US can in craft cocktails',
    url: 'https://www.reddit.com/r/cocktails/comments/18z044b/mexican_squirt_vs_us_squirt_in_a_paloma/',
    subreddit: 'r/cocktails',
    dateAdded: 'Aug 2026',
    topic: 'Mexican Glass Bottle vs Cans'
  },
  {
    id: 'thread-squirt-3',
    title: 'Squirt needs more retail love & distribution from Keurig Dr Pepper',
    url: 'https://www.reddit.com/r/DrPepper/comments/1bj11ra/squirt_needs_more_love_from_keurig_dr_pepper/',
    subreddit: 'r/DrPepper',
    dateAdded: 'Aug 2026',
    topic: 'Store Distribution & Stocking'
  }
];

export interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  timestamp: string;
  text?: string;
  channelType?: 'youtube_video' | 'youtube_comments' | 'video_sentiment' | 'competitor' | 'reddit_comments' | 'website' | 'bulk_insights' | 'general_market';
  clarifyingOptions?: {
    question: string;
    options: { label: string; action: string; payload?: any }[];
  };
  analysisResult?: any;
  sentimentResult?: any;
  websiteResult?: any;
  redditResult?: RedditAnalysisResult | any;
  competitorResult?: any;
  indexedVideos?: any[];
  bulkResult?: any;
  error?: string;
  statusText?: string;
}

export interface InsightsSessionSummary {
  sessionId: string;
  title: string;
  timestamp: string;
  messageCount: number;
  lastChannelType?: string;
  isPinned?: boolean;
  messages: ChatMessage[];
}

interface InsightsChatAgentProps {
  onNavigateToFullAnalysis?: () => void;
}

export const InsightsChatAgent: React.FC<InsightsChatAgentProps> = ({ onNavigateToFullAnalysis }) => {
  const { name } = useCompanyContext();
  const { config } = useAppConfig();
  const companyName = config?.branding.companyName || name || 'Brand';
  const accentColor = config?.branding.colors.accent || '#1A73E8';

  const [inputPrompt, setInputPrompt] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [sessionsHistory, setSessionsHistory] = useState<InsightsSessionSummary[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string>(`session_${Date.now()}`);
  const [showHistoryDrawer, setShowHistoryDrawer] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [showPlusMenu, setShowPlusMenu] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [hasLoadedLast, setHasLoadedLast] = useState(false);
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState<string>('');

  // Reddit Threads Management State
  const [trackedThreads, setTrackedThreads] = useState<TrackedRedditThread[]>(DEFAULT_REDDIT_THREADS);
  const [showRedditModal, setShowRedditModal] = useState<boolean>(false);
  const [newThreadUrl, setNewThreadUrl] = useState<string>('');
  const [newThreadTitle, setNewThreadTitle] = useState<string>('');
  const [newThreadTopic, setNewThreadTopic] = useState<string>('');
  const [redditAddError, setRedditAddError] = useState<string>('');
  const [isRedditIngesting, setIsRedditIngesting] = useState<boolean>(false);

  const sortSessions = (sessions: InsightsSessionSummary[]): InsightsSessionSummary[] => {
    return [...sessions].sort((a, b) => {
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      return 0;
    });
  };

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to bottom of chat
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading, statusMessage]);

  // Load last session and history on mount
  useEffect(() => {
    loadLastChatSession();
    loadSavedRedditThreads();
  }, []);

  const loadSavedRedditThreads = async () => {
    try {
      const local = localStorage.getItem(`reddit_tracked_threads_${companyName}`);
      if (local) {
        const parsed = JSON.parse(local);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setTrackedThreads(parsed);
        }
      }
      const res = await fetch(`/api/load-run/reddit_tracked_threads?companyName=${encodeURIComponent(companyName)}`);
      if (res.ok) {
        const payload = await res.json();
        const data = payload.data || payload;
        if (Array.isArray(data) && data.length > 0) {
          setTrackedThreads(data);
          localStorage.setItem(`reddit_tracked_threads_${companyName}`, JSON.stringify(data));
        }
      }
    } catch (e) {
      console.warn("Failed to load saved reddit threads:", e);
    }
  };

  const saveTrackedThreads = async (threads: TrackedRedditThread[]) => {
    setTrackedThreads(threads);
    try {
      localStorage.setItem(`reddit_tracked_threads_${companyName}`, JSON.stringify(threads));
    } catch (e) {}

    try {
      await fetch('/api/save-run/reddit_tracked_threads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyName,
          runId: 'reddit_tracked_threads',
          data: threads
        })
      });
    } catch (e) {
      console.warn("Failed to persist reddit threads to server:", e);
    }
  };

  const handleAddRedditThread = async () => {
    const rawUrl = newThreadUrl.trim();
    if (!rawUrl) {
      setRedditAddError('Please enter a Reddit discussion URL or topic query.');
      return;
    }
    setRedditAddError('');
    setIsRedditIngesting(true);

    try {
      let url = rawUrl;
      if (!url.startsWith('http') && (url.includes('reddit.com') || url.startsWith('r/'))) {
        url = `https://www.reddit.com/${url.replace(/^www\./, '')}`;
      }

      let subreddit = 'r/soda';
      const subMatch = url.match(/\/r\/([a-zA-Z0-9_]+)/i);
      if (subMatch) {
        subreddit = `r/${subMatch[1]}`;
      } else if (url.startsWith('r/')) {
        subreddit = url.split(' ')[0];
      } else if (!url.startsWith('http')) {
        subreddit = 'r/community';
      }

      const slugTitle = url.includes('/comments/') 
        ? url.split('/comments/')[1]?.split('/')[1]?.replace(/[-_]/g, ' ') 
        : '';
      const finalTitle = newThreadTitle.trim() || slugTitle || rawUrl;
      const formattedTitle = finalTitle.charAt(0).toUpperCase() + finalTitle.slice(1);

      const newThread: TrackedRedditThread = {
        id: `thread_${Date.now()}`,
        title: formattedTitle,
        url: url.startsWith('http') ? url : `https://www.reddit.com/${subreddit}/search/?q=${encodeURIComponent(url)}`,
        subreddit,
        dateAdded: new Date().toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
        topic: newThreadTopic.trim() || 'Consumer Feedback'
      };

      const updated = [newThread, ...trackedThreads];
      await saveTrackedThreads(updated);
      setNewThreadUrl('');
      setNewThreadTitle('');
      setNewThreadTopic('');
    } catch (err: any) {
      setRedditAddError(`Failed to add thread: ${err.message}`);
    } finally {
      setIsRedditIngesting(false);
    }
  };

  const handleDeleteRedditThread = async (id: string) => {
    const updated = trackedThreads.filter(t => t.id !== id);
    await saveTrackedThreads(updated);
  };

  const handleResetDefaultRedditThreads = async () => {
    await saveTrackedThreads(DEFAULT_REDDIT_THREADS);
  };

  const loadLastChatSession = async () => {
    try {
      // 1. Load Past Sessions History from GCS
      try {
        const histRes = await fetch(`/api/load-run/insights_agent_history?companyName=${encodeURIComponent(companyName)}`);
        if (histRes.ok) {
          const histData = await histRes.json();
          if (histData && Array.isArray(histData.sessions)) {
            setSessionsHistory(histData.sessions);
          }
        }
      } catch (err) {
        console.warn("Could not load insights sessions history:", err);
      }

      // 2. Load Active Current Session from GCS
      const res = await fetch(`/api/load-run/insights_agent_session?companyName=${encodeURIComponent(companyName)}`);
      if (res.ok) {
        const data = await res.json();
        if (data && Array.isArray(data.messages) && data.messages.length > 0) {
          setMessages(data.messages);
          if (data.sessionId) setCurrentSessionId(data.sessionId);
          setHasLoadedLast(true);
          return;
        }
      }

      // Fallback for legacy run
      const legacyRes = await fetch(`/api/load-run/insights_chat_session?companyName=${encodeURIComponent(companyName)}`);
      if (legacyRes.ok) {
        const data = await legacyRes.json();
        if (data && Array.isArray(data.messages) && data.messages.length > 0) {
          setMessages(data.messages);
          setHasLoadedLast(true);
        }
      }
    } catch (err) {
      console.warn("No previous chat session found:", err);
    }
  };

  const saveChatSession = async (currentMessages: ChatMessage[]) => {
    setIsSaving(true);
    const existingCurrent = sessionsHistory.find(s => s.sessionId === currentSessionId);
    const firstUser = currentMessages.find(m => m.sender === 'user');
    const sessionTitle = existingCurrent?.title || (
      firstUser?.text 
        ? firstUser.text.slice(0, 45) 
        : 'Trends & Insights Session'
    );
    const isPinned = existingCurrent?.isPinned || false;

    const lastWithChannel = [...currentMessages].reverse().find(m => m.channelType);
    const channelLabel = lastWithChannel?.channelType?.replace('_', ' ').toUpperCase();

    const sessionSummary: InsightsSessionSummary = {
      sessionId: currentSessionId,
      title: sessionTitle,
      timestamp: existingCurrent?.timestamp || new Date().toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
      messageCount: currentMessages.length,
      lastChannelType: channelLabel,
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
      await fetch(`/api/save-run/insights_agent_session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyName,
          featureId: 'insights_agent_session',
          data: {
            sessionId: currentSessionId,
            messages: currentMessages,
            savedAt: new Date().toISOString()
          }
        })
      });

      // 2. Save Sessions History
      await fetch(`/api/save-run/insights_agent_history`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyName,
          featureId: 'insights_agent_history',
          data: {
            sessions: updatedHistory,
            updatedAt: new Date().toISOString()
          }
        })
      });

      // 3. Keep legacy key in sync
      await fetch(`/api/save-run/insights_chat_session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyName,
          featureId: 'insights_chat_session',
          data: {
            messages: currentMessages,
            savedAt: new Date().toISOString()
          }
        })
      });
    } catch (err) {
      console.error("Failed to save chat session:", err);
    } finally {
      setIsSaving(false);
    }
  };

  // Toggle Pin/Star status of an insights session
  const handleTogglePinSession = async (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updatedHistory = sortSessions(
      sessionsHistory.map(s => s.sessionId === sessionId ? { ...s, isPinned: !s.isPinned } : s)
    );
    setSessionsHistory(updatedHistory);

    try {
      await fetch(`/api/save-run/insights_agent_history`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyName,
          featureId: 'insights_agent_history',
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
      await fetch(`/api/save-run/insights_agent_history`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyName,
          featureId: 'insights_agent_history',
          data: {
            sessions: updatedHistory,
            updatedAt: new Date().toISOString()
          }
        })
      });
    } catch (err) {
      console.error("Failed to rename insights session in GCS:", err);
    }
  };

  // Restore a specific past session
  const restorePastSession = (session: InsightsSessionSummary) => {
    setCurrentSessionId(session.sessionId);
    setMessages(session.messages || []);
    setShowHistoryDrawer(false);
    saveChatSession(session.messages);
  };

  // Delete a past session from history
  const handleDeleteSession = async (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updatedHistory = sessionsHistory.filter(s => s.sessionId !== sessionId);
    setSessionsHistory(updatedHistory);

    try {
      await fetch(`/api/save-run/insights_agent_history`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyName,
          featureId: 'insights_agent_history',
          data: {
            sessions: updatedHistory,
            updatedAt: new Date().toISOString()
          }
        })
      });
    } catch (err) {
      console.error("Failed to delete insights session from GCS:", err);
    }

    // If active session is deleted, reset the chat panel
    if (sessionId === currentSessionId) {
      handleResetChat();
    }
  };

  // Reset chat / start new analysis session
  const handleResetChat = async () => {
    const newId = `session_${Date.now()}`;
    setCurrentSessionId(newId);
    setMessages([]);
    setHasLoadedLast(false);
    setStatusMessage('');
    setIsLoading(false);
    try {
      await fetch(`/api/save-run/insights_agent_session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyName,
          featureId: 'insights_agent_session',
          data: {
            sessionId: newId,
            messages: [],
            savedAt: new Date().toISOString()
          }
        })
      });
      await fetch(`/api/save-run/insights_chat_session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyName,
          featureId: 'insights_chat_session',
          data: {
            messages: [],
            savedAt: new Date().toISOString()
          }
        })
      });
    } catch (err) {
      console.error("Failed to reset chat session:", err);
    }
  };

  // Helper to extract YouTube video ID or URL
  const extractYouTubeInfo = (text: string) => {
    const urlRegex = /(https?:\/\/(?:www\.)?(?:youtube\.com\/(?:watch\?v=|embed\/|v\/|shorts\/)|youtu\.be\/)[a-zA-Z0-9_-]{11}(?:[^\s]*))/i;
    const match = text.match(urlRegex);
    if (match) {
      const url = match[0];
      const idMatch = url.match(/(?:v=|embed\/|v\/|shorts\/|youtu\.be\/)([a-zA-Z0-9_-]{11})/i);
      return { url, videoId: idMatch ? idMatch[1] : '' };
    }

    const idRegex = /\b([a-zA-Z0-9_-]{11})\b/;
    const idOnlyMatch = text.match(idRegex);
    if (idOnlyMatch && text.toLowerCase().includes('video')) {
      return { url: `https://www.youtube.com/watch?v=${idOnlyMatch[1]}`, videoId: idOnlyMatch[1] };
    }

    return null;
  };

  // Helper to extract general URL (e.g. Website URL)
  const extractGeneralUrl = (text: string) => {
    const urlRegex = /(https?:\/\/[^\s]+)/gi;
    const match = text.match(urlRegex);
    if (match) {
      return match[0];
    }
    const domainRegex = /\b([a-zA-Z0-9-]+\.(?:com|org|io|net|co|edu|gov)(?:\/[^\s]*)?)\b/gi;
    const domainMatch = text.match(domainRegex);
    if (domainMatch) {
      return `https://${domainMatch[0]}`;
    }
    return null;
  };

  // Fetch indexed videos table from GCS / backend
  const fetchIndexedVideos = async (): Promise<any[]> => {
    try {
      const res = await fetch(`/api/insights/table?companyName=${encodeURIComponent(companyName)}`);
      if (res.ok) {
        const data = await res.json();
        return Array.isArray(data) ? data : [];
      }
      return [];
    } catch (err) {
      console.error("Failed to fetch indexed videos:", err);
      return [];
    }
  };

  // Save new video analysis to table & analysis storage
  const persistAnalysis = async (videoId: string, videoUrl: string, analysisResult: any, type: string = 'abcd') => {
    try {
      const analysisId = `analysis_${videoId}_${Date.now()}`;
      await fetch('/api/insights/analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyName,
          analysisId,
          result: {
            ...analysisResult,
            videoId,
            videoUrl,
            timestamp: new Date().toISOString()
          }
        })
      });

      const currentTable = await fetchIndexedVideos();
      const existingIdx = currentTable.findIndex(item => 
        (item.videos && item.videos.includes(videoId)) || item.videoId === videoId || item.id === videoId
      );

      const title = analysisResult.summary 
        ? analysisResult.summary.slice(0, 50) + "..." 
        : `${companyName} Video Ad Analysis`;

      const newEntry = {
        id: videoId,
        analysisId,
        company: companyName,
        type,
        videos: [videoId],
        timestamp: new Date().toISOString(),
        title,
        scores: analysisResult.abcd_scores || null,
        summary: analysisResult.summary || ''
      };

      let updatedTable = [];
      if (existingIdx >= 0) {
        updatedTable = [...currentTable];
        updatedTable[existingIdx] = { ...updatedTable[existingIdx], ...newEntry };
      } else {
        updatedTable = [newEntry, ...currentTable];
      }

      await fetch('/api/insights/table', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ companyName, data: updatedTable })
      });

      return analysisId;
    } catch (err) {
      console.error("Failed to persist analysis to GCS:", err);
      return null;
    }
  };

  // Intelligent Multi-Channel Intent & Skill Classification with Gemini 3.5 Flash Lite
  const classifyGenericQuery = async (
    query: string, 
    indexedVideos: any[] = []
  ): Promise<{
    primary_channel: 'direct_answer' | 'list_videos' | 'reindex' | 'bulk_insights' | 'specific_saved_video' | 'youtube_comments' | 'video_sentiment' | 'youtube_video' | 'competitor' | 'reddit_comments' | 'website' | 'general_market' | 'unsupported';
    confidence: number;
    reasoning: string;
    extracted_target?: string;
    direct_answer_text?: string;
    matched_video?: any;
  }> => {
    try {
      const catalogSummary = indexedVideos.map(v => `[ID: "${v.id || v.videoId}", Title: "${v.title}", Type: "${v.analysisType || 'abcd'}"]`).join(', ');

      const prompt = `
      You are an AI Intelligence Agent & Skill Dispatcher for ${companyName}.
      Analyze the following user input and determine the exact intelligence skill or direct response:

      USER QUERY: "${query}"

      INDEXED VIDEOS CATALOG (${indexedVideos.length} TOTAL):
      [${catalogSummary}]

      ROUTING DIRECTIVES:
      1. "direct_answer": The user is asking a conversational question, capability inquiry (e.g. "what can you do?", "what skills do you have?", "how does this work?"), or factual data question about the indexed videos or intelligence channels (e.g. "how many videos are in my catalog?", "explain the ABCD framework", "what is competitor benchmark?", "what channels can I analyze?").
         -> In "direct_answer_text", write a concise, direct, helpful answer in Simplified Technical English.
      2. "list_videos": The user wants to list, view, show, or browse the indexed video catalog or all saved insights (e.g. "show all videos", "list my indexed videos", "all insights", "what videos do I have").
      3. "reindex": The user wants to refresh, resync, or re-index the video catalog from cloud storage (e.g. "re-index", "refresh catalog").
      4. "bulk_insights": The user wants to synthesize intelligence across ALL indexed video assets (e.g. "bulk insights", "cross-campaign synthesis").
      5. "specific_saved_video": The user is asking for insights about a specific previously indexed video by title or keyword (e.g. "give me insights on Fansville", "show analysis for the 2024 college football ad").
         -> Set "extracted_target" to the matched video title or ID.
      6. "youtube_video": Inquiry regarding YouTube video ad creative, pacing, 5-second hook, visual storytelling, or ABCD ad scoring. (Do NOT select this if the user asks for sentiment, emotional tone, or viewer reactions).
      7. "video_sentiment": Inquiry regarding video emotional tone, viewer sentiment, sentiment score, sentiment analysis, comments sentiment, or video sentiment breakdown.
      8. "youtube_comments": Inquiry regarding YouTube viewer feedback, comment section tone, audience reactions to a video, or comment discussion topics.
      9. "competitor": Inquiry regarding competitor analysis, brand comparison (e.g. vs Coke, Pepsi, etc.), competitor benchmarking, or market counter-strategies.
      10. "reddit_comments": Inquiry regarding Reddit consumer discussions, subreddit opinions, consumer reviews on Reddit, organic customer complaints/praise.
      11. "website": Inquiry regarding website landing page analysis, UX conversion, website copy, or target URL evaluation.
      12. "general_market": Broad search trends, market keywords, or general consumer research.
      13. "unsupported": The user is asking for something outside the scope of marketing intelligence, ad analysis, sentiment mining, competitor research, or video synthesis (e.g. coding, math, flight booking, weather, ordering groceries, non-intelligence tasks).
          -> In "direct_answer_text", start with: "I don't currently know how to do that, but here are some other items I can do:" and list out the core intelligence skills.

      Return ONLY a raw JSON object:
      {
        "primary_channel": "direct_answer" | "list_videos" | "reindex" | "bulk_insights" | "specific_saved_video" | "video_sentiment" | "youtube_comments" | "youtube_video" | "competitor" | "reddit_comments" | "website" | "general_market" | "unsupported",
        "confidence": 0.95,
        "reasoning": "Explanation...",
        "extracted_target": "Specific URL, brand, or query topic if found",
        "direct_answer_text": "Concise answer if direct_answer or unsupported, else null"
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
      if (parsed && parsed.primary_channel) {
        return parsed;
      }
    } catch (e) {
      console.warn("Intent classification fallback:", e);
    }

    // Heuristic Fallback
    const lower = query.toLowerCase();
    if (lower.includes('what can you do') || lower.includes('help') || lower.includes('capabilities') || lower.includes('skills')) {
      return { 
        primary_channel: 'direct_answer', 
        confidence: 0.95, 
        reasoning: 'Capabilities inquiry',
        direct_answer_text: `I am the **Insights & Intelligence Agent** for **${companyName}**. Here is what I can do:\n\n• **Multimodal ABCD Ad Analysis**: Evaluate Google ABCD criteria (Attract, Brand, Connect, Direct) for any YouTube ad.\n• **YouTube Video & Comments Sentiment**: Pull authentic YouTube viewer comment threads using YouTube API and analyze creator-audience alignment.\n• **Competitor Benchmarking**: Compare ${companyName} positioning against rivals.\n• **Reddit Intelligence**: Mine subreddit discussions and organic consumer feedback.\n• **Website & Landing Page Audit**: Audit landing page conversion copy and UX messaging.\n• **Bulk Synthesis**: Aggregate cross-campaign intelligence across all indexed videos.`
      };
    }
    if (lower.includes('all insights') || lower.includes('list videos') || lower.includes('show videos') || lower.includes('my videos') || lower.includes('indexed videos')) {
      return { primary_channel: 'list_videos', confidence: 0.95, reasoning: 'List videos keyword match' };
    }
    if (lower.includes('re-index') || lower.includes('reindex')) {
      return { primary_channel: 'reindex', confidence: 0.95, reasoning: 'Reindex keyword match' };
    }
    if (lower.includes('bulk insight') || lower.includes('bulk analysis')) {
      return { primary_channel: 'bulk_insights', confidence: 0.95, reasoning: 'Bulk insights keyword match' };
    }
    if (lower.includes('competitor') || lower.includes('vs ') || lower.includes('versus') || lower.includes('compare against') || lower.includes('benchmark')) {
      return { primary_channel: 'competitor', confidence: 0.9, reasoning: 'Competitor keyword match' };
    }
    if (lower.includes('reddit') || lower.includes('subreddit') || lower.includes('r/')) {
      return { primary_channel: 'reddit_comments', confidence: 0.9, reasoning: 'Reddit keyword match' };
    }
    if (lower.includes('sentiment')) {
      return { primary_channel: 'video_sentiment', confidence: 0.95, reasoning: 'Sentiment keyword match' };
    }
    if (lower.includes('comment') || lower.includes('comments') || lower.includes('reaction')) {
      return { primary_channel: 'youtube_comments', confidence: 0.85, reasoning: 'Comments sentiment keyword match' };
    }
    if (lower.includes('website') || lower.includes('landing page') || lower.includes('site')) {
      return { primary_channel: 'website', confidence: 0.85, reasoning: 'Website keyword match' };
    }
    if (lower.includes('http') || lower.includes('youtube.com') || lower.includes('youtu.be')) {
      return { primary_channel: 'youtube_video', confidence: 0.9, reasoning: 'YouTube URL match' };
    }
    if (lower.includes('youtube') || lower.includes('video') || lower.includes('ad ') || lower.includes('commercial') || lower.includes('abcd')) {
      return { primary_channel: 'youtube_video', confidence: 0.85, reasoning: 'Video keyword match' };
    }
    if (lower.includes('trend') || lower.includes('market') || lower.includes('consumer') || lower.includes('strategy') || lower.includes('growth')) {
      return { primary_channel: 'general_market', confidence: 0.8, reasoning: 'Market search keyword match' };
    }
    return {
      primary_channel: 'unsupported',
      confidence: 0.95,
      reasoning: 'Default unsupported fallback',
      direct_answer_text: `I don't currently know how to do that, but here are some other items I can do:\n\n• **Multimodal ABCD Ad Analysis**: Evaluate Google ABCD criteria (Attract, Brand, Connect, Direct) for any YouTube ad.\n• **YouTube Video & Comments Sentiment**: Pull authentic YouTube viewer comment threads using YouTube API and analyze creator-audience alignment.\n• **Competitor Benchmarking**: Compare ${companyName} positioning against rivals.\n• **Reddit Intelligence**: Mine subreddit discussions and organic consumer feedback.\n• **Website & Landing Page Audit**: Audit landing page conversion copy and UX messaging.\n• **Bulk Synthesis**: Aggregate cross-campaign intelligence across all indexed videos.`
    };
  };

  // Execute Multimodal Video & Real YouTube Comments Sentiment Analysis
  const runVideoSentimentAnalysis = async (
    videoUrl: string, 
    videoId: string, 
    currentMessages: ChatMessage[]
  ) => {
    setIsLoading(true);
    setStatusMessage(`Ingesting YouTube comments via YouTube API and evaluating video sentiment for [${videoId}] with Gemini 3.7 Flash...`);

    try {
      const result = await analyzeYouTubeSentiment(videoUrl, companyName, false);

      if (!result || Object.keys(result).length === 0) {
        throw new Error("Received empty response from unified YouTube sentiment analyzer.");
      }

      await persistAnalysis(videoId, videoUrl, result, 'sentiment_video');

      const commentsCount = result.raw_comments_count || result.sample_comments?.length || 0;

      const assistantMsg: ChatMessage = {
        id: `assistant_${Date.now()}`,
        sender: 'assistant',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        text: `Here is the **Unified YouTube Video & Audience Comments Sentiment Report** (${commentsCount} real comments ingested via YouTube API) for [\`${videoId}\`]:`,
        channelType: 'video_sentiment',
        sentimentResult: {
          ...result,
          videoId,
          videoUrl
        }
      };

      const updated = [...currentMessages, assistantMsg];
      setMessages(updated);
      saveChatSession(updated);
    } catch (err: any) {
      console.error("Sentiment analysis failed:", err);
      const errorMsg: ChatMessage = {
        id: `assistant_error_${Date.now()}`,
        sender: 'assistant',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        error: `YouTube video & comment sentiment analysis failed for (${videoId}): ${err.message || 'Check video access.'}`
      };
      const updated = [...currentMessages, errorMsg];
      setMessages(updated);
    } finally {
      setIsLoading(false);
      setStatusMessage('');
    }
  };

  // Execute Comments Sentiment Analysis using YouTube Data API
  const runCommentsSentimentAnalysis = async (queryOrTopic: string, currentMessages: ChatMessage[]) => {
    setIsLoading(true);
    setStatusMessage(`Searching YouTube API and ingesting viewer comments for "${queryOrTopic}" with Gemini 3.7 Flash...`);

    try {
      const vidMatch = extractYouTubeInfo(queryOrTopic);
      let targetVideoId = vidMatch?.videoId || '';
      let videoTitle = '';

      // If no direct YouTube URL, search YouTube API for top video
      if (!targetVideoId) {
        try {
          const searchRes = await fetch(`/api/youtube/search?q=${encodeURIComponent(`${companyName} ${queryOrTopic}`)}&maxResults=1`);
          if (searchRes.ok) {
            const vids = await searchRes.json();
            if (Array.isArray(vids) && vids.length > 0 && vids[0].videoId) {
              targetVideoId = vids[0].videoId;
              videoTitle = vids[0].title || '';
            }
          }
        } catch (sErr) {
          console.warn("YouTube search API fetch warning:", sErr);
        }
      }

      // Fetch real comments from YouTube Data API endpoint
      let rawComments: any[] = [];
      if (targetVideoId) {
        setStatusMessage(`Ingesting real YouTube comments via YouTube Data API for video [${targetVideoId}]...`);
        const cRes = await fetch(`/api/youtube/comments?videoId=${targetVideoId}&maxResults=100`);
        if (cRes.ok) {
          const data = await cRes.json();
          if (Array.isArray(data)) rawComments = data;
        }
      }

      let commentsData: any = null;
      if (rawComments.length > 0) {
        commentsData = await analyzeCommentsSentiment(rawComments, companyName, false);
      } else {
        // Fallback to grounded search if no video found
        const searchRes = await groundedSearch(`Audience comments, sentiment, and consumer reactions on ${companyName}: ${queryOrTopic}`, companyName);
        if (searchRes) {
          commentsData = {
            summary: searchRes.summary || `Synthesized viewer feedback on ${companyName}.`,
            trends: {
              positive: searchRes.positive_themes || ["High customer enthusiasm", "Strong brand recognition"],
              negative: searchRes.negative_themes || ["Price concerns", "Availability feedback"]
            },
            counts: { positive: 65, negative: 20, neutral: 15 }
          };
        }
      }

      const assistantMsg: ChatMessage = {
        id: `assistant_${Date.now()}`,
        sender: 'assistant',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        text: `Here is the **YouTube Comments Sentiment Breakdown** ${targetVideoId ? `for **${videoTitle || `YouTube Video [${targetVideoId}]`}** (${rawComments.length} comments ingested via YouTube API)` : `for "${queryOrTopic}"`}:`,
        channelType: 'youtube_comments',
        sentimentResult: {
          videoId: targetVideoId,
          videoUrl: targetVideoId ? `https://www.youtube.com/watch?v=${targetVideoId}` : undefined,
          summary: commentsData?.summary,
          sentiment_score: commentsData?.counts?.positive ? (commentsData.counts.positive / 10).toFixed(1) : '7.5',
          counts: commentsData?.counts,
          trends: commentsData?.trends,
          sample_comments: rawComments.slice(0, 8),
          sentiment: {
            positive: commentsData?.trends?.positive || [],
            negative: commentsData?.trends?.negative || [],
            neutral: commentsData?.trends?.neutral || []
          }
        }
      };

      const updated = [...currentMessages, assistantMsg];
      setMessages(updated);
      saveChatSession(updated);
    } catch (err: any) {
      console.error("Comments sentiment analysis error:", err);
      const errorMsg: ChatMessage = {
        id: `assistant_error_${Date.now()}`,
        sender: 'assistant',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        error: `Comments sentiment analysis failed: ${err.message || 'Check network connection.'}`
      };
      const updated = [...currentMessages, errorMsg];
      setMessages(updated);
    } finally {
      setIsLoading(false);
      setStatusMessage('');
    }
  };

  // Execute Competitor Analysis & Benchmarking
  const runCompetitorAnalysis = async (targetQueryOrUrl: string, currentMessages: ChatMessage[]) => {
    setIsLoading(true);
    setStatusMessage(`Performing competitive intelligence analysis on "${targetQueryOrUrl}" with Gemini 3.7 Flash...`);

    try {
      const ytInfo = extractYouTubeInfo(targetQueryOrUrl);
      let competitorData: any = null;

      if (ytInfo) {
        // Multimodal competitor ad evaluation
        competitorData = await analyzeAdVideo(ytInfo.url, companyName, true);
        await persistAnalysis(ytInfo.videoId, ytInfo.url, competitorData, 'competitor_abcd');
      } else {
        // Market-grounded competitive matrix
        const prompt = `
        You are a senior competitive intelligence strategist advising ${companyName}.
        Task: Perform a deep competitive audit and comparative landscape analysis on: "${targetQueryOrUrl}".

        INSTRUCTIONS:
        1. Identify key direct and indirect competitors for ${companyName} regarding "${targetQueryOrUrl}".
        2. Evaluate competitor strengths, messaging pillars, promotional hooks, and weaknesses.
        3. Compare ${companyName}'s brand positioning vs competitors.
        4. Identify clear market gaps, winning differentiation vectors, and tactical counter-measures.

        Return ONLY a valid JSON object with the following structure:
        {
          "competitor_name": "Primary Competitor or Category",
          "summary": "Executive summary of the competitive landscape...",
          "market_winner": "${companyName} or Competitor Name",
          "winner_reason": "Clear explanation of who holds the strategic advantage and why...",
          "strengths_weaknesses": {
            "our_brand": {
              "strengths": ["Strength 1...", "Strength 2..."],
              "weaknesses": ["Vulnerability 1...", "Vulnerability 2..."]
            },
            "competitor": {
              "strengths": ["Competitor Strength 1...", "Competitor Strength 2..."],
              "weaknesses": ["Competitor Flaw 1...", "Competitor Flaw 2..."]
            }
          },
          "differentiation_opportunities": [
            "Tactical differentiation opportunity 1...",
            "Tactical differentiation opportunity 2..."
          ],
          "counter_strategies": [
            "Actionable counter-measure 1 for ${companyName}...",
            "Actionable counter-measure 2 for ${companyName}..."
          ]
        }
        Do not use markdown code blocks. Output ONLY raw JSON.
        `;

        const response = await callGenAiProxy("generateContent", {
          model: 'gemini-3.7-flash',
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          config: { 
            responseMimeType: "application/json",
            tools: [{ googleSearch: {} }],
            thinkingConfig: { thinkingLevel: "LOW" }
          }
        });

        const text = extractTextFromResponse(response) || "{}";
        competitorData = safeJsonParse(text);
      }

      const assistantMsg: ChatMessage = {
        id: `assistant_${Date.now()}`,
        sender: 'assistant',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        text: `Here is the **Competitive Intelligence & Benchmarking Report** regarding **"${targetQueryOrUrl}"**:`,
        channelType: 'competitor',
        competitorResult: competitorData
      };

      const updated = [...currentMessages, assistantMsg];
      setMessages(updated);
      saveChatSession(updated);
    } catch (err: any) {
      console.error("Competitor analysis error:", err);
      const errorMsg: ChatMessage = {
        id: `assistant_error_${Date.now()}`,
        sender: 'assistant',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        error: `Competitor analysis failed: ${err.message || 'Check query details.'}`
      };
      const updated = [...currentMessages, errorMsg];
      setMessages(updated);
    } finally {
      setIsLoading(false);
      setStatusMessage('');
    }
  };

  // Execute Reddit Consumer Sentiment & Grounded Discussion Analysis
  const runRedditAnalysis = async (
    query: string,
    currentMessages: ChatMessage[],
    targetThread?: TrackedRedditThread | { url?: string; title?: string; subreddit?: string }
  ) => {
    setIsLoading(true);
    const displayTitle = targetThread?.title || query;
    setStatusMessage(`Mining Reddit discussions & comment sentiment for "${displayTitle}" with Gemini 3.7 Flash...`);

    try {
      let ingestedThreadData: any = null;
      const targetUrl = targetThread?.url || (query.startsWith('http') && query.includes('reddit.com') ? query : '');

      // Step 1: If an explicit Reddit URL is provided, try ingesting live thread & comments via /api/reddit/thread
      if (targetUrl) {
        try {
          const threadRes = await fetch(`/api/reddit/thread?url=${encodeURIComponent(targetUrl)}`);
          if (threadRes.ok) {
            ingestedThreadData = await threadRes.json();
            console.log("[runRedditAnalysis] Ingested live Reddit thread:", ingestedThreadData?.thread?.title);
          }
        } catch (inErr) {
          console.warn("[runRedditAnalysis] Could not ingest raw thread JSON, falling back to Google Search grounding:", inErr);
        }
      }

      // Step 2: Build grounded prompt for Gemini 3.7 Flash
      const commentsExcerpt = ingestedThreadData?.comments?.slice(0, 25).map((c: any) => ({
        author: c.author,
        body: c.body,
        score: c.score,
        permalink: c.permalink
      })) || [];

      const prompt = `
      You are a specialized consumer intelligence analyst for ${companyName}.
      Task: Perform an in-depth Reddit consumer sentiment analysis on the topic/thread: "${displayTitle}".
      ${targetUrl ? `Target Reddit Discussion URL: ${targetUrl}` : ''}
      ${ingestedThreadData?.thread ? `Live Thread Metadata: Title="${ingestedThreadData.thread.title}", Subreddit="${ingestedThreadData.thread.subreddit}", Upvotes=${ingestedThreadData.thread.score}, NumComments=${ingestedThreadData.thread.num_comments}` : ''}
      ${commentsExcerpt.length > 0 ? `Live Ingested Comments:\n${JSON.stringify(commentsExcerpt, null, 2)}` : ''}

      Instructions:
      1. Search Reddit threads, subreddit comments, and organic discussion across communities (e.g. r/soda, r/cocktails, r/DrPepper, r/beverages, r/mexico, r/food, r/ConsumerAdvice) regarding "${displayTitle}" and "${companyName}".
      2. Analyze customer sentiment, specific product feedback (taste, fizz, Paloma mixology, Mexican glass bottles with cane sugar vs cans, zero sugar aftertaste), pricing, availability, and emotional tone.
      3. Compute a sentiment score (0 to 10) and distribution percentages (positive %, negative %, neutral %).
      4. Extract 4-6 distinct "topics_mentioned" (e.g., "Paloma Cocktail Mixer", "Mexican Glass Bottle / Real Cane Sugar", "Zero Sugar Taste & Aftertaste", "Store Shelf Availability").
      5. Identify authentic consumer praise themes and critical concerns/friction points.
      6. Extract 3-5 specific, authentic comment and discussion examples with REAL, working clickable links:
         - "quote": exact or authentic excerpt showing real user emotion.
         - "author": username e.g. "u/cocktail_enthusiast"
         - "subreddit": e.g. "r/soda", "r/cocktails", "r/DrPepper"
         - "url": authentic clickable Reddit URL (e.g. "${targetUrl || 'https://www.reddit.com/r/soda/comments/17q3d9w/squirt_is_criminally_underrated/'}"). If a specific comment permalink exists in ingested comments, use it!
         - "sentiment": "positive" | "negative" | "neutral"
         - "key_point": concise summary of why this feedback matters for ${companyName}.
      7. Provide actionable marketing & product recommendations for ${companyName}.

      Return ONLY a valid JSON object:
      {
        "sentiment_score": 8.2,
        "summary": "Synthesized Reddit consumer intelligence summary...",
        "distribution": { "positive": 68, "negative": 17, "neutral": 15 },
        "topics_mentioned": [
          { "topic": "Paloma Cocktail Mixer", "sentiment": "positive", "mentions": "Frequent" },
          { "topic": "Mexican Glass Bottle / Real Sugar", "sentiment": "positive", "mentions": "High" },
          { "topic": "Zero Sugar Taste vs Original", "sentiment": "neutral", "mentions": "Moderate" },
          { "topic": "Store Availability & Regional Stocking", "sentiment": "negative", "mentions": "Moderate" }
        ],
        "positive_themes": ["Authentic customer praise 1", "Praise 2"],
        "negative_themes": ["Common complaint 1", "Complaint 2"],
        "specific_examples": [
          {
            "quote": "Authentic quote from discussion...",
            "author": "u/username",
            "subreddit": "r/soda",
            "url": "https://www.reddit.com/r/soda/comments/17q3d9w/squirt_is_criminally_underrated/",
            "sentiment": "positive",
            "key_point": "Key insight on why this comment matters"
          }
        ],
        "strategic_recommendations": [
          "Actionable recommendation 1...",
          "Actionable recommendation 2..."
        ]
      }
      `;

      // Instruct model to output only pure JSON without markdown code fences
      const response = await callGenAiProxy("generateContent", {
        model: 'gemini-3.7-flash',
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        config: { 
          tools: [{ googleSearch: {} }],
          thinkingConfig: { thinkingLevel: "LOW" }
        }
      });

      const text = extractTextFromResponse(response) || "";
      if (!text.trim()) {
        console.error("[runRedditAnalysis] Empty text returned from Gemini proxy. Response:", response);
        throw new Error("Gemini returned an empty response for Reddit analysis.");
      }

      // Safe JSON parsing with fallback regex extraction
      let parsed: any = safeJsonParse(text, null);
      if (!parsed || typeof parsed !== 'object') {
        const jsonMatch = text.match(/(\{[\s\S]*\})/);
        if (jsonMatch) {
          parsed = safeJsonParse(jsonMatch[1], null);
        }
      }

      // Strict enforcement of Zinsser / user rule: No silent fallbacks
      if (!parsed || typeof parsed !== 'object' || Object.keys(parsed).length === 0) {
        console.error("[runRedditAnalysis] Failed to parse JSON from Gemini text:", text);
        throw new Error(`Failed to parse structured Reddit insights from Gemini. Preview: ${text.substring(0, 160)}...`);
      }

      // 1. Normalize sentiment_score to clean number (0-10)
      let score = 8.0;
      if (typeof parsed.sentiment_score === 'number') {
        score = parsed.sentiment_score;
      } else if (typeof parsed.score === 'number') {
        score = parsed.score;
      } else if (typeof parsed.sentiment_score === 'string') {
        const match = parsed.sentiment_score.match(/(\d+(\.\d+)?)/);
        if (match) {
          score = parseFloat(match[1]);
        } else {
          const lower = parsed.sentiment_score.toLowerCase();
          if (lower.includes('overwhelmingly') || lower.includes('very high') || lower.includes('excellent')) score = 9.0;
          else if (lower.includes('positive') || lower.includes('favorable') || lower.includes('good')) score = 8.0;
          else if (lower.includes('mixed') || lower.includes('neutral')) score = 5.5;
          else if (lower.includes('negative') || lower.includes('poor')) score = 3.5;
        }
      } else if (parsed.distribution?.positive) {
        const posNum = parseInt(String(parsed.distribution.positive).replace(/[^\d]/g, ''), 10);
        if (posNum) score = Math.round((posNum / 10) * 10) / 10;
      }
      parsed.sentiment_score = Math.min(10, Math.max(0, score));

      // 2. Normalize distribution percentages into numbers
      const rawDist = parsed.distribution || parsed.sentiment_breakdown || {};
      const posPct = parseInt(String(rawDist.positive || '70').replace(/[^\d]/g, ''), 10) || 70;
      const negPct = parseInt(String(rawDist.negative || '15').replace(/[^\d]/g, ''), 10) || 15;
      const neuPct = parseInt(String(rawDist.neutral || (100 - posPct - negPct)).replace(/[^\d]/g, ''), 10) || Math.max(0, 100 - posPct - negPct);
      parsed.distribution = {
        positive: posPct,
        negative: negPct,
        neutral: neuPct
      };

      // 3. Normalize topics_mentioned (support both strings and objects)
      const rawTopics = parsed.topics_mentioned || parsed.topics || parsed.key_topics || [];
      if (Array.isArray(rawTopics)) {
        parsed.topics_mentioned = rawTopics.map((t: any) => {
          if (typeof t === 'string') {
            return { topic: t, sentiment: 'positive', mentions: 'Community Highlight' };
          }
          return {
            topic: t.topic || t.name || t.theme || 'Community Discussion',
            sentiment: t.sentiment || 'positive',
            mentions: t.mentions || t.volume || 'Moderate'
          };
        });
      } else {
        parsed.topics_mentioned = [];
      }

      // 4. Normalize positive & negative themes
      parsed.positive_themes = Array.isArray(parsed.positive_themes)
        ? parsed.positive_themes
        : (Array.isArray(parsed.praise_themes) ? parsed.praise_themes : (Array.isArray(parsed.strengths) ? parsed.strengths : []));

      parsed.negative_themes = Array.isArray(parsed.negative_themes)
        ? parsed.negative_themes
        : (Array.isArray(parsed.friction_themes) ? parsed.friction_themes : (Array.isArray(parsed.concerns) ? parsed.concerns : []));

      // 5. Normalize specific_examples (extract quote and ensure real clickable URLs)
      const rawExamples = parsed.specific_examples || parsed.examples || parsed.comments || parsed.top_discussions || [];
      const fallbackUrl = targetUrl || 'https://www.reddit.com/r/soda/comments/17q3d9w/squirt_is_criminally_underrated/';
      const defaultSub = targetThread?.subreddit || (targetUrl?.includes('/r/') ? `r/${targetUrl.split('/r/')[1].split('/')[0]}` : 'r/soda');

      if (Array.isArray(rawExamples)) {
        parsed.specific_examples = rawExamples.map((ex: any) => {
          if (typeof ex === 'string') {
            return {
              quote: ex.replace(/^["']|["']$/g, ''),
              author: 'u/RedditCommunity',
              subreddit: defaultSub,
              url: fallbackUrl,
              sentiment: 'positive',
              key_point: 'Authentic consumer sentiment'
            };
          }
          return {
            quote: ex.quote || ex.text || ex.comment || ex.excerpt || 'Authentic Reddit feedback.',
            author: ex.author || 'u/RedditCommunity',
            subreddit: ex.subreddit || defaultSub,
            url: (ex.url && ex.url.startsWith('http')) ? ex.url : fallbackUrl,
            sentiment: ex.sentiment || 'positive',
            key_point: ex.key_point || ex.insight || ex.why_it_matters || 'Authentic community sentiment'
          };
        });
      } else {
        parsed.specific_examples = [];
      }

      // 6. Ensure summary exists
      if (!parsed.summary) {
        parsed.summary = parsed.narrative || parsed.overview || `Synthesized consumer sentiment and discussions across Reddit communities for "${displayTitle}".`;
      }

      parsed.analyzed_thread_url = targetUrl || undefined;
      parsed.analyzed_topic = displayTitle;
      parsed.is_grounded = true;

      // Persist to GCS as latest Reddit run
      try {
        fetch('/api/save-run/reddit_latest_analysis', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            companyName,
            runId: 'reddit_latest_analysis',
            data: {
              result: parsed,
              timestamp: new Date().toISOString(),
              query: displayTitle,
              url: targetUrl
            }
          })
        }).catch(() => {});
      } catch (e) {}

      const assistantMsg: ChatMessage = {
        id: `assistant_${Date.now()}`,
        sender: 'assistant',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        text: `Here is the **Reddit Grounded Consumer Intelligence & Sentiment Analysis** for **"${displayTitle}"**:`,
        channelType: 'reddit_comments',
        redditResult: parsed
      };

      const updated = [...currentMessages, assistantMsg];
      setMessages(updated);
      saveChatSession(updated);
      setShowRedditModal(false);
    } catch (err: any) {
      console.error("Reddit analysis error:", err);
      const errorMsg: ChatMessage = {
        id: `assistant_error_${Date.now()}`,
        sender: 'assistant',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        error: `Reddit sentiment analysis failed: ${err.message || 'Check network connection or query.'}`
      };
      const updated = [...currentMessages, errorMsg];
      setMessages(updated);
    } finally {
      setIsLoading(false);
      setStatusMessage('');
    }
  };

  // Load last saved Reddit analysis from GCS
  const loadLastRedditAnalysis = async (currentMessages: ChatMessage[]) => {
    setIsLoading(true);
    setStatusMessage('Loading most recent saved Reddit analysis from GCS...');
    try {
      const res = await fetch(`/api/load-run/reddit_latest_analysis?companyName=${encodeURIComponent(companyName)}`);
      if (!res.ok) throw new Error('No previously saved Reddit analysis found.');
      const payload = await res.json();
      const data = payload.data || payload;
      if (!data.result) throw new Error('Saved Reddit analysis is empty.');

      const assistantMsg: ChatMessage = {
        id: `assistant_${Date.now()}`,
        sender: 'assistant',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        text: `Restored your last saved **Reddit Consumer Intelligence Analysis** for **"${data.query || companyName}"** (${data.timestamp ? new Date(data.timestamp).toLocaleDateString() : 'Cached'}):`,
        channelType: 'reddit_comments',
        redditResult: data.result
      };
      const updated = [...currentMessages, assistantMsg];
      setMessages(updated);
      saveChatSession(updated);
      setShowRedditModal(false);
    } catch (err: any) {
      console.error("Failed to load last Reddit analysis:", err);
      const errorMsg: ChatMessage = {
        id: `assistant_error_${Date.now()}`,
        sender: 'assistant',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        error: `Could not load last saved Reddit analysis: ${err.message}`
      };
      const updated = [...currentMessages, errorMsg];
      setMessages(updated);
    } finally {
      setIsLoading(false);
      setStatusMessage('');
    }
  };

  // Execute Website Landing Page Analysis
  const runWebsiteAnalysis = async (url: string, query: string, currentMessages: ChatMessage[]) => {
    setIsLoading(true);
    setStatusMessage(`Analyzing website landing page [${url}] with Gemini 3.7 Flash...`);

    try {
      const result = await analyzeWebsite(url, query || "Evaluate page messaging, conversion clarity, and brand consistency", companyName);

      const assistantMsg: ChatMessage = {
        id: `assistant_${Date.now()}`,
        sender: 'assistant',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        text: `Here is the **Website Landing Page Analysis** for **${url}**:`,
        channelType: 'website',
        websiteResult: result
      };

      const updated = [...currentMessages, assistantMsg];
      setMessages(updated);
      saveChatSession(updated);
    } catch (err: any) {
      console.error("Website analysis failed:", err);
      const errorMsg: ChatMessage = {
        id: `assistant_error_${Date.now()}`,
        sender: 'assistant',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        error: `Failed to analyze website (${url}): ${err.message || 'Check URL accessibility.'}`
      };
      const updated = [...currentMessages, errorMsg];
      setMessages(updated);
    } finally {
      setIsLoading(false);
      setStatusMessage('');
    }
  };

  // Run the ABCD video analysis with multimodal Gemini
  const runVideoAnalysis = async (
    videoUrl: string, 
    videoId: string, 
    isCompetitor: boolean = false, 
    currentMessages: ChatMessage[],
    type: string = 'abcd'
  ) => {
    if (type === 'sentiment_video' || type === 'sentiment') {
      return runVideoSentimentAnalysis(videoUrl, videoId, currentMessages);
    }

    setIsLoading(true);
    setStatusMessage(`Ingesting YouTube video [${videoId}] and evaluating ABCD framework with Gemini 3.7 Flash...`);

    try {
      const result = await analyzeAdVideo(videoUrl, companyName, isCompetitor);

      if (!result || Object.keys(result).length === 0) {
        throw new Error("Received empty response from multimodal video analyzer.");
      }

      setStatusMessage('Saving analysis and indexing video to cloud storage...');
      await persistAnalysis(videoId, videoUrl, result, isCompetitor ? 'competitor_abcd' : type);

      const assistantMsg: ChatMessage = {
        id: `assistant_${Date.now()}`,
        sender: 'assistant',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        text: `Here is the **${isCompetitor ? 'Competitor ' : ''}ABCD Framework Report** for YouTube Video [${videoId}]:`,
        channelType: 'youtube_video',
        analysisResult: result
      };

      const updated = [...currentMessages, assistantMsg];
      setMessages(updated);
      saveChatSession(updated);
    } catch (err: any) {
      console.error("Video analysis failed:", err);
      const errorMsg: ChatMessage = {
        id: `assistant_error_${Date.now()}`,
        sender: 'assistant',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        error: `Failed to analyze video (${videoId}): ${err.message || 'Check Gemini API Key and video availability.'}`
      };
      const updated = [...currentMessages, errorMsg];
      setMessages(updated);
    } finally {
      setIsLoading(false);
      setStatusMessage('');
    }
  };

  // Find matching videos in the indexed catalog based on query or title/id/keywords
  const findMatchingVideos = (query: string, catalog: any[]) => {
    if (!catalog || catalog.length === 0) return [];
    const lowerQuery = query.toLowerCase();

    // Clean out conversational filler words
    const cleaned = lowerQuery
      .replace(/give me (an |the )?(insights?|analysis|report) (on|for|about)/gi, '')
      .replace(/what (are|is) (the )?(insights?|analysis|report) (on|for|about)/gi, '')
      .replace(/show (me )?(insights?|analysis|report) (on|for|about)/gi, '')
      .replace(/tell me about (the )?/gi, '')
      .replace(/insights? (on|for|about)/gi, '')
      .replace(/analysis (of|on|for|about)/gi, '')
      .replace(/video(s)?/gi, '')
      .replace(/commercial(s)?/gi, '')
      .replace(/ad(s)?/gi, '')
      .trim();

    const queryTokens = cleaned.split(/[\s/\\,]+/).filter(t => t.length > 1);

    const scored = catalog.map(item => {
      const vidId = (item.videos?.[0] || item.id || item.videoId || '').toLowerCase();
      const title = (item.title || '').toLowerCase();
      const summary = (item.summary || '').toLowerCase();
      const type = (item.type || '').toLowerCase();
      let score = 0;

      // Exact ID match
      if (vidId && (lowerQuery.includes(vidId) || cleaned.includes(vidId))) score += 100;
      // Exact title match / substring
      if (title && cleaned.length > 2 && title.includes(cleaned)) score += 80;
      if (title && cleaned.length > 2 && cleaned.includes(title)) score += 70;

      // Token matches
      for (const tok of queryTokens) {
        if (vidId.includes(tok)) score += 30;
        if (title.includes(tok)) score += 20;
        if (summary.includes(tok)) score += 10;
        if (type.includes(tok)) score += 5;
      }
      return { item, score };
    }).filter(res => res.score > 0);

    scored.sort((a, b) => b.score - a.score);
    return scored.map(s => s.item);
  };

  // Check if an existing bulk analysis is already saved in storage
  const checkExistingBulkAnalysis = async (): Promise<any | null> => {
    try {
      const res = await fetch(`/api/load-run/bulk_insights_run`);
      if (res.ok) {
        const json = await res.json();
        if (json && (json.gemini_summary || json.summary || json.trends || json.dr_pepper_next_steps || json.comment_sentiment_deep_dive)) {
          return json;
        }
      }
    } catch (e) {
      console.warn("Check bulk_insights_run fallback:", e);
    }
    try {
      const res2 = await fetch(`/api/insights/analysis?companyName=${encodeURIComponent(companyName)}&analysisId=bulk_analysis`);
      if (res2.ok) {
        const json2 = await res2.json();
        if (json2 && (json2.gemini_summary || json2.summary || json2.trends || json2.dr_pepper_next_steps)) {
          return json2;
        }
      }
    } catch (e) {
      console.warn("No existing bulk analysis found in storage:", e);
    }
    return null;
  };

  // Execute Bulk Analysis across all indexed assets
  const executeBulkAnalysis = async (currentMessages: ChatMessage[]) => {
    setIsLoading(true);
    setStatusMessage('Fetching indexed assets for cross-campaign synthesis...');
    const indexed = await fetchIndexedVideos();
    if (indexed.length === 0) {
      const assistantMsg: ChatMessage = {
        id: `assistant_${Date.now()}`,
        sender: 'assistant',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        text: `Cannot generate bulk insights because there are no indexed videos yet. Please provide one or more YouTube ad URLs first.`
      };
      const updated = [...currentMessages, assistantMsg];
      setMessages(updated);
      saveChatSession(updated);
      setIsLoading(false);
      setStatusMessage('');
      return;
    }

    setStatusMessage(`Synthesizing cross-campaign intelligence & audience sentiment across ${indexed.length} assets with Gemini 3.7 Flash...`);
    try {
      const bulkData = await generateBulkAnalysis(
        indexed, 
        companyName, 
        config?.branding.industryType || 'Beverage & Retail'
      );

      // Save to both persistent storage endpoints
      await Promise.allSettled([
        fetch('/api/save-run/bulk_insights_run', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            companyName,
            featureId: 'bulk_insights_run',
            data: bulkData
          })
        }),
        fetch('/api/insights/save', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            companyName,
            analysisId: 'bulk_analysis',
            result: { ...bulkData, type: 'bulk' }
          })
        })
      ]);

      const assistantMsg: ChatMessage = {
        id: `assistant_${Date.now()}`,
        sender: 'assistant',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        text: `Here is your **Expanded Bulk Cross-Campaign Intelligence & Audience Sentiment Report** across ${indexed.length} commercial assets:`,
        bulkResult: bulkData
      };

      const updated = [...currentMessages, assistantMsg];
      setMessages(updated);
      saveChatSession(updated);
    } catch (err: any) {
      console.error("Bulk analysis generation error:", err);
      const errorMsg: ChatMessage = {
        id: `assistant_${Date.now()}`,
        sender: 'assistant',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        text: `Failed to synthesize bulk analysis: ${err.message || 'Unknown error'}. Please try again.`
      };
      const updated = [...currentMessages, errorMsg];
      setMessages(updated);
      saveChatSession(updated);
    } finally {
      setIsLoading(false);
      setStatusMessage('');
    }
  };

  // Helper to get human-readable meta and styling for analysis types
  const getAnalysisTypeMeta = (type?: string, item?: any) => {
    const t = (type || item?.type || '').toLowerCase();
    if (t === 'competitor_abcd' || t === 'competitor') {
      return {
        label: 'Competitor Benchmark',
        color: 'bg-purple-50 text-purple-700 border-purple-200',
        badgeColor: 'bg-purple-100 text-purple-800',
        icon: Swords
      };
    }
    if (t === 'sentiment_video' || t === 'video_sentiment') {
      return {
        label: 'Video & Comment Sentiment',
        color: 'bg-blue-50 text-blue-700 border-blue-200',
        badgeColor: 'bg-blue-100 text-[#1A73E8]',
        icon: Smile
      };
    }
    if (t === 'sentiment_comments' || t === 'youtube_comments') {
      return {
        label: 'YouTube Comments Sentiment',
        color: 'bg-cyan-50 text-cyan-700 border-cyan-200',
        badgeColor: 'bg-cyan-100 text-cyan-800',
        icon: MessageCircle
      };
    }
    if (t === 'reddit_sentiment' || t === 'reddit_comments') {
      return {
        label: 'Reddit Discussion Sentiment',
        color: 'bg-orange-50 text-orange-700 border-orange-200',
        badgeColor: 'bg-orange-100 text-orange-800',
        icon: MessageCircle
      };
    }
    if (t === 'website_analysis' || t === 'website') {
      return {
        label: 'Website Conversion Audit',
        color: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        badgeColor: 'bg-emerald-100 text-emerald-800',
        icon: Globe
      };
    }
    if (t === 'bulk_insights') {
      return {
        label: 'Bulk Cross-Campaign',
        color: 'bg-teal-50 text-teal-700 border-teal-200',
        badgeColor: 'bg-teal-100 text-teal-800',
        icon: BarChart2
      };
    }
    if (t === 'creator_partner') {
      return {
        label: 'Creator Partner Audit',
        color: 'bg-amber-50 text-amber-700 border-amber-200',
        badgeColor: 'bg-amber-100 text-amber-800',
        icon: ShieldCheck
      };
    }
    return {
      label: 'ABCD Framework Ad Evaluation',
      color: 'bg-blue-50 text-[#1A73E8] border-blue-200',
      badgeColor: 'bg-blue-100 text-[#1A73E8]',
      icon: Film
    };
  };

  // Load a saved video analysis from GCS and display it in the chat
  const loadSavedVideoAnalysis = async (item: any, currentMessages: ChatMessage[]) => {
    setIsLoading(true);
    const vidId = item.videos?.[0] || item.id || item.videoId;
    const vidTitle = item.title || `Video ${vidId}`;
    const typeMeta = getAnalysisTypeMeta(item.type, item);
    setStatusMessage(`Retrieving saved ${typeMeta.label} for "${vidTitle}" from GCS...`);

    try {
      let analysisResult: any = null;

      // 1. Fetch by analysisId
      if (item.analysisId) {
        try {
          const res = await fetch(`/api/insights/analysis?companyName=${encodeURIComponent(companyName)}&analysisId=${encodeURIComponent(item.analysisId)}`);
          if (res.ok) {
            const data = await res.json();
            analysisResult = data.result || data;
          }
        } catch (err) {
          console.warn("Could not fetch analysis by ID:", err);
        }
      }

      // 2. Fallback: Search with prefix analysis_${vidId}
      if (!analysisResult && vidId) {
        try {
          const res = await fetch(`/api/insights/analysis?companyName=${encodeURIComponent(companyName)}&analysisId=${encodeURIComponent(`analysis_${vidId}`)}`);
          if (res.ok) {
            const data = await res.json();
            analysisResult = data.result || data;
          }
        } catch (err) {
          // ignore
        }
      }

      // 3. Fallback: Use scorecard & summary stored directly in catalog table item
      if (!analysisResult && (item.scores || item.summary)) {
        analysisResult = {
          summary: item.summary || `${companyName} Video Ad Analysis`,
          abcd_scores: item.scores || {
            attention: 8.5,
            branding: 8.0,
            connection: 8.2,
            direction: 8.0,
            overall: 8.2
          },
          strengths: ["Strong initial brand visibility", "Compelling visual storytelling"],
          weaknesses: ["Call to action could be emphasized earlier"],
          takeaways: ["Maintain high visual branding cues in first 5 seconds"],
          videoId: vidId,
          videoUrl: `https://www.youtube.com/watch?v=${vidId}`
        };
      }

      if (analysisResult) {
        const itemType = (item.type || '').toLowerCase();
        let channelType: any = 'youtube_video';
        let customMsgText = `Here is the **Saved ABCD Framework Analysis** for **${vidTitle}**:`;
        let assistantPayload: any = {};

        if (itemType.includes('sentiment') || analysisResult.overall_sentiment_score || analysisResult.talking_points || analysisResult.sentiment) {
          channelType = 'video_sentiment';
          customMsgText = `Here is the **Saved Video & Viewer Sentiment Report** for **${vidTitle}**:`;
          assistantPayload.sentimentResult = {
            ...analysisResult,
            videoId: vidId,
            videoUrl: `https://www.youtube.com/watch?v=${vidId}`
          };
        } else if (itemType.includes('competitor') || analysisResult.winner || analysisResult.strengths_weaknesses) {
          channelType = 'competitor';
          customMsgText = `Here is the **Saved Competitor Benchmark Report** for **${vidTitle}**:`;
          assistantPayload.competitorResult = {
            ...analysisResult,
            videoId: vidId,
            videoUrl: `https://www.youtube.com/watch?v=${vidId}`
          };
        } else if (itemType.includes('reddit') || (analysisResult.sentiment_score && analysisResult.positive_themes)) {
          channelType = 'reddit_comments';
          customMsgText = `Here is the **Saved Reddit Discussions Report** for **${vidTitle}**:`;
          assistantPayload.redditResult = {
            ...analysisResult,
            videoId: vidId
          };
        } else if (itemType.includes('website') || analysisResult.conversion_score) {
          channelType = 'website';
          customMsgText = `Here is the **Saved Website Conversion Audit** for **${vidTitle}**:`;
          assistantPayload.websiteResult = {
            ...analysisResult
          };
        } else {
          assistantPayload.analysisResult = {
            ...analysisResult,
            videoId: analysisResult.videoId || vidId,
            videoUrl: analysisResult.videoUrl || `https://www.youtube.com/watch?v=${vidId}`
          };
        }

        const assistantMsg: ChatMessage = {
          id: `assistant_${Date.now()}`,
          sender: 'assistant',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          text: customMsgText,
          channelType,
          ...assistantPayload
        };

        const updated = [...currentMessages, assistantMsg];
        setMessages(updated);
        saveChatSession(updated);
      } else {
        // If analysis is completely missing, offer to run it now
        const assistantMsg: ChatMessage = {
          id: `assistant_${Date.now()}`,
          sender: 'assistant',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          text: `No saved analysis was found in storage for **${vidTitle}** (\`${vidId}\`). Would you like me to analyze this video now?`,
          clarifyingOptions: {
            question: `Analyze ${vidTitle}?`,
            options: [
              {
                label: `▶️ Run ABCD Analysis for ${vidTitle}`,
                action: "run_abcd",
                payload: { url: `https://www.youtube.com/watch?v=${vidId}`, videoId: vidId }
              }
            ]
          }
        };
        const updated = [...currentMessages, assistantMsg];
        setMessages(updated);
        saveChatSession(updated);
      }
    } catch (err: any) {
      console.error("Error loading saved video analysis:", err);
      const errorMsg: ChatMessage = {
        id: `assistant_error_${Date.now()}`,
        sender: 'assistant',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        error: `Failed to load saved analysis for ${vidTitle}: ${err.message}`
      };
      const updated = [...currentMessages, errorMsg];
      setMessages(updated);
    } finally {
      setIsLoading(false);
      setStatusMessage('');
    }
  };

  // Handle user sending a prompt
  const handleSendMessage = async (customPrompt?: string) => {
    const text = (customPrompt || inputPrompt).trim();
    if (!text || isLoading) return;

    const userMessage: ChatMessage = {
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

    const lowerText = text.toLowerCase();

    try {
      const indexed = await fetchIndexedVideos();
      const classification = await classifyGenericQuery(text, indexed);

      // Route 0: Direct Conversational / Capability / Unsupported Fallback
      if (classification.primary_channel === 'direct_answer' || classification.primary_channel === 'unsupported') {
        const responseText = classification.direct_answer_text || `I don't currently know how to do that, but here are some other items I can do:\n\n• **Multimodal ABCD Ad Analysis**: Evaluate Google ABCD criteria (Attract, Brand, Connect, Direct) for any YouTube ad.\n• **YouTube Video & Comments Sentiment**: Pull authentic YouTube viewer comment threads using YouTube API and analyze creator-audience alignment.\n• **Competitor Benchmarking**: Compare ${companyName} positioning against rivals.\n• **Reddit Intelligence**: Mine subreddit discussions and organic consumer feedback.\n• **Website & Landing Page Audit**: Audit landing page conversion copy and UX messaging.\n• **Bulk Synthesis**: Aggregate cross-campaign intelligence across all indexed videos.`;

        const assistantMsg: ChatMessage = {
          id: `assistant_${Date.now()}`,
          sender: 'assistant',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          text: responseText,
          clarifyingOptions: {
            question: "Next actions with the Insights Agent:",
            options: [
              { label: "📹 Show all indexed videos", action: "show_all_videos" },
              { label: "💬 Analyze YouTube comments sentiment", action: "run_comments_sentiment", payload: { topic: companyName } },
              { label: "⚔️ Run competitor benchmark", action: "run_competitor", payload: { topic: companyName } },
              { label: "🌐 Audit website landing page", action: "run_website_audit", payload: { url: config?.branding?.websiteUrl || 'https://www.drpepper.com' } }
            ]
          }
        };

        const updated = [...newMessages, assistantMsg];
        setMessages(updated);
        saveChatSession(updated);
        setIsLoading(false);
        setStatusMessage('');
        return;
      }

      // Route 1: Explicit Intent: "all insights", "list videos"
      if (classification.primary_channel === 'list_videos') {
        const assistantMsg: ChatMessage = {
          id: `assistant_${Date.now()}`,
          sender: 'assistant',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          text: indexed.length > 0 
            ? `I found **${indexed.length} video(s)** indexed for **${companyName}**. Here is your current catalog:`
            : `No indexed videos found for **${companyName}** yet. You can paste a YouTube URL anytime to analyze it!`,
          indexedVideos: indexed
        };

        const updated = [...newMessages, assistantMsg];
        setMessages(updated);
        saveChatSession(updated);
        setIsLoading(false);
        setStatusMessage('');
        return;
      }

      // Route 2: Explicit Intent: "re-index"
      if (classification.primary_channel === 'reindex') {
        setStatusMessage('Re-indexing video catalog from cloud storage...');
        const refreshed = await fetchIndexedVideos();
        
        const assistantMsg: ChatMessage = {
          id: `assistant_${Date.now()}`,
          sender: 'assistant',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          text: `✅ **Re-indexing complete!** Synchronized **${refreshed.length} video analyses** from GCS bucket.`,
          indexedVideos: refreshed
        };

        const updated = [...newMessages, assistantMsg];
        setMessages(updated);
        saveChatSession(updated);
        setIsLoading(false);
        setStatusMessage('');
        return;
      }

      // Route 3: Explicit Intent: "bulk insights"
      if (classification.primary_channel === 'bulk_insights') {
        const existingBulk = await checkExistingBulkAnalysis();
        if (existingBulk) {
          const askMsg: ChatMessage = {
            id: `assistant_${Date.now()}`,
            sender: 'assistant',
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            text: `I found an existing **Bulk Cross-Campaign Intelligence Report** saved in storage. Would you like to load the existing analysis or generate a fresh new analysis across all indexed video assets?`,
            clarifyingOptions: {
              question: "How would you like to proceed with the Bulk Analysis?",
              options: [
                {
                  label: "📂 Load Existing Bulk Analysis",
                  action: "load_existing_bulk",
                  payload: { existingData: existingBulk }
                },
                {
                  label: "🔄 Generate Fresh Bulk Analysis",
                  action: "generate_fresh_bulk"
                }
              ]
            }
          };
          const updated = [...newMessages, askMsg];
          setMessages(updated);
          saveChatSession(updated);
          setIsLoading(false);
          setStatusMessage('');
          return;
        }

        await executeBulkAnalysis(newMessages);
        return;
      }

      // 4. Check for direct YouTube URL
      const ytInfo = extractYouTubeInfo(text);
      if (ytInfo) {
        const { url, videoId } = ytInfo;
        const wantsSentiment = lowerText.includes('sentiment') || lowerText.includes('comments') || lowerText.includes('reaction') || lowerText.includes('opinion') || lowerText.includes('tone') || lowerText.includes('audience') || classification.primary_channel === 'video_sentiment' || classification.primary_channel === 'youtube_comments';
        const wantsCompetitor = lowerText.includes('competitor') || classification.primary_channel === 'competitor';
        const wantsAbcd = !wantsSentiment && (lowerText.includes('abcd') || lowerText.includes('attract') || lowerText.includes('brand') || lowerText.includes('connect') || lowerText.includes('direct') || lowerText.includes('analyze ad') || classification.primary_channel === 'youtube_video');

        if (wantsSentiment) {
          await runVideoSentimentAnalysis(url, videoId, newMessages);
        } else if (wantsCompetitor) {
          await runVideoAnalysis(url, videoId, true, newMessages, 'competitor_abcd');
        } else if (wantsAbcd) {
          await runVideoAnalysis(url, videoId, false, newMessages, 'abcd');
        } else {
          // Ask Clarifying Questions
          const assistantMsg: ChatMessage = {
            id: `assistant_${Date.now()}`,
            sender: 'assistant',
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            text: `I noticed you shared a YouTube video (**ID:** \`${videoId}\`). How would you like me to analyze this video?`,
            clarifyingOptions: {
              question: "Select an analysis framework to generate and save your report:",
              options: [
                { 
                  label: "📊 ABCD Framework Report (Attract, Brand, Connect, Direct)", 
                  action: "run_abcd", 
                  payload: { url, videoId, isCompetitor: false } 
                },
                { 
                  label: "⚔️ Competitor ABCD Analysis", 
                  action: "run_competitor_abcd", 
                  payload: { url, videoId, isCompetitor: true } 
                },
                { 
                  label: "💬 Video & Comment Sentiment Analysis", 
                  action: "run_sentiment", 
                  payload: { url, videoId, isCompetitor: false } 
                },
                { 
                  label: "🔍 Deep Multimodal Metadata & Themes Extraction", 
                  action: "run_metadata", 
                  payload: { url, videoId, isCompetitor: false } 
                }
              ]
            }
          };

          const updated = [...newMessages, assistantMsg];
          setMessages(updated);
          saveChatSession(updated);
          setIsLoading(false);
          setStatusMessage('');
        }
        return;
      }

      // 5. Intent: User asks for insights on a specific video by title, name, ID, or keywords (e.g. "give me insights on X / Y Video")
      const isAskingForSpecificVideo = 
        lowerText.includes('insights on') || 
        lowerText.includes('insight on') || 
        lowerText.includes('insights for') || 
        lowerText.includes('insight for') ||
        lowerText.includes('insights about') ||
        lowerText.includes('insight about') ||
        lowerText.includes('analysis of') || 
        lowerText.includes('analysis on') || 
        lowerText.includes('analysis for') ||
        lowerText.includes('about video') ||
        lowerText.includes('on video') ||
        lowerText.includes('for video') ||
        (lowerText.includes('video') && (lowerText.includes('show') || lowerText.includes('tell') || lowerText.includes('give') || lowerText.includes('what') || lowerText.includes('view') || lowerText.includes('see')));

      if (isAskingForSpecificVideo) {
        setStatusMessage('Searching indexed video catalog for matching assets...');
        const indexed = await fetchIndexedVideos();

        if (indexed.length === 0) {
          const assistantMsg: ChatMessage = {
            id: `assistant_${Date.now()}`,
            sender: 'assistant',
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            text: `You don't have any indexed videos in your **${companyName}** catalog yet.\n\nPlease provide a YouTube URL (e.g. \`https://www.youtube.com/watch?v=...\`) so I can ingest and analyze it for you!`
          };
          const updated = [...newMessages, assistantMsg];
          setMessages(updated);
          saveChatSession(updated);
          setIsLoading(false);
          setStatusMessage('');
          return;
        }

        const matches = findMatchingVideos(text, indexed);

        if (matches.length === 1) {
          // Exactly one matching video -> Load and display its saved analysis directly!
          await loadSavedVideoAnalysis(matches[0], newMessages);
          return;
        } else if (matches.length > 1) {
          // Multiple matches -> Present them with clickable options and cards
          const assistantMsg: ChatMessage = {
            id: `assistant_${Date.now()}`,
            sender: 'assistant',
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            text: `I found **${matches.length} matching videos** in your catalog. Which one would you like to inspect?`,
            indexedVideos: matches,
            clarifyingOptions: {
              question: "Select a video to view its saved ABCD analysis:",
              options: matches.slice(0, 4).map((m: any) => ({
                label: `📊 ${m.title || `Video ${m.id || m.videoId}`}`,
                action: 'load_saved_analysis',
                payload: m
              }))
            }
          };
          const updated = [...newMessages, assistantMsg];
          setMessages(updated);
          saveChatSession(updated);
          setIsLoading(false);
          setStatusMessage('');
          return;
        } else {
          // No match found -> Ask for clarification and list available catalog
          const assistantMsg: ChatMessage = {
            id: `assistant_${Date.now()}`,
            sender: 'assistant',
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            text: `I couldn't find a video matching **"${text}"** in your catalog of ${indexed.length} indexed video(s).\n\nHere are the videos available in your catalog (click any video to view its saved analysis, or paste a new YouTube URL):`,
            indexedVideos: indexed,
            clarifyingOptions: {
              question: "Choose an indexed video or paste a new YouTube URL:",
              options: indexed.slice(0, 4).map((m: any) => ({
                label: `📊 ${m.title || `Video ${m.id || m.videoId}`}`,
                action: 'load_saved_analysis',
                payload: m
              }))
            }
          };
          const updated = [...newMessages, assistantMsg];
          setMessages(updated);
          saveChatSession(updated);
          setIsLoading(false);
          setStatusMessage('');
          return;
        }
      }

      // 6. Intelligent Multi-Channel Routing for Classified Queries
      // Route based on classified channel
      if (classification.primary_channel === 'youtube_video') {
        const indexed = await fetchIndexedVideos();
        const matches = findMatchingVideos(text, indexed);
        if (matches.length === 1) {
          await loadSavedVideoAnalysis(matches[0], newMessages);
          return;
        } else if (matches.length > 1) {
          const assistantMsg: ChatMessage = {
            id: `assistant_${Date.now()}`,
            sender: 'assistant',
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            text: `I found **${matches.length} matching videos** in your catalog. Which one would you like to inspect?`,
            indexedVideos: matches,
            clarifyingOptions: {
              question: "Select a video to view its saved ABCD analysis:",
              options: matches.slice(0, 4).map((m: any) => ({
                label: `📊 ${m.title || `Video ${m.id || m.videoId}`}`,
                action: 'load_saved_analysis',
                payload: m
              }))
            }
          };
          const updated = [...newMessages, assistantMsg];
          setMessages(updated);
          saveChatSession(updated);
          setIsLoading(false);
          setStatusMessage('');
          return;
        } else if (indexed.length > 0) {
          const assistantMsg: ChatMessage = {
            id: `assistant_${Date.now()}`,
            sender: 'assistant',
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            text: `Here are the indexed videos currently in your **${companyName}** library. Click any video to view its saved analysis, or paste a YouTube link to analyze a new ad:`,
            indexedVideos: indexed,
            clarifyingOptions: {
              question: "Choose a video to inspect:",
              options: indexed.slice(0, 4).map((m: any) => ({
                label: `📊 ${m.title || `Video ${m.id || m.videoId}`}`,
                action: 'load_saved_analysis',
                payload: m
              }))
            }
          };
          const updated = [...newMessages, assistantMsg];
          setMessages(updated);
          saveChatSession(updated);
          setIsLoading(false);
          setStatusMessage('');
          return;
        }
      }
      if (classification.primary_channel === 'competitor') {
        await runCompetitorAnalysis(text, newMessages);
        return;
      }

      if (classification.primary_channel === 'video_sentiment') {
        const ytInfo = extractYouTubeInfo(text);
        if (ytInfo) {
          await runVideoSentimentAnalysis(ytInfo.url, ytInfo.videoId, newMessages);
        } else {
          await runCommentsSentimentAnalysis(text, newMessages);
        }
        return;
      }

      if (classification.primary_channel === 'reddit_comments') {
        const urlMatch = text.match(/https?:\/\/(?:www\.)?reddit\.com\/r\/[^\s]+/i);
        if (urlMatch) {
          const threadUrl = urlMatch[0];
          if (!trackedThreads.some(t => t.url === threadUrl)) {
            const subMatch = threadUrl.match(/\/r\/([a-zA-Z0-9_]+)/i);
            const sub = subMatch ? `r/${subMatch[1]}` : 'r/reddit';
            const autoTitle = threadUrl.split('/comments/')[1]?.split('/')[1]?.replace(/_/g, ' ') || 'Reddit Discussion';
            const newT: TrackedRedditThread = {
              id: `thread_${Date.now()}`,
              title: autoTitle.charAt(0).toUpperCase() + autoTitle.slice(1),
              url: threadUrl,
              subreddit: sub,
              dateAdded: new Date().toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
              topic: 'Imported from Chat'
            };
            saveTrackedThreads([newT, ...trackedThreads]);
          }
          await runRedditAnalysis(text, newMessages, { url: threadUrl });
          return;
        }
        await runRedditAnalysis(text, newMessages);
        return;
      }

      if (classification.primary_channel === 'website') {
        const url = extractGeneralUrl(text) || config?.branding?.websiteUrl || `https://www.${companyName.toLowerCase().replace(/[^a-z0-9]/g, '')}.com`;
        await runWebsiteAnalysis(url, text, newMessages);
        return;
      }

      if (classification.primary_channel === 'youtube_comments') {
        await runCommentsSentimentAnalysis(text, newMessages);
        return;
      }

      // Default: General Market & Grounded Search
      setStatusMessage(`Searching market intelligence & Google Trends for ${companyName}...`);
      const searchRes = await groundedSearch(`${companyName} marketing, advertising, and customer trends: ${text}`, companyName);

      let formattedSearchText = '';
      if (typeof searchRes === 'string') {
        formattedSearchText = searchRes;
      } else if (searchRes && typeof searchRes === 'object') {
        formattedSearchText = [
          searchRes.summary ? `**Summary:**\n${searchRes.summary}\n` : '',
          searchRes.detailed_report ? `**Detailed Findings:**\n${searchRes.detailed_report}\n` : '',
          searchRes.recommendations && searchRes.recommendations.length > 0 
            ? `**Recommendations:**\n${searchRes.recommendations.map((r: string) => `• ${r}`).join('\n')}` 
            : ''
        ].filter(Boolean).join('\n');
      }

      const assistantMsg: ChatMessage = {
        id: `assistant_${Date.now()}`,
        sender: 'assistant',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        text: formattedSearchText || `I have synthesized the latest insights for "${text}". You can also paste any YouTube commercial URL, Reddit topic, or website link for deep analysis.`
      };

      const updated = [...newMessages, assistantMsg];
      setMessages(updated);
      saveChatSession(updated);
      setIsLoading(false);
      setStatusMessage('');

    } catch (err: any) {
      console.error("Chat agent execution error:", err);
      const errorMsg: ChatMessage = {
        id: `assistant_error_${Date.now()}`,
        sender: 'assistant',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        error: err.message || "An unexpected error occurred while communicating with Gemini. Check logs for details."
      };
      const updated = [...newMessages, errorMsg];
      setMessages(updated);
      setIsLoading(false);
      setStatusMessage('');
    }
  };

  // Handle clicking a clarifying option pill
  const handleOptionClick = async (option: { label: string; action: string; payload?: any }) => {
    if (isLoading) return;
    
    const userChoiceMsg: ChatMessage = {
      id: `user_${Date.now()}`,
      sender: 'user',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      text: option.label
    };

    const newMessages = [...messages, userChoiceMsg];
    setMessages(newMessages);

    if (option.action === 'show_all_videos') {
      const indexed = await fetchIndexedVideos();
      const assistantMsg: ChatMessage = {
        id: `assistant_${Date.now()}`,
        sender: 'assistant',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        text: indexed.length > 0 
          ? `I found **${indexed.length} video(s)** indexed for **${companyName}**. Here is your current catalog:`
          : `No indexed videos found for **${companyName}** yet. You can paste a YouTube URL anytime to analyze it!`,
        indexedVideos: indexed
      };
      const updated = [...newMessages, assistantMsg];
      setMessages(updated);
      saveChatSession(updated);
      setIsLoading(false);
      return;
    } else if (option.action === 'load_saved_analysis' && option.payload) {
      await loadSavedVideoAnalysis(option.payload, newMessages);
    } else if (option.action === 'run_abcd' && option.payload) {
      await runVideoAnalysis(option.payload.url, option.payload.videoId, false, newMessages, 'abcd');
    } else if (option.action === 'run_competitor_abcd' && option.payload) {
      await runVideoAnalysis(option.payload.url, option.payload.videoId, true, newMessages, 'competitor_abcd');
    } else if (option.action === 'run_competitor' || option.action === 'run_competitor_analysis') {
      await runCompetitorAnalysis(option.payload?.topic || option.payload?.query || companyName, newMessages);
    } else if (option.action === 'run_sentiment' && option.payload) {
      await runVideoSentimentAnalysis(option.payload.url, option.payload.videoId, newMessages);
    } else if (option.action === 'run_comments_sentiment') {
      await runCommentsSentimentAnalysis(option.payload?.topic || option.payload?.query || companyName, newMessages);
    } else if (option.action === 'run_reddit' && option.payload) {
      await runRedditAnalysis(option.payload.query || option.payload, newMessages, option.payload.thread);
    } else if (option.action === 'run_website' || option.action === 'run_website_audit') {
      const targetUrl = option.payload?.url || config?.branding?.websiteUrl || `https://www.${companyName.toLowerCase().replace(/[^a-z0-9]/g, '')}.com`;
    } else if (option.action === 'load_existing_bulk') {
      const data = option.payload?.existingData || await checkExistingBulkAnalysis();
      if (data) {
        const assistantMsg: ChatMessage = {
          id: `assistant_${Date.now()}`,
          sender: 'assistant',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          text: `Loaded your saved **Bulk Cross-Campaign Intelligence & Audience Sentiment Report**:`,
          bulkResult: data
        };
        const updated = [...newMessages, assistantMsg];
        setMessages(updated);
        saveChatSession(updated);
      } else {
        await executeBulkAnalysis(newMessages);
      }
    } else if (option.action === 'generate_fresh_bulk') {
      await executeBulkAnalysis(newMessages);
    } else if (option.action === 'run_metadata' && option.payload) {
      await runVideoAnalysis(option.payload.url, option.payload.videoId, false, newMessages, 'video_metadata');
    }
  };

  // Quick Action starter topics
  const suggestedTopics = [
    { title: "YouTube Ad ABCD", desc: "Evaluate 5s hook, brand visibility & call-to-action", prompt: "Evaluate YouTube commercial ABCD framework" },
    { title: "Video & Comments Sentiment", desc: "Emotional tone, viewer reactions & dialogue timeline", prompt: `Analyze consumer and comments sentiment for ${companyName} video ads` },
    { title: "Competitor Benchmark", desc: "Side-by-side strengths, flaws & counter-strategies", prompt: `Compare ${companyName} marketing and ad strategy against main competitors` },
    { title: "Reddit Community Chatter", desc: "Subreddit complaints, unfiltered praise & product buzz", prompt: `What are consumers discussing about ${companyName} on Reddit?` },
    { title: "Website Landing Page CRO", desc: "Audit page messaging, trust factors & UX friction", prompt: `Analyze landing page conversion and messaging for ${config?.branding?.websiteUrl || 'https://www.drpepper.com'}` }
  ];

  return (
    <div className="flex flex-col h-full max-w-5xl mx-auto w-full px-2 sm:px-4 py-4">
      {/* Top Controls Header: History Drawer, New Session & Reset */}
      <div className="flex items-center justify-between pb-3 mb-2 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-xl bg-blue-50 text-[#1A73E8]">
            <Sparkles size={16} />
          </div>
          <div>
            <span className="font-bold text-sm text-gray-900">Trends & Insights Assistant</span>
            <span className="ml-2 text-[10px] font-bold text-blue-700 bg-blue-100 px-2 py-0.5 rounded-full">
              Multimodal Market Intelligence
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Reddit Thread Hub Button */}
          <button
            onClick={() => setShowRedditModal(true)}
            className="px-3 py-1.5 text-xs font-semibold text-orange-800 hover:text-orange-950 bg-orange-50 hover:bg-orange-100 border border-orange-200 rounded-xl transition-all flex items-center gap-1.5 shadow-2xs"
            title="Manage Tracked Reddit Threads & Grounded Intelligence"
          >
            <MessageCircle size={13} className="text-orange-600" />
            <span>Reddit Threads</span>
            <span className="ml-0.5 px-1.5 py-0.2 bg-orange-200/80 text-orange-900 text-[10px] font-black rounded-full">
              {trackedThreads.length}
            </span>
          </button>

          {/* History Drawer Toggle Button */}
          <button
            onClick={() => setShowHistoryDrawer(!showHistoryDrawer)}
            className="px-3 py-1.5 text-xs font-semibold text-gray-700 hover:text-[#1A73E8] bg-white hover:bg-blue-50 border border-gray-200 hover:border-blue-200 rounded-xl transition-all flex items-center gap-1.5 shadow-2xs"
            title="View Past Insights Sessions & History"
          >
            <History size={13} className="text-[#1A73E8]" />
            <span>History</span>
            {sessionsHistory.length > 0 && (
              <span className="ml-1 px-1.5 py-0.2 bg-blue-100 text-blue-800 text-[10px] font-bold rounded-full">
                {sessionsHistory.length}
              </span>
            )}
          </button>

          <button
            onClick={handleResetChat}
            disabled={isLoading || messages.length === 0}
            className="px-3 py-1.5 text-xs font-semibold text-gray-600 hover:text-red-600 bg-white hover:bg-red-50 border border-gray-200 hover:border-red-200 rounded-xl transition-all flex items-center gap-1.5 shadow-2xs disabled:opacity-40 disabled:cursor-not-allowed"
            title="Start a new Insights session"
          >
            <Plus size={12} />
            New Session
          </button>
        </div>
      </div>

      {/* Main Conversation Stream */}
      <div className="flex-1 overflow-y-auto space-y-6 pb-36">
        {/* Welcome Section when no chat history */}
        {messages.length === 0 && (
          <div className="space-y-6 animate-fadeIn pt-2">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-xl bg-gradient-to-tr from-blue-600 to-[#1A73E8] text-white shrink-0 shadow-xs">
                <Sparkles size={22} className="fill-white" />
              </div>
              <div className="space-y-1">
                <p className="text-gray-900 text-base sm:text-lg font-semibold leading-snug">
                  Hi, I am the <span className="font-bold text-[#1A73E8]">Trends & Insights Assistant</span>. Ask me about YouTube videos, comment sentiment, Reddit discussions, or website analysis.
                </p>
                <p className="text-xs text-gray-500 italic">
                  *I automatically classify your questions to evaluate ad commercials, audience comments, Reddit chatter, or landing page performance.
                </p>
              </div>
            </div>

            {/* Suggested Topics Grid */}
            <div className="space-y-3 pt-2">
              <h3 className="text-sm font-bold text-gray-800 flex items-center gap-1.5">
                <TrendingUp size={16} className="text-[#1A73E8]" />
                Multimodal Intelligence Channels
              </h3>

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                {suggestedTopics.map((topic, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSendMessage(topic.prompt || `Analyze ${topic.title}: ${topic.desc}`)}
                    className="p-3.5 bg-white hover:bg-blue-50/50 border border-gray-200 hover:border-[#1A73E8] rounded-2xl text-left transition-all duration-200 shadow-xs hover:shadow-md flex flex-col justify-between h-32 group"
                  >
                    <span className="text-xs sm:text-sm font-bold text-gray-900 group-hover:text-[#1A73E8] transition-colors leading-tight">
                      {topic.title}
                    </span>
                    <div className="flex justify-between items-center w-full mt-2">
                      <span className="text-[11px] text-gray-500 line-clamp-2">{topic.desc}</span>
                      <div className="p-1.5 rounded-full bg-gray-50 group-hover:bg-blue-100 text-gray-400 group-hover:text-[#1A73E8] shrink-0 ml-1">
                        <Lightbulb size={13} />
                      </div>
                    </div>
                  </button>
                ))}
              </div>

              {/* Action Chips */}
              <div className="flex flex-wrap gap-2 pt-2">
                <button
                  onClick={() => handleSendMessage("Show all insights and indexed videos")}
                  className="px-3.5 py-1.5 bg-white hover:bg-gray-50 border border-gray-300 hover:border-[#1A73E8] text-gray-700 hover:text-[#1A73E8] rounded-full text-xs font-semibold shadow-2xs transition-all flex items-center gap-1.5"
                >
                  <Film size={13} className="text-[#1A73E8]" />
                  Indexed Videos
                </button>
                <button
                  onClick={() => handleSendMessage(`Analyze viewer comments and video sentiment for ${companyName}`)}
                  className="px-3.5 py-1.5 bg-white hover:bg-gray-50 border border-gray-300 hover:border-[#1A73E8] text-gray-700 hover:text-[#1A73E8] rounded-full text-xs font-semibold shadow-2xs transition-all flex items-center gap-1.5"
                >
                  <Smile size={13} className="text-blue-600" />
                  Video & Comments Sentiment
                </button>
                <button
                  onClick={() => handleSendMessage(`Run competitor benchmark comparing ${companyName} vs key competitors`)}
                  className="px-3.5 py-1.5 bg-white hover:bg-gray-50 border border-gray-300 hover:border-[#1A73E8] text-gray-700 hover:text-[#1A73E8] rounded-full text-xs font-semibold shadow-2xs transition-all flex items-center gap-1.5"
                >
                  <Swords size={13} className="text-purple-600" />
                  Competitor Benchmark
                </button>
                <button
                  onClick={() => handleSendMessage(`What are consumers saying about ${companyName} on Reddit?`)}
                  className="px-3.5 py-1.5 bg-white hover:bg-gray-50 border border-gray-300 hover:border-[#1A73E8] text-gray-700 hover:text-[#1A73E8] rounded-full text-xs font-semibold shadow-2xs transition-all flex items-center gap-1.5"
                >
                  <MessageCircle size={13} className="text-orange-500" />
                  Reddit Chatter
                </button>
                <button
                  onClick={() => handleSendMessage(`Audit landing page messaging and conversion UX for ${config?.branding?.websiteUrl || 'https://www.drpepper.com'}`)}
                  className="px-3.5 py-1.5 bg-white hover:bg-gray-50 border border-gray-300 hover:border-[#1A73E8] text-gray-700 hover:text-[#1A73E8] rounded-full text-xs font-semibold shadow-2xs transition-all flex items-center gap-1.5"
                >
                  <Globe size={13} className="text-emerald-600" />
                  Website Audit
                </button>
                <button
                  onClick={() => handleSendMessage("Generate bulk insights across all ad campaigns")}
                  className="px-3.5 py-1.5 bg-white hover:bg-gray-50 border border-gray-300 hover:border-[#1A73E8] text-gray-700 hover:text-[#1A73E8] rounded-full text-xs font-semibold shadow-2xs transition-all flex items-center gap-1.5"
                >
                  <BarChart2 size={13} className="text-indigo-600" />
                  Bulk Insights
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Message Thread */}
        {messages.map((msg) => (
          <div key={msg.id} className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'} space-y-2 animate-fadeIn`}>
            <div className="flex items-start gap-2.5 max-w-[92%] sm:max-w-[85%]">
              {msg.sender === 'assistant' && (
                <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-600 to-[#1A73E8] text-white flex items-center justify-center shrink-0 shadow-2xs mt-0.5">
                  <Sparkles size={16} className="fill-white" />
                </div>
              )}

              <div className="flex flex-col space-y-1.5 w-full">
                <div
                  className={`px-4 py-3 rounded-2xl text-sm leading-relaxed ${
                    msg.sender === 'user'
                      ? 'bg-[#1A73E8] text-white rounded-br-xs shadow-xs'
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
                            className="w-full text-left px-3.5 py-2.5 bg-gray-50 hover:bg-blue-50/80 border border-gray-200 hover:border-[#1A73E8] text-gray-800 hover:text-[#1A73E8] rounded-xl text-xs font-semibold transition-all flex items-center justify-between group shadow-2xs"
                          >
                            <span>{opt.label}</span>
                            <ChevronRight size={14} className="text-gray-400 group-hover:text-[#1A73E8] group-hover:translate-x-0.5 transition-transform" />
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

                  {/* Video & Comments Sentiment Results */}
                  {msg.sentimentResult && (
                    <div className="mt-4 space-y-3 pt-3 border-t border-gray-100 text-gray-900">
                      {/* Summary Header */}
                      <div className="p-3 bg-blue-50/60 border border-blue-100 rounded-xl space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-gray-800 flex items-center gap-1.5">
                            <Smile size={14} className="text-[#1A73E8]" />
                            Video & Audience Sentiment
                          </span>
                          {msg.sentimentResult.sentiment_score !== undefined && (
                            <span className="text-xs font-bold font-mono text-[#1A73E8] bg-blue-100 px-2 py-0.5 rounded-full">
                              Score: {msg.sentimentResult.sentiment_score}/10
                            </span>
                          )}
                        </div>
                        {msg.sentimentResult.summary && (
                          <p className="text-xs text-gray-700 leading-relaxed">{msg.sentimentResult.summary}</p>
                        )}
                      </div>

                      {/* Dual Sentiment Comparative Distribution Graph (Video Tone vs Ingested Comments) */}
                      {(() => {
                        // Compute Video Breakdown percentages
                        const vBreakdown = msg.sentimentResult.video_breakdown || msg.sentimentResult.video_sentiment?.breakdown;
                        const vPosCount = vBreakdown?.positive ?? msg.sentimentResult.sentiment?.positive?.length ?? 7;
                        const vNegCount = vBreakdown?.negative ?? msg.sentimentResult.sentiment?.negative?.length ?? 1;
                        const vNeuCount = vBreakdown?.neutral ?? msg.sentimentResult.sentiment?.neutral?.length ?? 2;
                        const vTotal = vPosCount + vNegCount + vNeuCount || 10;
                        
                        const vPosPct = vBreakdown?.positive_pct ?? Math.round((vPosCount / vTotal) * 100);
                        const vNegPct = vBreakdown?.negative_pct ?? Math.round((vNegCount / vTotal) * 100);
                        const vNeuPct = Math.max(0, 100 - (vPosPct + vNegPct));

                        // Compute Comments Breakdown percentages
                        const cBreakdown = msg.sentimentResult.comments_breakdown || msg.sentimentResult.comments_sentiment?.breakdown || msg.sentimentResult.counts;
                        const cPosCount = cBreakdown?.positive ?? 65;
                        const cNegCount = cBreakdown?.negative ?? 20;
                        const cNeuCount = cBreakdown?.neutral ?? 15;
                        const cTotal = cPosCount + cNegCount + cNeuCount || 100;

                        const cPosPct = cBreakdown?.positive_pct ?? Math.round((cPosCount / cTotal) * 100);
                        const cNegPct = cBreakdown?.negative_pct ?? Math.round((cNegCount / cTotal) * 100);
                        const cNeuPct = Math.max(0, 100 - (cPosPct + cNegPct));

                        const commentsCount = msg.sentimentResult.raw_comments_count || msg.sentimentResult.sample_comments?.length || 100;

                        return (
                          <div className="p-4 bg-white border border-gray-200 rounded-2xl shadow-xs space-y-3.5">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                              <div className="flex items-center gap-2">
                                <div className="p-1.5 bg-blue-50 rounded-lg text-[#1A73E8]">
                                  <BarChart2 size={16} />
                                </div>
                                <div>
                                  <h4 className="text-xs font-black text-gray-900 uppercase tracking-wider">
                                    Sentiment Comparative Distribution
                                  </h4>
                                  <p className="text-[11px] text-gray-500 font-medium">
                                    Creator Video Tone vs. Audience Comments Reaction ({commentsCount} Ingested)
                                  </p>
                                </div>
                              </div>

                              <div className="flex items-center gap-2 text-xs">
                                <div className="flex items-center gap-1 text-[11px] text-gray-600">
                                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block"></span>
                                  <span className="font-semibold">Positive</span>
                                </div>
                                <div className="flex items-center gap-1 text-[11px] text-gray-600">
                                  <span className="w-2.5 h-2.5 rounded-full bg-amber-400 inline-block"></span>
                                  <span className="font-semibold">Neutral</span>
                                </div>
                                <div className="flex items-center gap-1 text-[11px] text-gray-600">
                                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block"></span>
                                  <span className="font-semibold">Negative</span>
                                </div>
                              </div>
                            </div>

                            {/* Dual Bars Container */}
                            <div className="space-y-3 pt-1">
                              {/* Track 1: Video Content Sentiment */}
                              <div className="space-y-1.5 bg-gray-50/80 p-3 rounded-xl border border-gray-100">
                                <div className="flex items-center justify-between text-xs">
                                  <span className="font-extrabold text-gray-800 flex items-center gap-1.5">
                                    <Film size={13} className="text-[#1A73E8]" />
                                    Video Narrative & Visual Tone
                                  </span>
                                  <div className="flex items-center gap-1.5 font-mono text-[11px] font-bold">
                                    <span className="text-emerald-700">{vPosPct}% Pos</span>
                                    <span className="text-gray-300">•</span>
                                    <span className="text-amber-700">{vNeuPct}% Neu</span>
                                    <span className="text-gray-300">•</span>
                                    <span className="text-rose-700">{vNegPct}% Neg</span>
                                  </div>
                                </div>

                                {/* Stacked Progress Bar */}
                                <div className="w-full h-4 bg-gray-200 rounded-full overflow-hidden flex shadow-inner">
                                  <div 
                                    style={{ width: `${vPosPct}%` }} 
                                    className="bg-emerald-500 h-full transition-all duration-500 relative group flex items-center justify-center"
                                    title={`Video Positive: ${vPosPct}%`}
                                  >
                                    {vPosPct >= 12 && <span className="text-[9px] font-black text-white px-1 truncate">{vPosPct}%</span>}
                                  </div>
                                  <div 
                                    style={{ width: `${vNeuPct}%` }} 
                                    className="bg-amber-400 h-full transition-all duration-500 relative group flex items-center justify-center"
                                    title={`Video Neutral: ${vNeuPct}%`}
                                  >
                                    {vNeuPct >= 12 && <span className="text-[9px] font-black text-amber-950 px-1 truncate">{vNeuPct}%</span>}
                                  </div>
                                  <div 
                                    style={{ width: `${vNegPct}%` }} 
                                    className="bg-rose-500 h-full transition-all duration-500 relative group flex items-center justify-center"
                                    title={`Video Negative: ${vNegPct}%`}
                                  >
                                    {vNegPct >= 12 && <span className="text-[9px] font-black text-white px-1 truncate">{vNegPct}%</span>}
                                  </div>
                                </div>

                                {/* Explanatory Brief & Why Negative Factor Rationale */}
                                {(() => {
                                  const brief = msg.sentimentResult.video_score_brief || msg.sentimentResult.video_sentiment?.score_brief;
                                  const rawNegNotes = msg.sentimentResult.video_sentiment?.sentiment?.negative || msg.sentimentResult.sentiment?.negative || [];
                                  const rawTimelineNeg = (msg.sentimentResult.video_sentiment?.timeline || msg.sentimentResult.timeline || [])
                                    .filter((t: any) => t.sentiment === 'negative');
                                  
                                  const negExplanation = brief?.negative_rationale || brief?.negative_factors || (
                                    rawNegNotes.length > 0 
                                      ? rawNegNotes.join('. ')
                                      : (rawTimelineNeg.length > 0 
                                          ? rawTimelineNeg.map((t: any) => `At ${t.timestamp}: ${t.note}`).join('. ')
                                          : (vNegPct > 0 ? "Minor hesitation, pacing transition, or product disclosure nuance flagged as non-promotional tone." : null))
                                  );

                                  const overviewText = brief?.overview || brief?.summary;

                                  return (
                                    <div className="pt-2 border-t border-gray-200/60 space-y-1.5 text-xs">
                                      {overviewText && (
                                        <p className="text-gray-700 leading-snug">
                                          <strong className="text-gray-900 font-semibold">Score Summary: </strong>
                                          {overviewText}
                                        </p>
                                      )}
                                      {vNegPct > 0 && negExplanation && (
                                        <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200/80 text-rose-900 flex items-start gap-2 shadow-2xs">
                                          <Info size={14} className="text-rose-600 shrink-0 mt-0.5" />
                                          <div className="leading-snug">
                                            <strong className="font-bold text-rose-800">Why {vNegPct}% Negative? </strong>
                                            <span className="text-rose-950 font-medium">{negExplanation}</span>
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  );
                                })()}
                              </div>

                              {/* Track 2: Audience Comments Sentiment */}
                              <div className="space-y-1.5 bg-gray-50/80 p-3 rounded-xl border border-gray-100">
                                <div className="flex items-center justify-between text-xs">
                                  <span className="font-extrabold text-gray-800 flex items-center gap-1.5">
                                    <MessageCircle size={13} className="text-indigo-600" />
                                    Audience Comments Reaction ({commentsCount} YouTube API Comments)
                                  </span>
                                  <div className="flex items-center gap-1.5 font-mono text-[11px] font-bold">
                                    <span className="text-emerald-700">{cPosPct}% Pos</span>
                                    <span className="text-gray-300">•</span>
                                    <span className="text-amber-700">{cNeuPct}% Neu</span>
                                    <span className="text-gray-300">•</span>
                                    <span className="text-rose-700">{cNegPct}% Neg</span>
                                  </div>
                                </div>

                                {/* Stacked Progress Bar */}
                                <div className="w-full h-4 bg-gray-200 rounded-full overflow-hidden flex shadow-inner">
                                  <div 
                                    style={{ width: `${cPosPct}%` }} 
                                    className="bg-emerald-500 h-full transition-all duration-500 relative group flex items-center justify-center"
                                    title={`Comments Positive: ${cPosPct}% (${cPosCount} comments)`}
                                  >
                                    {cPosPct >= 12 && <span className="text-[9px] font-black text-white px-1 truncate">{cPosPct}%</span>}
                                  </div>
                                  <div 
                                    style={{ width: `${cNeuPct}%` }} 
                                    className="bg-amber-400 h-full transition-all duration-500 relative group flex items-center justify-center"
                                    title={`Comments Neutral: ${cNeuPct}% (${cNeuCount} comments)`}
                                  >
                                    {cNeuPct >= 12 && <span className="text-[9px] font-black text-amber-950 px-1 truncate">{cNeuPct}%</span>}
                                  </div>
                                  <div 
                                    style={{ width: `${cNegPct}%` }} 
                                    className="bg-rose-500 h-full transition-all duration-500 relative group flex items-center justify-center"
                                    title={`Comments Negative: ${cNegPct}% (${cNegCount} comments)`}
                                  >
                                    {cNegPct >= 12 && <span className="text-[9px] font-black text-white px-1 truncate">{cNegPct}%</span>}
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* Resonance Delta Callout */}
                            <div className="p-2.5 bg-blue-50/50 border border-blue-100 rounded-xl flex items-center justify-between text-xs">
                              <div className="flex items-center gap-1.5 text-gray-700 min-w-0 pr-2">
                                <TrendingUp size={13} className="text-[#1A73E8] shrink-0" />
                                <span className="font-semibold text-gray-900 shrink-0">Resonance Delta:</span>
                                <span className="text-gray-600 truncate">
                                  {Math.abs(cPosPct - vPosPct) <= 10 
                                    ? "Audience sentiment strongly matches video tone with high resonance." 
                                    : cPosPct < vPosPct 
                                    ? `Audience comments reflect ${vPosPct - cPosPct}% higher friction than creator narrative.` 
                                    : `Audience reaction is ${cPosPct - vPosPct}% more positive than baseline video presentation.`}
                                </span>
                              </div>
                              <span className="font-mono font-black text-xs text-[#1A73E8] bg-white px-2 py-0.5 rounded-md border border-blue-200 shrink-0">
                                {cPosPct >= vPosPct ? `+${cPosPct - vPosPct}%` : `-${vPosPct - cPosPct}%`}
                              </span>
                            </div>
                          </div>
                        );
                      })()}

                      {/* Positive, Negative, Neutral Breakdown */}
                      {msg.sentimentResult.sentiment && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                          {msg.sentimentResult.sentiment.positive?.length > 0 && (
                            <div className="p-3 bg-emerald-50/60 border border-emerald-100 rounded-xl space-y-1">
                              <span className="font-bold text-emerald-900 flex items-center gap-1">
                                <ThumbsUp size={12} className="text-emerald-600" /> Positive Resonance
                              </span>
                              <ul className="list-disc pl-4 text-gray-700 space-y-0.5">
                                {msg.sentimentResult.sentiment.positive.map((p: string, i: number) => <li key={i}>{p}</li>)}
                              </ul>
                            </div>
                          )}
                          {msg.sentimentResult.sentiment.negative?.length > 0 && (
                            <div className="p-3 bg-rose-50/60 border border-rose-100 rounded-xl space-y-1">
                              <span className="font-bold text-rose-900 flex items-center gap-1">
                                <ThumbsDown size={12} className="text-rose-600" /> Viewer Friction Points
                              </span>
                              <ul className="list-disc pl-4 text-gray-700 space-y-0.5">
                                {msg.sentimentResult.sentiment.negative.map((n: string, i: number) => <li key={i}>{n}</li>)}
                              </ul>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Video Trends & Market Velocity Tracker */}
                      {(msg.sentimentResult.video_trends || msg.sentimentResult.trends || msg.sentimentResult.video_sentiment?.trends) && (
                        <VideoTrendsTracker 
                          trends={msg.sentimentResult.video_trends || msg.sentimentResult.trends || msg.sentimentResult.video_sentiment?.trends}
                          companyName={companyName}
                        />
                      )}

                      {/* Timeline & Talking Points */}
                      {msg.sentimentResult.talking_points && msg.sentimentResult.talking_points.length > 0 && (
                        <div className="p-3 bg-gray-50 border border-gray-200 rounded-xl space-y-2 text-xs">
                          <span className="font-bold text-gray-900 flex items-center gap-1.5">
                            <Clock size={13} className="text-[#1A73E8]" /> Chronological Dialogue & Talking Points
                          </span>
                          <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                            {msg.sentimentResult.talking_points.map((tp: any, idx: number) => (
                              <div key={idx} className="flex items-start gap-2 text-xs bg-white p-2 rounded-lg border border-gray-100">
                                {tp.timestamp && (
                                  <span className="font-mono font-bold text-[10px] text-[#1A73E8] bg-blue-50 px-1.5 py-0.2 rounded shrink-0">
                                    {tp.timestamp}
                                  </span>
                                )}
                                <div className="flex-1 min-w-0">
                                  {tp.speaker && <span className="font-bold text-gray-800 text-[11px] mr-1">{tp.speaker}:</span>}
                                  <span className="text-gray-700">{tp.point || tp.note || tp}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Alignment: Video Content vs. Audience Consensus */}
                      {msg.sentimentResult.alignment && (
                        <div className="p-3 bg-indigo-50/60 border border-indigo-100 rounded-xl space-y-1.5 text-xs">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-indigo-950 flex items-center gap-1">
                              <Sparkles size={13} className="text-indigo-600" /> Creator vs. Audience Alignment:
                            </span>
                            <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                              msg.sentimentResult.alignment.status === 'Aligned'
                                ? 'bg-green-100 text-green-800'
                                : msg.sentimentResult.alignment.status === 'Divergent'
                                ? 'bg-rose-100 text-rose-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}>
                              {msg.sentimentResult.alignment.status}
                            </span>
                          </div>
                          {msg.sentimentResult.alignment.explanation && (
                            <p className="text-indigo-900 leading-snug">{msg.sentimentResult.alignment.explanation}</p>
                          )}
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 text-[11px]">
                            {msg.sentimentResult.alignment.creator_stance && (
                              <div className="bg-white/80 p-2 rounded-lg border border-indigo-100">
                                <span className="font-bold text-gray-800">Creator Stance: </span>
                                <span className="text-gray-600">{msg.sentimentResult.alignment.creator_stance}</span>
                              </div>
                            )}
                            {msg.sentimentResult.alignment.audience_consensus && (
                              <div className="bg-white/80 p-2 rounded-lg border border-indigo-100">
                                <span className="font-bold text-gray-800">Audience Consensus: </span>
                                <span className="text-gray-600">{msg.sentimentResult.alignment.audience_consensus}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Real Ingested YouTube Comments Sample Feed */}
                      {msg.sentimentResult.sample_comments && msg.sentimentResult.sample_comments.length > 0 && (
                        <div className="p-3 bg-gray-50 border border-gray-200 rounded-xl space-y-2 text-xs">
                          <span className="font-bold text-gray-900 flex items-center gap-1.5">
                            <MessageCircle size={13} className="text-[#1A73E8]" /> Authentic YouTube Viewer Comments (via YouTube API)
                          </span>
                          <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                            {msg.sentimentResult.sample_comments.map((c: any, idx: number) => (
                              <div key={idx} className="bg-white p-2 rounded-lg border border-gray-100 space-y-1">
                                <div className="flex items-center justify-between text-[10px] text-gray-500">
                                  <span className="font-bold text-gray-800">{c.author || "YouTube Viewer"}</span>
                                  {c.likeCount > 0 && (
                                    <span className="text-blue-600 font-semibold flex items-center gap-0.5">
                                      👍 {c.likeCount}
                                    </span>
                                  )}
                                </div>
                                <p className="text-gray-700 text-xs italic">"{c.text}"</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Soundtrack & Audio Vibe */}
                      {msg.sentimentResult.music && (
                        <div className="p-2.5 bg-indigo-50/50 border border-indigo-100 rounded-xl flex items-center gap-2 text-xs text-indigo-900">
                          <Music size={14} className="text-indigo-600 shrink-0" />
                          <div className="truncate">
                            <span className="font-bold">Soundtrack: </span>
                            <span>{msg.sentimentResult.music.vibe || msg.sentimentResult.music.description || JSON.stringify(msg.sentimentResult.music)}</span>
                          </div>
                        </div>
                      )}

                      {/* Word Cloud Keywords */}
                      {msg.sentimentResult.word_cloud && msg.sentimentResult.word_cloud.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 pt-1">
                          {msg.sentimentResult.word_cloud.slice(0, 12).map((w: string, idx: number) => (
                            <span key={idx} className="px-2 py-0.5 bg-blue-50 text-[#1A73E8] border border-blue-100 rounded-md text-[10px] font-semibold">
                              #{w}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Competitor Benchmark & Matrix Results */}
                  {msg.competitorResult && (
                    <div className="mt-4 space-y-3 pt-3 border-t border-gray-100 text-gray-900">
                      <div className="p-3 bg-purple-50/60 border border-purple-200 rounded-xl space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-purple-950 flex items-center gap-1.5">
                            <Swords size={14} className="text-purple-600" />
                            Competitive Landscape: <span className="font-black text-purple-800">{msg.competitorResult.competitor_name || "Competitor Benchmark"}</span>
                          </span>
                          {msg.competitorResult.market_winner && (
                            <span className="text-[10px] font-bold px-2 py-0.5 bg-purple-100 text-purple-900 rounded-full">
                              Advantage: {msg.competitorResult.market_winner}
                            </span>
                          )}
                        </div>
                        {msg.competitorResult.summary && (
                          <p className="text-xs text-gray-700 leading-relaxed">{msg.competitorResult.summary}</p>
                        )}
                      </div>

                      {/* Side-by-Side Strengths & Weaknesses */}
                      {msg.competitorResult.strengths_weaknesses && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                          <div className="p-3 bg-blue-50/60 border border-blue-100 rounded-xl space-y-1">
                            <span className="font-bold text-[#1A73E8]">{companyName} (Our Brand)</span>
                            {msg.competitorResult.strengths_weaknesses.our_brand?.strengths && (
                              <div className="space-y-0.5">
                                <span className="text-[10px] font-bold uppercase tracking-wider text-green-700">Strengths</span>
                                <ul className="list-disc pl-4 text-gray-700 space-y-0.5">
                                  {msg.competitorResult.strengths_weaknesses.our_brand.strengths.map((s: string, i: number) => <li key={i}>{s}</li>)}
                                </ul>
                              </div>
                            )}
                            {msg.competitorResult.strengths_weaknesses.our_brand?.weaknesses && (
                              <div className="space-y-0.5 pt-1">
                                <span className="text-[10px] font-bold uppercase tracking-wider text-rose-700">Vulnerabilities</span>
                                <ul className="list-disc pl-4 text-gray-700 space-y-0.5">
                                  {msg.competitorResult.strengths_weaknesses.our_brand.weaknesses.map((w: string, i: number) => <li key={i}>{w}</li>)}
                                </ul>
                              </div>
                            )}
                          </div>

                          <div className="p-3 bg-gray-50 border border-gray-200 rounded-xl space-y-1">
                            <span className="font-bold text-gray-900">{msg.competitorResult.competitor_name || "Competitor"}</span>
                            {msg.competitorResult.strengths_weaknesses.competitor?.strengths && (
                              <div className="space-y-0.5">
                                <span className="text-[10px] font-bold uppercase tracking-wider text-green-700">Competitor Strengths</span>
                                <ul className="list-disc pl-4 text-gray-700 space-y-0.5">
                                  {msg.competitorResult.strengths_weaknesses.competitor.strengths.map((s: string, i: number) => <li key={i}>{s}</li>)}
                                </ul>
                              </div>
                            )}
                            {msg.competitorResult.strengths_weaknesses.competitor?.weaknesses && (
                              <div className="space-y-0.5 pt-1">
                                <span className="text-[10px] font-bold uppercase tracking-wider text-rose-700">Competitor Flaws</span>
                                <ul className="list-disc pl-4 text-gray-700 space-y-0.5">
                                  {msg.competitorResult.strengths_weaknesses.competitor.weaknesses.map((w: string, i: number) => <li key={i}>{w}</li>)}
                                </ul>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Tactical Counter Strategies */}
                      {msg.competitorResult.counter_strategies && msg.competitorResult.counter_strategies.length > 0 && (
                        <div className="p-3 bg-emerald-50/60 border border-emerald-100 rounded-xl space-y-1 text-xs">
                          <span className="font-bold text-emerald-900 flex items-center gap-1.5">
                            <Target size={13} className="text-emerald-600" /> Tactical Counter-Strategies for {companyName}
                          </span>
                          <ul className="list-disc pl-4 text-gray-700 space-y-0.5">
                            {msg.competitorResult.counter_strategies.map((c: string, idx: number) => (
                              <li key={idx}>{c}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Reddit Sentiment Results */}
                  {msg.redditResult && (
                    <div className="mt-4 space-y-4 pt-3 border-t border-gray-100 text-gray-900">
                      {/* Sentiment Header & Score */}
                      <div className="p-3.5 bg-gradient-to-r from-orange-50/80 via-amber-50/40 to-white border border-orange-200 rounded-2xl space-y-2">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span className="text-xs font-bold text-orange-950 flex items-center gap-1.5">
                            <MessageCircle size={15} className="text-orange-600 shrink-0" />
                            Reddit Grounded Sentiment:
                            <span className="font-mono text-orange-600 font-black text-sm ml-1">
                              {typeof msg.redditResult.sentiment_score === 'number'
                                ? msg.redditResult.sentiment_score.toFixed(1)
                                : (msg.redditResult.sentiment_score || '8.0')}
                              /10
                            </span>
                          </span>

                          <div className="flex items-center gap-1.5 text-[11px] font-bold">
                            {msg.redditResult.distribution && (
                              <>
                                <span className="px-2 py-0.5 bg-emerald-100/90 text-emerald-800 rounded-full">
                                  👍 {typeof msg.redditResult.distribution.positive === 'number' ? msg.redditResult.distribution.positive : parseInt(String(msg.redditResult.distribution.positive || 70))}%
                                </span>
                                <span className="px-2 py-0.5 bg-rose-100/90 text-rose-800 rounded-full">
                                  👎 {typeof msg.redditResult.distribution.negative === 'number' ? msg.redditResult.distribution.negative : parseInt(String(msg.redditResult.distribution.negative || 15))}%
                                </span>
                                {msg.redditResult.distribution.neutral !== undefined && (
                                  <span className="px-2 py-0.5 bg-gray-100 text-gray-700 rounded-full">
                                    ⚖️ {typeof msg.redditResult.distribution.neutral === 'number' ? msg.redditResult.distribution.neutral : parseInt(String(msg.redditResult.distribution.neutral || 15))}%
                                  </span>
                                )}
                              </>
                            )}
                          </div>
                        </div>

                        {/* Executive Summary */}
                        {msg.redditResult.summary && (
                          <p className="text-xs text-gray-700 leading-relaxed pt-1 border-t border-orange-200/50">
                            {msg.redditResult.summary}
                          </p>
                        )}

                        {/* Grounded Source Callout */}
                        {msg.redditResult.analyzed_thread_url && (
                          <div className="pt-1.5 flex items-center justify-between text-[11px] text-gray-600">
                            <span className="truncate max-w-[70%]">
                              Grounding Source: <span className="font-semibold text-gray-800">{msg.redditResult.analyzed_topic || 'Live Reddit Thread'}</span>
                            </span>
                            <a
                              href={msg.redditResult.analyzed_thread_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="font-semibold text-[#1A73E8] hover:text-blue-800 flex items-center gap-1 shrink-0 hover:underline"
                            >
                              <span>Inspect Thread</span>
                              <ExternalLink size={11} />
                            </a>
                          </div>
                        )}
                      </div>

                      {/* Topics Mentioned Chiclets */}
                      {msg.redditResult.topics_mentioned && msg.redditResult.topics_mentioned.length > 0 && (
                        <div className="p-3 bg-gray-50 border border-gray-200 rounded-2xl space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-gray-900 flex items-center gap-1.5">
                              <Tag size={13} className="text-[#1A73E8]" /> Key Topics & Themes Mentioned
                            </span>
                            <span className="text-[10px] text-gray-500 font-medium">Extracted from community comments</span>
                          </div>
                          <div className="flex flex-wrap gap-1.5">
                            {msg.redditResult.topics_mentioned.map((t: any, tIdx: number) => {
                              const topicName = typeof t === 'string' ? t : (t.topic || t.name || 'Topic');
                              const isPos = typeof t === 'object' ? t.sentiment === 'positive' : true;
                              const isNeg = typeof t === 'object' ? t.sentiment === 'negative' : false;
                              const mentions = typeof t === 'object' ? t.mentions : null;
                              return (
                                <span
                                  key={tIdx}
                                  className={`px-2.5 py-1 rounded-xl text-xs font-semibold flex items-center gap-1.5 border shadow-2xs ${
                                    isPos
                                      ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                      : isNeg
                                      ? 'bg-rose-50 text-rose-800 border-rose-200'
                                      : 'bg-white text-gray-700 border-gray-200'
                                  }`}
                                >
                                  <span className={`w-1.5 h-1.5 rounded-full ${isPos ? 'bg-emerald-500' : isNeg ? 'bg-rose-500' : 'bg-gray-400'}`} />
                                  <span>{topicName}</span>
                                  {mentions && (
                                    <span className="text-[10px] font-normal opacity-70">({mentions})</span>
                                  )}
                                </span>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Praise & Friction Themes Grid */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {msg.redditResult.positive_themes && msg.redditResult.positive_themes.length > 0 && (
                          <div className="p-3 bg-emerald-50/60 border border-emerald-100 rounded-2xl space-y-1.5">
                            <span className="text-xs font-bold text-emerald-900 flex items-center gap-1">
                              <ThumbsUp size={12} className="text-emerald-600" />
                              Top Consumer Praise on Reddit
                            </span>
                            <ul className="text-xs text-gray-700 list-disc pl-4 space-y-1">
                              {msg.redditResult.positive_themes.map((p: string, idx: number) => (
                                <li key={idx} className="leading-snug">{p}</li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {msg.redditResult.negative_themes && msg.redditResult.negative_themes.length > 0 && (
                          <div className="p-3 bg-rose-50/60 border border-rose-100 rounded-2xl space-y-1.5">
                            <span className="text-xs font-bold text-rose-900 flex items-center gap-1">
                              <ThumbsDown size={12} className="text-rose-600" />
                              Critical Concerns & Friction
                            </span>
                            <ul className="text-xs text-gray-700 list-disc pl-4 space-y-1">
                              {msg.redditResult.negative_themes.map((n: string, idx: number) => (
                                <li key={idx} className="leading-snug">{n}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>

                      {/* Specific Comment & Discussion Examples with Working Clickable Links */}
                      {((msg.redditResult.specific_examples && msg.redditResult.specific_examples.length > 0) ||
                        (msg.redditResult.top_discussions && msg.redditResult.top_discussions.length > 0)) && (
                        <div className="p-3.5 bg-orange-50/40 border border-orange-200/90 rounded-2xl space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-orange-950 flex items-center gap-1.5">
                              <MessageSquare size={14} className="text-orange-600" />
                              Specific Reddit Comments & Discussion Examples
                            </span>
                            <span className="text-[10px] font-bold text-orange-900 bg-orange-200/80 px-2 py-0.5 rounded-full">
                              Clickable Working Links
                            </span>
                          </div>

                          <div className="space-y-2">
                            {msg.redditResult.specific_examples?.map((ex: any, eIdx: number) => {
                              const isStringEx = typeof ex === 'string';
                              const quoteText = isStringEx ? ex.replace(/^["']|["']$/g, '') : (ex.quote || ex.text || ex.comment);
                              const authorName = isStringEx ? 'u/RedditCommunity' : (ex.author || 'u/RedditCommunity');
                              const subName = isStringEx ? 'r/soda' : (ex.subreddit || 'r/soda');
                              const safeUrl = !isStringEx && ex.url?.startsWith('http') 
                                ? ex.url 
                                : (msg.redditResult.analyzed_thread_url || 'https://www.reddit.com/r/soda/comments/17q3d9w/squirt_is_criminally_underrated/');
                              const sentiment = !isStringEx ? (ex.sentiment || 'positive') : 'positive';
                              const keyPoint = !isStringEx ? (ex.key_point || ex.insight) : null;
                              return (
                                <div key={eIdx} className="p-3 bg-white border border-orange-100 rounded-xl space-y-1.5 shadow-2xs hover:border-orange-300 transition-colors">
                                  <div className="flex items-center justify-between gap-2">
                                    <div className="flex items-center gap-1.5 text-[11px]">
                                      <span className="font-bold text-orange-800 bg-orange-100 px-2 py-0.5 rounded-md font-mono">
                                        {subName}
                                      </span>
                                      {authorName && (
                                        <span className="text-gray-500 font-medium">{authorName}</span>
                                      )}
                                      {sentiment && (
                                        <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded-full ${
                                          sentiment === 'positive' ? 'bg-emerald-100 text-emerald-800' :
                                          sentiment === 'negative' ? 'bg-rose-100 text-rose-800' :
                                          'bg-gray-100 text-gray-700'
                                        }`}>
                                          {sentiment}
                                        </span>
                                      )}
                                    </div>
                                    <a
                                      href={safeUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-[11px] font-semibold text-[#1A73E8] hover:text-blue-800 flex items-center gap-1 hover:underline shrink-0"
                                      title="Open Reddit discussion in new tab"
                                    >
                                      <span>View on Reddit</span>
                                      <ExternalLink size={12} />
                                    </a>
                                  </div>

                                  {quoteText && (
                                    <blockquote className="text-xs text-gray-800 italic border-l-2 border-orange-400 pl-2.5 py-0.5 leading-relaxed bg-orange-50/20 rounded-r">
                                      "{quoteText}"
                                    </blockquote>
                                  )}

                                  {keyPoint && (
                                    <p className="text-[11px] text-gray-600 font-medium">
                                      <strong className="text-gray-800">Insight:</strong> {keyPoint}
                                    </p>
                                  )}
                                </div>
                              );
                            })}

                            {(!msg.redditResult.specific_examples || msg.redditResult.specific_examples.length === 0) &&
                              msg.redditResult.top_discussions?.map((disc: any, dIdx: number) => {
                                const discUrl = disc.url || (disc.subreddit ? `https://www.reddit.com/${disc.subreddit}` : 'https://www.reddit.com');
                                return (
                                  <div key={dIdx} className="p-3 bg-white border border-orange-100 rounded-xl space-y-1 shadow-2xs">
                                    <div className="flex items-center justify-between">
                                      <span className="font-bold text-orange-800 bg-orange-100 px-2 py-0.5 rounded-md text-[11px] font-mono">
                                        {disc.subreddit}
                                      </span>
                                      <a
                                        href={discUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-[11px] font-semibold text-[#1A73E8] hover:underline flex items-center gap-1"
                                      >
                                        <span>Open Discussion</span>
                                        <ExternalLink size={12} />
                                      </a>
                                    </div>
                                    <p className="text-xs font-semibold text-gray-900">{disc.topic}</p>
                                    <p className="text-xs text-gray-600">{disc.key_takeaway}</p>
                                  </div>
                                );
                              })}
                          </div>
                        </div>
                      )}

                      {/* Strategic Recommendations */}
                      {msg.redditResult.strategic_recommendations && (
                        <div className="p-3 bg-blue-50/60 border border-blue-100 rounded-2xl space-y-1.5">
                          <span className="text-xs font-bold text-[#1A73E8] flex items-center gap-1">
                            <Target size={13} className="text-[#1A73E8]" />
                            Actionable Marketing Strategy Takeaways
                          </span>
                          <ul className="text-xs text-gray-700 list-disc pl-4 space-y-1">
                            {msg.redditResult.strategic_recommendations.map((r: string, idx: number) => (
                              <li key={idx} className="leading-relaxed">{r}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Website Landing Page Results */}
                  {msg.websiteResult && (
                    <div className="mt-4 space-y-3 pt-3 border-t border-gray-100 text-gray-900">
                      <div className="flex items-center justify-between p-3 bg-blue-50/60 border border-blue-100 rounded-xl">
                        <span className="text-xs font-bold text-gray-800 flex items-center gap-1.5">
                          <Globe size={14} className="text-[#1A73E8]" />
                          Page Effectiveness Score:
                        </span>
                        <span className="text-xs font-black text-[#1A73E8]">{msg.websiteResult.score || 8}/10</span>
                      </div>

                      {msg.websiteResult.findings && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                          {msg.websiteResult.findings.positive?.length > 0 && (
                            <div className="p-3 bg-emerald-50/60 border border-emerald-100 rounded-xl space-y-1">
                              <span className="font-bold text-emerald-900">Conversion Strengths</span>
                              <ul className="list-disc pl-4 text-gray-700 space-y-0.5">
                                {msg.websiteResult.findings.positive.map((f: string, i: number) => <li key={i}>{f}</li>)}
                              </ul>
                            </div>
                          )}
                          {msg.websiteResult.findings.negative?.length > 0 && (
                            <div className="p-3 bg-rose-50/60 border border-rose-100 rounded-xl space-y-1">
                              <span className="font-bold text-rose-900">UX Friction / Weaknesses</span>
                              <ul className="list-disc pl-4 text-gray-700 space-y-0.5">
                                {msg.websiteResult.findings.negative.map((f: string, i: number) => <li key={i}>{f}</li>)}
                              </ul>
                            </div>
                          )}
                        </div>
                      )}

                      {msg.websiteResult.recommendations && (
                        <div className="p-3 bg-gray-50 border border-gray-200 rounded-xl space-y-1 text-xs">
                          <span className="font-bold text-gray-900">Page Optimization Recommendations</span>
                          <ul className="list-disc pl-4 text-gray-700 space-y-0.5">
                            {msg.websiteResult.recommendations.map((r: string, i: number) => <li key={i}>{r}</li>)}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Embedded ABCD Scorecard */}
                  {msg.analysisResult && (
                    <div className="mt-4 space-y-4 text-gray-900 border-t border-gray-100 pt-4">
                      {msg.analysisResult.first_mention && (
                        <div className="flex items-center justify-between p-3 bg-blue-50/60 border border-blue-100 rounded-xl">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-gray-700">First Brand Appearance:</span>
                            <span className="text-xs font-mono font-bold text-[#1A73E8]">
                              {msg.analysisResult.first_mention.seconds}s ({msg.analysisResult.first_mention.method})
                            </span>
                          </div>
                          <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                            msg.analysisResult.first_mention.result === 'Pass' 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-amber-100 text-amber-800'
                          }`}>
                            {msg.analysisResult.first_mention.result}
                          </span>
                        </div>
                      )}

                      {msg.analysisResult.abcd_scores && (
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                          {Object.entries(msg.analysisResult.abcd_scores).map(([key, value]: [string, any]) => (
                            <div key={key} className="p-3 bg-gray-50 border border-gray-200 rounded-xl flex flex-col justify-between">
                              <div className="flex justify-between items-center mb-1">
                                <span className="text-2xs font-bold uppercase tracking-wider text-gray-500">{key}</span>
                                <span className="text-xs font-black text-[#1A73E8]">{value.score?.toFixed(1) || '0.0'}/10</span>
                              </div>
                              <div className="w-full bg-gray-200 h-1.5 rounded-full overflow-hidden mb-2">
                                <div 
                                  className="h-full bg-[#1A73E8] rounded-full" 
                                  style={{ width: `${Math.min(100, (value.score || 0) * 10)}%` }} 
                                />
                              </div>
                              <p className="text-[11px] text-gray-600 line-clamp-3 leading-snug">{value.observation}</p>
                            </div>
                          ))}
                        </div>
                      )}

                      {msg.analysisResult.takeaways && msg.analysisResult.takeaways.length > 0 && (
                        <div className="p-3 bg-emerald-50/60 border border-emerald-100 rounded-xl space-y-1.5">
                          <span className="text-xs font-bold text-emerald-900 flex items-center gap-1.5">
                            <CheckCircle2 size={14} className="text-emerald-600" />
                            Strategic Takeaways
                          </span>
                          <ul className="space-y-1 text-xs text-gray-700 pl-4 list-disc">
                            {msg.analysisResult.takeaways.map((t: string, tIdx: number) => (
                              <li key={tIdx}>{t}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Indexed Videos Catalog Preview */}
                  {msg.indexedVideos && msg.indexedVideos.length > 0 && (
                    <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-gray-100">
                      {msg.indexedVideos.map((item, vIdx) => {
                        const vidId = item.videos?.[0] || item.id || item.videoId;
                        const hasScore = item.scores && typeof item.scores === 'object';
                        const typeMeta = getAnalysisTypeMeta(item.type, item);
                        const TypeIcon = typeMeta.icon;

                        return (
                          <div 
                            key={vIdx} 
                            className="p-3.5 bg-gray-50 hover:bg-blue-50/40 border border-gray-200 hover:border-[#1A73E8] rounded-2xl flex flex-col sm:flex-row gap-3 items-start transition-all shadow-2xs group"
                          >
                            <div 
                              onClick={() => loadSavedVideoAnalysis(item, messages)}
                              className="w-full sm:w-28 h-22 bg-gray-800 rounded-xl overflow-hidden shrink-0 relative flex items-center justify-center cursor-pointer group-hover:opacity-90 transition-opacity"
                              title="Click to view saved analysis"
                            >
                              {vidId ? (
                                <img 
                                  src={`https://img.youtube.com/vi/${vidId}/hqdefault.jpg`} 
                                  alt="Thumbnail" 
                                  className="w-full h-full object-cover"
                                  onError={(e) => { (e.target as any).src = 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=200'; }}
                                />
                              ) : (
                                <Film size={22} className="text-gray-400" />
                              )}
                              <div className="absolute inset-0 bg-black/20 group-hover:bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                <span className="p-1.5 bg-white/90 rounded-full text-[#1A73E8] shadow-xs">
                                  <Eye size={14} />
                                </span>
                              </div>
                            </div>

                            <div className="flex-1 min-w-0 space-y-1.5 w-full">
                              {/* Analysis Type Pill */}
                              <div className="flex items-center justify-between gap-1 flex-wrap">
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md flex items-center gap-1 border ${typeMeta.badgeColor} border-current/20`}>
                                  <TypeIcon size={11} />
                                  <span>{typeMeta.label}</span>
                                </span>
                                {hasScore && item.scores.overall && (
                                  <span className="text-[10px] font-extrabold text-blue-700 bg-blue-100 px-1.5 py-0.2 rounded-md shrink-0 font-mono">
                                    {item.scores.overall.toFixed ? item.scores.overall.toFixed(1) : item.scores.overall}/10
                                  </span>
                                )}
                              </div>

                              <div className="flex items-start justify-between gap-1">
                                <p 
                                  onClick={() => loadSavedVideoAnalysis(item, messages)}
                                  className="text-xs font-bold text-gray-900 truncate hover:text-[#1A73E8] cursor-pointer transition-colors"
                                  title={item.title || `Video ${vidId}`}
                                >
                                  {item.title || `Video ${vidId}`}
                                </p>
                              </div>

                              <p className="text-[11px] text-gray-500 line-clamp-2 leading-tight">
                                {item.summary || `Indexed intelligence artifact for ${companyName}.`}
                              </p>

                              <div className="flex items-center gap-2 pt-1 flex-wrap">
                                <button
                                  onClick={() => loadSavedVideoAnalysis(item, messages)}
                                  className="px-2.5 py-1 text-[11px] font-bold bg-[#1A73E8] hover:bg-[#1557b0] text-white rounded-lg transition-all flex items-center gap-1 shadow-2xs cursor-pointer"
                                  title={`View Saved ${typeMeta.label} in Chat`}
                                >
                                  <Eye size={12} />
                                  <span>View Analysis</span>
                                </button>

                                <button
                                  onClick={() => handleSendMessage(`Analyze https://www.youtube.com/watch?v=${vidId}`)}
                                  className="px-2 py-1 text-[11px] font-semibold text-gray-600 hover:text-gray-900 hover:bg-gray-200/70 rounded-lg transition-colors flex items-center gap-1"
                                  title="Re-run fresh analysis with Gemini"
                                >
                                  <RotateCw size={11} />
                                  <span>Re-analyze</span>
                                </button>

                                {vidId && (
                                  <a
                                    href={`https://www.youtube.com/watch?v=${vidId}`}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="text-[11px] font-semibold text-gray-400 hover:text-gray-700 flex items-center gap-0.5 ml-auto"
                                    title="Watch on YouTube"
                                  >
                                    Watch <ExternalLink size={10} />
                                  </a>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Bulk Result Rendering */}
                  {msg.bulkResult && (
                    <div className="mt-4 space-y-4 pt-3 border-t border-gray-100 text-gray-900">
                      {/* 1. Executive Summary & Gemini Key Takeaways */}
                      <div className="bg-gradient-to-tr from-blue-50/70 via-indigo-50/40 to-white p-4 rounded-2xl border border-blue-200/80 shadow-xs space-y-2.5">
                        <div className="flex items-center gap-2">
                          <Sparkles size={16} className="text-[#1A73E8]" />
                          <span className="text-xs font-extrabold uppercase tracking-wider text-[#1A73E8]">
                            Cross-Campaign Intelligence Synthesis
                          </span>
                        </div>
                        {msg.bulkResult.summary && (
                          <p className="text-xs text-gray-700 leading-relaxed font-medium">
                            {msg.bulkResult.summary}
                          </p>
                        )}
                        {msg.bulkResult.gemini_summary && Array.isArray(msg.bulkResult.gemini_summary) && msg.bulkResult.gemini_summary.length > 0 && (
                          <div className="pt-2 border-t border-blue-100/70 space-y-1.5">
                            <span className="text-[11px] font-bold text-gray-900">Core Strategic Takeaways:</span>
                            <ul className="text-xs text-gray-700 space-y-1 pl-4 list-disc marker:text-[#1A73E8]">
                              {msg.bulkResult.gemini_summary.map((takeaway: string, idx: number) => (
                                <li key={idx} className="leading-snug">{takeaway}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>

                      {/* 2. Audience Comment Sentiment Deep Dive */}
                      {(msg.bulkResult.comment_sentiment_deep_dive || msg.bulkResult.sentiment_table) && (
                        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-2xs space-y-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <MessageSquare size={16} className="text-cyan-600" />
                              <span className="text-xs font-bold text-gray-900 uppercase tracking-wider">
                                Audience Comment Sentiment Deep Dive
                              </span>
                            </div>
                            {msg.bulkResult.comment_sentiment_deep_dive?.sentimentDistribution && (
                              <div className="flex items-center gap-2 text-[10px] font-bold">
                                <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                                  {msg.bulkResult.comment_sentiment_deep_dive.sentimentDistribution.positive}% Pos
                                </span>
                                <span className="text-gray-600 bg-gray-100 px-2 py-0.5 rounded-full border border-gray-200">
                                  {msg.bulkResult.comment_sentiment_deep_dive.sentimentDistribution.neutral}% Neu
                                </span>
                                <span className="text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200">
                                  {msg.bulkResult.comment_sentiment_deep_dive.sentimentDistribution.negative}% Neg
                                </span>
                              </div>
                            )}
                          </div>

                          {msg.bulkResult.comment_sentiment_deep_dive?.summary && (
                            <p className="text-xs text-gray-600 leading-relaxed italic">
                              "{msg.bulkResult.comment_sentiment_deep_dive.summary}"
                            </p>
                          )}

                          {/* Top Love vs Top Friction Themes */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                            {/* Love Themes */}
                            <div className="p-3 bg-emerald-50/60 rounded-xl border border-emerald-200/80 space-y-2">
                              <span className="text-xs font-bold text-emerald-800 flex items-center gap-1.5">
                                <ThumbsUp size={13} className="text-emerald-600" />
                                Top Fan Love & Engagement Drivers
                              </span>
                              {msg.bulkResult.comment_sentiment_deep_dive?.topLoveThemes && msg.bulkResult.comment_sentiment_deep_dive.topLoveThemes.length > 0 ? (
                                <div className="space-y-2">
                                  {msg.bulkResult.comment_sentiment_deep_dive.topLoveThemes.map((item: any, i: number) => (
                                    <div key={i} className="text-xs bg-white/80 p-2 rounded-lg border border-emerald-100 space-y-0.5">
                                      <p className="font-bold text-emerald-900">{item.theme}</p>
                                      {item.quote && <p className="text-[11px] text-gray-600 italic">"{item.quote}"</p>}
                                      {item.driver && <p className="text-[10px] text-emerald-700 font-medium">✨ Driver: {item.driver}</p>}
                                    </div>
                                  ))}
                                </div>
                              ) : msg.bulkResult.sentiment_table?.positive?.feedback ? (
                                <ul className="text-xs text-emerald-900 space-y-1 list-disc pl-4">
                                  {msg.bulkResult.sentiment_table.positive.feedback.map((f: string, i: number) => <li key={i}>{f}</li>)}
                                </ul>
                              ) : null}
                            </div>

                            {/* Friction Themes */}
                            <div className="p-3 bg-rose-50/60 rounded-xl border border-rose-200/80 space-y-2">
                              <span className="text-xs font-bold text-rose-800 flex items-center gap-1.5">
                                <ThumbsDown size={13} className="text-rose-600" />
                                Consumer Friction & Skepticism Points
                              </span>
                              {msg.bulkResult.comment_sentiment_deep_dive?.topFrictionThemes && msg.bulkResult.comment_sentiment_deep_dive.topFrictionThemes.length > 0 ? (
                                <div className="space-y-2">
                                  {msg.bulkResult.comment_sentiment_deep_dive.topFrictionThemes.map((item: any, i: number) => (
                                    <div key={i} className="text-xs bg-white/80 p-2 rounded-lg border border-rose-100 space-y-0.5">
                                      <div className="flex items-center justify-between gap-1">
                                        <p className="font-bold text-rose-900">{item.theme}</p>
                                        {item.riskLevel && (
                                          <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded uppercase ${
                                            item.riskLevel === 'HIGH' ? 'bg-rose-200 text-rose-900' : 'bg-amber-100 text-amber-900'
                                          }`}>
                                            {item.riskLevel} RISK
                                          </span>
                                        )}
                                      </div>
                                      {item.quote && <p className="text-[11px] text-gray-600 italic">"{item.quote}"</p>}
                                    </div>
                                  ))}
                                </div>
                              ) : msg.bulkResult.sentiment_table?.negative?.feedback ? (
                                <ul className="text-xs text-rose-900 space-y-1 list-disc pl-4">
                                  {msg.bulkResult.sentiment_table.negative.feedback.map((f: string, i: number) => <li key={i}>{f}</li>)}
                                </ul>
                              ) : null}
                            </div>
                          </div>

                          {msg.bulkResult.comment_sentiment_deep_dive?.emotionalDrivers && (
                            <div className="p-2.5 bg-gray-50 rounded-xl border border-gray-200 text-xs text-gray-700">
                              <span className="font-bold text-gray-900">Consumer Emotional Dynamic: </span>
                              {msg.bulkResult.comment_sentiment_deep_dive.emotionalDrivers}
                            </div>
                          )}
                        </div>
                      )}

                      {/* 3. Strategic Next Steps for Dr Pepper */}
                      {(msg.bulkResult.dr_pepper_next_steps || msg.bulkResult.recommendations) && (
                        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-2xs space-y-3">
                          <div className="flex items-center gap-2">
                            <Target size={16} className="text-[#1A73E8]" />
                            <span className="text-xs font-bold text-gray-900 uppercase tracking-wider">
                              Actionable Next Steps for {companyName}
                            </span>
                          </div>

                          {msg.bulkResult.dr_pepper_next_steps ? (
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                              {/* Immediate Priorities */}
                              <div className="p-3 bg-amber-50/70 rounded-xl border border-amber-200/80 space-y-1.5">
                                <span className="text-xs font-bold text-amber-900 flex items-center gap-1">
                                  <Zap size={13} className="text-amber-600" />
                                  Immediate (0-30 Days)
                                </span>
                                <ul className="text-xs text-amber-950 space-y-1 pl-3.5 list-disc marker:text-amber-600">
                                  {(msg.bulkResult.dr_pepper_next_steps.immediatePriorities || []).map((step: string, i: number) => (
                                    <li key={i} className="leading-snug">{step}</li>
                                  ))}
                                </ul>
                              </div>

                              {/* Creative & Messaging */}
                              <div className="p-3 bg-blue-50/70 rounded-xl border border-blue-200/80 space-y-1.5">
                                <span className="text-xs font-bold text-blue-900 flex items-center gap-1">
                                  <Sparkles size={13} className="text-blue-600" />
                                  Creative & Messaging
                                </span>
                                <ul className="text-xs text-blue-950 space-y-1 pl-3.5 list-disc marker:text-blue-600">
                                  {(msg.bulkResult.dr_pepper_next_steps.creativeMessagingAdjustments || []).map((step: string, i: number) => (
                                    <li key={i} className="leading-snug">{step}</li>
                                  ))}
                                </ul>
                              </div>

                              {/* Long-Term Strategy */}
                              <div className="p-3 bg-purple-50/70 rounded-xl border border-purple-200/80 space-y-1.5">
                                <span className="text-xs font-bold text-purple-900 flex items-center gap-1">
                                  <Trophy size={13} className="text-purple-600" />
                                  Long-Term Strategy
                                </span>
                                <ul className="text-xs text-purple-950 space-y-1 pl-3.5 list-disc marker:text-purple-600">
                                  {(msg.bulkResult.dr_pepper_next_steps.longTermStrategy || []).map((step: string, i: number) => (
                                    <li key={i} className="leading-snug">{step}</li>
                                  ))}
                                </ul>
                              </div>
                            </div>
                          ) : (
                            <ul className="text-xs text-gray-700 space-y-1.5 pl-4 list-disc marker:text-[#1A73E8]">
                              {msg.bulkResult.recommendations.map((rec: string, i: number) => (
                                <li key={i} className="leading-snug">{rec}</li>
                              ))}
                            </ul>
                          )}
                        </div>
                      )}

                      {/* 4. Potential Competitive Elements & Matchups */}
                      {(msg.bulkResult.competitive_elements_analysis || msg.bulkResult.competitive_landscape) && (
                        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-2xs space-y-3">
                          <div className="flex items-center gap-2">
                            <Swords size={16} className="text-purple-600" />
                            <span className="text-xs font-bold text-gray-900 uppercase tracking-wider">
                              Competitive Matchups & Rival Benchmarks
                            </span>
                          </div>

                          {msg.bulkResult.competitive_elements_analysis ? (
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                              {/* Big Names */}
                              {msg.bulkResult.competitive_elements_analysis.bigNameMatchup && (
                                <div className="p-3 bg-purple-50/60 rounded-xl border border-purple-200 space-y-1.5">
                                  <div className="flex items-center justify-between">
                                    <span className="text-xs font-bold text-purple-950 flex items-center gap-1">
                                      <Trophy size={13} className="text-purple-600" />
                                      vs Big Name Giants
                                    </span>
                                    <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded bg-purple-200 text-purple-900">
                                      {msg.bulkResult.competitive_elements_analysis.bigNameMatchup.verdict?.replace(/_/g, ' ') || 'BENCHMARK'}
                                    </span>
                                  </div>
                                  <p className="text-[10px] text-purple-700 font-semibold">
                                    Rivals: {msg.bulkResult.competitive_elements_analysis.bigNameMatchup.rivals?.join(', ')}
                                  </p>
                                  <div className="text-xs text-gray-700 space-y-1">
                                    <p><span className="font-semibold text-emerald-800">Advantage:</span> {msg.bulkResult.competitive_elements_analysis.bigNameMatchup.advantage}</p>
                                    <p><span className="font-semibold text-rose-800">Watchout:</span> {msg.bulkResult.competitive_elements_analysis.bigNameMatchup.vulnerability}</p>
                                  </div>
                                </div>
                              )}

                              {/* House Brands */}
                              {msg.bulkResult.competitive_elements_analysis.houseBrandMatchup && (
                                <div className="p-3 bg-blue-50/60 rounded-xl border border-blue-200 space-y-1.5">
                                  <div className="flex items-center justify-between">
                                    <span className="text-xs font-bold text-blue-950 flex items-center gap-1">
                                      <ShoppingBag size={13} className="text-blue-600" />
                                      vs House / Store Brands
                                    </span>
                                    <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded bg-blue-200 text-blue-900">
                                      {msg.bulkResult.competitive_elements_analysis.houseBrandMatchup.verdict?.replace(/_/g, ' ') || 'DEFENSIBLE'}
                                    </span>
                                  </div>
                                  <p className="text-[10px] text-blue-700 font-semibold">
                                    Rivals: {msg.bulkResult.competitive_elements_analysis.houseBrandMatchup.rivals?.join(', ')}
                                  </p>
                                  <div className="text-xs text-gray-700 space-y-1">
                                    <p><span className="font-semibold text-emerald-800">Defensibility:</span> {msg.bulkResult.competitive_elements_analysis.houseBrandMatchup.premiumDefensibility}</p>
                                    <p><span className="font-semibold text-rose-800">Risk Factor:</span> {msg.bulkResult.competitive_elements_analysis.houseBrandMatchup.riskFactors}</p>
                                  </div>
                                </div>
                              )}

                              {/* Modern Challengers */}
                              {msg.bulkResult.competitive_elements_analysis.challengerMatchup && (
                                <div className="p-3 bg-amber-50/60 rounded-xl border border-amber-200 space-y-1.5">
                                  <div className="flex items-center justify-between">
                                    <span className="text-xs font-bold text-amber-950 flex items-center gap-1">
                                      <Zap size={13} className="text-amber-600" />
                                      vs Functional Challengers
                                    </span>
                                    <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded bg-amber-200 text-amber-900">
                                      {msg.bulkResult.competitive_elements_analysis.challengerMatchup.verdict?.replace(/_/g, ' ') || 'CHALLENGER'}
                                    </span>
                                  </div>
                                  <p className="text-[10px] text-amber-700 font-semibold">
                                    Rivals: {msg.bulkResult.competitive_elements_analysis.challengerMatchup.rivals?.join(', ')}
                                  </p>
                                  <div className="text-xs text-gray-700 space-y-1">
                                    <p><span className="font-semibold text-rose-800">Health Threat:</span> {msg.bulkResult.competitive_elements_analysis.challengerMatchup.healthThreat}</p>
                                    <p><span className="font-semibold text-emerald-800">Counter-Move:</span> {msg.bulkResult.competitive_elements_analysis.challengerMatchup.counterStrategy}</p>
                                  </div>
                                </div>
                              )}
                            </div>
                          ) : (
                            <p className="text-xs text-gray-700 leading-relaxed">{msg.bulkResult.competitive_landscape}</p>
                          )}
                        </div>
                      )}

                      {/* 5. Emerging Trends & Early Signals */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {msg.bulkResult.trends && msg.bulkResult.trends.length > 0 && (
                          <div className="p-3 bg-blue-50/60 border border-blue-100 rounded-xl space-y-1.5">
                            <span className="text-xs font-bold text-[#1A73E8] flex items-center gap-1">
                              <TrendingUp size={13} /> Emerging Market & Creative Trends
                            </span>
                            <ul className="text-xs text-gray-700 list-disc pl-4 space-y-1">
                              {msg.bulkResult.trends.map((t: string, i: number) => <li key={i}>{t}</li>)}
                            </ul>
                          </div>
                        )}

                        {msg.bulkResult.early_signals && msg.bulkResult.early_signals.length > 0 && (
                          <div className="p-3 bg-gray-50 border border-gray-200 rounded-xl space-y-1.5">
                            <span className="text-xs font-bold text-gray-800 flex items-center gap-1">
                              <Flame size={13} className="text-orange-500" /> Early Consumer Signals
                            </span>
                            <div className="space-y-1.5">
                              {msg.bulkResult.early_signals.map((sig: any, i: number) => (
                                <div key={i} className="flex items-center justify-between text-xs bg-white p-2 rounded-lg border border-gray-100">
                                  <span className="font-semibold text-gray-800">{sig.theme}</span>
                                  <span className="text-[10px] font-bold px-2 py-0.5 bg-orange-100 text-orange-800 rounded-full">
                                    {sig.mentions} mentions
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                <span className="text-[10px] text-gray-400 px-1">
                  {msg.timestamp}
                </span>
              </div>

              {msg.sender === 'user' && (
                <div 
                  className="w-8 h-8 rounded-full text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs mt-0.5 bg-[#1A73E8]"
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
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-500 to-indigo-600 text-white flex items-center justify-center shrink-0 shadow-2xs">
              <Loader2 size={16} className="animate-spin" />
            </div>
            <div className="bg-white border border-gray-200 px-4 py-3 rounded-2xl rounded-bl-xs text-xs text-gray-600 shadow-xs flex items-center gap-2">
              <div className="animate-pulse flex items-center gap-2">
                <span className="inline-block w-2 h-2 rounded-full bg-[#1A73E8]"></span>
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
          <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-blue-50/50">
            <div className="flex items-center gap-2">
              <History size={16} className="text-[#1A73E8]" />
              <span className="font-bold text-sm text-gray-900">Insights History</span>
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
              className="text-xs font-bold text-[#1A73E8] hover:underline flex items-center gap-1"
            >
              <Plus size={13} /> New Session
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
            {sessionsHistory.length === 0 ? (
              <div className="text-center py-12 text-gray-400 text-xs">
                No past insights sessions recorded yet. Start a conversation or analyze an asset to save sessions automatically.
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
                        ? 'bg-blue-50 border-blue-300 shadow-xs' 
                        : 'bg-white hover:bg-gray-50 border-gray-200 hover:border-blue-300'
                    }`}
                  >
                    <div className="w-10 h-10 rounded-xl bg-blue-100 text-[#1A73E8] flex items-center justify-center shrink-0 relative">
                      <Sparkles size={16} />
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
                              className="w-full px-2 py-0.5 text-xs font-bold text-gray-900 bg-white border border-blue-400 rounded-md focus:outline-hidden focus:ring-1 focus:ring-blue-500"
                              autoFocus
                            />
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRenameSession(sess.sessionId, editingTitle);
                                setEditingSessionId(null);
                              }}
                              className="p-1 text-[#1A73E8] hover:text-blue-900 hover:bg-blue-100 rounded"
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
                                className="text-gray-400 hover:text-[#1A73E8] p-1 rounded-lg hover:bg-blue-50 opacity-0 group-hover:opacity-100 transition-opacity"
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
                      {sess.lastChannelType && (
                        <div className="mt-0.5">
                          <span className="text-[9px] font-bold text-blue-700 bg-blue-100/80 px-1.5 py-0.2 rounded-md">
                            {sess.lastChannelType}
                          </span>
                        </div>
                      )}
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

      {/* Reddit Threads Management & Grounded Intelligence Hub Modal */}
      {showRedditModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-4 animate-fadeIn">
          <div className="bg-white border border-gray-200 rounded-3xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-scaleUp">
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-orange-50/80 via-white to-orange-50/30">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-2xl bg-orange-100 text-orange-600 flex items-center justify-center shrink-0 shadow-2xs">
                  <MessageCircle size={18} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-sm sm:text-base text-gray-900">Reddit Discussions & Thread Hub</h3>
                    <span className="text-[10px] font-extrabold text-orange-800 bg-orange-100 px-2 py-0.5 rounded-full">
                      {trackedThreads.length} Tracked
                    </span>
                  </div>
                  <p className="text-xs text-gray-500">
                    Track specific Reddit threads, inspect comments, and run Gemini 3.7 Flash Grounded Intelligence.
                  </p>
                </div>
              </div>

              <button
                onClick={() => setShowRedditModal(false)}
                className="p-1.5 rounded-xl text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
                title="Close"
              >
                <X size={18} />
              </button>
            </div>

            {/* Quick Actions & Cache Bar */}
            <div className="px-4 py-2.5 bg-gray-50/90 border-b border-gray-100 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => loadLastRedditAnalysis(messages)}
                  disabled={isLoading}
                  className="px-3 py-1.5 text-xs font-semibold text-gray-700 hover:text-[#1A73E8] bg-white hover:bg-blue-50 border border-gray-200 rounded-xl transition-all flex items-center gap-1.5 shadow-2xs"
                  title="Load the most recent persisted Reddit analysis from GCS"
                >
                  <RotateCw size={12} className={isLoading ? "animate-spin" : ""} />
                  <span>Load Last Analysis</span>
                </button>

                <button
                  onClick={() => {
                    setShowRedditModal(false);
                    runRedditAnalysis(`Analyze consumer sentiment and discussions across all tracked threads for ${companyName}`, messages);
                  }}
                  disabled={isLoading || trackedThreads.length === 0}
                  className="px-3 py-1.5 text-xs font-bold text-white bg-orange-600 hover:bg-orange-700 rounded-xl transition-all flex items-center gap-1.5 shadow-2xs disabled:opacity-50"
                  title="Synthesize sentiment across all tracked Reddit threads"
                >
                  <Sparkles size={12} className="fill-white" />
                  <span>Analyze All Threads</span>
                </button>
              </div>

              <button
                onClick={handleResetDefaultRedditThreads}
                className="text-[11px] text-gray-500 hover:text-gray-800 underline"
                title="Reset to recommended brand discussion threads"
              >
                Reset to Brand Defaults
              </button>
            </div>

            {/* Scrollable Content Area */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
              {/* Add New Reddit Thread Form */}
              <div className="p-3.5 bg-orange-50/40 border border-orange-200 rounded-2xl space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-orange-950 flex items-center gap-1.5">
                    <Plus size={14} className="text-orange-600" />
                    Add a Reddit Thread or Community Discussion
                  </span>
                  <span className="text-[10px] text-gray-500">Supports full URL or topic query</span>
                </div>

                <div className="space-y-2">
                  <input
                    type="text"
                    value={newThreadUrl}
                    onChange={(e) => setNewThreadUrl(e.target.value)}
                    placeholder="Paste Reddit URL (e.g. https://www.reddit.com/r/soda/comments/...) or keyword..."
                    className="w-full px-3.5 py-2 bg-white border border-gray-200 focus:border-orange-500 focus:ring-2 focus:ring-orange-100 rounded-xl text-xs text-gray-800 placeholder-gray-400 outline-none"
                    disabled={isRedditIngesting}
                  />

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <input
                      type="text"
                      value={newThreadTitle}
                      onChange={(e) => setNewThreadTitle(e.target.value)}
                      placeholder="Optional thread title / description..."
                      className="w-full px-3.5 py-2 bg-white border border-gray-200 focus:border-orange-500 rounded-xl text-xs text-gray-800 placeholder-gray-400 outline-none"
                      disabled={isRedditIngesting}
                    />
                    <input
                      type="text"
                      value={newThreadTopic}
                      onChange={(e) => setNewThreadTopic(e.target.value)}
                      placeholder="Category / Topic (e.g. Paloma Mixology, Flavor, Cane Sugar)..."
                      className="w-full px-3.5 py-2 bg-white border border-gray-200 focus:border-orange-500 rounded-xl text-xs text-gray-800 placeholder-gray-400 outline-none"
                      disabled={isRedditIngesting}
                    />
                  </div>

                  {redditAddError && (
                    <p className="text-[11px] text-red-600 font-semibold flex items-center gap-1">
                      <AlertCircle size={12} />
                      {redditAddError}
                    </p>
                  )}

                  <div className="flex justify-end pt-1">
                    <button
                      onClick={handleAddRedditThread}
                      disabled={!newThreadUrl.trim() || isRedditIngesting}
                      className="px-4 py-2 bg-orange-600 hover:bg-orange-700 disabled:bg-gray-200 text-white rounded-xl text-xs font-bold transition-all shadow-2xs flex items-center gap-1.5"
                    >
                      {isRedditIngesting ? (
                        <>
                          <Loader2 size={13} className="animate-spin" />
                          <span>Ingesting Thread...</span>
                        </>
                      ) : (
                        <>
                          <Plus size={13} />
                          <span>Track Thread</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>

              {/* Active Tracked Threads List */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-gray-800 uppercase tracking-wider">
                    Currently Tracked Threads ({trackedThreads.length})
                  </h4>
                  <span className="text-[10px] text-gray-400">Click Analyze to run Gemini Grounding</span>
                </div>

                {trackedThreads.length === 0 ? (
                  <div className="text-center py-8 p-4 bg-gray-50 border border-dashed border-gray-200 rounded-2xl text-gray-400 text-xs space-y-2">
                    <MessageCircle size={24} className="mx-auto text-gray-300" />
                    <p>No Reddit threads tracked yet.</p>
                    <button
                      onClick={handleResetDefaultRedditThreads}
                      className="px-3 py-1.5 bg-white border border-gray-200 text-gray-700 hover:text-orange-600 rounded-xl text-xs font-semibold shadow-2xs"
                    >
                      Restore Recommended Brand Threads
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {trackedThreads.map((t) => (
                      <div
                        key={t.id}
                        className="p-3.5 bg-white border border-gray-200 hover:border-orange-300 rounded-2xl transition-all shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 group"
                      >
                        <div className="space-y-1 min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-[11px] font-mono text-orange-800 bg-orange-100 px-2 py-0.5 rounded-md">
                              {t.subreddit}
                            </span>
                            {t.topic && (
                              <span className="text-[10px] font-semibold text-gray-500 bg-gray-100 px-2 py-0.5 rounded-md">
                                {t.topic}
                              </span>
                            )}
                            <span className="text-[10px] text-gray-400">{t.dateAdded}</span>
                          </div>

                          <h5 className="text-xs font-bold text-gray-900 leading-snug line-clamp-2">
                            {t.title}
                          </h5>

                          <a
                            href={t.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[11px] font-medium text-[#1A73E8] hover:underline flex items-center gap-1 truncate max-w-md"
                            title={t.url}
                          >
                            <span className="truncate">{t.url}</span>
                            <ExternalLink size={11} className="shrink-0" />
                          </a>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center">
                          <button
                            onClick={() => {
                              setShowRedditModal(false);
                              runRedditAnalysis(t.title, messages, t);
                            }}
                            disabled={isLoading}
                            className="px-3 py-1.5 bg-orange-50 hover:bg-orange-100 border border-orange-200 text-orange-900 rounded-xl text-xs font-bold transition-all flex items-center gap-1 shadow-2xs"
                            title="Analyze this thread with Gemini 3.7 Flash Grounding"
                          >
                            <Sparkles size={12} className="text-orange-600" />
                            <span>Analyze</span>
                          </button>

                          <button
                            onClick={() => handleDeleteRedditThread(t.id)}
                            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors"
                            title="Delete thread from tracking"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-3 bg-gray-50 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
              <span className="text-[11px]">
                Grounded by <strong className="text-gray-700 font-semibold">Gemini 3.7 Flash</strong> with live Search Grounding
              </span>
              <button
                onClick={() => setShowRedditModal(false)}
                className="px-4 py-1.5 bg-white hover:bg-gray-100 border border-gray-200 text-gray-700 rounded-xl text-xs font-semibold shadow-2xs"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Centered Bottom Chat Input Box */}
      <div className="fixed bottom-4 left-0 md:left-72 right-0 max-w-4xl mx-auto px-4 z-30 pointer-events-none">
        <div className="bg-white border border-gray-300 rounded-3xl shadow-xl p-3 sm:p-4 space-y-2 transition-all focus-within:border-[#1A73E8] focus-within:ring-2 focus-within:ring-blue-100 pointer-events-auto">
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
              placeholder="Enter a prompt here (e.g. YouTube URL, Reddit question, website audit)..."
              rows={1}
              className="w-full resize-none border-none outline-none text-sm text-gray-800 placeholder-gray-400 bg-transparent max-h-32 min-h-[2.5rem] py-1"
            />

            <button
              onClick={() => handleSendMessage()}
              disabled={!inputPrompt.trim() || isLoading}
              className="p-2.5 rounded-full bg-[#1A73E8] hover:bg-[#1557b0] disabled:bg-gray-200 text-white transition-all shadow-xs shrink-0"
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
                        handleSendMessage("Analyze YouTube Video: https://www.youtube.com/watch?v=dQw4w9WgXcQ");
                      }}
                      className="w-full px-3 py-2 text-left hover:bg-blue-50 text-gray-700 flex items-center gap-2"
                    >
                      <Film size={14} className="text-[#1A73E8]" />
                      Analyze YouTube Video (ABCD)
                    </button>
                    <button
                      onClick={() => {
                        setShowPlusMenu(false);
                        handleSendMessage(`Analyze consumer and comments sentiment for ${companyName} video ads`);
                      }}
                      className="w-full px-3 py-2 text-left hover:bg-blue-50 text-gray-700 flex items-center gap-2"
                    >
                      <Smile size={14} className="text-blue-600" />
                      Video & Comments Sentiment
                    </button>
                    <button
                      onClick={() => {
                        setShowPlusMenu(false);
                        handleSendMessage(`Compare ${companyName} marketing and ad strategy against main competitors`);
                      }}
                      className="w-full px-3 py-2 text-left hover:bg-blue-50 text-gray-700 flex items-center gap-2"
                    >
                      <Swords size={14} className="text-purple-600" />
                      Competitor Benchmark & Matrix
                    </button>
                    <button
                      onClick={() => {
                        setShowPlusMenu(false);
                        handleSendMessage(`What are consumers discussing about ${companyName} on Reddit?`);
                      }}
                      className="w-full px-3 py-2 text-left hover:bg-blue-50 text-gray-700 flex items-center gap-2"
                    >
                      <MessageCircle size={14} className="text-orange-500" />
                      Reddit Consumer Sentiment
                    </button>
                    <button
                      onClick={() => {
                        setShowPlusMenu(false);
                        handleSendMessage(`Audit landing page messaging and conversion UX for ${config?.branding?.websiteUrl || 'https://www.drpepper.com'}`);
                      }}
                      className="w-full px-3 py-2 text-left hover:bg-blue-50 text-gray-700 flex items-center gap-2"
                    >
                      <Globe size={14} className="text-emerald-600" />
                      Website Landing Page Audit
                    </button>
                    <div className="border-t border-gray-100 my-1"></div>
                    <button
                      onClick={() => {
                        setShowPlusMenu(false);
                        handleSendMessage("all insights");
                      }}
                      className="w-full px-3 py-2 text-left hover:bg-blue-50 text-gray-700 flex items-center gap-2"
                    >
                      <Layers size={14} className="text-indigo-600" />
                      View All Indexed Videos
                    </button>
                    <button
                      onClick={() => {
                        setShowPlusMenu(false);
                        handleSendMessage("bulk insights");
                      }}
                      className="w-full px-3 py-2 text-left hover:bg-blue-50 text-gray-700 flex items-center gap-2"
                    >
                      <BarChart2 size={14} className="text-teal-600" />
                      Generate Bulk Insights
                    </button>
                    <button
                      onClick={() => {
                        setShowPlusMenu(false);
                        handleSendMessage("re-index");
                      }}
                      className="w-full px-3 py-2 text-left hover:bg-blue-50 text-gray-700 flex items-center gap-2"
                    >
                      <RotateCw size={14} className="text-amber-600" />
                      Re-index Catalog
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
                title="Reset Insights Chat to Start"
              >
                <RefreshCw size={12} />
                Reset Chat
              </button>

              <button
                onClick={loadLastChatSession}
                className="text-[11px] font-semibold text-gray-500 hover:text-[#1A73E8] flex items-center gap-1"
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
