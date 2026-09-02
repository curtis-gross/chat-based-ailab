import React, { useState, useEffect, useRef } from 'react';
import { 
  Palette, 
  Send, 
  Plus, 
  Upload, 
  Image as ImageIcon, 
  Video as VideoIcon,
  Sparkles, 
  CheckCircle2, 
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
  Wand2, 
  Layers, 
  Scissors, 
  Maximize2,
  Trash2,
  History,
  Clock,
  ArrowRight,
  FolderHeart,
  X,
  Play,
  Film,
  Clapperboard,
  Table,
  Pencil,
  Check,
  Star,
  Pin
} from 'lucide-react';
import { useCompanyContext } from '../context/CompanyContext';
import { useAppConfig } from '../context/AppConfigContext';
import { 
  generateImageWithReference, 
  saveImageToGCS, 
  editOmniVideo, 
  generateOmniVideo, 
  detectImageAspectRatio,
  callGenAiProxy,
  extractTextFromResponse,
  safeJsonParse,
  generateAssetMetadata,
  saveAssetToCatalog,
  loadCreativeCatalog,
  queryCreativeCatalogWithGemini,
  CreativeCatalogItem,
  CreativeCatalogStore,
  VideoStoryboard,
  StoryboardScene,
  SceneVisualItem,
  generateVideoStoryboard,
  generateStoryboardSceneImages,
  regenerateSingleSceneImage,
  generateOmniStoryboardVideo
} from '../services/geminiService';

const ASPECT_RATIO_CONFIGS = [
  { label: "1:1 (Square)", ratio: "1:1" },
  { label: "4:3 (Classic)", ratio: "4:3" },
  { label: "16:9 (Landscape)", ratio: "16:9" },
  { label: "9:16 (Vertical Story)", ratio: "9:16" },
  { label: "3:2 (Standard)", ratio: "3:2" },
  { label: "2:3 (Portrait)", ratio: "2:3" },
  { label: "4:5 (Social Feed)", ratio: "4:5" },
  { label: "5:4 (Social)", ratio: "5:4" },
  { label: "21:9 (Cinematic Banner)", ratio: "21:9" }
];

export const buildAspectRatioPrompt = (companyName: string, ratio: string, label?: string): string => `
CRITICAL INSTRUCTION: Reframe and adapt the canvas of the provided reference image for ${companyName} to fill the target aspect ratio.

1. ZERO PRODUCT MODIFICATION (KEEP ONLY ORIGINAL PRODUCTS):
- Keep ONLY the exact original products present in the reference image.
- Do NOT add any new products, bottles, cans, packs, glasses, props, or items.
- Do NOT remove or delete any products that are present in the reference image.
- Preserve 100% of the original product shape, geometry, colors, packaging, and label details.

2. ZERO TEXT OR TAGLINE MODIFICATION (DO NOT ADD OR REMOVE ANY TEXT):
- Do NOT add any new text, words, taglines, slogans, copy, prices, captions, or typography.
- Do NOT remove, alter, or obscure any existing text, logos, or typography present in the reference image.
- Maintain all existing text and logos exactly as they appear in the original image.

3. CANVAS & BACKGROUND EXPANSION ONLY:
- Extend, outpaint, and seamlessly continue the natural background environment, lighting, texture, and atmosphere of the reference image to fill the canvas.
- The lighting, shadows, reflections, and color grading must match the original reference image seamlessly.
`;

export interface CreativeGalleryItem {
  id: string;
  urlOrBase64: string;
  title: string;
  type: 'uploaded' | 'aspect_ratio' | 'edited' | 'uploaded_video' | 'edited_video';
  timestamp: string;
  editPrompt?: string;
  ratio?: string;
  mediaType?: 'image' | 'video';
}

export interface CreativeSessionSummary {
  sessionId: string;
  title: string;
  timestamp: string;
  messageCount: number;
  previewImage?: string;
  previewVideo?: string;
  currentReferenceImage?: string | null;
  currentReferenceVideo?: string | null;
  isPinned?: boolean;
  messages: CreativeChatMessage[];
}

export interface CreativeChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  timestamp: string;
  text?: string;
  uploadedImageBase64?: string;
  uploadedVideoUrlOrBase64?: string;
  aspectRatioResults?: { [ratio: string]: string | null };
  editedImageResult?: {
    originalImage: string;
    editedImage: string;
    editPrompt: string;
  };
  editedVideoResult?: {
    originalVideo: string;
    editedVideo: string;
    editPrompt: string;
    aspectRatio?: string;
  };
  videoStoryboard?: VideoStoryboard;
  sceneVisualsResult?: {
    storyboard: VideoStoryboard;
    scenes: SceneVisualItem[];
  };
  catalogResults?: {
    explanation: string;
    matchedAssets: CreativeCatalogItem[];
  };
  clarifyingOptions?: {
    question: string;
    options: { label: string; action: string; payload?: any }[];
  };
  error?: string;
}

const formatImageSrc = (src?: string | null): string => {
  if (!src) return '';
  if (src.startsWith('data:') || src.startsWith('blob:')) {
    return src;
  }
  // Validate if it is a genuine URL (length < 1000 and valid prefix)
  if ((src.startsWith('http://') || src.startsWith('https://') || src.startsWith('/') || src.startsWith('./')) && src.length < 1000) {
    return src;
  }
  return `data:image/jpeg;base64,${src.replace(/^data:image\/\w+;base64,/, '')}`;
};

const formatVideoSrc = (src?: string | null): string => {
  if (!src) return '';
  if (src.startsWith('data:') || src.startsWith('blob:')) {
    return src;
  }
  if ((src.startsWith('http://') || src.startsWith('https://') || src.startsWith('/') || src.startsWith('./')) && src.length < 1000) {
    return src;
  }
  return `data:video/mp4;base64,${src.replace(/^data:video\/\w+;base64,/, '')}`;
};

const openImageInNewTab = (base64OrUrl: string) => {
  const formattedUrl = formatImageSrc(base64OrUrl);
  try {
    const newWindow = window.open();
    if (newWindow) {
      newWindow.document.write(`
        <html>
          <head>
            <title>Creative Preview</title>
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
            <img src="${formattedUrl}" alt="Creative Preview" />
          </body>
        </html>
      `);
      newWindow.document.close();
    }
  } catch (e) {
    window.open(formattedUrl, '_blank');
  }
};

export const CreativeChatAgent: React.FC = () => {
  const { name } = useCompanyContext();
  const { config } = useAppConfig();
  const companyName = config?.branding.companyName || name || 'Brand';

  const [inputPrompt, setInputPrompt] = useState('');
  const [messages, setMessages] = useState<CreativeChatMessage[]>([]);
  const [currentReferenceImage, setCurrentReferenceImage] = useState<string | null>(null);
  const [currentReferenceVideo, setCurrentReferenceVideo] = useState<string | null>(null);
  const [gallery, setGallery] = useState<CreativeGalleryItem[]>([]);
  const [sessionsHistory, setSessionsHistory] = useState<CreativeSessionSummary[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string>(`session_${Date.now()}`);
  
  const [showHistoryDrawer, setShowHistoryDrawer] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [showPlusMenu, setShowPlusMenu] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [hasLoadedLast, setHasLoadedLast] = useState(false);
  const [activeStoryboard, setActiveStoryboard] = useState<VideoStoryboard | null>(null);
  const [activeSceneVisuals, setActiveSceneVisuals] = useState<SceneVisualItem[]>([]);
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState<string>('');

  const sortSessions = (sessions: CreativeSessionSummary[]): CreativeSessionSummary[] => {
    return [...sessions].sort((a, b) => {
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      return 0;
    });
  };

  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading, statusMessage]);

  useEffect(() => {
    initCreativeAgent();
  }, []);

  // Initialize: load last active session, past uploaded gallery, and session history
  // Initialize: load last active session, past uploaded gallery, and session history
  const initCreativeAgent = async () => {
    try {
      // 1. Load Past Gallery Assets (Strictly Original Uploaded Assets Only)
      const galleryRes = await fetch(`/api/load-run/creative_agent_gallery?companyName=${encodeURIComponent(companyName)}`);
      if (galleryRes.ok) {
        const galData = await galleryRes.json();
        if (galData && Array.isArray(galData.items) && galData.items.length > 0) {
          // Filter strictly for original uploads (exclude generated aspect ratios or edited variants)
          const originalUploads = galData.items.filter((item: any) => 
            (item.type === 'uploaded' || item.type === 'uploaded_video') &&
            !item.title?.toLowerCase().includes('aspect ratio') &&
            !item.type?.includes('aspect') &&
            !item.type?.includes('edited')
          );
          setGallery(originalUploads);
        }
      }
    } catch (e) {
      console.warn("Could not load creative gallery:", e);
    }

    try {
      // 2. Load Sessions History List
      const historyRes = await fetch(`/api/load-run/creative_agent_history?companyName=${encodeURIComponent(companyName)}`);
      if (historyRes.ok) {
        const histData = await historyRes.json();
        if (histData && Array.isArray(histData.sessions) && histData.sessions.length > 0) {
          setSessionsHistory(histData.sessions);
        }
      }
    } catch (e) {
      console.warn("Could not load sessions history:", e);
    }

    try {
      // 3. Load Last Active Session
      const sessionRes = await fetch(`/api/load-run/creative_agent_session?companyName=${encodeURIComponent(companyName)}`);
      if (sessionRes.ok) {
        const sessData = await sessionRes.json();
        if (sessData && Array.isArray(sessData.messages) && sessData.messages.length > 0) {
          setMessages(sessData.messages);
          setHasLoadedLast(true);
          if (sessData.currentReferenceImage) {
            setCurrentReferenceImage(sessData.currentReferenceImage);
          }
          if (sessData.currentReferenceVideo) {
            setCurrentReferenceVideo(sessData.currentReferenceVideo);
          }
          if (sessData.sessionId) {
            setCurrentSessionId(sessData.sessionId);
          }
        }
      }
    } catch (e) {
      console.warn("Could not load last active session:", e);
    }
  };

  // Helper: Persist original uploaded gallery item to GCS
  const addGalleryItem = async (item: CreativeGalleryItem) => {
    // Only store genuine uploaded assets in the uploaded assets gallery
    if (item.type !== 'uploaded' && item.type !== 'uploaded_video') return;

    const updated = [item, ...gallery.filter(g => g.id !== item.id && (g.type === 'uploaded' || g.type === 'uploaded_video'))].slice(0, 30);
    setGallery(updated);
    try {
      await fetch(`/api/save-run/creative_agent_gallery`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyName,
          featureId: 'creative_agent_gallery',
          data: {
            items: updated,
            updatedAt: new Date().toISOString()
          }
        })
      });
    } catch (e) {
      console.error("Failed to persist gallery to GCS:", e);
    }
  };

  // Helper: Delete asset from uploaded gallery and GCS
  const handleDeleteGalleryItem = async (itemId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = gallery.filter(g => g.id !== itemId);
    setGallery(updated);
    try {
      await fetch(`/api/save-run/creative_agent_gallery`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyName,
          featureId: 'creative_agent_gallery',
          data: {
            items: updated,
            updatedAt: new Date().toISOString()
          }
        })
      });
    } catch (e) {
      console.error("Failed to delete gallery item from GCS:", e);
    }
  };

  // Helper: Persist session checkpoint to active session & history list in GCS
  const saveCreativeSession = async (
    currentMessages: CreativeChatMessage[], 
    refImg?: string | null,
    refVid?: string | null
  ) => {
    setIsSaving(true);
    const activeImg = refImg !== undefined ? refImg : currentReferenceImage;
    const activeVid = refVid !== undefined ? refVid : currentReferenceVideo;

    // Find preview image / video
    let previewImg = activeImg;
    let previewVid = activeVid;
    
    const lastWithAspect = [...currentMessages].reverse().find(m => m.aspectRatioResults);
    if (lastWithAspect && lastWithAspect.aspectRatioResults) {
      const firstRatio = Object.values(lastWithAspect.aspectRatioResults).find(v => !!v);
      if (firstRatio) previewImg = firstRatio;
    }
    const lastWithEdit = [...currentMessages].reverse().find(m => m.editedImageResult);
    if (lastWithEdit && lastWithEdit.editedImageResult) {
      previewImg = lastWithEdit.editedImageResult.editedImage;
    }
    const lastWithVideoEdit = [...currentMessages].reverse().find(m => m.editedVideoResult);
    if (lastWithVideoEdit && lastWithVideoEdit.editedVideoResult) {
      previewVid = lastWithVideoEdit.editedVideoResult.editedVideo;
    }

    const existingCurrent = sessionsHistory.find(s => s.sessionId === currentSessionId);
    const sessionTitle = existingCurrent?.title || (
      currentMessages.length > 0 && currentMessages[0].text
        ? currentMessages[0].text.slice(0, 45)
        : 'Creative Session'
    );
    const isPinned = existingCurrent?.isPinned || false;

    const sessionSummary: CreativeSessionSummary = {
      sessionId: currentSessionId,
      title: sessionTitle,
      timestamp: existingCurrent?.timestamp || new Date().toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
      messageCount: currentMessages.length,
      previewImage: previewImg || undefined,
      previewVideo: previewVid || undefined,
      currentReferenceImage: activeImg,
      currentReferenceVideo: activeVid,
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
      await fetch(`/api/save-run/creative_agent_session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyName,
          featureId: 'creative_agent_session',
          data: {
            sessionId: currentSessionId,
            messages: currentMessages,
            currentReferenceImage: activeImg,
            currentReferenceVideo: activeVid,
            savedAt: new Date().toISOString()
          }
        })
      });

      // 2. Save Sessions History
      await fetch(`/api/save-run/creative_agent_history`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyName,
          featureId: 'creative_agent_history',
          data: {
            sessions: updatedHistory,
            updatedAt: new Date().toISOString()
          }
        })
      });
    } catch (err) {
      console.error("Failed to save creative session:", err);
    } finally {
      setIsSaving(false);
    }
  };

  // Toggle Pin/Star status of a creative session
  const handleTogglePinSession = async (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updatedHistory = sortSessions(
      sessionsHistory.map(s => s.sessionId === sessionId ? { ...s, isPinned: !s.isPinned } : s)
    );
    setSessionsHistory(updatedHistory);

    try {
      await fetch(`/api/save-run/creative_agent_history`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyName,
          featureId: 'creative_agent_history',
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
      await fetch(`/api/save-run/creative_agent_history`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyName,
          featureId: 'creative_agent_history',
          data: {
            sessions: updatedHistory,
            updatedAt: new Date().toISOString()
          }
        })
      });
    } catch (err) {
      console.error("Failed to rename creative session in GCS:", err);
    }
  };

  // Restore a specific past session
  const restorePastSession = (session: CreativeSessionSummary) => {
    setCurrentSessionId(session.sessionId);
    setMessages(session.messages || []);
    setCurrentReferenceImage(session.currentReferenceImage || null);
    setCurrentReferenceVideo(session.currentReferenceVideo || null);
    setShowHistoryDrawer(false);
    setHasLoadedLast(true);
    saveCreativeSession(session.messages, session.currentReferenceImage, session.currentReferenceVideo);
  };

  // Delete a past session from history
  const handleDeleteSession = async (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updatedHistory = sessionsHistory.filter(s => s.sessionId !== sessionId);
    setSessionsHistory(updatedHistory);

    try {
      await fetch(`/api/save-run/creative_agent_history`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyName,
          featureId: 'creative_agent_history',
          data: {
            sessions: updatedHistory,
            updatedAt: new Date().toISOString()
          }
        })
      });
    } catch (err) {
      console.error("Failed to delete creative session from GCS:", err);
    }

    // If active session is deleted, reset the chat panel
    if (sessionId === currentSessionId) {
      handleResetChat();
    }
  };

  // Reset chat / start new creative session
  const handleResetChat = async () => {
    const newId = `session_${Date.now()}`;
    setCurrentSessionId(newId);
    setMessages([]);
    setCurrentReferenceImage(null);
    setCurrentReferenceVideo(null);
    setHasLoadedLast(false);
    setStatusMessage('');
    setIsLoading(false);

    try {
      await fetch(`/api/save-run/creative_agent_session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyName,
          featureId: 'creative_agent_session',
          data: {
            sessionId: newId,
            messages: [],
            currentReferenceImage: null,
            currentReferenceVideo: null,
            savedAt: new Date().toISOString()
          }
        })
      });
    } catch (err) {
      console.error("Failed to reset creative session:", err);
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
        savedUrl = await saveImageToGCS(base64, 'creative_upload', companyName);
      } catch (err) {
        console.warn("GCS save failed, using base64:", err);
      }

      const imgRef = savedUrl || base64;
      handleNewImageUploaded(imgRef, file.name);
    };
    reader.readAsDataURL(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Handle video upload from disk
  const handleVideoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = async () => {
      const raw = reader.result as string;
      handleNewVideoUploaded(raw, file.name);
    };
    reader.readAsDataURL(file);
    if (videoInputRef.current) videoInputRef.current.value = '';
  };

  // Ingest image & prompt user with clarifying choices
  const handleNewImageUploaded = (imageRef: string, fileName?: string) => {
    setCurrentReferenceImage(imageRef);

    // Save to past uploads gallery
    const galleryItem: CreativeGalleryItem = {
      id: `img_${Date.now()}`,
      urlOrBase64: imageRef,
      title: fileName || 'Uploaded Reference Asset',
      type: 'uploaded',
      mediaType: 'image',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    addGalleryItem(galleryItem);

    // Asynchronously generate Gemini 3.5 Flash metadata and persist to GCS Catalog
    (async () => {
      try {
        const metadata = await generateAssetMetadata(imageRef, 'upload', fileName || 'Uploaded Image', 'auto', companyName);
        const catalogItem: CreativeCatalogItem = {
          id: `asset_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
          url: imageRef,
          type: 'upload',
          mediaType: 'image',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          isoDate: new Date().toISOString(),
          query: fileName || 'Uploaded Image',
          aspectRatio: metadata.sizing || 'auto',
          metadata
        };
        await saveAssetToCatalog(catalogItem, companyName);
      } catch (catErr) {
        console.warn("Catalog indexing error on upload:", catErr);
      }
    })();

    const userUploadMsg: CreativeChatMessage = {
      id: `user_${Date.now()}`,
      sender: 'user',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      text: `Uploaded Image: ${fileName || 'Creative Reference Image'}`,
      uploadedImageBase64: imageRef
    };

    const assistantClarifyingMsg: CreativeChatMessage = {
      id: `assistant_${Date.now() + 1}`,
      sender: 'assistant',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      text: `I have received your image asset. What creative action would you like to perform?`,
      clarifyingOptions: {
        question: "Select an AI creative action:",
        options: [
          {
            label: "📐 Generate Multiple Aspect Ratios (9 Formats: 1:1, 16:9, 9:16, 4:3, etc.)",
            action: "generate_aspect_ratios",
            payload: { imageBase64: imageRef }
          },
          {
            label: "🎨 Edit / Restyle Image (Change background, elements, lighting, theme)",
            action: "prompt_for_edit",
            payload: { imageBase64: imageRef }
          },
          {
            label: "🎬 Animate Image to Video Motion (Gemini Omni Flash Preview)",
            action: "animate_image_to_video",
            payload: { imageBase64: imageRef }
          }
        ]
      }
    };

    const updated = [...messages, userUploadMsg, assistantClarifyingMsg];
    setMessages(updated);
    saveCreativeSession(updated, imageRef, currentReferenceVideo);
  };

  // Ingest video & prompt user with clarifying choices
  const handleNewVideoUploaded = (videoRef: string, fileName?: string) => {
    setCurrentReferenceVideo(videoRef);

    // Save to past uploads gallery
    const galleryItem: CreativeGalleryItem = {
      id: `vid_${Date.now()}`,
      urlOrBase64: videoRef,
      title: fileName || 'Uploaded Video Asset',
      type: 'uploaded_video',
      mediaType: 'video',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    addGalleryItem(galleryItem);

    const userUploadMsg: CreativeChatMessage = {
      id: `user_${Date.now()}`,
      sender: 'user',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      text: `Uploaded Video: ${fileName || 'Video Asset'}`,
      uploadedVideoUrlOrBase64: videoRef
    };

    const assistantClarifyingMsg: CreativeChatMessage = {
      id: `assistant_${Date.now() + 1}`,
      sender: 'assistant',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      text: `I have received your video. How would you like me to modify or edit this video with **Gemini Omni**?`,
      clarifyingOptions: {
        question: "Select a Video Editing Action:",
        options: [
          {
            label: "🎬 Transform Scene / Background (e.g., Change setting to autumn football tailgate)",
            action: "prompt_for_video_edit",
            payload: { videoRef, promptPreset: "Change the background to a sunny autumn football tailgate" }
          },
          {
            label: "✨ Commercial Lighting & Color Grade (e.g., Dramatic studio lighting with lens flares)",
            action: "prompt_for_video_edit",
            payload: { videoRef, promptPreset: "Enhance lighting to dramatic commercial studio spotlights with rich cinematic contrast" }
          },
          {
            label: "🥫 Product Integration / Flavor Swap (e.g., Insert cold Squirt Zero Sugar can)",
            action: "prompt_for_video_edit",
            payload: { videoRef, promptPreset: "Insert a cold crisp Squirt Zero Sugar can with condensation on the table" }
          }
        ]
      }
    };

    const updated = [...messages, userUploadMsg, assistantClarifyingMsg];
    setMessages(updated);
    saveCreativeSession(updated, currentReferenceImage, videoRef);
  };

  // Generate 9 Aspect Ratios for Reference Image (gemini-3.1-flash-lite-image)
  const runAspectRatioGeneration = async (imageBase64: string, currentMessages: CreativeChatMessage[]) => {
    setIsLoading(true);
    setStatusMessage('Generating 9 aspect ratio variations with Gemini 3.1 Flash Lite Image...');

    // Initialize blank results map
    const initialMap: { [ratio: string]: string | null } = {};
    ASPECT_RATIO_CONFIGS.forEach(c => { initialMap[c.ratio] = null; });

    const placeholderMsg: CreativeChatMessage = {
      id: `assistant_ratios_${Date.now()}`,
      sender: 'assistant',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      text: `Generating **9 Aspect Ratio Variations** adapted for social, display, and video banners:`,
      aspectRatioResults: initialMap
    };

    const threadWithPlaceholder = [...currentMessages, placeholderMsg];
    setMessages(threadWithPlaceholder);

    const updatedResults = { ...initialMap };

    try {
      // Run generation in parallel across all 9 ratios
      await Promise.all(
        ASPECT_RATIO_CONFIGS.map(async (cfg) => {
          try {
            const prompt = buildAspectRatioPrompt(companyName, cfg.ratio, cfg.label);
            const generatedUrlOrBase64 = await generateImageWithReference(
              prompt,
              [imageBase64],
              "image/jpeg",
              "gemini-3.1-flash-lite-image",
              cfg.ratio
            );
            if (generatedUrlOrBase64) {
              updatedResults[cfg.ratio] = generatedUrlOrBase64;
              setMessages(prev => prev.map(m => m.id === placeholderMsg.id ? { ...m, aspectRatioResults: { ...updatedResults } } : m));
            }
          } catch (err) {
            console.error(`Failed to generate ratio ${cfg.ratio}:`, err);
          }
        })
      );

      const finalMessages = threadWithPlaceholder.map(m => 
        m.id === placeholderMsg.id ? { ...m, aspectRatioResults: updatedResults } : m
      );
      setMessages(finalMessages);
      saveCreativeSession(finalMessages, imageBase64, currentReferenceVideo);

      // Persist aspect ratios to dedicated GCS folder
      try {
        await fetch(`/api/save-run/creative_aspect_ratios`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            companyName,
            featureId: 'creative_aspect_ratios',
            data: {
              aspectRatioResults: updatedResults,
              originalImage: imageBase64,
              savedAt: new Date().toISOString()
            }
          })
        });
      } catch (saveErr) {
        console.warn("Could not save aspect ratios run to GCS:", saveErr);
      }

    } catch (err: any) {
      console.error("Aspect ratio generation error:", err);
      const errorMsg: CreativeChatMessage = {
        id: `assistant_error_${Date.now()}`,
        sender: 'assistant',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        error: `Failed to complete aspect ratio generation: ${err.message || 'Check Gemini API Key.'}`
      };
      setMessages([...threadWithPlaceholder, errorMsg]);
    } finally {
      setIsLoading(false);
      setStatusMessage('');
    }
  };

  // Regenerate a single aspect ratio
  const regenerateSingleRatio = async (ratio: string, msgId: string, imageBase64: string) => {
    setIsLoading(true);
    setStatusMessage(`Regenerating aspect ratio ${ratio}...`);

    try {
      const prompt = buildAspectRatioPrompt(companyName, ratio);
      const regenerated = await generateImageWithReference(
        prompt,
        [imageBase64],
        "image/jpeg",
        "gemini-3.1-flash-lite-image",
        ratio
      );

      if (regenerated) {
        setMessages(prev => {
          const updated = prev.map(m => {
            if (m.id === msgId && m.aspectRatioResults) {
              return {
                ...m,
                aspectRatioResults: {
                  ...m.aspectRatioResults,
                  [ratio]: regenerated
                }
              };
            }
            return m;
          });
          saveCreativeSession(updated, imageBase64, currentReferenceVideo);
          return updated;
        });
      }
    } catch (err) {
      console.error(`Error regenerating ratio ${ratio}:`, err);
    } finally {
      setIsLoading(false);
      setStatusMessage('');
    }
  };

  // Edit Image with Prompt (gemini-3.1-flash-lite-image)
  const runImageEdit = async (editPrompt: string, imageBase64: string, currentMessages: CreativeChatMessage[]) => {
    setIsLoading(true);
    setStatusMessage(`Editing creative asset ("${editPrompt}")...`);

    try {
      // 1. Detect natural aspect ratio of input image automatically
      const autoAspect = await detectImageAspectRatio(imageBase64);

      // 2. Check if user explicitly asked for a specific aspect ratio in their edit prompt
      let targetRatio = autoAspect;
      const lower = editPrompt.toLowerCase();
      if (lower.includes('16:9') || lower.includes('landscape') || lower.includes('horizontal') || lower.includes('wide')) {
        targetRatio = '16:9';
      } else if (lower.includes('9:16') || lower.includes('vertical') || lower.includes('story') || lower.includes('reel') || lower.includes('tiktok')) {
        targetRatio = '9:16';
      } else if (lower.includes('1:1') || lower.includes('square')) {
        targetRatio = '1:1';
      } else if (lower.includes('4:3')) {
        targetRatio = '4:3';
      } else if (lower.includes('3:4')) {
        targetRatio = '3:4';
      } else if (lower.includes('3:2')) {
        targetRatio = '3:2';
      } else if (lower.includes('2:3')) {
        targetRatio = '2:3';
      } else if (lower.includes('4:5')) {
        targetRatio = '4:5';
      } else if (lower.includes('5:4')) {
        targetRatio = '5:4';
      } else if (lower.includes('21:9') || lower.includes('panoramic')) {
        targetRatio = '21:9';
      }

      const prompt = `
      Edit and transform the provided input image according to the following creative direction:
      "${editPrompt}"

      CRITICAL GUIDELINES:
      - Faithfully incorporate the requested edits while maintaining the product clarity, brand identity, and natural lighting.
      - Ensure photorealistic, commercial-grade rendering.
      - Maintain the original product composition, perspective, and aspect ratio (${targetRatio}).
      `;

      const editedResult = await generateImageWithReference(
        prompt,
        [imageBase64],
        "image/jpeg",
        "gemini-3.1-flash-lite-image",
        targetRatio
      );

      if (!editedResult) {
        throw new Error("Gemini Image generation returned an empty result.");
      }

      // Asynchronously generate Gemini 3.5 Flash metadata and persist to GCS Catalog
      (async () => {
        try {
          const metadata = await generateAssetMetadata(editedResult, 'edit', editPrompt, targetRatio, companyName);
          const catalogItem: CreativeCatalogItem = {
            id: `edit_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
            url: editedResult,
            type: 'edit',
            mediaType: 'image',
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            isoDate: new Date().toISOString(),
            query: editPrompt,
            aspectRatio: targetRatio,
            parentAssetUrl: imageBase64,
            metadata
          };
          await saveAssetToCatalog(catalogItem, companyName);
        } catch (catErr) {
          console.warn("Catalog indexing error on edit:", catErr);
        }
      })();

      const assistantMsg: CreativeChatMessage = {
        id: `assistant_edit_${Date.now()}`,
        sender: 'assistant',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        text: `Here is your edited creative variation for: *"**${editPrompt}**"*`,
        editedImageResult: {
          originalImage: imageBase64,
          editedImage: editedResult,
          editPrompt
        }
      };

      const updated = [...currentMessages, assistantMsg];
      setMessages(updated);
      saveCreativeSession(updated, imageBase64, currentReferenceVideo);

    } catch (err: any) {
      console.error("Image editing failed:", err);
      const errorMsg: CreativeChatMessage = {
        id: `assistant_error_${Date.now()}`,
        sender: 'assistant',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        error: `Image edit failed: ${err.message || 'Check Gemini API Key.'}`
      };
      const updated = [...currentMessages, errorMsg];
      setMessages(updated);
    } finally {
      setIsLoading(false);
      setStatusMessage('');
    }
  };

  // Video Editing with Gemini Omni Flash Preview
  const runVideoEdit = async (editPrompt: string, videoUrlOrB64: string, currentMessages: CreativeChatMessage[]) => {
    setIsLoading(true);
    setStatusMessage(`Modifying video with Gemini Omni ("${editPrompt}")...`);

    try {
      const editedVideoUrl = await editOmniVideo(videoUrlOrB64, editPrompt, "16:9");

      if (!editedVideoUrl) {
        throw new Error("Gemini Omni returned no video stream.");
      }

      // Index Video Edit in GCS Creative Catalog
      (async () => {
        try {
          const metadata = await generateAssetMetadata(videoUrlOrB64, 'video_edit', editPrompt, "16:9", companyName);
          const catalogItem: CreativeCatalogItem = {
            id: `vid_edit_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
            url: editedVideoUrl,
            type: 'video_edit',
            mediaType: 'video',
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            isoDate: new Date().toISOString(),
            query: editPrompt,
            aspectRatio: "16:9",
            parentAssetUrl: videoUrlOrB64,
            metadata
          };
          await saveAssetToCatalog(catalogItem, companyName);
        } catch (catErr) {
          console.warn("Catalog indexing error on video edit:", catErr);
        }
      })();

      const assistantMsg: CreativeChatMessage = {
        id: `assistant_vid_edit_${Date.now()}`,
        sender: 'assistant',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        text: `Here is your modified video transformed with **Gemini Omni** for *"**${editPrompt}**"*:`,
        editedVideoResult: {
          originalVideo: videoUrlOrB64,
          editedVideo: editedVideoUrl,
          editPrompt,
          aspectRatio: "16:9"
        }
      };

      const updated = [...currentMessages, assistantMsg];
      setMessages(updated);
      saveCreativeSession(updated, currentReferenceImage, editedVideoUrl);

    } catch (err: any) {
      console.error("Video editing failed:", err);
      const errorMsg: CreativeChatMessage = {
        id: `assistant_error_${Date.now()}`,
        sender: 'assistant',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        error: `Video edit failed: ${err.message || 'Check Gemini Omni access.'}`
      };
      const updated = [...currentMessages, errorMsg];
      setMessages(updated);
    } finally {
      setIsLoading(false);
      setStatusMessage('');
    }
  };

  // Animate Image to Video with Gemini Omni
  const runAnimateImageToVideo = async (imageBase64: string, currentMessages: CreativeChatMessage[], customPrompt?: string) => {
    setIsLoading(true);
    const motionPrompt = customPrompt || "A cinematic commercial panning motion shot of the product";
    setStatusMessage(`Generating video motion with Gemini Omni ("${motionPrompt}")...`);

    try {
      const generatedVideoUrl = await generateOmniVideo(imageBase64, motionPrompt);

      if (!generatedVideoUrl) {
        throw new Error("Gemini Omni returned no video stream.");
      }

      addGalleryItem({
        id: `vid_gen_${Date.now()}`,
        urlOrBase64: generatedVideoUrl,
        title: `Motion Video (${companyName})`,
        type: 'edited_video',
        mediaType: 'video',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      });

      // Index Generated Video in GCS Creative Catalog
      (async () => {
        try {
          const metadata = await generateAssetMetadata(imageBase64, 'image_to_video', motionPrompt, "16:9", companyName);
          const catalogItem: CreativeCatalogItem = {
            id: `omni_vid_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
            url: generatedVideoUrl,
            type: 'image_to_video',
            mediaType: 'video',
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            isoDate: new Date().toISOString(),
            query: motionPrompt,
            aspectRatio: "16:9",
            parentAssetUrl: imageBase64,
            metadata
          };
          await saveAssetToCatalog(catalogItem, companyName);
        } catch (catErr) {
          console.warn("Catalog indexing error on image to video:", catErr);
        }
      })();

      const assistantMsg: CreativeChatMessage = {
        id: `assistant_vid_${Date.now()}`,
        sender: 'assistant',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        text: `Generated video motion using **Gemini Omni** from your creative asset for *"**${motionPrompt}**"*:`,
        editedVideoResult: {
          originalVideo: imageBase64,
          editedVideo: generatedVideoUrl,
          editPrompt: motionPrompt,
          aspectRatio: "16:9"
        }
      };

      const updated = [...currentMessages, assistantMsg];
      setMessages(updated);
      saveCreativeSession(updated, imageBase64, generatedVideoUrl);

    } catch (err: any) {
      console.error("Animate image to video failed:", err);
      const errorMsg: CreativeChatMessage = {
        id: `assistant_error_${Date.now()}`,
        sender: 'assistant',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        error: `Video generation failed: ${err.message || 'Check Gemini Omni access.'}`
      };
      setMessages([...currentMessages, errorMsg]);
    } finally {
      setIsLoading(false);
      setStatusMessage('');
    }
  };

  // Step 3: Storyboard Generation (Gemini 3.7 Flash)
  const runGenerateStoryboard = async (
    userPrompt: string,
    refImage: string,
    currentMessages: CreativeChatMessage[],
    modificationFeedback?: string,
    prevStoryboard?: VideoStoryboard
  ) => {
    setIsLoading(true);
    setStatusMessage(`Synthesizing 10s commercial storyboard with Gemini 3.7 Flash...`);

    try {
      const storyboard = await generateVideoStoryboard(
        userPrompt,
        refImage,
        companyName,
        modificationFeedback,
        prevStoryboard
      );

      if (!storyboard || !storyboard.scenes || storyboard.scenes.length === 0) {
        throw new Error("Gemini returned an invalid storyboard structure.");
      }

      setActiveStoryboard(storyboard);

      const assistantMsg: CreativeChatMessage = {
        id: `assistant_sb_${Date.now()}`,
        sender: 'assistant',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        text: `Here is the **10-Second Commercial Storyboard** (${storyboard.scenes.length} Scenes) created for *"**${storyboard.title}**"*:`,
        videoStoryboard: storyboard,
        clarifyingOptions: {
          question: "How would you like to proceed with this storyboard?",
          options: [
            { label: "✅ Approve Storyboard & Generate Scene Images", action: "approve_storyboard", payload: { storyboard } },
            { label: "✏️ Modify Storyboard", action: "prompt_modify_storyboard", payload: { storyboard } }
          ]
        }
      };

      const updated = [...currentMessages, assistantMsg];
      setMessages(updated);
      saveCreativeSession(updated, refImage, currentReferenceVideo);

    } catch (err: any) {
      console.error("Storyboard generation failed:", err);
      const errorMsg: CreativeChatMessage = {
        id: `assistant_error_${Date.now()}`,
        sender: 'assistant',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        error: `Storyboard generation failed: ${err.message || 'Error generating storyboard.'}`
      };
      setMessages([...currentMessages, errorMsg]);
    } finally {
      setIsLoading(false);
      setStatusMessage('');
    }
  };

  // Step 4: Scene Visuals Generation (Gemini 3.1 Flash Lite Image)
  const runGenerateSceneVisuals = async (
    storyboard: VideoStoryboard,
    refImage: string,
    currentMessages: CreativeChatMessage[]
  ) => {
    setIsLoading(true);
    setStatusMessage(`Generating scene keyframe visual anchors (1 of ${storyboard.scenes.length}) with Gemini 3.1 Flash Lite Image...`);

    try {
      const sceneVisuals = await generateStoryboardSceneImages(storyboard, refImage, companyName);

      if (!sceneVisuals || sceneVisuals.length === 0) {
        throw new Error("Failed to generate scene visual images.");
      }

      setActiveSceneVisuals(sceneVisuals);
      setActiveStoryboard(storyboard);

      const assistantMsg: CreativeChatMessage = {
        id: `assistant_visuals_${Date.now()}`,
        sender: 'assistant',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        text: `Generated **Keyframe Scene Visuals & Script Breakdown** for *"**${storyboard.title}**"*:`,
        sceneVisualsResult: {
          storyboard,
          scenes: sceneVisuals
        },
        clarifyingOptions: {
          question: "Are these scenes ready to synthesize into a 10-second Omni Video?",
          options: [
            { label: "🎬 Approve & Render 10s Omni Video", action: "approve_scene_visuals", payload: { storyboard, sceneVisuals } },
            { label: "✏️ Request Scene Changes", action: "prompt_modify_scenes", payload: { storyboard, sceneVisuals } }
          ]
        }
      };

      const updated = [...currentMessages, assistantMsg];
      setMessages(updated);
      saveCreativeSession(updated, refImage, currentReferenceVideo);

    } catch (err: any) {
      console.error("Scene visuals generation failed:", err);
      const errorMsg: CreativeChatMessage = {
        id: `assistant_error_${Date.now()}`,
        sender: 'assistant',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        error: `Scene visuals generation failed: ${err.message || 'Error generating keyframes.'}`
      };
      setMessages([...currentMessages, errorMsg]);
    } finally {
      setIsLoading(false);
      setStatusMessage('');
    }
  };

  // Step 4b: Re-roll single scene visual
  const runRegenerateScene = async (
    sceneIndex: number,
    storyboard: VideoStoryboard,
    currentSceneVisuals: SceneVisualItem[],
    refImage: string,
    currentMessages: CreativeChatMessage[],
    modPrompt?: string
  ) => {
    setIsLoading(true);
    const targetScene = storyboard.scenes[sceneIndex];
    setStatusMessage(`Regenerating Scene ${targetScene ? targetScene.sceneNumber : sceneIndex + 1} with Gemini 3.1 Flash Lite Image...`);

    try {
      if (!targetScene) throw new Error("Scene not found in storyboard.");

      const newImageUrl = await regenerateSingleSceneImage(targetScene, refImage, companyName, modPrompt);

      if (!newImageUrl) {
        throw new Error(`Failed to regenerate image for Scene ${targetScene.sceneNumber}.`);
      }

      const updatedVisuals = [...currentSceneVisuals];
      updatedVisuals[sceneIndex] = {
        ...updatedVisuals[sceneIndex],
        imageUrl: newImageUrl
      };

      setActiveSceneVisuals(updatedVisuals);

      const assistantMsg: CreativeChatMessage = {
        id: `assistant_scene_update_${Date.now()}`,
        sender: 'assistant',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        text: `Updated **Scene ${targetScene.sceneNumber}** visual anchor:`,
        sceneVisualsResult: {
          storyboard,
          scenes: updatedVisuals
        },
        clarifyingOptions: {
          question: "Ready to render the final 10s Omni Video?",
          options: [
            { label: "🎬 Approve & Render 10s Omni Video", action: "approve_scene_visuals", payload: { storyboard, sceneVisuals: updatedVisuals } },
            { label: "✏️ Request Further Changes", action: "prompt_modify_scenes", payload: { storyboard, sceneVisuals: updatedVisuals } }
          ]
        }
      };

      const updated = [...currentMessages, assistantMsg];
      setMessages(updated);
      saveCreativeSession(updated, refImage, currentReferenceVideo);

    } catch (err: any) {
      console.error("Regenerate scene visual failed:", err);
      const errorMsg: CreativeChatMessage = {
        id: `assistant_error_${Date.now()}`,
        sender: 'assistant',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        error: `Scene regeneration failed: ${err.message || 'Error updating scene.'}`
      };
      setMessages([...currentMessages, errorMsg]);
    } finally {
      setIsLoading(false);
      setStatusMessage('');
    }
  };

  // Step 5: Final Omni Video Rendering
  const runRenderFinalOmniVideo = async (
    storyboard: VideoStoryboard,
    sceneVisuals: SceneVisualItem[],
    refImage: string,
    currentMessages: CreativeChatMessage[]
  ) => {
    setIsLoading(true);
    setStatusMessage(`Synthesizing 10s commercial video across ${sceneVisuals.length} scenes with Gemini Omni...`);

    try {
      const generatedVideoUrl = await generateOmniStoryboardVideo(storyboard, sceneVisuals, refImage, companyName);

      if (!generatedVideoUrl) {
        throw new Error("Gemini Omni returned no video stream.");
      }

      addGalleryItem({
        id: `vid_storyboard_${Date.now()}`,
        urlOrBase64: generatedVideoUrl,
        title: `${storyboard.title} (Omni 10s)`,
        type: 'edited_video',
        mediaType: 'video',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      });

      // Index in GCS Creative Catalog
      (async () => {
        try {
          const metadata = await generateAssetMetadata(refImage, 'omni_storyboard_video', storyboard.concept, "16:9", companyName);
          const catalogItem: CreativeCatalogItem = {
            id: `omni_sb_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
            url: generatedVideoUrl,
            type: 'omni_storyboard_video',
            mediaType: 'video',
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            isoDate: new Date().toISOString(),
            query: storyboard.concept,
            aspectRatio: "16:9",
            parentAssetUrl: refImage,
            metadata
          };
          await saveAssetToCatalog(catalogItem, companyName);
        } catch (catErr) {
          console.warn("Catalog indexing error on omni storyboard video:", catErr);
        }
      })();

      const assistantMsg: CreativeChatMessage = {
        id: `assistant_final_vid_${Date.now()}`,
        sender: 'assistant',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        text: `Your **10-Second Commercial Video** for *"**${storyboard.title}**"* has been successfully synthesized with **Gemini Omni**!`,
        editedVideoResult: {
          originalVideo: refImage,
          editedVideo: generatedVideoUrl,
          editPrompt: storyboard.concept,
          aspectRatio: "16:9"
        },
        clarifyingOptions: {
          question: "Next creative actions:",
          options: [
            { label: "🎬 Create Another Storyboard Video", action: "prompt_create_storyboard_video" },
            { label: "📐 Generate 9 Aspect Ratios of Anchor", action: "generate_aspect_ratios", payload: { imageBase64: refImage } },
            { label: "🔍 Search Saved Catalog", action: "query_catalog" }
          ]
        }
      };

      const updated = [...currentMessages, assistantMsg];
      setMessages(updated);
      saveCreativeSession(updated, refImage, generatedVideoUrl);

    } catch (err: any) {
      console.error("Render final Omni video failed:", err);
      const errorMsg: CreativeChatMessage = {
        id: `assistant_error_${Date.now()}`,
        sender: 'assistant',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        error: `Final video generation failed: ${err.message || 'Check Gemini Omni access.'}`
      };
      setMessages([...currentMessages, errorMsg]);
    } finally {
      setIsLoading(false);
      setStatusMessage('');
    }
  };

  // Search & Retrieve Assets from GCS Creative Catalog with Gemini 3.5 Flash
  const runCatalogQuery = async (query: string, currentMessages: CreativeChatMessage[]) => {
    setIsLoading(true);
    setStatusMessage('Querying GCS Creative Asset Catalog with Gemini 3.5 Flash...');

    try {
      const catalog = await loadCreativeCatalog(companyName);
      const { explanation, matchedAssets } = await queryCreativeCatalogWithGemini(query, catalog, companyName);

      const assistantMsg: CreativeChatMessage = {
        id: `assistant_catalog_${Date.now()}`,
        sender: 'assistant',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        text: explanation,
        catalogResults: {
          explanation,
          matchedAssets
        },
        clarifyingOptions: matchedAssets.length > 0 ? {
          question: "Next actions with retrieved assets:",
          options: [
            { label: "🎨 Edit First Retrieved Asset", action: "edit_catalog_asset", payload: { asset: matchedAssets[0] } },
            { label: "📐 Generate Aspect Ratios", action: "aspect_ratio_catalog_asset", payload: { asset: matchedAssets[0] } },
            { label: "📁 Upload New Reference Image", action: "trigger_upload" }
          ]
        } : undefined
      };

      const updated = [...currentMessages, assistantMsg];
      setMessages(updated);
      saveCreativeSession(updated, currentReferenceImage, currentReferenceVideo);
    } catch (err: any) {
      console.error("Catalog query error:", err);
      const errorMsg: CreativeChatMessage = {
        id: `assistant_error_${Date.now()}`,
        sender: 'assistant',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        error: `Could not retrieve assets from catalog: ${err.message || 'Error querying GCS.'}`
      };
      const updated = [...currentMessages, errorMsg];
      setMessages(updated);
    } finally {
      setIsLoading(false);
      setStatusMessage('');
    }
  };

  // Intelligent Creative Intent & Skill Classification with Gemini 3.5 Flash Lite
  const classifyCreativeQuery = async (
    query: string,
    hasImage: boolean,
    hasVideo: boolean
  ): Promise<{
    intent: 'create_storyboard_video' | 'approve_storyboard' | 'approve_scene_visuals' | 'modify_storyboard' | 'modify_scene_visuals' | 'query_catalog' | 'direct_answer' | 'generate_aspect_ratios' | 'edit_image' | 'edit_video' | 'animate_image' | 'upload_prompt' | 'unsupported';
    direct_answer_text?: string;
    extracted_edit_prompt?: string;
    extracted_video_prompt?: string;
    referenced_asset_query?: string;
    scene_number?: number;
    reasoning?: string;
  }> => {
    try {
      const prompt = `
      You are the Master Creative Classifier for the ${companyName} Creative Agent.
      Analyze the following user input and determine the exact creative skill or direct response:

      USER QUERY: "${query}"
      ACTIVE ASSET STATE:
      - Has Active Image: ${hasImage ? 'Yes' : 'No'}
      - Has Active Video: ${hasVideo ? 'Yes' : 'No'}
      - Has Active Storyboard: ${activeStoryboard ? 'Yes' : 'No'}
      - Has Active Scene Visuals: ${activeSceneVisuals && activeSceneVisuals.length > 0 ? 'Yes' : 'No'}

      ROUTING DIRECTIVES:
      1. "approve_storyboard": The user explicitly approves the storyboard, wants to proceed to step 4, or says to generate scene images/keyframes (e.g. "approve storyboard", "looks good generate scene images", "approve scenes", "proceed with images", "generate keyframes", "yes generate scene visuals").
      2. "approve_scene_visuals": The user explicitly approves the scene visuals & script and wants to render the final 10-second Omni video (e.g. "approve video", "render omni video", "looks good create the video", "generate final video", "render video with omni", "yes make the video").
      3. "modify_storyboard": The user requests narrative, script, or timing modifications to the existing storyboard (e.g. "change scene 2 to be faster", "make scene 1 outdoors at a tailgate", "tweak the voiceover in scene 3", "modify the ending to be happier").
      4. "modify_scene_visuals": The user requests modifications or re-rolling of a specific scene image (e.g. "regenerate scene 2 image", "change scene 1 visual", "re-roll scene 3 with more ice", "scene 2 image should have sunlight").
         -> Set "scene_number" to the integer scene number (e.g. 1, 2, 3) or null.
      5. "create_storyboard_video": The user wants to create, storyboard, or generate a 10-second commercial video from a concept, narrative, or image (e.g. "generate a video where a Paloma is crafted with Squirt", "create an omni video of the can", "storyboard a commercial for me", "turn this into an omni video", "make the squirt citrus image into an omni video", "make a video of...").
         -> Set "referenced_asset_query" to any specific image name/phrase referenced or null.
         -> Set "extracted_video_prompt" to the narrative direction or motion prompt.
      6. "query_catalog": The user is asking to retrieve, find, show, search, get, or list past images, edits, uploaded assets, or videos from GCS/history (e.g. "get me the last 3 images I edited", "show me the yellow background image", "find my Squirt edits", "what images have I generated so far?", "list my past edits", "show previous assets", "grab the last image").
      7. "direct_answer": The user is asking a conversational question, capability inquiry (e.g. "what can you do?", "what aspect ratios are supported?", "how does video editing work?"), or general help.
         -> In "direct_answer_text", write a concise, direct, helpful answer in Simplified Technical English explaining all 4 creative studio features.
      8. "generate_aspect_ratios": The user wants to generate multi-aspect ratio variations across all 9 formats (1:1, 4:3, 16:9, 9:16, 3:2, 2:3, 4:5, 5:4, 21:9).
         -> Set "referenced_asset_query" if a past asset is mentioned.
      9. "edit_image": The user wants to edit, restyle, transform, or modify an image (e.g. "change background to a tailgate", "make lighting dramatic", "add ice droplets").
         -> Set "extracted_edit_prompt" to the editing prompt.
         -> Set "referenced_asset_query" if a past asset is mentioned.
      10. "edit_video": The user wants to edit or transform an existing video with Gemini Omni.
          -> Set "extracted_edit_prompt" to the video edit prompt.
      11. "upload_prompt": The user needs to upload or select an asset first before performing an edit.
      12. "unsupported": The user is asking for something outside the scope of creative media generation, image editing, aspect ratios, or storyboard video production (e.g. coding, math, flight booking, weather, ordering groceries, non-creative tasks).
          -> In "direct_answer_text", start with: "I don't currently know how to do that, but here are some other items I can do:" and list out the core creative skills.

      Return ONLY raw JSON:
      {
        "intent": "create_storyboard_video" | "approve_storyboard" | "approve_scene_visuals" | "modify_storyboard" | "modify_scene_visuals" | "query_catalog" | "direct_answer" | "generate_aspect_ratios" | "edit_image" | "edit_video" | "animate_image" | "upload_prompt" | "unsupported",
        "extracted_edit_prompt": "Cleaned editing instruction or null",
        "extracted_video_prompt": "Cleaned video motion prompt or null",
        "referenced_asset_query": "Specific image or asset name referenced or null",
        "scene_number": 1,
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
      console.warn("Creative classification fallback:", e);
    }

    // Heuristic Fallback
    const lower = query.toLowerCase();
    if (activeSceneVisuals.length > 0 && (lower.includes('approve') || lower.includes('make video') || lower.includes('render video') || lower.includes('omni video') || lower.includes('create video'))) {
      return { intent: 'approve_scene_visuals', reasoning: 'Approval of scene visuals' };
    }
    if (activeStoryboard && (lower.includes('approve') || lower.includes('generate scene') || lower.includes('proceed') || lower.includes('create image'))) {
      return { intent: 'approve_storyboard', reasoning: 'Approval of storyboard' };
    }
    if (activeStoryboard && (lower.includes('modify') || lower.includes('change scene') || lower.includes('tweak story') || lower.includes('script'))) {
      return { intent: 'modify_storyboard', reasoning: 'Modify storyboard script' };
    }
    if (activeSceneVisuals.length > 0 && (lower.includes('reroll') || lower.includes('regenerate') || lower.includes('change image') || lower.includes('scene'))) {
      const match = lower.match(/scene\s*(\d+)/);
      const sNum = match ? parseInt(match[1], 10) : 1;
      return { intent: 'modify_scene_visuals', scene_number: sNum, reasoning: 'Regenerate scene image' };
    }
    if (lower.includes('video') || lower.includes('storyboard') || lower.includes('animate') || lower.includes('commercial')) {
      const cleanedRef = query.replace(/make|turn|into|an|omni|video|please|create|from|the|storyboard/gi, '').trim();
      return { 
        intent: 'create_storyboard_video', 
        extracted_video_prompt: query, 
        referenced_asset_query: cleanedRef || undefined,
        reasoning: 'Video/Storyboard creation keywords' 
      };
    }
    if (lower.includes('last') || lower.includes('find') || lower.includes('get me') || lower.includes('show me the') || lower.includes('past') || lower.includes('history') || lower.includes('catalog') || lower.includes('previous') || lower.includes('grab')) {
      return { intent: 'query_catalog', reasoning: 'Catalog retrieval keywords' };
    }
    if (lower.includes('what can you do') || lower.includes('help') || lower.includes('capabilities') || lower.includes('skills') || lower.includes('what aspect ratio') || lower.includes('formats') || lower.includes('sizes')) {
      return {
        intent: 'direct_answer',
        direct_answer_text: `I am the **Creative Agent** for **${companyName}**. Here is what I can do:\n\n• **5-Step Commercial Video Studio**: Create full 10-second commercial storyboards (3–7 scenes), generate character-consistent keyframe visuals with Gemini 3.1 Flash Lite Image, and render high-fidelity continuous videos with Gemini Omni.\n• **9 Aspect Ratio Adaptations**: Generate photorealistic adaptations across all 9 commercial formats (1:1, 4:3, 16:9, 9:16, 3:2, 2:3, 4:5, 5:4, 21:9) using Gemini 3.1 Flash Lite Image.\n• **Prompt-Guided Image Editing**: Modify backgrounds, lighting, and environments while preserving 100% of the original product packaging.\n• **GCS Asset Catalog & Retrieval**: All created and edited assets are automatically indexed with Gemini 3.5 Flash metadata—ask me anytime to retrieve past edits or variations (e.g. *"Get me the last 3 images I edited"*).\n• **Gemini Omni Video Motion**: Animate static product photography into high-fidelity panning commercial video clips.`
      };
    }
    if (lower.includes('aspect') || lower.includes('ratio') || lower.includes('resize') || lower.includes('formats')) {
      return { intent: 'generate_aspect_ratios', reasoning: 'Aspect ratio keywords' };
    }
    if (hasVideo || lower.includes('edit video') || lower.includes('modify video')) {
      return { intent: 'edit_video', extracted_edit_prompt: query, reasoning: 'Video edit keywords' };
    }
    if (hasImage) {
      return { intent: 'edit_image', extracted_edit_prompt: query, reasoning: 'Image edit with active asset' };
    }
    return { 
      intent: 'unsupported', 
      direct_answer_text: `I don't currently know how to do that, but here are some other items I can do:\n\n• **5-Step Commercial Video Studio**: Create full 10-second commercial storyboards (3–7 scenes), generate character-consistent keyframe visuals with Gemini 3.1 Flash Lite Image, and render high-fidelity continuous videos with Gemini Omni.\n• **9 Aspect Ratio Adaptations**: Generate photorealistic adaptations across all 9 commercial formats (1:1, 4:3, 16:9, 9:16, 3:2, 2:3, 4:5, 5:4, 21:9) using Gemini 3.1 Flash Lite Image.\n• **Prompt-Guided Image Editing**: Modify backgrounds, lighting, and environments while preserving 100% of the original product packaging.\n• **GCS Asset Catalog & Retrieval**: All created and edited assets are automatically indexed with Gemini 3.5 Flash metadata—ask me anytime to retrieve past edits or variations (e.g. *"Get me the last 3 images I edited"*).\n• **Gemini Omni Video Motion**: Animate static product photography into high-fidelity panning commercial video clips.`,
      reasoning: 'Default unsupported fallback' 
    };
  };

  // Helper to resolve target image from active state, reference query, recent thread, or catalog
  const resolveTargetImage = async (refQuery?: string): Promise<{ urlOrBase64: string; name?: string } | null> => {
    // 1. If a specific reference query was mentioned (e.g. "squirt paloma image", "citrus barbecue image")
    if (refQuery && refQuery.trim().length > 1) {
      try {
        const cat = await loadCreativeCatalog(companyName);
        if (cat && cat.items && cat.items.length > 0) {
          const queryRes = await queryCreativeCatalogWithGemini(refQuery, cat, companyName);
          if (queryRes.matchedAssets && queryRes.matchedAssets.length > 0) {
            const bestMatch = queryRes.matchedAssets[0];
            return { urlOrBase64: bestMatch.url, name: bestMatch.query || bestMatch.id };
          }
        }
      } catch (catErr) {
        console.warn("Catalog lookup error while resolving target image:", catErr);
      }
    }

    // 2. If active reference image is present
    if (currentReferenceImage) {
      return { urlOrBase64: currentReferenceImage };
    }

    // 3. Fallback: check recent gallery or message items
    if (gallery && gallery.length > 0) {
      const recentImg = gallery.find(g => g.mediaType !== 'video' && g.urlOrBase64);
      if (recentImg) return { urlOrBase64: recentImg.urlOrBase64, name: recentImg.title };
    }

    const recentMsgImg = [...messages].reverse().find(m => m.uploadedImageBase64 || m.editedImageResult?.editedImage);
    if (recentMsgImg) {
      const img = recentMsgImg.uploadedImageBase64 || recentMsgImg.editedImageResult?.editedImage;
      if (img) return { urlOrBase64: img, name: "Recent Session Asset" };
    }

    // 4. Search full catalog as general fallback
    try {
      const cat = await loadCreativeCatalog(companyName);
      if (cat && cat.items && cat.items.length > 0) {
        const queryRes = await queryCreativeCatalogWithGemini(refQuery || "latest image", cat, companyName);
        if (queryRes.matchedAssets && queryRes.matchedAssets.length > 0) {
          const bestMatch = queryRes.matchedAssets[0];
          return { urlOrBase64: bestMatch.url, name: bestMatch.query || bestMatch.id };
        }
      }
    } catch (catErr) {
      console.warn("General catalog lookup error:", catErr);
    }

    return null;
  };

  // Handle Sending a Message
  const handleSendMessage = async (customPrompt?: string) => {
    const text = (customPrompt || inputPrompt).trim();
    if (!text || isLoading) return;

    const userMessage: CreativeChatMessage = {
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
      const classification = await classifyCreativeQuery(
        text, 
        !!currentReferenceImage, 
        !!currentReferenceVideo
      );

      // Route 0: Query Catalog Retrieval
      if (classification.intent === 'query_catalog') {
        await runCatalogQuery(text, newMessages);
        return;
      }

      // Route 1: Direct Conversational / Capability / Unsupported Fallback
      if (classification.intent === 'direct_answer' || classification.intent === 'unsupported') {
        const responseText = classification.direct_answer_text || `I don't currently know how to do that, but here are some other items I can do:\n\n• **5-Step Commercial Video Studio**: Create full 10-second commercial storyboards (3–7 scenes), generate character-consistent keyframe visuals with Gemini 3.1 Flash Lite Image, and render high-fidelity continuous videos with Gemini Omni.\n• **9 Aspect Ratio Adaptations**: Generate photorealistic adaptations across all 9 commercial formats (1:1, 4:3, 16:9, 9:16, 3:2, 2:3, 4:5, 5:4, 21:9) using Gemini 3.1 Flash Lite Image.\n• **Prompt-Guided Image Editing**: Modify backgrounds, lighting, and environments while preserving 100% of the original product packaging.\n• **GCS Asset Catalog & Retrieval**: All created and edited assets are automatically indexed with Gemini 3.5 Flash metadata.\n• **Gemini Omni Video Motion**: Animate static product photography into high-fidelity panning commercial video clips.`;
        
        const assistantMsg: CreativeChatMessage = {
          id: `assistant_${Date.now()}`,
          sender: 'assistant',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          text: responseText,
          clarifyingOptions: {
            question: "Next actions with the Creative Agent:",
            options: [
              { label: "🎬 Create 10s Storyboard Video", action: "prompt_create_storyboard_video" },
              { label: "📐 Generate 9 Aspect Ratios (1:1, 16:9, 9:16, etc.)", action: "generate_aspect_ratios" },
              { label: "🎨 Edit / Restyle Active Image", action: "prompt_for_edit" },
              { label: "📁 Upload New Reference Image", action: "trigger_upload" }
            ]
          }
        };

        const updated = [...newMessages, assistantMsg];
        setMessages(updated);
        saveCreativeSession(updated, currentReferenceImage, currentReferenceVideo);
        setIsLoading(false);
        setStatusMessage('');
        return;
      }

      // Route 2a: Approve Storyboard -> Generate Scene Visuals (Step 4)
      if (classification.intent === 'approve_storyboard' && activeStoryboard) {
        const targetImg = currentReferenceImage || (await resolveTargetImage())?.urlOrBase64;
        if (targetImg) {
          await runGenerateSceneVisuals(activeStoryboard, targetImg, newMessages);
          return;
        }
      }

      // Route 2b: Approve Scene Visuals -> Render Final Omni Video (Step 5)
      if (classification.intent === 'approve_scene_visuals' && activeStoryboard && activeSceneVisuals.length > 0) {
        const targetImg = currentReferenceImage || (await resolveTargetImage())?.urlOrBase64;
        if (targetImg) {
          await runRenderFinalOmniVideo(activeStoryboard, activeSceneVisuals, targetImg, newMessages);
          return;
        }
      }

      // Route 2c: Modify Storyboard
      if (classification.intent === 'modify_storyboard' && activeStoryboard) {
        const targetImg = currentReferenceImage || (await resolveTargetImage())?.urlOrBase64;
        if (targetImg) {
          await runGenerateStoryboard(text, targetImg, newMessages, text, activeStoryboard);
          return;
        }
      }

      // Route 2d: Modify / Regenerate Scene Visual
      if (classification.intent === 'modify_scene_visuals' && activeStoryboard && activeSceneVisuals.length > 0) {
        const sNum = classification.scene_number || (text.match(/scene\s*(\d+)/i) ? parseInt(text.match(/scene\s*(\d+)/i)![1], 10) : 1);
        const sIdx = Math.max(0, Math.min(sNum - 1, activeStoryboard.scenes.length - 1));
        const targetImg = currentReferenceImage || (await resolveTargetImage())?.urlOrBase64;
        if (targetImg) {
          await runRegenerateScene(sIdx, activeStoryboard, activeSceneVisuals, targetImg, newMessages, text);
          return;
        }
      }

      // Route 2e: Create Storyboard Video (Step 1-3)
      if (classification.intent === 'create_storyboard_video' || classification.intent === 'animate_image') {
        const videoPrompt = classification.extracted_video_prompt || text;
        const resolved = await resolveTargetImage(classification.referenced_asset_query);
        if (resolved) {
          setCurrentReferenceImage(resolved.urlOrBase64);
          await runGenerateStoryboard(videoPrompt, resolved.urlOrBase64, newMessages);
        } else {
          const askUploadMsg: CreativeChatMessage = {
            id: `assistant_${Date.now()}`,
            sender: 'assistant',
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            text: `Please upload or select a reference image first so I can build a 10-second commercial storyboard with **Gemini Flash**!`,
            clarifyingOptions: {
              question: "Provide an image to storyboard & animate:",
              options: [
                { label: "📁 Upload Image from Device", action: "trigger_upload" },
                { label: "🥤 Load Sample Product Image", action: "use_sample_image" },
                { label: "🔍 Search Asset Catalog", action: "query_catalog" }
              ]
            }
          };
          setMessages([...newMessages, askUploadMsg]);
        }
        setIsLoading(false);
        setStatusMessage('');
        return;
      }

      // Route 3: Aspect Ratio Generation
      if (classification.intent === 'generate_aspect_ratios') {
        const resolved = await resolveTargetImage(classification.referenced_asset_query);
        if (resolved) {
          setCurrentReferenceImage(resolved.urlOrBase64);
          await runAspectRatioGeneration(resolved.urlOrBase64, newMessages);
        } else {
          const askUploadMsg: CreativeChatMessage = {
            id: `assistant_${Date.now()}`,
            sender: 'assistant',
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            text: `Please upload or select an image first so I can generate all 9 aspect ratios for you!`,
            clarifyingOptions: {
              question: "Upload or select an image:",
              options: [
                { label: "📁 Upload Image from Device", action: "trigger_upload" },
                { label: "🖼️ Use Sample Product Ad", action: "use_sample_image" },
                { label: "🔍 Search Asset Catalog", action: "query_catalog" }
              ]
            }
          };
          setMessages([...newMessages, askUploadMsg]);
        }
        setIsLoading(false);
        setStatusMessage('');
        return;
      }

      // Route 4: Video Editing
      if (classification.intent === 'edit_video') {
        const editPrompt = classification.extracted_edit_prompt || text;
        if (currentReferenceVideo) {
          await runVideoEdit(editPrompt, currentReferenceVideo, newMessages);
        } else {
          const resolved = await resolveTargetImage(classification.referenced_asset_query);
          if (resolved) {
            setCurrentReferenceImage(resolved.urlOrBase64);
            await runGenerateStoryboard(editPrompt, resolved.urlOrBase64, newMessages);
          } else {
            const askUploadMsg: CreativeChatMessage = {
              id: `assistant_${Date.now()}`,
              sender: 'assistant',
              timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              text: `Please upload or select a video first so I can edit it with **Gemini Omni**!`,
              clarifyingOptions: {
                question: "Upload or select a video:",
                options: [
                  { label: "🎥 Upload Video from Device (MP4)", action: "trigger_video_upload" },
                  { label: "📁 Upload Image to Animate", action: "trigger_upload" },
                  { label: "🥤 Use Sample Ad", action: "use_sample_image" }
                ]
              }
            };
            setMessages([...newMessages, askUploadMsg]);
          }
        }
        setIsLoading(false);
        setStatusMessage('');
        return;
      }

      // Route 5: Image Edit
      if (classification.intent === 'edit_image') {
        const editPrompt = classification.extracted_edit_prompt || text;
        const resolved = await resolveTargetImage(classification.referenced_asset_query);
        if (resolved) {
          setCurrentReferenceImage(resolved.urlOrBase64);
          await runImageEdit(editPrompt, resolved.urlOrBase64, newMessages);
          return;
        }
      }

      // Route 6: No image/video loaded yet
      const askUploadMsg: CreativeChatMessage = {
        id: `assistant_${Date.now()}`,
        sender: 'assistant',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        text: `I am ready to build video storyboards, synthesize Gemini Omni videos, edit assets, generate 9 aspect ratios, or search your saved catalog. Please upload an asset or describe your video concept!`,
        clarifyingOptions: {
          question: "How would you like to provide an asset or idea?",
          options: [
            { label: "🎬 Create 10s Storyboard Video", action: "prompt_create_storyboard_video" },
            { label: "📁 Upload Image from Computer", action: "trigger_upload" },
            { label: "🥤 Load Sample Product Image", action: "use_sample_image" },
            { label: "🔍 Search Saved Catalog", action: "query_catalog" }
          ]
        }
      };
      setMessages([...newMessages, askUploadMsg]);
      saveCreativeSession([...newMessages, askUploadMsg]);
    } catch (err: any) {
      console.error("Creative dispatch error:", err);
    } finally {
      setIsLoading(false);
      setStatusMessage('');
    }
  };

  // Handle Clarifying Options
  const handleOptionClick = async (option: { label: string; action: string; payload?: any }) => {
    if (isLoading) return;

    const userChoiceMsg: CreativeChatMessage = {
      id: `user_${Date.now()}`,
      sender: 'user',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      text: option.label
    };
    const thread = [...messages, userChoiceMsg];
    setMessages(thread);

    if (option.action === 'approve_storyboard') {
      const sb = option.payload?.storyboard || activeStoryboard;
      const img = currentReferenceImage || (await resolveTargetImage())?.urlOrBase64;
      if (sb && img) {
        await runGenerateSceneVisuals(sb, img, thread);
      } else if (!img) {
        fileInputRef.current?.click();
      }
    } else if (option.action === 'prompt_modify_storyboard') {
      const assistantPromptMsg: CreativeChatMessage = {
        id: `assistant_${Date.now()}`,
        sender: 'assistant',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        text: `Please describe the modifications you would like to make to the storyboard (e.g. *"Change scene 2 to be outdoors at a BBQ tailgate"*, *"Make the pacing faster and more energetic"*, *"Add a close-up can toast in scene 4"*):`
      };
      setMessages([...thread, assistantPromptMsg]);
    } else if (option.action === 'approve_scene_visuals') {
      const sb = option.payload?.storyboard || activeStoryboard;
      const visuals = option.payload?.sceneVisuals || activeSceneVisuals;
      const img = currentReferenceImage || (await resolveTargetImage())?.urlOrBase64;
      if (sb && visuals && img) {
        await runRenderFinalOmniVideo(sb, visuals, img, thread);
      }
    } else if (option.action === 'prompt_modify_scenes') {
      const assistantPromptMsg: CreativeChatMessage = {
        id: `assistant_${Date.now()}`,
        sender: 'assistant',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        text: `Tell me what changes are needed (e.g. *"Regenerate Scene 2 image with ice splashing"*, *"Update Scene 3 script to: 'Feel the 23 flavors'"*):`
      };
      setMessages([...thread, assistantPromptMsg]);
    } else if (option.action === 'regenerate_single_scene') {
      const sceneIdx = option.payload?.sceneIndex;
      const sb = option.payload?.storyboard || activeStoryboard;
      const visuals = option.payload?.sceneVisuals || activeSceneVisuals;
      const img = currentReferenceImage || (await resolveTargetImage())?.urlOrBase64;
      if (typeof sceneIdx === 'number' && sb && visuals && img) {
        await runRegenerateScene(sceneIdx, sb, visuals, img, thread);
      }
    } else if (option.action === 'prompt_create_storyboard_video') {
      const assistantPromptMsg: CreativeChatMessage = {
        id: `assistant_${Date.now()}`,
        sender: 'assistant',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        text: `Describe your commercial storyline or narrative concept for the 10-second video (e.g. *"A refreshing summer afternoon on a sunlit patio crafting an ice-cold Squirt Paloma with fresh lime"*):`
      };
      setMessages([...thread, assistantPromptMsg]);
    } else if (option.action === 'generate_aspect_ratios') {
      const img = option.payload?.imageBase64 || currentReferenceImage;
      if (img) await runAspectRatioGeneration(img, thread);
    } else if (option.action === 'prompt_for_edit') {
      const assistantPromptMsg: CreativeChatMessage = {
        id: `assistant_${Date.now()}`,
        sender: 'assistant',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        text: `Tell me how you would like to edit this image (e.g. *"Change background to a sunny backyard barbecue"*, *"Add a cold Squirt can"*, *"Make lighting dramatic sunset"*):`
      };
      setMessages([...thread, assistantPromptMsg]);
    } else if (option.action === 'edit_catalog_asset') {
      const asset = option.payload?.asset as CreativeCatalogItem;
      if (asset) {
        setCurrentReferenceImage(asset.url);
        const assistantPromptMsg: CreativeChatMessage = {
          id: `assistant_${Date.now()}`,
          sender: 'assistant',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          text: `Selected asset: "${asset.query || asset.id}". Tell me how you would like to edit this image (e.g. *"Change background to a yellow studio setting"*, *"Add ice droplets"*):`
        };
        setMessages([...thread, assistantPromptMsg]);
      }
    } else if (option.action === 'aspect_ratio_catalog_asset') {
      const asset = option.payload?.asset as CreativeCatalogItem;
      if (asset) {
        setCurrentReferenceImage(asset.url);
        await runAspectRatioGeneration(asset.url, thread);
      }
    } else if (option.action === 'prompt_for_video_edit') {
      const vid = option.payload?.videoRef || currentReferenceVideo;
      const preset = option.payload?.promptPreset;
      if (vid && preset) {
        await runVideoEdit(preset, vid, thread);
      } else {
        const assistantPromptMsg: CreativeChatMessage = {
          id: `assistant_${Date.now()}`,
          sender: 'assistant',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          text: `Describe how you want Gemini Omni to modify the video (e.g. *"Change the background to a sunny autumn football tailgate"*, *"Add dramatic lens flares"*):`
        };
        setMessages([...thread, assistantPromptMsg]);
      }
    } else if (option.action === 'prompt_for_omni_video') {
      const assistantPromptMsg: CreativeChatMessage = {
        id: `assistant_${Date.now()}`,
        sender: 'assistant',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        text: `Tell me the motion prompt for Gemini Omni (e.g. *"Slow motion cinematic panning shot of the cold can with condensation glistening"*, *"Dynamic camera zoom in on the product"*):`
      };
      setMessages([...thread, assistantPromptMsg]);
    } else if (option.action === 'query_catalog') {
      await runCatalogQuery("all recent assets", thread);
    } else if (option.action === 'animate_image_to_video') {
      const img = option.payload?.imageBase64 || currentReferenceImage;
      if (img) await runGenerateStoryboard("Cinematic commercial video bringing the uploaded image to life", img, thread);
    } else if (option.action === 'trigger_upload') {
      fileInputRef.current?.click();
    } else if (option.action === 'trigger_video_upload') {
      videoInputRef.current?.click();
    } else if (option.action === 'use_sample_image') {
      try {
        const sampleUrl = '/images/squirt_sample_ad.jpg';
        handleNewImageUploaded(sampleUrl, 'squirt_sample_ad.jpg');
      } catch (e) {
        console.error("Failed to load sample image:", e);
      }
    }
  };

  return (
    <div className="flex flex-col h-full max-w-5xl mx-auto w-full px-2 sm:px-4 py-4 relative">
      {/* Hidden file inputs */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileUpload}
        accept="image/*"
        className="hidden"
      />
      <input
        type="file"
        ref={videoInputRef}
        onChange={handleVideoUpload}
        accept="video/*"
        className="hidden"
      />

      {/* Header Bar */}
      <div className="flex items-center justify-between pb-3 mb-2 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-xl bg-pink-50 text-pink-700">
            <Palette size={16} />
          </div>
          <div>
            <span className="font-bold text-sm text-gray-900">Creative Agent</span>
            <span className="ml-2 text-[10px] font-bold text-pink-700 bg-pink-100 px-2 py-0.5 rounded-full">
              Image & Video Studio
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* History Drawer Toggle Button */}
          <button
            onClick={() => setShowHistoryDrawer(!showHistoryDrawer)}
            className="px-3 py-1.5 text-xs font-semibold text-gray-700 hover:text-pink-700 bg-white hover:bg-pink-50 border border-gray-200 hover:border-pink-200 rounded-xl transition-all flex items-center gap-1.5 shadow-2xs"
            title="View Past Creative Sessions & History"
          >
            <History size={13} className="text-pink-600" />
            <span>History</span>
            {sessionsHistory.length > 0 && (
              <span className="ml-1 px-1.5 py-0.2 bg-pink-100 text-pink-800 text-[10px] font-bold rounded-full">
                {sessionsHistory.length}
              </span>
            )}
          </button>

          <button
            onClick={() => fileInputRef.current?.click()}
            className="px-3 py-1.5 text-xs font-semibold text-gray-700 hover:text-pink-700 bg-white hover:bg-pink-50 border border-gray-200 hover:border-pink-200 rounded-xl transition-all flex items-center gap-1.5 shadow-2xs"
            title="Upload Image"
          >
            <Upload size={12} />
            Upload Image
          </button>

          <button
            onClick={() => videoInputRef.current?.click()}
            className="px-3 py-1.5 text-xs font-semibold text-gray-700 hover:text-pink-700 bg-white hover:bg-pink-50 border border-gray-200 hover:border-pink-200 rounded-xl transition-all flex items-center gap-1.5 shadow-2xs"
            title="Upload Video"
          >
            <Film size={12} />
            Upload Video
          </button>

          <button
            onClick={handleResetChat}
            disabled={isLoading || messages.length === 0}
            className="px-3 py-1.5 text-xs font-semibold text-gray-600 hover:text-red-600 bg-white hover:bg-red-50 border border-gray-200 hover:border-red-200 rounded-xl transition-all flex items-center gap-1.5 shadow-2xs disabled:opacity-40 disabled:cursor-not-allowed"
            title="Start New Creative Session"
          >
            <Plus size={12} />
            New Session
          </button>
        </div>
      </div>

      {/* Main Conversation Stream */}
      <div className="flex-1 overflow-y-auto space-y-6 pb-36">
        {/* Welcome Screen when messages are empty */}
        {messages.length === 0 && (
          <div className="space-y-6 animate-fadeIn pt-2">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-xl bg-gradient-to-tr from-pink-500 via-rose-500 to-amber-400 text-white shrink-0 shadow-xs">
                <Palette size={22} className="fill-white" />
              </div>
              <div className="space-y-1">
                <p className="text-gray-900 text-base sm:text-lg font-semibold leading-snug">
                  Hi, I am the <span className="font-bold text-pink-700">Creative Agent</span>. Upload images or videos to generate <span className="font-bold text-gray-900">9 aspect ratio variations</span>, edit scenes, or perform <span className="font-bold text-gray-900">video transformations with Gemini Omni</span>.
                </p>
                <p className="text-xs text-gray-500 italic">
                  *Powered by Gemini 3.1 Flash Lite Image for photorealistic aspect ratios and Gemini Omni Flash Preview for video scene modifications.
                </p>
              </div>
            </div>

            {/* PREVIOUSLY UPLOADED ORIGINAL ASSETS GALLERY */}
            {gallery.length > 0 && (
              <div className="space-y-2.5 p-4 bg-white border border-gray-200 rounded-2xl shadow-2xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-gray-800">
                    <FolderHeart size={15} className="text-pink-600" />
                    <span>Uploaded Reference Assets</span>
                    <span className="text-[10px] font-bold text-gray-400">({gallery.length} Originals in Cloud)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="text-xs font-bold text-pink-700 hover:text-pink-800 flex items-center gap-1"
                    >
                      <Upload size={12} /> Image
                    </button>
                    <button
                      onClick={() => videoInputRef.current?.click()}
                      className="text-xs font-bold text-indigo-700 hover:text-indigo-800 flex items-center gap-1"
                    >
                      <Film size={12} /> Video
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-2.5 max-h-48 overflow-y-auto pt-1">
                  {gallery.slice(0, 12).map((item) => {
                    const isVideo = item.mediaType === 'video' || item.type.includes('video');
                    return (
                      <div 
                        key={item.id}
                        onClick={() => {
                          if (isVideo) {
                            handleNewVideoUploaded(item.urlOrBase64, item.title);
                          } else {
                            handleNewImageUploaded(item.urlOrBase64, item.title);
                          }
                        }}
                        className="group relative rounded-xl border border-gray-200 hover:border-pink-600 overflow-hidden cursor-pointer bg-gray-50 transition-all aspect-square flex items-center justify-center p-1 shadow-2xs hover:shadow-xs"
                        title={`Click to use "${item.title}" as active reference`}
                      >
                        {isVideo ? (
                          <div className="w-full h-full flex flex-col items-center justify-center bg-slate-900 text-white rounded-lg relative overflow-hidden">
                            <video 
                              src={formatVideoSrc(item.urlOrBase64)}
                              className="w-full h-full object-cover opacity-80"
                              muted
                            />
                            <div className="absolute inset-0 flex items-center justify-center">
                              <Play size={20} className="text-white fill-white/80" />
                            </div>
                          </div>
                        ) : (
                          <img 
                            src={formatImageSrc(item.urlOrBase64)}
                            alt={item.title}
                            className="max-w-full max-h-full object-contain group-hover:scale-105 transition-transform"
                          />
                        )}
                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center p-1 text-center">
                          <span className="text-[10px] font-bold text-white leading-tight line-clamp-2">
                            {item.title}
                          </span>
                          <span className="text-[9px] font-extrabold text-pink-300 uppercase mt-0.5">
                            {isVideo ? 'Edit Video' : 'Use Image'}
                          </span>
                        </div>
                        <button
                          onClick={(e) => handleDeleteGalleryItem(item.id, e)}
                          className="absolute top-1.5 right-1.5 p-1 rounded-md bg-black/70 hover:bg-red-600 text-white opacity-0 group-hover:opacity-100 transition-all z-20 shadow-xs"
                          title="Delete from uploaded assets"
                        >
                          <Trash2 size={11} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Quick Upload Drop Area */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div 
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-gray-300 hover:border-pink-500 rounded-3xl p-5 text-center bg-white hover:bg-pink-50/30 transition-all cursor-pointer shadow-xs group"
              >
                <div className="flex flex-col items-center gap-1.5">
                  <div className="p-2.5 bg-pink-50 group-hover:bg-pink-100 text-pink-600 rounded-2xl transition-colors">
                    <Upload size={20} />
                  </div>
                  <span className="text-xs sm:text-sm font-bold text-gray-800 group-hover:text-pink-700 transition-colors">
                    Upload Image Asset
                  </span>
                  <span className="text-[11px] text-gray-500">
                    JPG, PNG, WEBP (9 Aspect Ratios & Edits)
                  </span>
                </div>
              </div>

              <div 
                onClick={() => videoInputRef.current?.click()}
                className="border-2 border-dashed border-indigo-200 hover:border-indigo-500 rounded-3xl p-5 text-center bg-white hover:bg-indigo-50/30 transition-all cursor-pointer shadow-xs group"
              >
                <div className="flex flex-col items-center gap-1.5">
                  <div className="p-2.5 bg-indigo-50 group-hover:bg-indigo-100 text-indigo-600 rounded-2xl transition-colors">
                    <Film size={20} />
                  </div>
                  <span className="text-xs sm:text-sm font-bold text-gray-800 group-hover:text-indigo-700 transition-colors">
                    Upload Video for Gemini Omni
                  </span>
                  <span className="text-[11px] text-gray-500">
                    MP4, MOV, WEBM (Video Scene Modification)
                  </span>
                </div>
              </div>
            </div>

            {/* Suggested Creative Capabilities Grid */}
            <div className="space-y-3 pt-1">
              <h3 className="text-sm font-bold text-gray-800 flex items-center gap-1.5">
                <TrendingUp size={16} className="text-pink-700" />
                Suggested Creative & Video Capabilities
              </h3>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <button
                  onClick={() => handleOptionClick({ label: "Generate 9 Aspect Ratios", action: "use_sample_image" })}
                  className="p-4 bg-white hover:bg-pink-50/50 border border-gray-200 hover:border-pink-600 rounded-2xl text-left transition-all duration-200 shadow-xs hover:shadow-md flex flex-col justify-between h-32 group"
                >
                  <span className="text-xs sm:text-sm font-bold text-gray-900 group-hover:text-pink-700 transition-colors leading-tight">
                    9 Aspect Ratios
                  </span>
                  <div className="flex justify-between items-center w-full mt-2">
                    <span className="text-[11px] text-gray-500 line-clamp-2">Adapt for 1:1, 16:9, 9:16, 4:3, 21:9.</span>
                    <div className="p-1.5 rounded-full bg-gray-50 group-hover:bg-pink-100 text-gray-400 group-hover:text-pink-700 shrink-0 ml-1">
                      <Lightbulb size={14} />
                    </div>
                  </div>
                </button>

                <button
                  onClick={() => handleSendMessage("Change video background to a sunny autumn football tailgate")}
                  className="p-4 bg-white hover:bg-pink-50/50 border border-gray-200 hover:border-pink-600 rounded-2xl text-left transition-all duration-200 shadow-xs hover:shadow-md flex flex-col justify-between h-32 group"
                >
                  <span className="text-xs sm:text-sm font-bold text-gray-900 group-hover:text-pink-700 transition-colors leading-tight">
                    Video: Tailgate Scene
                  </span>
                  <div className="flex justify-between items-center w-full mt-2">
                    <span className="text-[11px] text-gray-500 line-clamp-2">Modify video scene with Gemini Omni.</span>
                    <div className="p-1.5 rounded-full bg-gray-50 group-hover:bg-pink-100 text-gray-400 group-hover:text-pink-700 shrink-0 ml-1">
                      <Film size={14} />
                    </div>
                  </div>
                </button>

                <button
                  onClick={() => handleSendMessage("Enhance lighting to dramatic commercial studio spotlights")}
                  className="p-4 bg-white hover:bg-pink-50/50 border border-gray-200 hover:border-pink-600 rounded-2xl text-left transition-all duration-200 shadow-xs hover:shadow-md flex flex-col justify-between h-32 group"
                >
                  <span className="text-xs sm:text-sm font-bold text-gray-900 group-hover:text-pink-700 transition-colors leading-tight">
                    Studio Lighting
                  </span>
                  <div className="flex justify-between items-center w-full mt-2">
                    <span className="text-[11px] text-gray-500 line-clamp-2">Add commercial grade studio lighting & reflections.</span>
                    <div className="p-1.5 rounded-full bg-gray-50 group-hover:bg-pink-100 text-gray-400 group-hover:text-pink-700 shrink-0 ml-1">
                      <Lightbulb size={14} />
                    </div>
                  </div>
                </button>

                <button
                  onClick={() => handleSendMessage("Place a cold Squirt Zero Sugar can with condensation on the table")}
                  className="p-4 bg-white hover:bg-pink-50/50 border border-gray-200 hover:border-pink-600 rounded-2xl text-left transition-all duration-200 shadow-xs hover:shadow-md flex flex-col justify-between h-32 group"
                >
                  <span className="text-xs sm:text-sm font-bold text-gray-900 group-hover:text-pink-700 transition-colors leading-tight">
                    Product Integration
                  </span>
                  <div className="flex justify-between items-center w-full mt-2">
                    <span className="text-[11px] text-gray-500 line-clamp-2">Insert crisp can with condensation drops.</span>
                    <div className="p-1.5 rounded-full bg-gray-50 group-hover:bg-pink-100 text-gray-400 group-hover:text-pink-700 shrink-0 ml-1">
                      <Lightbulb size={14} />
                    </div>
                  </div>
                </button>
              </div>

              {/* Action Chips */}
              <div className="flex flex-wrap gap-2 pt-2">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="px-4 py-2 bg-white hover:bg-gray-50 border border-gray-300 hover:border-pink-600 text-gray-700 hover:text-pink-700 rounded-full text-xs font-semibold shadow-2xs transition-all flex items-center gap-1.5"
                >
                  <Upload size={14} className="text-pink-600" />
                  Upload Image
                </button>
                <button
                  onClick={() => videoInputRef.current?.click()}
                  className="px-4 py-2 bg-white hover:bg-gray-50 border border-gray-300 hover:border-pink-600 text-gray-700 hover:text-pink-700 rounded-full text-xs font-semibold shadow-2xs transition-all flex items-center gap-1.5"
                >
                  <Film size={14} className="text-indigo-600" />
                  Upload Video (MP4)
                </button>
                <button
                  onClick={() => handleOptionClick({ label: "Use Sample Ad", action: "use_sample_image" })}
                  className="px-4 py-2 bg-white hover:bg-gray-50 border border-gray-300 hover:border-pink-600 text-gray-700 hover:text-pink-700 rounded-full text-xs font-semibold shadow-2xs transition-all flex items-center gap-1.5"
                >
                  <ImageIcon size={14} className="text-indigo-600" />
                  Sample Ad (9 Ratios)
                </button>
                {sessionsHistory.length > 0 && (
                  <button
                    onClick={() => setShowHistoryDrawer(true)}
                    className="px-4 py-2 bg-white hover:bg-gray-50 border border-gray-300 hover:border-pink-600 text-gray-700 hover:text-pink-700 rounded-full text-xs font-semibold shadow-2xs transition-all flex items-center gap-1.5"
                  >
                    <History size={14} className="text-amber-600" />
                    Browse {sessionsHistory.length} Past Sessions
                  </button>
                )}
                <button
                  onClick={() => handleSendMessage("What aspect ratios are supported?")}
                  className="px-4 py-2 bg-white hover:bg-gray-50 border border-gray-300 hover:border-pink-600 text-gray-700 hover:text-pink-700 rounded-full text-xs font-semibold shadow-2xs transition-all flex items-center gap-1.5"
                >
                  <Maximize2 size={14} className="text-emerald-600" />
                  View 9 Aspect Ratios
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
                <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-pink-600 to-rose-600 text-white flex items-center justify-center shrink-0 shadow-2xs mt-0.5">
                  <Palette size={16} className="fill-white" />
                </div>
              )}

              <div className="flex flex-col space-y-1.5 w-full">
                <div
                  className={`px-4 py-3 rounded-2xl text-sm leading-relaxed ${
                    msg.sender === 'user'
                      ? 'bg-pink-700 text-white rounded-br-xs shadow-xs'
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
                        alt="Uploaded Reference" 
                        className="w-full h-44 object-contain cursor-pointer hover:scale-105 transition-transform"
                        onClick={() => openImageInNewTab(msg.uploadedImageBase64!)}
                        title="Click to view full size"
                      />
                      <div className="p-2 bg-white border-t border-gray-100 flex items-center justify-between text-[11px] text-gray-500">
                        <span className="font-semibold text-gray-700">Image Asset</span>
                        <span className="text-pink-600 font-bold">Ready for Transformation</span>
                      </div>
                    </div>
                  )}

                  {/* Uploaded Video Player Card */}
                  {msg.uploadedVideoUrlOrBase64 && (
                    <div className="mt-3 relative rounded-xl overflow-hidden border border-gray-200 bg-slate-950 max-w-md">
                      <video 
                        src={formatVideoSrc(msg.uploadedVideoUrlOrBase64)}
                        controls
                        className="w-full max-h-60 object-contain"
                      />
                      <div className="p-2 bg-slate-900 text-white border-t border-slate-800 flex items-center justify-between text-[11px]">
                        <span className="font-semibold text-slate-300 flex items-center gap-1">
                          <Film size={12} className="text-indigo-400" />
                          Source Video Asset
                        </span>
                        <span className="text-indigo-400 font-bold">Gemini Omni Ready</span>
                      </div>
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
                            className="w-full text-left px-3.5 py-2.5 bg-gray-50 hover:bg-pink-50 border border-gray-200 hover:border-pink-600 text-gray-800 hover:text-pink-700 rounded-xl text-xs font-semibold transition-all flex items-center justify-between group shadow-2xs"
                          >
                            <span>{opt.label}</span>
                            <ChevronRight size={14} className="text-gray-400 group-hover:text-pink-700 group-hover:translate-x-0.5 transition-transform" />
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* 9 Aspect Ratio Variations Visual Grid */}
                  {msg.aspectRatioResults && (
                    <div className="mt-4 space-y-3 pt-3 border-t border-gray-100 text-gray-900">
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                        {ASPECT_RATIO_CONFIGS.map((cfg, cIdx) => {
                          const imgUrlOrBase64 = msg.aspectRatioResults?.[cfg.ratio];
                          const isDone = !!imgUrlOrBase64;

                          return (
                            <div key={cIdx} className="p-3 bg-gray-50 border border-gray-200 rounded-2xl flex flex-col justify-between space-y-2 shadow-2xs hover:border-pink-600 transition-colors">
                              <div className="flex items-center justify-between">
                                <span className="text-2xs font-extrabold text-pink-700 uppercase tracking-wider">{cfg.label}</span>
                                <span className="text-[10px] font-mono text-gray-400">{cfg.ratio}</span>
                              </div>

                              <div className="h-36 bg-white rounded-xl overflow-hidden border border-gray-200 flex items-center justify-center relative">
                                {isDone ? (
                                  <img 
                                    src={formatImageSrc(imgUrlOrBase64)}
                                    alt={`Ratio ${cfg.ratio}`}
                                    className="max-w-full max-h-full object-contain cursor-pointer hover:scale-105 transition-transform"
                                    onClick={() => openImageInNewTab(imgUrlOrBase64)}
                                    title="Click to view full size"
                                  />
                                ) : (
                                  <div className="flex flex-col items-center gap-1.5">
                                    <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-pink-600"></div>
                                    <span className="text-[10px] text-gray-400 font-medium">Adapting...</span>
                                  </div>
                                )}
                              </div>

                              {isDone && (
                                <div className="flex items-center justify-between text-[11px] pt-1">
                                  <button
                                    onClick={() => currentReferenceImage && regenerateSingleRatio(cfg.ratio, msg.id, currentReferenceImage)}
                                    className="text-gray-500 hover:text-pink-700 flex items-center gap-1 transition-colors"
                                    title="Regenerate this aspect ratio"
                                  >
                                    <RotateCw size={11} /> Redo
                                  </button>
                                  <a
                                    href={formatImageSrc(imgUrlOrBase64)}
                                    download={`deal-${cfg.ratio.replace(':', 'x')}.jpg`}
                                    className="font-bold text-pink-700 hover:underline flex items-center gap-1"
                                  >
                                    <Download size={11} /> Download
                                  </a>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Edited Image Result Before & After */}
                  {msg.editedImageResult && (
                    <div className="mt-4 space-y-3 pt-3 border-t border-gray-100 text-gray-900">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="p-3 bg-gray-50 border border-gray-200 rounded-2xl space-y-2">
                          <span className="text-2xs font-extrabold text-gray-500 uppercase tracking-wider">Original Asset</span>
                          <div className="h-44 bg-white rounded-xl overflow-hidden border border-gray-200 flex items-center justify-center">
                            <img 
                              src={formatImageSrc(msg.editedImageResult.originalImage)} 
                              alt="Original" 
                              className="max-w-full max-h-full object-contain cursor-pointer"
                              onClick={() => openImageInNewTab(msg.editedImageResult?.originalImage || '')}
                            />
                          </div>
                        </div>

                        <div className="p-3 bg-pink-50/60 border border-pink-200 rounded-2xl space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-2xs font-extrabold text-pink-700 uppercase tracking-wider">Edited Creative</span>
                            <a 
                              href={formatImageSrc(msg.editedImageResult.editedImage)}
                              download="creative-edit.jpg"
                              className="text-[11px] font-bold text-pink-700 hover:underline flex items-center gap-1"
                            >
                              <Download size={12} /> Download
                            </a>
                          </div>
                          <div className="h-44 bg-white rounded-xl overflow-hidden border border-gray-200 flex items-center justify-center">
                            <img 
                              src={formatImageSrc(msg.editedImageResult.editedImage)} 
                              alt="Edited Variation" 
                              className="max-w-full max-h-full object-contain cursor-pointer hover:scale-105 transition-transform"
                              onClick={() => openImageInNewTab(msg.editedImageResult?.editedImage || '')}
                              title="Click to view full size"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Edited Video Result Card */}
                  {msg.editedVideoResult && (
                    <div className="mt-4 space-y-3 pt-3 border-t border-gray-100 text-gray-900">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="p-3 bg-gray-50 border border-gray-200 rounded-2xl space-y-2">
                          <span className="text-2xs font-extrabold text-gray-500 uppercase tracking-wider">Original Video</span>
                          <div className="h-48 bg-slate-950 rounded-xl overflow-hidden border border-gray-200 flex items-center justify-center">
                            {msg.editedVideoResult.originalVideo.startsWith('data:image') || msg.editedVideoResult.originalVideo.includes('.jpg') || msg.editedVideoResult.originalVideo.includes('.png') ? (
                              <img 
                                src={formatImageSrc(msg.editedVideoResult.originalVideo)} 
                                alt="Original" 
                                className="max-w-full max-h-full object-contain"
                              />
                            ) : (
                              <video 
                                src={formatVideoSrc(msg.editedVideoResult.originalVideo)} 
                                controls 
                                className="w-full h-full object-contain"
                              />
                            )}
                          </div>
                        </div>

                        <div className="p-3 bg-indigo-50/60 border border-indigo-200 rounded-2xl space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-2xs font-extrabold text-indigo-700 uppercase tracking-wider">Gemini Omni Modified Video</span>
                            <a 
                              href={formatVideoSrc(msg.editedVideoResult.editedVideo)}
                              download="omni-edited-video.mp4"
                              className="text-[11px] font-bold text-indigo-700 hover:underline flex items-center gap-1"
                            >
                              <Download size={12} /> Download
                            </a>
                          </div>
                          <div className="h-48 bg-slate-950 rounded-xl overflow-hidden border border-indigo-200 flex items-center justify-center">
                            <video 
                              src={formatVideoSrc(msg.editedVideoResult.editedVideo)} 
                              controls 
                              loop
                              preload="metadata"
                              autoPlay={false}
                              className="w-full h-full object-contain"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Video Storyboard Card (Step 3) */}
                  {msg.videoStoryboard && (
                    <div className="mt-4 space-y-4 pt-3 border-t border-gray-100 text-gray-900 animate-fadeIn">
                      <div className="p-4 bg-gradient-to-br from-indigo-50/80 via-white to-purple-50/50 border border-indigo-200/80 rounded-2xl shadow-xs space-y-4">
                        {/* Header */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-indigo-100 pb-3">
                          <div className="flex items-center gap-2">
                            <div className="p-2 rounded-xl bg-indigo-600 text-white shadow-xs">
                              <Film size={18} />
                            </div>
                            <div>
                              <h4 className="font-extrabold text-sm text-gray-900 flex items-center gap-2">
                                {msg.videoStoryboard.title}
                                <span className="text-[10px] font-mono font-bold px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded-full border border-indigo-200">
                                  10.0s Commercial
                                </span>
                              </h4>
                              <p className="text-[11.5px] text-gray-500 font-medium mt-0.5">
                                {msg.videoStoryboard.concept}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <span className="text-[10px] font-mono font-bold px-2.5 py-1 bg-purple-100 text-purple-800 rounded-lg border border-purple-200">
                              {msg.videoStoryboard.moodAndTone}
                            </span>
                            <span className="text-[10px] font-mono font-bold px-2.5 py-1 bg-slate-100 text-slate-700 rounded-lg border border-slate-200">
                              {msg.videoStoryboard.scenes.length} Scenes
                            </span>
                          </div>
                        </div>

                        {/* Storyboard Continuity Directives */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                          <div className="p-2.5 bg-white/90 border border-indigo-100 rounded-xl space-y-1">
                            <span className="font-bold text-indigo-900 flex items-center gap-1">
                              <Sparkles size={12} className="text-indigo-600" /> Character Consistency
                            </span>
                            <p className="text-gray-600 text-[10.5px] leading-relaxed">{msg.videoStoryboard.characterConsistencyNotes}</p>
                          </div>
                          <div className="p-2.5 bg-white/90 border border-purple-100 rounded-xl space-y-1">
                            <span className="font-bold text-purple-900 flex items-center gap-1">
                              <Palette size={12} className="text-purple-600" /> Style & Polish Directives
                            </span>
                            <p className="text-gray-600 text-[10.5px] leading-relaxed">{msg.videoStoryboard.stylePreservationNotes}</p>
                          </div>
                        </div>

                        {/* Sequential Scene Breakdown */}
                        <div className="space-y-2.5">
                          <span className="text-2xs font-extrabold text-gray-500 uppercase tracking-wider block">
                            Sequential Storyboard Breakdown ({msg.videoStoryboard.scenes.length} Scenes)
                          </span>
                          <div className="grid grid-cols-1 gap-2.5">
                            {msg.videoStoryboard.scenes.map((scene) => (
                              <div key={scene.sceneNumber} className="p-3.5 bg-white border border-gray-200 rounded-xl hover:border-indigo-300 transition-all shadow-2xs space-y-2">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    <span className="w-5 h-5 rounded-full bg-indigo-600 text-white text-xs font-black flex items-center justify-center">
                                      {scene.sceneNumber}
                                    </span>
                                    <span className="font-extrabold text-xs text-gray-900">{scene.title}</span>
                                  </div>
                                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                                    ⏱️ {scene.timeRange}
                                  </span>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-12 gap-2 text-xs">
                                  <div className="md:col-span-7 space-y-1">
                                    <span className="text-[10px] font-bold uppercase text-gray-400">Visual Action & Camera</span>
                                    <p className="text-gray-700 text-[11.5px] leading-relaxed">{scene.actionDescription}</p>
                                  </div>
                                  <div className="md:col-span-5 p-2 bg-slate-50 border border-slate-150 rounded-lg space-y-1">
                                    <span className="text-[10px] font-bold uppercase text-indigo-600">Voiceover / Script</span>
                                    <p className="text-gray-800 italic text-[11px] leading-snug">"{scene.dialogueOrScript}"</p>
                                    {scene.onScreenText && scene.onScreenText.trim().length > 0 && (
                                      <div className="pt-1 border-t border-slate-200/60 mt-1">
                                        <span className="text-[9.5px] font-bold uppercase text-amber-700 block">On-Screen Text</span>
                                        <p className="text-[10.5px] font-semibold text-gray-900 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200/80 inline-block mt-0.5">
                                          "{scene.onScreenText}"
                                        </p>
                                      </div>
                                    )}
                                    <span className="text-[9.5px] text-gray-500 block">🎵 {scene.audioOrMusicCue}</span>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Storyboard Approval / Edit Actions */}
                        <div className="pt-3 border-t border-indigo-100 flex flex-wrap items-center justify-between gap-2">
                          <span className="text-[11px] text-gray-500 font-medium">
                            Ready to generate keyframe scene visuals with Gemini 3.1 Flash Lite Image?
                          </span>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleOptionClick({
                                label: "✏️ Modify Storyboard",
                                action: "prompt_modify_storyboard",
                                payload: { storyboard: msg.videoStoryboard }
                              })}
                              className="px-3 py-1.5 bg-white hover:bg-gray-50 text-gray-700 border border-gray-200 rounded-xl text-xs font-bold transition flex items-center gap-1 shadow-2xs"
                            >
                              <Pencil size={12} /> Modify Storyboard
                            </button>
                            <button
                              onClick={() => handleOptionClick({
                                label: "✅ Approve & Generate Scene Images",
                                action: "approve_storyboard",
                                payload: { storyboard: msg.videoStoryboard }
                              })}
                              className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm"
                            >
                              <CheckCircle2 size={13} /> Approve & Generate Scene Images
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Scene Visuals & Script Table Card (Step 4) */}
                  {msg.sceneVisualsResult && (
                    <div className="mt-4 space-y-4 pt-3 border-t border-gray-100 text-gray-900 animate-fadeIn">
                      <div className="p-4 bg-gradient-to-br from-purple-50/80 via-white to-indigo-50/50 border border-purple-200/80 rounded-2xl shadow-xs space-y-4">
                        {/* Header */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-purple-100 pb-3">
                          <div className="flex items-center gap-2">
                            <div className="p-2 rounded-xl bg-purple-600 text-white shadow-xs">
                              <Layers size={18} />
                            </div>
                            <div>
                              <h4 className="font-extrabold text-sm text-gray-900 flex items-center gap-2">
                                {msg.sceneVisualsResult.storyboard.title}
                                <span className="text-[10px] font-mono font-bold px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-full border border-emerald-200">
                                  Visuals Ready ({msg.sceneVisualsResult.scenes.length} Scenes)
                                </span>
                              </h4>
                              <p className="text-[11.5px] text-gray-500 font-medium mt-0.5">
                                Review keyframe visuals and script. You can modify any individual scene or approve to generate the final 10s Omni video.
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* Visuals & Script Table Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                          {msg.sceneVisualsResult.scenes.map((scene, sIdx) => (
                            <div key={sIdx} className="p-3 bg-white border border-gray-200 hover:border-purple-300 rounded-2xl shadow-2xs transition-all flex flex-col justify-between space-y-2.5">
                              <div>
                                {/* Scene Header & Timing */}
                                <div className="flex items-center justify-between mb-2">
                                  <div className="flex items-center gap-1.5">
                                    <span className="w-5 h-5 rounded-full bg-purple-600 text-white text-[11px] font-black flex items-center justify-center">
                                      {scene.sceneNumber}
                                    </span>
                                    <span className="font-extrabold text-xs text-gray-900 truncate max-w-[140px]">{scene.title}</span>
                                  </div>
                                  <span className="text-[9.5px] font-mono font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                                    {scene.timeRange}
                                  </span>
                                </div>

                                {/* Image Preview */}
                                <div className="relative aspect-video w-full bg-slate-950 rounded-xl overflow-hidden border border-gray-200 flex items-center justify-center group">
                                  <img
                                    src={formatImageSrc(scene.imageUrl)}
                                    alt={`Scene ${scene.sceneNumber}`}
                                    className="w-full h-full object-contain cursor-pointer group-hover:scale-105 transition-transform duration-300"
                                    onClick={() => openImageInNewTab(scene.imageUrl)}
                                    title="Click to view full size"
                                  />
                                  <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                                    <button
                                      onClick={() => openImageInNewTab(scene.imageUrl)}
                                      className="p-1 bg-black/70 hover:bg-black text-white rounded-md text-[10px]"
                                      title="Fullscreen"
                                    >
                                      <Maximize2 size={12} />
                                    </button>
                                    <a
                                      href={formatImageSrc(scene.imageUrl)}
                                      download={`scene_${scene.sceneNumber}_visual.png`}
                                      className="p-1 bg-black/70 hover:bg-black text-white rounded-md text-[10px]"
                                      title="Download Scene Image"
                                    >
                                      <Download size={12} />
                                    </a>
                                  </div>
                                </div>

                                {/* Script / Dialogue & Action */}
                                <div className="mt-2.5 space-y-1.5">
                                  <div className="p-2 bg-slate-50 border border-slate-150 rounded-lg">
                                    <span className="text-[9.5px] font-bold uppercase text-purple-700 block">Voiceover Line</span>
                                    <p className="text-[10.5px] text-gray-800 italic leading-snug">"{scene.dialogueOrScript}"</p>
                                    {scene.onScreenText && scene.onScreenText.trim().length > 0 && (
                                      <div className="pt-1 border-t border-slate-200/60 mt-1">
                                        <span className="text-[9px] font-bold uppercase text-amber-700 block">On-Screen Text</span>
                                        <p className="text-[10px] font-semibold text-gray-900 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200/80 inline-block mt-0.5">
                                          "{scene.onScreenText}"
                                        </p>
                                      </div>
                                    )}
                                  </div>
                                  <p className="text-[10.5px] text-gray-600 line-clamp-2 leading-relaxed">
                                    <strong>Action:</strong> {scene.actionDescription}
                                  </p>
                                </div>
                              </div>

                              {/* Individual Scene Actions */}
                              <div className="pt-2 border-t border-gray-100 flex items-center justify-between gap-1">
                                <button
                                  onClick={() => handleOptionClick({
                                    label: `🔄 Regenerate Scene ${scene.sceneNumber} Image`,
                                    action: "regenerate_single_scene",
                                    payload: { 
                                      sceneIndex: sIdx, 
                                      storyboard: msg.sceneVisualsResult?.storyboard, 
                                      sceneVisuals: msg.sceneVisualsResult?.scenes 
                                    }
                                  })}
                                  className="text-[10px] font-bold text-purple-700 hover:text-purple-900 bg-purple-50 hover:bg-purple-100 px-2 py-1 rounded-lg transition-colors flex items-center gap-1"
                                  title="Regenerate this specific scene visual"
                                >
                                  <RefreshCw size={10} /> Re-roll Visual
                                </button>
                                <span className="text-[9px] text-gray-400 font-mono">16:9 • Gemini 3.1</span>
                              </div>
                            </div>
                          ))}
                        </div>

                        {/* Final Video Approval Bar */}
                        <div className="pt-3 border-t border-purple-100 flex flex-wrap items-center justify-between gap-2">
                          <span className="text-[11px] text-gray-500 font-medium">
                            Ready to synthesize the continuous 10-second commercial with <strong>Gemini Omni</strong>?
                          </span>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleOptionClick({
                                label: "✏️ Request Scene Modifications",
                                action: "prompt_modify_scenes",
                                payload: { 
                                  storyboard: msg.sceneVisualsResult.storyboard, 
                                  sceneVisuals: msg.sceneVisualsResult.scenes 
                                }
                              })}
                              className="px-3 py-1.5 bg-white hover:bg-gray-50 text-gray-700 border border-gray-200 rounded-xl text-xs font-bold transition flex items-center gap-1 shadow-2xs"
                            >
                              <Pencil size={12} /> Request Changes
                            </button>
                            <button
                              onClick={() => handleOptionClick({
                                label: "🎬 Approve & Render 10s Omni Video",
                                action: "approve_scene_visuals",
                                payload: { 
                                  storyboard: msg.sceneVisualsResult.storyboard, 
                                  sceneVisuals: msg.sceneVisualsResult.scenes 
                                }
                              })}
                              className="px-4 py-1.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-md"
                            >
                              <Sparkles size={13} /> Approve & Render 10s Omni Video
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Catalog Retrieval Results Grid */}
                  {msg.catalogResults && msg.catalogResults.matchedAssets.length > 0 && (
                    <div className="mt-4 space-y-3 pt-3 border-t border-gray-100 text-gray-900">
                      <div className="flex items-center justify-between">
                        <span className="text-2xs font-extrabold text-indigo-700 uppercase tracking-wider flex items-center gap-1.5">
                          <Layers size={13} className="text-indigo-600" />
                          GCS Creative Catalog ({msg.catalogResults.matchedAssets.length} Assets Found)
                        </span>
                        <span className="text-2xs text-gray-400 font-medium">Persisted in Google Cloud Storage</span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                        {msg.catalogResults.matchedAssets.map((asset, aIdx) => (
                          <div 
                            key={asset.id || aIdx}
                            className="p-3 bg-white border border-gray-200 hover:border-indigo-300 rounded-2xl shadow-xs transition-all space-y-2 flex flex-col justify-between"
                          >
                            <div>
                              <div className="flex items-center justify-between mb-1.5">
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                                  asset.type === 'edit' ? 'bg-pink-100 text-pink-700 border border-pink-200' :
                                  asset.type === 'aspect_ratio' ? 'bg-indigo-100 text-indigo-700 border border-indigo-200' :
                                  asset.type === 'upload' ? 'bg-blue-100 text-blue-700 border border-blue-200' :
                                  'bg-purple-100 text-purple-700 border border-purple-200'
                                }`}>
                                  {asset.type.replace('_', ' ')}
                                </span>
                                {asset.aspectRatio && (
                                  <span className="text-[10px] text-gray-400 font-semibold">{asset.aspectRatio}</span>
                                )}
                              </div>

                              <div className="h-36 bg-gray-50 rounded-xl overflow-hidden border border-gray-100 flex items-center justify-center relative group">
                                {asset.mediaType === 'video' ? (
                                  <video 
                                    src={formatVideoSrc(asset.url)}
                                    className="max-w-full max-h-full object-contain"
                                    controls
                                  />
                                ) : (
                                  <img 
                                    src={formatImageSrc(asset.url)} 
                                    alt={asset.metadata?.coreContent || "Catalog Asset"}
                                    className="max-w-full max-h-full object-contain cursor-pointer group-hover:scale-105 transition-transform"
                                    onClick={() => openImageInNewTab(asset.url)}
                                    title="Click to view full size"
                                  />
                                )}
                              </div>

                              {/* Asset Description & Query */}
                              <div className="mt-2 space-y-1">
                                {asset.query && (
                                  <p className="text-[11px] font-bold text-gray-800 line-clamp-1" title={asset.query}>
                                    "{asset.query}"
                                  </p>
                                )}
                                {asset.metadata?.coreContent && (
                                  <p className="text-[10px] text-gray-500 line-clamp-2" title={asset.metadata.coreContent}>
                                    {asset.metadata.coreContent}
                                  </p>
                                )}
                                <div className="flex items-center gap-1 flex-wrap pt-0.5">
                                  {asset.metadata?.tags?.slice(0, 3).map((tag, tIdx) => (
                                    <span key={tIdx} className="text-[9px] bg-gray-100 text-gray-600 px-1.5 py-0.2 rounded">
                                      #{tag}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            </div>

                            {/* Actions on this asset */}
                            <div className="pt-2 border-t border-gray-100 flex items-center justify-between gap-1">
                              <button
                                onClick={() => {
                                  setCurrentReferenceImage(asset.url);
                                  handleOptionClick({ label: `🎨 Edit "${asset.query || asset.id}"`, action: "prompt_for_edit", payload: { imageBase64: asset.url } });
                                }}
                                className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-2 py-1 rounded-lg transition-colors flex items-center gap-1"
                              >
                                <Wand2 size={10} /> Edit
                              </button>
                              <button
                                onClick={() => {
                                  setCurrentReferenceImage(asset.url);
                                  handleOptionClick({ label: "📐 9 Ratios", action: "generate_aspect_ratios", payload: { imageBase64: asset.url } });
                                }}
                                className="text-[10px] font-bold text-gray-600 hover:text-gray-900 bg-gray-100 hover:bg-gray-200 px-2 py-1 rounded-lg transition-colors flex items-center gap-1"
                              >
                                <Maximize2 size={10} /> Ratios
                              </button>
                              <a
                                href={formatImageSrc(asset.url)}
                                download={`${asset.id || 'creative_asset'}.jpg`}
                                className="text-[10px] font-bold text-gray-500 hover:text-gray-800 p-1 hover:bg-gray-100 rounded-lg transition-colors"
                                title="Download Asset"
                              >
                                <Download size={12} />
                              </a>
                            </div>
                          </div>
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
                  className="w-8 h-8 rounded-full text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs mt-0.5 bg-pink-700"
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
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-pink-600 to-rose-600 text-white flex items-center justify-center shrink-0 shadow-2xs">
              <Loader2 size={16} className="animate-spin" />
            </div>
            <div className="bg-white border border-gray-200 px-4 py-3 rounded-2xl rounded-bl-xs text-xs text-gray-600 shadow-xs flex items-center gap-2">
              <div className="animate-pulse flex items-center gap-2">
                <span className="inline-block w-2 h-2 rounded-full bg-pink-600"></span>
                <span className="font-semibold text-gray-800">{statusMessage || 'Transforming creative with Gemini...'}</span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Slide-in Past Sessions History Drawer */}
      {showHistoryDrawer && (
        <div className="fixed inset-y-0 right-0 w-80 sm:w-96 bg-white border-l border-gray-200 shadow-2xl z-50 flex flex-col animate-slideLeft">
          <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-pink-50/50">
            <div className="flex items-center gap-2">
              <History size={16} className="text-pink-700" />
              <span className="font-bold text-sm text-gray-900">Creative Chat History</span>
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
              className="text-xs font-bold text-pink-700 hover:text-pink-800 flex items-center gap-1"
            >
              <Plus size={13} /> New Chat
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
            {sessionsHistory.length === 0 ? (
              <div className="text-center py-12 text-gray-400 text-xs">
                No past sessions recorded yet. Upload an image or video to save sessions automatically.
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
                        ? 'bg-pink-50 border-pink-300 shadow-xs' 
                        : 'bg-white hover:bg-gray-50 border-gray-200 hover:border-pink-300'
                    }`}
                  >
                    {sess.previewVideo ? (
                      <div className="w-12 h-12 rounded-xl bg-slate-900 text-white overflow-hidden shrink-0 flex items-center justify-center relative">
                        <video 
                          src={formatVideoSrc(sess.previewVideo)}
                          className="w-full h-full object-cover opacity-70"
                          muted
                        />
                        <Film size={14} className="absolute text-white" />
                        {sess.isPinned && (
                          <div className="absolute top-0.5 right-0.5 bg-amber-400 text-amber-950 p-0.5 rounded-full shadow-2xs z-10" title="Pinned to top">
                            <Star size={9} className="fill-amber-950" />
                          </div>
                        )}
                      </div>
                    ) : sess.previewImage ? (
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
                      <div className="w-12 h-12 rounded-xl bg-pink-100 text-pink-700 flex items-center justify-center shrink-0 relative">
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
                              className="w-full px-2 py-0.5 text-xs font-bold text-gray-900 bg-white border border-pink-400 rounded-md focus:outline-hidden focus:ring-1 focus:ring-pink-500"
                              autoFocus
                            />
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRenameSession(sess.sessionId, editingTitle);
                                setEditingSessionId(null);
                              }}
                              className="p-1 text-pink-700 hover:text-pink-900 hover:bg-pink-100 rounded"
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
                              {isActive && (
                                <span className="text-[9px] font-extrabold text-pink-700 bg-pink-200/80 px-1.5 py-0.2 rounded-full">
                                  Active
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
                                className="text-gray-400 hover:text-pink-700 p-1 rounded-lg hover:bg-pink-50 opacity-0 group-hover:opacity-100 transition-opacity"
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
        <div className="bg-white border border-gray-300 rounded-3xl shadow-xl p-3 sm:p-4 space-y-2 transition-all focus-within:border-pink-600 focus-within:ring-2 focus-within:ring-pink-100 pointer-events-auto">
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
              placeholder="Ask Creative Agent (e.g. 'Generate 9 aspect ratios', 'Edit video background to tailgate')..."
              rows={1}
              className="w-full resize-none border-none outline-none text-sm text-gray-800 placeholder-gray-400 bg-transparent max-h-32 min-h-[2.5rem] py-1"
            />

            <button
              onClick={() => handleSendMessage()}
              disabled={!inputPrompt.trim() || isLoading}
              className="p-2.5 rounded-full bg-pink-700 hover:bg-pink-800 disabled:bg-gray-200 text-white transition-all shadow-xs shrink-0"
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
                        fileInputRef.current?.click();
                      }}
                      className="w-full px-3 py-2 text-left hover:bg-pink-50 text-gray-700 flex items-center gap-2"
                    >
                      <Upload size={14} className="text-pink-600" />
                      Upload New Image
                    </button>
                    <button
                      onClick={() => {
                        setShowPlusMenu(false);
                        videoInputRef.current?.click();
                      }}
                      className="w-full px-3 py-2 text-left hover:bg-pink-50 text-gray-700 flex items-center gap-2"
                    >
                      <Film size={14} className="text-indigo-600" />
                      Upload Video (MP4)
                    </button>
                    <button
                      onClick={() => {
                        setShowPlusMenu(false);
                        handleSendMessage("Generate multiple aspect ratios of the uploaded image");
                      }}
                      className="w-full px-3 py-2 text-left hover:bg-pink-50 text-gray-700 flex items-center gap-2"
                    >
                      <Maximize2 size={14} className="text-indigo-600" />
                      Generate 9 Aspect Ratios
                    </button>
                    <button
                      onClick={() => {
                        setShowPlusMenu(false);
                        handleSendMessage("Change video background to a sunny autumn football tailgate");
                      }}
                      className="w-full px-3 py-2 text-left hover:bg-pink-50 text-gray-700 flex items-center gap-2"
                    >
                      <Wand2 size={14} className="text-amber-600" />
                      Edit Video: Tailgate Scene
                    </button>
                    {sessionsHistory.length > 0 && (
                      <button
                        onClick={() => {
                          setShowPlusMenu(false);
                          setShowHistoryDrawer(true);
                        }}
                        className="w-full px-3 py-2 text-left hover:bg-pink-50 text-gray-700 flex items-center gap-2"
                      >
                        <History size={14} className="text-purple-600" />
                        Browse Chat History ({sessionsHistory.length})
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Model Callout Badge in Light Gray */}
              <span className="text-[11px] font-medium text-gray-400 bg-gray-100/90 px-2 py-0.5 rounded-md flex items-center gap-1 border border-gray-200/60 shadow-2xs">
                <Sparkles size={11} className="text-gray-400" />
                gemini-3.1-flash-lite-image / gemini-omni
              </span>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowHistoryDrawer(!showHistoryDrawer)}
                className="text-[11px] font-semibold text-gray-500 hover:text-pink-700 flex items-center gap-1 transition-colors"
                title="View Past Sessions"
              >
                <History size={12} />
                History ({sessionsHistory.length})
              </button>

              <button
                onClick={handleResetChat}
                disabled={isLoading || messages.length === 0}
                className="text-[11px] font-semibold text-gray-500 hover:text-red-600 flex items-center gap-1 disabled:opacity-40 transition-colors"
                title="New Creative Chat Session"
              >
                <Plus size={12} />
                New Chat
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
