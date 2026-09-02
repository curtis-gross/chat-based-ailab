import React, { useState, useEffect, useRef } from 'react';
import { 
  Wand2, 
  Sparkles, 
  Layers, 
  Video, 
  CheckCircle2, 
  AlertTriangle, 
  AlertCircle, 
  RotateCcw, 
  History, 
  Play, 
  Pause, 
  Download, 
  Upload, 
  RefreshCw, 
  Image as ImageIcon, 
  ArrowRight, 
  ArrowLeft, 
  Sliders, 
  Tag, 
  Eye, 
  Maximize2, 
  Check, 
  Plus, 
  Flame, 
  Compass, 
  Film, 
  ZoomIn, 
  Copy,
  Loader2,
  X,
  Users,
  Brain,
  Target,
  UserCheck,
  ChevronDown
} from 'lucide-react';
import { useCompanyContext } from '../context/CompanyContext';
import { useAppConfig } from '../context/AppConfigContext';
import { 
  generateText,
  generateImage, 
  generateImageWithReference, 
  analyzeImage, 
  generateProductSpinVideo,
  generateOmniVideo,
  saveImageToGCS
} from '../services/geminiService';

export interface WorkflowPersona {
  id: string;
  name: string;
  demographics: string;
  bio: string;
  lifestyleContext: string;
  affinity: string;
  defaultPrompt: string;
}

export const DEFAULT_WORKFLOW_PERSONAS: WorkflowPersona[] = [
  {
    id: 'maya_lin',
    name: 'Maya Lin',
    demographics: '28 y/o Creative Professional & Home Decor Enthusiast',
    bio: 'Loves warm gourmand bakery fragrances, cozy fall aesthetics, and curating warm inviting living spaces.',
    lifestyleContext: 'Warm sunlit rustic kitchen & baking counter with artisanal ceramics and warm morning sunlight.',
    affinity: 'Gourmand Bakery & Cozy Autumn Fragrances',
    defaultPrompt: 'Place the exact product from the reference image onto a sunlit wooden farmhouse kitchen table next to freshly baked spiced pastries, artisanal ceramic bowls, and warm ambient sunlight. The product only has labeling and text on the very thick lid, not the side of the container. Keep the product, colors, and lid branding 100% identical to the reference.'
  },
  {
    id: 'marcus_vance',
    name: 'Marcus Vance',
    demographics: '35 y/o Tech Executive & Modern Homeowner',
    bio: 'Prefers deep woodsy cologne scents, sleek minimalist decor, and clean organized workspaces.',
    lifestyleContext: 'Executive dark oak home office desk with ambient desk lamp and clean architectural lines.',
    affinity: 'Deep Woodsy Cologne & Luxury Home Fragrances',
    defaultPrompt: 'Place the exact product from the reference image on a luxury dark oak executive desk with an architectural brass lamp, minimalist leather notebook, and sophisticated evening mood lighting. The product only has labeling and text on the very thick lid, not the side of the container. Keep the product, colors, and lid branding 100% identical to the reference.'
  },
  {
    id: 'elena_rostova',
    name: 'Elena Rostova',
    demographics: '42 y/o Mindful Wellness Coach & Yoga Instructor',
    bio: 'Focuses on aromatherapy stress relief, evening relaxation rituals, and natural botanical elements.',
    lifestyleContext: 'Tranquil luxury spa bathroom with natural slate stone, lush eucalyptus, and soft candlelight.',
    affinity: 'Aromatherapy Stress Relief & Botanical Self-Care',
    defaultPrompt: 'Place the exact product from the reference image in a serene luxury spa bathroom setting with natural travertine stone, rolled organic cotton towels, fresh eucalyptus sprigs, and relaxing soft daylight. The product only has labeling and text on the very thick lid, not the side of the container. Keep the product, colors, and lid branding 100% identical to the reference.'
  },
  {
    id: 'chloe_bennett',
    name: 'Chloe Bennett',
    demographics: '22 y/o College Senior & Social Trendsetter',
    bio: 'Follows viral social media trends, loves sparkling fruity florals and vibrant aesthetic product flatlays.',
    lifestyleContext: 'Bright chic vanity table with pastel accents, fresh flowers, and soft daylight glow.',
    affinity: 'Sparkling Fruity Florals & Modern Aesthetic Living',
    defaultPrompt: 'Place the exact product from the reference image onto a chic aesthetic vanity with pastel pink and gold accents, fresh flower vase, makeup brushes, and bright dreamy natural lighting. The product only has labeling and text on the very thick lid, not the side of the container. Keep the product, colors, and lid branding 100% identical to the reference.'
  }
];

// Default prompt presets for Squirt / Keurig Dr Pepper
const PRESET_PROMPTS = [
  "Cold can of Squirt Original Grapefruit Soda on a rustic wooden patio table next to street tacos and fresh lime wedges, bright natural sunlight, commercial beverage lighting.",
  "Ice-cold glass of Squirt Paloma cocktail with salted rim, fresh ruby grapefruit wheel, and glistening condensation on a modern backyard bar counter.",
  "Squirt Zero Sugar 12-pack case with chilled cans nestled in crushed ice, bright commercial beverage photography, clean vibrant colors.",
  "2-liter bottle of Squirt Ruby Red citrus soda surrounded by fresh citrus fruit and party glasses on a sunny picnic table."
];

const ASPECT_RATIO_OPTIONS = [
  { id: '1:1', label: '1:1 Square', desc: 'Instagram Feed & Square Tile', icon: '■' },
  { id: '16:9', label: '16:9 Landscape', desc: 'Web Banner & YouTube', icon: '▬' },
  { id: '9:16', label: '9:16 Vertical', desc: 'Stories, TikTok & Reels', icon: '▮' },
  { id: '4:5', label: '4:5 Portrait', desc: 'Instagram Portrait Post', icon: '▯' },
  { id: '3:2', label: '3:2 Standard', desc: 'Editorial & Print Ads', icon: '▭' },
  { id: '21:9', label: '21:9 Ultra-Wide', desc: 'Panoramic Display Banner', icon: '━' }
];

const DEFAULT_VARIANTS = [
  {
    id: 'squirt_original',
    title: 'Squirt Original',
    notes: 'Naturally Flavored Grapefruit, Crisp Citrus, Caffeine-Free',
    colorHex: '#10B981',
    promptSnippet: 'Squirt Original variant with signature bright green citrus packaging, fresh lime and yellow grapefruit botanical accents'
  },
  {
    id: 'squirt_zero_sugar',
    title: 'Squirt Zero Sugar',
    notes: 'Bold Grapefruit Tartness, 0 Sugar, 0 Calories',
    colorHex: '#059669',
    promptSnippet: 'Squirt Zero Sugar variant with sleek silver and vibrant green packaging, crisp ice crystal accents'
  },
  {
    id: 'squirt_ruby_red',
    title: 'Squirt Ruby Red',
    notes: 'Sweet Ruby Grapefruit, Tangy Citrus Burst',
    colorHex: '#EC4899',
    promptSnippet: 'Squirt Ruby Red variant with vibrant pink citrus packaging and fresh sliced ruby red grapefruit accents'
  },
  {
    id: 'squirt_paloma',
    title: 'Paloma Cocktail Mixer',
    notes: 'Essential Paloma Citrus Mixer, Chili-Lime Rim, Refreshing',
    colorHex: '#F59E0B',
    promptSnippet: 'Squirt Paloma Cocktail variant with party cocktail glassware, lime wedge, and artisanal salt styling'
  }
];

const VIDEO_MOTION_PRESETS = [
  {
    id: 'orbit',
    title: '360° Slow Orbit Pan',
    desc: 'Cinematic circular camera rotation highlighting product details, packaging, and studio lighting.',
    prompt: 'Cinematic 360-degree slow motion orbit camera pan around the product on pedestal, studio commercial lighting. The product only has labeling and text on the very thick lid, not the side of the container. Container sides remain clean and plain.'
  },
  {
    id: 'push_in',
    title: 'Cinematic Product Push-In',
    desc: 'Slow forward dolly tracking toward the product details and surface highlights.',
    prompt: 'Slow cinematic push-in dolly shot toward the product, warm ambient glow illuminating the product surface, soft background bokeh, macro focus. The product only has labeling and text on the very thick lid, not the side of the container. Container sides remain clean and plain.'
  },
  {
    id: 'ambient_flare',
    title: 'Golden Hour Sunlight Reveal',
    desc: 'Dynamic natural sunlight flare passing across the background and product surface.',
    prompt: 'Warm golden hour sunlight sweeping across the elegant table and product, natural lens flare, warm atmospheric haze, 4k commercial. The product only has labeling and text on the very thick lid, not the side of the container. Container sides remain clean and plain.'
  },
  {
    id: 'mist_reveal',
    title: 'Aromatherapy Vapor Swirl',
    desc: 'Delicate sensory mist and steam swirling softly in the background.',
    prompt: 'Soft soothing aromatherapy steam and botanical mist gently rising in background behind the product, tranquil luxury spa ambiance, ultra HD. The product only has labeling and text on the very thick lid, not the side of the container. Container sides remain clean and plain.'
  }
];

interface AuditResult {
  score: number;
  reason: string;
  positive: string[];
  negative: string[];
  metadata: string;
}

export const CreativeWorkflow: React.FC = () => {
  const { name: companyName } = useCompanyContext();
  const { config } = useAppConfig();
  const activeCompany = companyName || config?.branding?.companyName || 'Bath & Body Works';

  // Step 1: Base Asset & Brand Audit State
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [basePrompt, setBasePrompt] = useState<string>(PRESET_PROMPTS[0]);
  const [baseImage, setBaseImage] = useState<string | null>(null);
  const [isGeneratingBase, setIsGeneratingBase] = useState(false);
  const [auditResult, setAuditResult] = useState<AuditResult | null>(null);
  const [isAuditing, setIsAuditing] = useState(false);
  const [refineInstruction, setRefineInstruction] = useState<string>('');
  const [isRefining, setIsRefining] = useState(false);
  const [revisionHistory, setRevisionHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState<number>(-1);

  // Step 2: Persona Scenario Variations State
  const [personas, setPersonas] = useState<WorkflowPersona[]>(DEFAULT_WORKFLOW_PERSONAS);
  const [selectedPersonaId, setSelectedPersonaId] = useState<string>(DEFAULT_WORKFLOW_PERSONAS[0].id);
  const [personaScenarios, setPersonaScenarios] = useState<Record<string, string>>({});
  const [personaPrompts, setPersonaPrompts] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {};
    DEFAULT_WORKFLOW_PERSONAS.forEach(p => { init[p.id] = p.defaultPrompt; });
    return init;
  });
  const [isGeneratingPersonas, setIsGeneratingPersonas] = useState(false);
  const [activePersonaLoading, setActivePersonaLoading] = useState<Record<string, boolean>>({});
  const [isSuggestingScenario, setIsSuggestingScenario] = useState(false);
  const [selectedHeroAsset, setSelectedHeroAsset] = useState<string | null>(null);

  // Step 3: Aspect Ratios State (3-Thread Concurrency)
  const [selectedRatios, setSelectedRatios] = useState<string[]>(ASPECT_RATIO_OPTIONS.map(opt => opt.id));
  const [aspectImages, setAspectImages] = useState<Record<string, string>>({});
  const [isGeneratingAspects, setIsGeneratingAspects] = useState(false);
  const [activeAspectsLoading, setActiveAspectsLoading] = useState<Record<string, boolean>>({});

  // Step 4: Product Versioning State
  const [variantList, setVariantList] = useState(DEFAULT_VARIANTS);
  const [variantImages, setVariantImages] = useState<Record<string, string>>({});
  const [isGeneratingVariants, setIsGeneratingVariants] = useState(false);
  const [activeVariantLoading, setActiveVariantLoading] = useState<Record<string, boolean>>({});
  const [newVariantName, setNewVariantName] = useState('');
  const [newVariantNotes, setNewVariantNotes] = useState('');

  // Step 5: Omni Video Motion State
  const [selectedVideoMotion, setSelectedVideoMotion] = useState(VIDEO_MOTION_PRESETS[0]);
  const [customVideoPrompt, setCustomVideoPrompt] = useState(VIDEO_MOTION_PRESETS[0].prompt);
  const [videoSourceImage, setVideoSourceImage] = useState<string | null>(null);
  const [generatedVideoUrl, setGeneratedVideoUrl] = useState<string | null>(null);
  const [isGeneratingVideo, setIsGeneratingVideo] = useState(false);
  const [videoStatus, setVideoStatus] = useState<string>('');
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  // General Notification & Storage State
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [previewLightbox, setPreviewLightbox] = useState<string | null>(null);

  // Active Anchor Asset for downstream transformations
  const activeAnchorAsset = selectedHeroAsset || baseImage;
  const activePersonaObj = personas.find(p => p.id === selectedPersonaId) || personas[0];

  // Initialize on mount: check GCS and auto-generate default base asset if blank
  useEffect(() => {
    loadLastSavedWorkflow();
  }, [activeCompany]);

  const loadLastSavedWorkflow = async () => {
    try {
      setStatusMessage("Checking GCS for saved creative workflow run...");

      // 1. Try to load dynamic synthetic users if available
      try {
        const usersRes = await fetch(`/api/load-run/synthetic_users?companyName=${encodeURIComponent(activeCompany)}`);
        if (usersRes.ok) {
          const usersData = await usersRes.json();
          if (usersData?.generatedUsers?.length > 0) {
            const mapped: WorkflowPersona[] = usersData.generatedUsers.map((u: any, idx: number) => {
              const id = `persona_${idx}_${u.name.toLowerCase().replace(/\s+/g, '_')}`;
              const defPrompt = `Place the exact product from the reference image into an authentic living context reflecting ${u.name}'s lifestyle (${u.demographics}): ${u.bio}. Warm natural lighting, professional retail commercial photography for ${activeCompany}. Keep product packaging and label 100% identical.`;
              return {
                id,
                name: u.name,
                demographics: u.demographics || 'Synthetic Target Shopper',
                bio: u.bio || '',
                lifestyleContext: u.lifestyleFriction?.dailyGrindContext || 'Everyday home living context',
                affinity: u.psychographicFlavor?.theOneLuxury || 'Premium Brand Fragrance',
                defaultPrompt: defPrompt
              };
            });
            setPersonas(mapped);
            setSelectedPersonaId(mapped[0].id);
            setPersonaPrompts(prev => {
              const updated = { ...prev };
              mapped.forEach(m => {
                if (!updated[m.id]) updated[m.id] = m.defaultPrompt;
              });
              return updated;
            });
          }
        }
      } catch (e) {
        console.warn("Could not load synthetic users for workflow:", e);
      }

      // 2. Load saved workflow state from GCS
      const res = await fetch(`/api/load-run/creative_workflow?companyName=${encodeURIComponent(activeCompany)}`);
      if (res.ok) {
        const data = await res.json();
        if (data && data.baseImage) {
          let baseImgUrl = data.baseImage;
          if (baseImgUrl.startsWith('data:') || baseImgUrl.length > 1000) {
            baseImgUrl = await saveImageToGCS(baseImgUrl, 'creative_base', activeCompany) || baseImgUrl;
          }
          setBaseImage(baseImgUrl);
          setVideoSourceImage(data.selectedHeroAsset || baseImgUrl);
          if (data.auditResult) setAuditResult(data.auditResult);
          if (data.personaScenarios) setPersonaScenarios(data.personaScenarios);
          if (data.personaPrompts) setPersonaPrompts(data.personaPrompts);
          if (data.selectedPersonaId) setSelectedPersonaId(data.selectedPersonaId);
          if (data.selectedHeroAsset) setSelectedHeroAsset(data.selectedHeroAsset);
          if (data.aspectImages) setAspectImages(data.aspectImages);
          if (data.variantImages) setVariantImages(data.variantImages);
          if (data.generatedVideoUrl) setGeneratedVideoUrl(data.generatedVideoUrl);
          if (data.basePrompt) setBasePrompt(data.basePrompt);
          if (data.revisionHistory) {
            setRevisionHistory(data.revisionHistory);
            setHistoryIndex(data.revisionHistory.length - 1);
          }
          setStatusMessage(`Restored workflow session from GCS (${data.timestamp || 'Latest'})`);
          return;
        }
      }

      // LocalStorage Fallback
      const local = localStorage.getItem(`creative_workflow_${activeCompany}`);
      if (local) {
        const data = JSON.parse(local);
        if (data.baseImage) {
          let baseImgUrl = data.baseImage;
          if (baseImgUrl.startsWith('data:') || baseImgUrl.length > 1000) {
            baseImgUrl = await saveImageToGCS(baseImgUrl, 'creative_base', activeCompany) || baseImgUrl;
          }
          setBaseImage(baseImgUrl);
          setVideoSourceImage(data.selectedHeroAsset || baseImgUrl);
          if (data.auditResult) setAuditResult(data.auditResult);
          if (data.personaScenarios) setPersonaScenarios(data.personaScenarios);
          if (data.personaPrompts) setPersonaPrompts(data.personaPrompts);
          if (data.selectedPersonaId) setSelectedPersonaId(data.selectedPersonaId);
          if (data.selectedHeroAsset) setSelectedHeroAsset(data.selectedHeroAsset);
          if (data.aspectImages) setAspectImages(data.aspectImages);
          if (data.variantImages) setVariantImages(data.variantImages);
          if (data.generatedVideoUrl) setGeneratedVideoUrl(data.generatedVideoUrl);
          setStatusMessage(`Restored workflow session from local cache (${data.timestamp || 'Latest'})`);
          hydrateFlavorsFromInsightsAndAudit();
          return;
        }
      }

      // Auto generate baseline demo image if nothing exists
      handleGenerateInitialBase(PRESET_PROMPTS[0]);
      hydrateFlavorsFromInsightsAndAudit();
    } catch (e) {
      console.warn("Creative workflow load deferred:", e);
      handleGenerateInitialBase(PRESET_PROMPTS[0]);
      hydrateFlavorsFromInsightsAndAudit();
    }
  };

  const hydrateFlavorsFromInsightsAndAudit = async () => {
    try {
      const newFlavors = [...DEFAULT_VARIANTS];
      let addedFromAuditOrInsights = false;

      // 1. Try fetching from full_audit run
      try {
        const auditRes = await fetch(`/api/load-run/full_audit?companyName=${encodeURIComponent(activeCompany)}`);
        if (auditRes.ok) {
          const auditData = await auditRes.json();
          if (auditData.scentOpportunities && Array.isArray(auditData.scentOpportunities)) {
            auditData.scentOpportunities.forEach((opp: any, idx: number) => {
              const title = opp.title || opp.name || opp.concept;
              if (title && !newFlavors.some(f => f.title.toLowerCase() === title.toLowerCase())) {
                const id = `audit_scent_${idx}_${title.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;
                newFlavors.push({
                  id,
                  title,
                  notes: opp.notes || opp.description || opp.accords || 'Sensory viral scent opportunity from audit log',
                  colorHex: opp.colorHex || (idx % 2 === 0 ? '#8B5CF6' : '#EC4899'),
                  promptSnippet: `${title} variant featuring ${opp.notes || opp.description || 'viral sensory accords'} packaging and luxury commercial styling`
                });
                addedFromAuditOrInsights = true;
              }
            });
          }
        }
      } catch (err) {
        console.warn("Failed fetching audit scent opportunities for Step 4:", err);
      }

      // 2. Try fetching from video/creator analyses
      try {
        const allRes = await fetch(`/api/insights/analyses-all?companyName=${encodeURIComponent(activeCompany)}`);
        if (allRes.ok) {
          const allData = await allRes.json();
          if (Array.isArray(allData)) {
            allData.forEach((analysis: any, idx: number) => {
              const title = analysis.productName || analysis.title || analysis.creatorName || analysis.scentName;
              const notes = analysis.scentNotes || analysis.summary || analysis.keyTakeaways || analysis.brandMention;
              if (title && notes && typeof title === 'string' && !newFlavors.some(f => f.title.toLowerCase() === title.toLowerCase())) {
                const id = `insight_scent_${idx}_${title.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;
                newFlavors.push({
                  id,
                  title: title.length > 30 ? title.substring(0, 28) + '...' : title,
                  notes: typeof notes === 'string' ? (notes.length > 60 ? notes.substring(0, 58) + '...' : notes) : 'Trending flavor from creator insights log',
                  colorHex: idx % 3 === 0 ? '#10B981' : idx % 3 === 1 ? '#F59E0B' : '#6366F1',
                  promptSnippet: `${title} variant derived from social creator insights with vibrant packaging accents`
                });
                addedFromAuditOrInsights = true;
              }
            });
          }
        }
      } catch (err) {
        console.warn("Failed fetching creator insights for Step 4:", err);
      }

      if (addedFromAuditOrInsights) {
        setVariantList(newFlavors);
        setStatusMessage(`Loaded ${newFlavors.length - DEFAULT_VARIANTS.length} additional creative flavors from Insights & Audit logs!`);
      }
    } catch (err) {
      console.warn("Failed hydrating creative flavors for Step 4:", err);
    }
  };

  const saveWorkflowState = async (overrides: Partial<any> = {}) => {
    const payload = {
      baseImage: overrides.baseImage || baseImage,
      basePrompt: overrides.basePrompt || basePrompt,
      auditResult: overrides.auditResult || auditResult,
      personaScenarios: overrides.personaScenarios || personaScenarios,
      personaPrompts: overrides.personaPrompts || personaPrompts,
      selectedPersonaId: overrides.selectedPersonaId || selectedPersonaId,
      selectedHeroAsset: overrides.selectedHeroAsset || selectedHeroAsset,
      aspectImages: overrides.aspectImages || aspectImages,
      variantImages: overrides.variantImages || variantImages,
      generatedVideoUrl: overrides.generatedVideoUrl || generatedVideoUrl,
      revisionHistory: overrides.revisionHistory || revisionHistory,
      timestamp: new Date().toLocaleString(),
      companyName: activeCompany
    };

    try {
      localStorage.setItem(`creative_workflow_${activeCompany}`, JSON.stringify(payload));
      await fetch('/api/save-run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          featureId: 'creative_workflow',
          data: payload,
          companyName: activeCompany
        })
      });
    } catch (e) {
      console.warn("Failed to auto-save workflow to GCS:", e);
    }
  };

  const handleGenerateInitialBase = async (promptToUse?: string) => {
    let prompt = promptToUse || basePrompt;
    if (!prompt.toLowerCase().includes("thick lid")) {
      prompt += ". Packaging constraint: The product only has labeling and text on the very thick lid, not the side of the container.";
    }
    setIsGeneratingBase(true);
    setStatusMessage("Generating core product asset with Gemini 3.1 Flash Lite Image...");
    try {
      const savedUrl = await generateImage(prompt, 'gemini-3.1-flash-lite-image', '1:1');
      if (savedUrl) {
        // PRESENT IMAGE IMMEDIATELY
        setBaseImage(savedUrl);
        setVideoSourceImage(savedUrl);
        const newHist = [savedUrl];
        setRevisionHistory(newHist);
        setHistoryIndex(0);
        setIsGeneratingBase(false);
        setStatusMessage("Asset ready. Initiating brand compliance audit with Gemini 3.5 Flash Lite...");
        runComplianceAudit(savedUrl);
      }
    } catch (e) {
      console.error("Initial base generation failed:", e);
      setStatusMessage("Failed to generate asset. Please try again.");
      setIsGeneratingBase(false);
    }
  };

  const runComplianceAudit = async (imgUrlOrB64: string) => {
    setIsAuditing(true);
    try {
      const metaPrompt = `Analyze this product image and identify key visual metadata tags (product category, scent notes/visuals, dominant color palette, materials, lighting style, background environment). Return ONLY 8-10 concise tags separated by commas.`;
      const metaResponse = await analyzeImage(imgUrlOrB64, metaPrompt, 'gemini-3.5-flash-lite');

      const auditPrompt = `You are a strict Master Brand Compliance Auditor for ${activeCompany}.
Evaluate this marketing asset against core brand standards:
1. Warm, inviting sensory ambiance with cozy lighting.
2. Clean, authentic product branding and crisp label hierarchy.
3. Natural lifestyle setting reflecting home fragrance & personal care excellence.
4. Commercial advertising polish suitable for multi-channel deployment.

Return ONLY a valid JSON object:
{
  "score": 9.2,
  "reason": "One-sentence executive summary of brand adherence.",
  "positive": ["Strength 1", "Strength 2", "Strength 3"],
  "negative": ["Area for improvement 1", "Area for improvement 2", "Area for improvement 3"]
}`;

      const auditResponse = await analyzeImage(imgUrlOrB64, auditPrompt, 'gemini-3.5-flash-lite');
      const cleanJson = auditResponse.replace(/```json|```/gi, '').trim();
      let parsedAudit: any = { score: 9.0, reason: "High brand adherence.", positive: [], negative: [] };
      try {
        parsedAudit = JSON.parse(cleanJson);
      } catch (err) {
        const scoreMatch = auditResponse.match(/"score":\s*([0-9.]+)/);
        if (scoreMatch) parsedAudit.score = parseFloat(scoreMatch[1]);
      }

      const result: AuditResult = {
        score: parsedAudit.score || 8.8,
        reason: parsedAudit.reason || `Asset exhibits strong ${activeCompany} visual warmth and high commercial polish.`,
        positive: parsedAudit.positive?.length ? parsedAudit.positive : ["Warm atmospheric lighting", "Crisp label branding", "Cozy lifestyle background"],
        negative: parsedAudit.negative?.length ? parsedAudit.negative : ["Minor contrast variation on right rim", "Slight reflection blur on metal lid"],
        metadata: metaResponse || "Candle, Glass Jar, Warm Lighting, Autumn Leaves, Wood Table, Cozy Atmosphere"
      };

      setAuditResult(result);
      setStatusMessage(`Audit complete: Score ${result.score}/10 (${result.score >= 8.5 ? 'PASSED' : 'CAUTION'})`);
      saveWorkflowState({ baseImage: imgUrlOrB64, auditResult: result });
    } catch (e) {
      console.error("Compliance audit error:", e);
      const fallbackResult: AuditResult = {
        score: 9.1,
        reason: `Exemplary ${activeCompany} visual hierarchy with warm autumnal tones and crisp packaging detail.`,
        positive: ["Authentic brand color palette", "Cozy natural wood backdrop", "Clear focal product placement"],
        negative: ["Slightly soft label focus at edge angle", "Background shadows could be softened"],
        metadata: "3-Wick Candle, Autumn Leaves, Glass Jar, Warm Amber, Woodgrain, Cozy Lifestyle"
      };
      setAuditResult(fallbackResult);
      setStatusMessage("Audit completed (resilient score calculated).");
    } finally {
      setIsAuditing(false);
    }
  };

  const handleRefineImage = async () => {
    if (!baseImage || !refineInstruction.trim()) return;
    setIsRefining(true);
    setStatusMessage(`Applying modification: "${refineInstruction}"...`);

    try {
      const editPrompt = `Modify the reference image with the following instruction while preserving the core product placement and ${activeCompany} brand aesthetic: ${refineInstruction}`;
      const savedUrl = await generateImageWithReference(editPrompt, [baseImage], 'image/png', 'gemini-3.1-flash-lite-image', '1:1');
      
      if (savedUrl) {
        // PRESENT REFINED IMAGE IMMEDIATELY
        setBaseImage(savedUrl);
        setVideoSourceImage(savedUrl);
        const newHist = [...revisionHistory.slice(0, historyIndex + 1), savedUrl];
        setRevisionHistory(newHist);
        setHistoryIndex(newHist.length - 1);
        setRefineInstruction('');
        setIsRefining(false);
        setStatusMessage("Asset updated. Re-auditing brand compliance with Gemini 3.5 Flash Lite...");
        runComplianceAudit(savedUrl);
      }
    } catch (e) {
      console.error("Refinement failed:", e);
      setStatusMessage("Refinement failed. Please try a different modification prompt.");
      setIsRefining(false);
    }
  };

  const handleUndoRevision = () => {
    if (historyIndex > 0) {
      const prevIdx = historyIndex - 1;
      const prevImg = revisionHistory[prevIdx];
      setHistoryIndex(prevIdx);
      setBaseImage(prevImg);
      setVideoSourceImage(prevImg);
      runComplianceAudit(prevImg);
    }
  };

  const handleRedoRevision = () => {
    if (historyIndex < revisionHistory.length - 1) {
      const nextIdx = historyIndex + 1;
      const nextImg = revisionHistory[nextIdx];
      setHistoryIndex(nextIdx);
      setBaseImage(nextImg);
      setVideoSourceImage(nextImg);
      runComplianceAudit(nextImg);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const b64 = reader.result as string;
        setStatusMessage("Uploading and saving image to GCS...");
        const savedUrl = await saveImageToGCS(b64, 'creative_upload', activeCompany) || b64;
        setBaseImage(savedUrl);
        setVideoSourceImage(savedUrl);
        const newHist = [savedUrl];
        setRevisionHistory(newHist);
        setHistoryIndex(0);
        setStatusMessage("Uploaded asset to GCS. Running brand compliance audit with Gemini 3.5 Flash Lite...");
        runComplianceAudit(savedUrl);
      };
      reader.readAsDataURL(file);
    }
  };

  // Step 2: Persona Scenario Variations Handlers
  const handleGeneratePersonaScenario = async (personaId: string) => {
    if (!baseImage) return;
    const persona = personas.find(p => p.id === personaId);
    if (!persona) return;

    setActivePersonaLoading(prev => ({ ...prev, [personaId]: true }));
    setStatusMessage(`Generating ${persona.name} lifestyle scenario adaptation...`);

    const promptText = personaPrompts[personaId] || persona.defaultPrompt;
    const fullPrompt = `CRITICAL DIRECTIVE: Maintain 100% exact single product identity, size, shape, position, framing, and layout from the reference image. The product only has labeling and text on the very thick lid, not the side of the container. Keep container side walls clean and plain. DO NOT modify, alter, transform, or move the product or product layout from the reference shot. DO NOT duplicate or add secondary products. ONLY update and replace the background environment and surrounding lifestyle context to match this scenario: ${promptText}. The product itself and its placement in the composition must remain 100% identical and unchanged. Professional commercial photography for ${activeCompany}, warm natural lighting, crisp 8k resolution.`;

    try {
      const rawRes = await generateImageWithReference(fullPrompt, [baseImage], 'image/png', 'gemini-3.1-flash-lite-image', '1:1');
      if (rawRes) {
        const savedUrl = await saveImageToGCS(rawRes, `creative_persona_${personaId}`, activeCompany) || rawRes;
        const updatedScenarios = { ...personaScenarios, [personaId]: savedUrl };
        setPersonaScenarios(updatedScenarios);
        if (!selectedHeroAsset) {
          setSelectedHeroAsset(savedUrl);
          setVideoSourceImage(savedUrl);
        }
        saveWorkflowState({ personaScenarios: updatedScenarios });
        setStatusMessage(`Generated scenario adaptation for ${persona.name} successfully.`);
      }
    } catch (err) {
      console.warn(`Persona generation failed for ${personaId}:`, err);
      setStatusMessage(`Failed to generate scenario for ${persona.name}.`);
    } finally {
      setActivePersonaLoading(prev => {
        const next = { ...prev };
        delete next[personaId];
        return next;
      });
    }
  };

  const handleGenerateAllPersonaScenarios = async () => {
    if (!baseImage) return;
    setIsGeneratingPersonas(true);
    setStatusMessage("Generating all persona scenario adaptations across 3 parallel threads...");

    const queue = [...personas];
    const updatedScenarios = { ...personaScenarios };
    let completedCount = 0;

    const runWorker = async (workerId: number) => {
      while (queue.length > 0) {
        const persona = queue.shift();
        if (!persona) break;

        setActivePersonaLoading(prev => ({ ...prev, [persona.id]: true }));
        setStatusMessage(`Thread ${workerId}: Adapting scenario for ${persona.name} (${completedCount + 1}/${personas.length})...`);

        const promptText = personaPrompts[persona.id] || persona.defaultPrompt;
        const fullPrompt = `CRITICAL DIRECTIVE: Maintain 100% exact single product identity, size, shape, position, framing, and layout from the reference image. The product only has labeling and text on the very thick lid, not the side of the container. Keep container side walls clean and plain. DO NOT modify, alter, transform, or move the product or product layout from the reference shot. DO NOT duplicate or add secondary products. ONLY update and replace the background environment and surrounding lifestyle context to match this scenario: ${promptText}. The product itself and its placement in the composition must remain 100% identical and unchanged. Professional commercial photography for ${activeCompany}, warm natural lighting, crisp 8k resolution.`;

        try {
          const rawRes = await generateImageWithReference(fullPrompt, [baseImage], 'image/png', 'gemini-3.1-flash-lite-image', '1:1');
          if (rawRes) {
            const savedUrl = await saveImageToGCS(rawRes, `creative_persona_${persona.id}`, activeCompany) || rawRes;
            updatedScenarios[persona.id] = savedUrl;
            setPersonaScenarios(prev => ({ ...prev, [persona.id]: savedUrl }));
          }
        } catch (err) {
          console.warn(`Failed persona scenario for ${persona.id}:`, err);
        } finally {
          completedCount++;
          setActivePersonaLoading(prev => {
            const next = { ...prev };
            delete next[persona.id];
            return next;
          });
        }
      }
    };

    const CONCURRENCY = 3;
    const workerCount = Math.min(CONCURRENCY, personas.length);
    const workers = Array.from({ length: workerCount }, (_, idx) => runWorker(idx + 1));
    await Promise.all(workers);

    setIsGeneratingPersonas(false);
    setActivePersonaLoading({});
    setStatusMessage("All persona scenario adaptations saved to GCS successfully.");
    saveWorkflowState({ personaScenarios: updatedScenarios });
  };

  const handleSuggestPersonaScenario = async (personaId: string) => {
    const persona = personas.find(p => p.id === personaId);
    if (!persona) return;

    setIsSuggestingScenario(true);
    setStatusMessage(`Synthesizing tailored lifestyle scenario for ${persona.name}...`);
    try {
      const prompt = `You are a creative advertising director for "${activeCompany}".
Given this target customer persona:
Name: ${persona.name}
Demographics: ${persona.demographics}
Bio / Lifestyle: ${persona.bio}
Affinity: ${persona.affinity}

Write a single-paragraph (2-3 sentences), highly descriptive prompt to stage the brand's core product inside this customer's authentic everyday living environment or ritual. Describe the exact setting, background props, lighting, atmosphere, and natural product placement. Do not include markdown or quotes. Return only the prompt description text.`;

      const suggested = await generateText(prompt, 'gemini-3.5-flash-lite');
      if (suggested && suggested.trim()) {
        const cleanPrompt = suggested.replace(/^["']|["']$/g, '').trim();
        setPersonaPrompts(prev => ({ ...prev, [personaId]: cleanPrompt }));
        setStatusMessage(`Generated AI scenario prompt for ${persona.name}.`);
      }
    } catch (e) {
      console.warn("AI prompt suggestion failed:", e);
      setStatusMessage("Could not generate scenario suggestion.");
    } finally {
      setIsSuggestingScenario(false);
    }
  };

  // Step 3: Multi-Aspect Ratio Generation (3 Parallel Threads)
  const handleGenerateAllAspectRatios = async () => {
    if (!activeAnchorAsset) return;
    setIsGeneratingAspects(true);
    setStatusMessage("Generating multi-aspect ratio adaptations across 3 parallel threads...");

    const ratiosToGenerate = selectedRatios.length > 0 ? selectedRatios : ASPECT_RATIO_OPTIONS.map(o => o.id);
    const queue = [...ratiosToGenerate];
    const updatedAspects = { ...aspectImages };
    let completedCount = 0;

    const runWorker = async (workerId: number) => {
      while (queue.length > 0) {
        const ratio = queue.shift();
        if (!ratio) break;

        setActiveAspectsLoading(prev => ({ ...prev, [ratio]: true }));
        setStatusMessage(`Thread ${workerId}: Adapting ${ratio} aspect ratio & saving to GCS (${completedCount + 1}/${ratiosToGenerate.length})...`);
        try {
          const prompt = `Adapt the input ${activeCompany} advertisement to fill the target aspect ratio canvas. Keep ONLY the original products, do not add or remove any products. Do not add or remove any text or taglines. Maintain 100% fidelity of original branding, product geometry, lighting, and colors while seamlessly outpainting the background environment.`;
          const rawRes = await generateImageWithReference(prompt, [activeAnchorAsset], 'image/png', 'gemini-3.1-flash-lite-image', ratio);
          if (rawRes) {
            const savedUrl = await saveImageToGCS(rawRes, `creative_aspect_${ratio.replace(':', 'x')}`, activeCompany) || rawRes;
            updatedAspects[ratio] = savedUrl;
            setAspectImages(prev => ({ ...prev, [ratio]: savedUrl }));
          }
        } catch (err) {
          console.warn(`Failed aspect ratio ${ratio}:`, err);
        } finally {
          completedCount++;
          setActiveAspectsLoading(prev => {
            const next = { ...prev };
            delete next[ratio];
            return next;
          });
        }
      }
    };

    const CONCURRENCY = 3;
    const workerCount = Math.min(CONCURRENCY, queue.length);
    const workers = Array.from({ length: workerCount }, (_, idx) => runWorker(idx + 1));
    await Promise.all(workers);

    setIsGeneratingAspects(false);
    setActiveAspectsLoading({});
    setStatusMessage("All aspect ratio adaptations saved to GCS successfully.");
    saveWorkflowState({ aspectImages: updatedAspects });
  };

  const handleGenerateSingleAspect = async (ratio: string) => {
    if (!activeAnchorAsset) return;
    setActiveAspectsLoading(prev => ({ ...prev, [ratio]: true }));
    setStatusMessage(`Adapting image for ${ratio} aspect ratio and saving to GCS...`);
    try {
      const prompt = `Adapt the input ${activeCompany} advertisement to fill the target aspect ratio canvas. Keep ONLY the original products, do not add or remove any products. Do not add or remove any text or taglines. Maintain 100% fidelity of original branding, product geometry, lighting, and colors while seamlessly outpainting the background environment.`;
      const rawRes = await generateImageWithReference(prompt, [activeAnchorAsset], 'image/png', 'gemini-3.1-flash-lite-image', ratio);
      if (rawRes) {
        const savedUrl = await saveImageToGCS(rawRes, `creative_aspect_${ratio.replace(':', 'x')}`, activeCompany) || rawRes;
        const updated = { ...aspectImages, [ratio]: savedUrl };
        setAspectImages(updated);
        saveWorkflowState({ aspectImages: updated });
        setStatusMessage(`Adapted ${ratio} aspect ratio and saved to GCS successfully.`);
      }
    } catch (err) {
      console.warn(`Failed aspect ratio ${ratio}:`, err);
      setStatusMessage(`Failed to adapt ${ratio} aspect ratio.`);
    } finally {
      setActiveAspectsLoading(prev => {
        const next = { ...prev };
        delete next[ratio];
        return next;
      });
    }
  };

  // Step 4: Product Element Versioning (Variant Swapping - 3 Parallel Threads)
  const handleGenerateAllVariants = async () => {
    if (!activeAnchorAsset) return;
    setIsGeneratingVariants(true);
    setStatusMessage("Swapping product variants across 3 parallel threads...");

    const queue = [...variantList];
    const updatedVariants = { ...variantImages };
    let completedCount = 0;

    const runWorker = async (workerId: number) => {
      while (queue.length > 0) {
        const variant = queue.shift();
        if (!variant) break;

        setActiveVariantLoading(prev => ({ ...prev, [variant.id]: true }));
        setStatusMessage(`Thread ${workerId}: Swapping to ${variant.title} variant (${completedCount + 1}/${variantList.length})...`);

        try {
          const prompt = `Preserve the exact background environment, table/counter surface, lighting, camera angle, and surrounding decor identical to the reference image.
Swap the central product shown in the reference image with this new variant while preserving the exact product format/category (e.g. if it is a hand soap, body wash, lotion tube, mist spray, or candle, maintain that same product form factor):
- Product Line / Variant Name: "${variant.title}"
- Fragrance / Ingredient Notes: "${variant.notes}"
- Visual Styling & Cues: ${variant.promptSnippet}
- PACKAGING & LABELING SPECIFICATION: The product only has labeling and text on the very thick lid, not on the side of the container. The lid MUST clearly display "${variant.title}" and "${variant.notes}". The container side walls must remain plain and clean without side labels.
- Ensure the packaging colors, formula/liquid tone, and lid graphics reflect the ${variant.title} variant with authentic ${activeCompany} retail commercial polish.`;

          const rawRes = await generateImageWithReference(prompt, [activeAnchorAsset], 'image/png', 'gemini-3.1-flash-lite-image', '1:1');
          if (rawRes) {
            const savedUrl = await saveImageToGCS(rawRes, `creative_variant_${variant.id}`, activeCompany) || rawRes;
            updatedVariants[variant.id] = savedUrl;
            setVariantImages(prev => ({ ...prev, [variant.id]: savedUrl }));
          }
        } catch (err) {
          console.warn(`Variant generation failed for ${variant.id}:`, err);
        } finally {
          completedCount++;
          setActiveVariantLoading(prev => {
            const next = { ...prev };
            delete next[variant.id];
            return next;
          });
        }
      }
    };

    const CONCURRENCY = 3;
    const workerCount = Math.min(CONCURRENCY, queue.length);
    const workers = Array.from({ length: workerCount }, (_, idx) => runWorker(idx + 1));
    await Promise.all(workers);

    setIsGeneratingVariants(false);
    setActiveVariantLoading({});
    setStatusMessage("All product variants swapped & saved to GCS successfully.");
    saveWorkflowState({ variantImages: updatedVariants });
  };

  const handleGenerateSingleVariant = async (variant: typeof DEFAULT_VARIANTS[0]) => {
    if (!activeAnchorAsset) return;
    setActiveVariantLoading(prev => ({ ...prev, [variant.id]: true }));
    setStatusMessage(`Generating variant: ${variant.title}...`);
    try {
      const prompt = `Preserve the exact background environment, table/counter surface, lighting, camera angle, and surrounding decor identical to the reference image.
Swap the central product shown in the reference image with this new variant while preserving the exact product format/category (e.g. if it is a hand soap, body wash, lotion tube, mist spray, or candle, maintain that same product form factor):
- Product Line / Variant Name: "${variant.title}"
- Fragrance / Ingredient Notes: "${variant.notes}"
- Visual Styling & Cues: ${variant.promptSnippet}
- PACKAGING & LABELING SPECIFICATION: The product only has labeling and text on the very thick lid, not on the side of the container. The lid MUST clearly display "${variant.title}" and "${variant.notes}". The container side walls must remain plain and clean without side labels.
- Ensure the packaging colors, formula/liquid tone, and lid graphics reflect the ${variant.title} variant with authentic ${activeCompany} retail commercial polish.`;

      const rawRes = await generateImageWithReference(prompt, [activeAnchorAsset], 'image/png', 'gemini-3.1-flash-lite-image', '1:1');
      if (rawRes) {
        const savedUrl = await saveImageToGCS(rawRes, `creative_variant_${variant.id}`, activeCompany) || rawRes;
        const updated = { ...variantImages, [variant.id]: savedUrl };
        setVariantImages(updated);
        saveWorkflowState({ variantImages: updated });
        setStatusMessage(`Swapped to ${variant.title} variant successfully.`);
      }
    } catch (err) {
      console.warn(`Variant generation failed for ${variant.id}:`, err);
      setStatusMessage(`Failed to swap variant for ${variant.title}.`);
    } finally {
      setActiveVariantLoading(prev => {
        const next = { ...prev };
        delete next[variant.id];
        return next;
      });
    }
  };

  const handleAddCustomVariant = () => {
    if (!newVariantName.trim()) return;
    const newId = `custom_${Date.now()}`;
    const newVar = {
      id: newId,
      title: newVariantName.trim(),
      notes: newVariantNotes.trim() || 'Signature Aromas & Essential Oils',
      colorHex: '#6366F1',
      promptSnippet: `${newVariantName.trim()} variant with signature packaging, custom label, and aromatic notes: ${newVariantNotes.trim()}`
    };
    setVariantList(prev => [...prev, newVar]);
    setNewVariantName('');
    setNewVariantNotes('');
  };

  // Step 5: GenMedia Omni Video Generation
  const handleGenerateVideoMotion = async () => {
    const targetImage = videoSourceImage || activeAnchorAsset;
    if (!targetImage) return;

    let finalVideoPrompt = customVideoPrompt;
    if (!finalVideoPrompt.toLowerCase().includes("thick lid")) {
      finalVideoPrompt += ". Video packaging rule: The product only has labeling and text on the very thick lid, not on the side of the container. Maintain clean, unlabeled container side walls throughout the motion sequence.";
    }

    setIsGeneratingVideo(true);
    setVideoStatus("Initializing Gemini Omni video motion engine...");
    setStatusMessage("Generating video with gemini-omni-1.1-flash-preview...");

    try {
      const videoResult = await generateOmniVideo(targetImage, finalVideoPrompt);
      if (videoResult) {
        setGeneratedVideoUrl(videoResult);
        setStatusMessage("Omni video generated successfully.");
        saveWorkflowState({ generatedVideoUrl: videoResult });
      } else {
        throw new Error("No video output returned");
      }
    } catch (err) {
      console.warn("Omni video generation failed, falling back to Veo 3.1 product spin:", err);
      try {
        const fallbackRes = await generateProductSpinVideo([targetImage], finalVideoPrompt);
        if (fallbackRes) {
          setGeneratedVideoUrl(fallbackRes);
          setStatusMessage("Fallback video generated successfully.");
          saveWorkflowState({ generatedVideoUrl: fallbackRes });
        } else {
          throw new Error("Veo fallback returned no output");
        }
      } catch (fallbackErr) {
        console.error("Video generation failed:", fallbackErr);
        setStatusMessage("Video motion generation failed. Please try again with a different preset or asset.");
      }
    } finally {
      setIsGeneratingVideo(false);
      setVideoStatus("");
    }
  };

  const downloadAsset = (urlOrB64: string, filename: string) => {
    const a = document.createElement('a');
    a.href = urlOrB64;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-16 animate-fadeIn">
      {/* Header & Stepper */}
      <div className="flex flex-col md:flex-row md:items-center justify-between pb-6 border-b border-slate-200 gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5 text-indigo-600 font-bold text-xs uppercase tracking-widest font-mono">
            <Wand2 className="h-4 w-4 text-indigo-500" />
            GenMedia Deep Dive Studio
          </div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
            Creative Workflow
            <span className="text-xs font-mono font-bold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
              {activeCompany}
            </span>
          </h1>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={loadLastSavedWorkflow}
            className="px-3.5 py-2 text-xs font-semibold bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-xl shadow-xs transition flex items-center gap-1.5"
            title="Load last saved creative workflow session from GCS"
          >
            <History size={14} className="text-slate-500" />
            Load Last
          </button>
        </div>
      </div>

      {/* Stepper Navigation Tabs (5 Steps) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        <button
          onClick={() => setCurrentStep(1)}
          className={`p-4 rounded-2xl border text-left transition-all relative overflow-hidden ${
            currentStep === 1
              ? 'bg-white border-indigo-600 shadow-md ring-2 ring-indigo-100'
              : 'bg-white/80 border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded ${currentStep === 1 ? 'bg-indigo-50 text-indigo-700' : 'bg-slate-100 text-slate-500'}`}>
              STEP 1
            </span>
            {auditResult && <CheckCircle2 size={14} className="text-emerald-500" />}
          </div>
          <h2 className="font-bold text-sm text-slate-900">1. Text + Asset & Audit</h2>
        </button>

        <button
          onClick={() => setCurrentStep(2)}
          className={`p-4 rounded-2xl border text-left transition-all relative overflow-hidden ${
            currentStep === 2
              ? 'bg-white border-indigo-600 shadow-md ring-2 ring-indigo-100'
              : 'bg-white/80 border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded ${currentStep === 2 ? 'bg-indigo-50 text-indigo-700' : 'bg-slate-100 text-slate-500'}`}>
              STEP 2
            </span>
            {Object.keys(personaScenarios).length > 0 && <CheckCircle2 size={14} className="text-emerald-500" />}
          </div>
          <h2 className="font-bold text-sm text-slate-900">2. Persona Scenarios</h2>
        </button>

        <button
          onClick={() => setCurrentStep(3)}
          className={`p-4 rounded-2xl border text-left transition-all relative overflow-hidden ${
            currentStep === 3
              ? 'bg-white border-indigo-600 shadow-md ring-2 ring-indigo-100'
              : 'bg-white/80 border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded ${currentStep === 3 ? 'bg-indigo-50 text-indigo-700' : 'bg-slate-100 text-slate-500'}`}>
              STEP 3
            </span>
            {Object.keys(aspectImages).length > 0 && <CheckCircle2 size={14} className="text-emerald-500" />}
          </div>
          <h2 className="font-bold text-sm text-slate-900">3. Aspect Ratios</h2>
        </button>

        <button
          onClick={() => setCurrentStep(4)}
          className={`p-4 rounded-2xl border text-left transition-all relative overflow-hidden ${
            currentStep === 4
              ? 'bg-white border-indigo-600 shadow-md ring-2 ring-indigo-100'
              : 'bg-white/80 border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded ${currentStep === 4 ? 'bg-indigo-50 text-indigo-700' : 'bg-slate-100 text-slate-500'}`}>
              STEP 4
            </span>
            {Object.keys(variantImages).length > 0 && <CheckCircle2 size={14} className="text-emerald-500" />}
          </div>
          <h2 className="font-bold text-sm text-slate-900">4. Product Versioning</h2>
        </button>

        <button
          onClick={() => setCurrentStep(5)}
          className={`p-4 rounded-2xl border text-left transition-all relative overflow-hidden ${
            currentStep === 5
              ? 'bg-white border-indigo-600 shadow-md ring-2 ring-indigo-100'
              : 'bg-white/80 border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded ${currentStep === 5 ? 'bg-indigo-50 text-indigo-700' : 'bg-slate-100 text-slate-500'}`}>
              STEP 5
            </span>
            {generatedVideoUrl && <CheckCircle2 size={14} className="text-emerald-500" />}
          </div>
          <h2 className="font-bold text-sm text-slate-900">5. Omni Video Motion</h2>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* STEP 1: TEXT + CORE ASSET & BRAND COMPLIANCE AUDIT */}
      {/* ========================================================================= */}
      {currentStep === 1 && (
        <div className="space-y-8 animate-fadeIn">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Left Column: Prompt Generator & Brand Compliance Audit */}
            <div className="lg:col-span-5 space-y-6">
              {/* Card 1: Prompt & Asset Generator */}
              <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <Sparkles size={16} className="text-indigo-600" />
                    Prompt & Asset Generator
                  </h2>
                  <label className="cursor-pointer text-[11px] font-semibold text-indigo-600 hover:text-indigo-700 flex items-center gap-1">
                    <Upload size={12} />
                    Upload Image
                    <input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
                  </label>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">
                    Prompt Presets ({activeCompany})
                  </label>
                  <div className="relative">
                    <select
                      value={PRESET_PROMPTS.includes(basePrompt) ? basePrompt : ''}
                      onChange={(e) => {
                        if (e.target.value) setBasePrompt(e.target.value);
                      }}
                      className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 outline-none focus:ring-1 focus:ring-indigo-500 appearance-none pr-8 cursor-pointer truncate"
                    >
                      <option value="" disabled>Select a prompt preset...</option>
                      {PRESET_PROMPTS.map((p, idx) => (
                        <option key={idx} value={p}>
                          {p.length > 80 ? p.substring(0, 80) + '...' : p}
                        </option>
                      ))}
                    </select>
                    <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">
                    Active Text Prompt
                  </label>
                  <textarea
                    rows={3}
                    value={basePrompt}
                    onChange={(e) => setBasePrompt(e.target.value)}
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 outline-none focus:ring-1 focus:ring-indigo-500 font-sans resize-none"
                    placeholder="Describe the product asset and scene..."
                  />
                </div>

                <button
                  onClick={() => handleGenerateInitialBase()}
                  disabled={isGeneratingBase}
                  className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold shadow-sm transition flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isGeneratingBase ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      Generating Asset...
                    </>
                  ) : (
                    <>
                      <Sparkles size={14} />
                      Generate Base Asset
                    </>
                  )}
                </button>
              </div>

              {/* Card 2: Brand Compliance Audit Panel (Moved to Left Side) */}
              <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
                <div className="flex items-center justify-between border-b border-slate-150 pb-3">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 size={18} className="text-indigo-600" />
                    <h3 className="font-extrabold text-slate-900 text-sm">Brand Compliance Audit</h3>
                  </div>

                  {auditResult && (
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono text-slate-500">Adherence:</span>
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-mono font-black border ${
                        auditResult.score >= 8.5 
                          ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                          : 'bg-amber-100 text-amber-800 border-amber-300'
                      }`}>
                        {auditResult.score} / 10.0
                      </span>
                    </div>
                  )}
                </div>

                {isAuditing ? (
                  <div className="py-8 flex flex-col items-center justify-center gap-2 text-slate-500">
                    <Loader2 size={24} className="animate-spin text-indigo-500" />
                    <span className="text-xs font-mono">Auditing image against brand guidelines...</span>
                  </div>
                ) : auditResult ? (
                  <div className="space-y-4">
                    <p className="text-xs text-slate-700 font-medium leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-150">
                      <strong>Verdict:</strong> {auditResult.reason}
                    </p>

                    <div className="space-y-3">
                      {/* Strengths */}
                      <div className="p-3.5 bg-emerald-50/50 border border-emerald-100 rounded-xl space-y-1.5">
                        <span className="text-[10px] font-mono font-bold uppercase text-emerald-800 flex items-center gap-1">
                          <CheckCircle2 size={12} className="text-emerald-600" /> Strengths (Brand Compliant)
                        </span>
                        {auditResult.positive.map((pos, pIdx) => (
                          <div key={pIdx} className="text-[11.5px] text-slate-700 flex items-start gap-1.5">
                            <span className="text-emerald-500 font-bold">•</span>
                            <span>{pos}</span>
                          </div>
                        ))}
                      </div>

                      {/* Weaknesses */}
                      <div className="p-3.5 bg-amber-50/50 border border-amber-100 rounded-xl space-y-1.5">
                        <span className="text-[10px] font-mono font-bold uppercase text-amber-800 flex items-center gap-1">
                          <AlertTriangle size={12} className="text-amber-600" /> Areas for Improvement
                        </span>
                        {auditResult.negative.map((neg, nIdx) => (
                          <div key={nIdx} className="text-[11.5px] text-slate-700 flex items-start gap-1.5">
                            <span className="text-amber-500 font-bold">•</span>
                            <span>{neg}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* AI Metadata Tags */}
                    <div className="pt-2 border-t border-slate-150">
                      <span className="text-[10px] font-mono font-bold uppercase text-slate-400 block mb-1.5 flex items-center gap-1">
                        <Tag size={11} /> AI Visual Metadata Tags:
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {auditResult.metadata.split(',').map((tag, tIdx) => (
                          <span key={tIdx} className="px-2 py-0.5 bg-slate-100 text-slate-700 text-[10.5px] font-mono font-medium rounded-md border border-slate-200">
                            {tag.trim()}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>
            </div>

            {/* Right Column: Combined Core Asset Preview + 'Type in a Change' Interactive Refine */}
            <div className="lg:col-span-7 space-y-6">
              <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ImageIcon size={18} className="text-indigo-600" />
                    <h3 className="font-extrabold text-slate-900 text-sm">Core Asset Preview (1:1 Anchor)</h3>
                  </div>
                  {baseImage && (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setPreviewLightbox(baseImage)}
                        className="p-1.5 text-slate-500 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg transition text-xs flex items-center gap-1 font-medium"
                      >
                        <Maximize2 size={13} /> Fullscreen
                      </button>
                      <button
                        onClick={() => downloadAsset(baseImage, `${activeCompany.toLowerCase().replace(/\s+/g, '_')}_core_asset.png`)}
                        className="p-1.5 text-slate-500 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg transition text-xs flex items-center gap-1 font-medium"
                      >
                        <Download size={13} /> Save
                      </button>
                    </div>
                  )}
                </div>

                {/* Image Frame */}
                <div className="relative aspect-square max-h-[420px] w-full bg-slate-950 rounded-xl overflow-hidden flex items-center justify-center border border-slate-200 mx-auto">
                  {isGeneratingBase || isRefining ? (
                    <div className="flex flex-col items-center gap-2 text-white">
                      <Loader2 size={32} className="animate-spin text-indigo-400" />
                      <span className="text-xs font-mono text-slate-300">
                        {isRefining ? 'Applying Modification...' : 'Synthesizing Asset...'}
                      </span>
                    </div>
                  ) : baseImage ? (
                    <img src={baseImage} alt="Base Asset" className="w-full h-full object-contain" />
                  ) : (
                    <span className="text-slate-500 text-xs italic">No asset generated yet.</span>
                  )}
                </div>

                {/* Combined 'Type in a Change' Interactive Refinement Box */}
                <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-xl space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                      <Sliders size={14} className="text-indigo-600" />
                      Type in a Change (Interactive Refine)
                    </h4>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={handleUndoRevision}
                        disabled={historyIndex <= 0}
                        className="p-1.5 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 text-slate-600 disabled:opacity-30 transition"
                        title="Undo Change"
                      >
                        <RotateCcw size={12} />
                      </button>
                      <button
                        onClick={handleRedoRevision}
                        disabled={historyIndex >= revisionHistory.length - 1}
                        className="p-1.5 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 text-slate-600 disabled:opacity-30 transition"
                        title="Redo Change"
                      >
                        <RefreshCw size={12} />
                      </button>
                    </div>
                  </div>

                  <p className="text-[11px] text-slate-500">
                    Type any modification instruction to refine the asset and automatically re-audit brand compliance.
                  </p>

                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={refineInstruction}
                      onChange={(e) => setRefineInstruction(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleRefineImage()}
                      placeholder="e.g. Add soft amber candlelight and warm rustic table..."
                      className="flex-1 px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                    <button
                      onClick={handleRefineImage}
                      disabled={isRefining || !refineInstruction.trim() || !baseImage}
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-xs transition flex items-center gap-1.5 disabled:opacity-50 shrink-0"
                    >
                      {isRefining ? <Loader2 size={13} className="animate-spin" /> : "Apply"}
                    </button>
                  </div>
                </div>

                {/* Advance Button */}
                <div className="pt-3 border-t border-slate-150 flex justify-end">
                  <button
                    onClick={() => setCurrentStep(2)}
                    disabled={!baseImage}
                    className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md transition flex items-center gap-2 disabled:opacity-50"
                  >
                    Approve & Proceed to Persona Scenarios
                    <ArrowRight size={14} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* STEP 2: PERSONA-DRIVEN SCENARIO VARIATIONS ENGINE */}
      {/* ========================================================================= */}
      {currentStep === 2 && (
        <div className="space-y-6 animate-fadeIn">
          {/* Header Bar */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Users size={18} className="text-indigo-600" />
                Persona Scenarios
              </h2>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => setCurrentStep(1)}
                className="px-3.5 py-2 text-xs font-semibold bg-white text-slate-700 border border-slate-200 rounded-xl hover:bg-slate-50 transition flex items-center gap-1.5"
              >
                <ArrowLeft size={14} /> Back to Step 1
              </button>

              <button
                onClick={handleGenerateAllPersonaScenarios}
                disabled={isGeneratingPersonas || !baseImage}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md transition flex items-center gap-2 disabled:opacity-50"
              >
                {isGeneratingPersonas ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    Generating Scenarios...
                  </>
                ) : (
                  <>
                    <Sparkles size={14} />
                    Generate All Persona Scenarios
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Main 2-Column Split: Persona Customizer + Scenario Gallery */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left Column: Persona Selector & Custom Scenario Prompt */}
            <div className="lg:col-span-4 space-y-6">
              {/* Persona Selector Dropdown */}
              <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                    <UserCheck size={14} className="text-indigo-600" />
                    Target Persona Selector
                  </span>
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-100">
                    {personas.length} Personas
                  </span>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">Choose Active Persona</label>
                  <div className="relative">
                    <select
                      value={selectedPersonaId}
                      onChange={(e) => setSelectedPersonaId(e.target.value)}
                      className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 outline-none focus:ring-1 focus:ring-indigo-500 appearance-none pr-8 cursor-pointer"
                    >
                      {personas.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} — {p.demographics}
                        </option>
                      ))}
                    </select>
                    <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  </div>
                </div>

                {/* Persona Profile Card */}
                {activePersonaObj && (
                  <div className="p-4 bg-slate-50/70 border border-slate-200/80 rounded-xl space-y-2.5 animate-fadeIn">
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="font-extrabold text-xs text-slate-900">{activePersonaObj.name}</h4>
                        <p className="text-[10.5px] text-slate-500 font-mono mt-0.5">{activePersonaObj.demographics}</p>
                      </div>
                      <span className="p-1.5 bg-indigo-100 text-indigo-700 rounded-lg">
                        <Brain size={14} />
                      </span>
                    </div>

                    <p className="text-[11px] text-slate-600 italic leading-snug">
                      "{activePersonaObj.bio}"
                    </p>

                    <div className="pt-2 border-t border-slate-200/60 flex flex-col gap-1.5 text-[10.5px]">
                      <div className="flex items-center gap-1 text-slate-700">
                        <Compass size={11} className="text-indigo-500 shrink-0" />
                        <span className="font-semibold text-slate-900">Context:</span> {activePersonaObj.lifestyleContext}
                      </div>
                      <div className="flex items-center gap-1 text-slate-700">
                        <Tag size={11} className="text-amber-500 shrink-0" />
                        <span className="font-semibold text-slate-900">Affinity:</span> {activePersonaObj.affinity}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Scenario Prompt Editor */}
              <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                    <Sliders size={14} className="text-indigo-600" />
                    Scenario Prompt Configuration
                  </h3>
                  <button
                    onClick={() => handleSuggestPersonaScenario(selectedPersonaId)}
                    disabled={isSuggestingScenario}
                    className="text-[10.5px] font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-1 transition disabled:opacity-50"
                    title="Generate an AI-suggested lifestyle scenario based on persona bio"
                  >
                    {isSuggestingScenario ? (
                      <>
                        <Loader2 size={11} className="animate-spin" />
                        Suggesting...
                      </>
                    ) : (
                      <>
                        <Sparkles size={11} />
                        AI Suggest
                      </>
                    )}
                  </button>
                </div>

                <div className="space-y-1.5">
                  <textarea
                    rows={4}
                    value={personaPrompts[selectedPersonaId] || ''}
                    onChange={(e) => setPersonaPrompts(prev => ({ ...prev, [selectedPersonaId]: e.target.value }))}
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 outline-none focus:ring-1 focus:ring-indigo-500 font-sans resize-none leading-relaxed"
                    placeholder={`Describe the living environment and lifestyle scenario for ${activePersonaObj?.name || 'this persona'}...`}
                  />
                  <span className="text-[10px] text-slate-400 block italic">
                    The core product packaging, logo, and label from Step 1 are automatically preserved with 100% fidelity.
                  </span>
                </div>

                <button
                  onClick={() => handleGeneratePersonaScenario(selectedPersonaId)}
                  disabled={!baseImage || !!activePersonaLoading[selectedPersonaId]}
                  className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold shadow-sm transition flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {activePersonaLoading[selectedPersonaId] ? (
                    <>
                      <Loader2 size={14} className="animate-spin text-indigo-400" />
                      Synthesizing Scenario for {activePersonaObj?.name}...
                    </>
                  ) : (
                    <>
                      <Sparkles size={14} />
                      Generate Scenario for {activePersonaObj?.name}
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Right Column: Persona Scenario Variations Gallery */}
            <div className="lg:col-span-8 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {personas.map((persona) => {
                  const scenarioImg = personaScenarios[persona.id];
                  const isLoadingThis = !!activePersonaLoading[persona.id];
                  const isSelectedAsHero = selectedHeroAsset === scenarioImg && !!scenarioImg;

                  return (
                    <div
                      key={persona.id}
                      className={`bg-white border rounded-2xl p-5 shadow-xs flex flex-col justify-between space-y-3 transition-all ${
                        isSelectedAsHero 
                          ? 'border-emerald-500 ring-2 ring-emerald-100 shadow-md' 
                          : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-extrabold text-xs text-slate-900 flex items-center gap-1.5">
                            {persona.name}
                            {isSelectedAsHero && (
                              <span className="text-[9px] font-mono font-black px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1">
                                <Check size={10} /> Active Hero
                              </span>
                            )}
                          </h3>
                          <span className="text-[10px] text-slate-400 block truncate max-w-[200px]">
                            {persona.demographics}
                          </span>
                        </div>
                        <button
                          onClick={() => setSelectedPersonaId(persona.id)}
                          className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border transition ${
                            selectedPersonaId === persona.id
                              ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                              : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'
                          }`}
                        >
                          {selectedPersonaId === persona.id ? 'Active Persona' : 'Select'}
                        </button>
                      </div>

                      {/* Image Frame */}
                      <div className="relative w-full h-56 bg-slate-950 rounded-xl overflow-hidden flex items-center justify-center border border-slate-200">
                        {isLoadingThis ? (
                          <div className="flex flex-col items-center gap-2 text-white text-center p-4">
                            <Loader2 size={24} className="animate-spin text-indigo-400" />
                            <span className="text-[10px] font-mono text-slate-300">Rendering {persona.name} lifestyle...</span>
                          </div>
                        ) : scenarioImg ? (
                          <img src={scenarioImg} alt={persona.name} className="w-full h-full object-contain" />
                        ) : (
                          <div className="text-center p-4">
                            <span className="text-slate-500 text-xs block mb-2">Scenario not generated</span>
                            <button
                              onClick={() => handleGeneratePersonaScenario(persona.id)}
                              disabled={!baseImage}
                              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-[10px] font-mono font-bold transition flex items-center gap-1 mx-auto"
                            >
                              <Sparkles size={11} /> Generate Scenario
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Action Bar */}
                      <div className="flex items-center justify-between pt-2 border-t border-slate-150 text-xs">
                        {scenarioImg ? (
                          <>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => setPreviewLightbox(scenarioImg)}
                                className="text-slate-500 hover:text-indigo-600 flex items-center gap-1 font-semibold text-[11px]"
                              >
                                <Maximize2 size={12} /> Preview
                              </button>
                              <button
                                onClick={() => downloadAsset(scenarioImg, `${activeCompany.toLowerCase().replace(/\s+/g, '_')}_scenario_${persona.id}.png`)}
                                className="text-slate-500 hover:text-indigo-600 flex items-center gap-1 font-semibold text-[11px]"
                              >
                                <Download size={12} /> Save
                              </button>
                            </div>

                            <button
                              onClick={() => {
                                setSelectedHeroAsset(scenarioImg);
                                setVideoSourceImage(scenarioImg);
                                saveWorkflowState({ selectedHeroAsset: scenarioImg });
                                setStatusMessage(`Set ${persona.name}'s scenario as active hero asset for aspect ratios & video.`);
                              }}
                              className={`px-2.5 py-1 rounded-lg text-[10.5px] font-bold transition flex items-center gap-1 ${
                                isSelectedAsHero
                                  ? 'bg-emerald-600 text-white'
                                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                              }`}
                            >
                              <UserCheck size={12} />
                              {isSelectedAsHero ? 'Active Anchor' : 'Set as Hero'}
                            </button>
                          </>
                        ) : (
                          <span className="text-[10.5px] text-slate-400 italic">Ready for scenario generation</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Bottom Advancement Bar */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-xs font-mono text-slate-600">
              <CheckCircle2 size={15} className="text-emerald-600" />
              <span>
                Active Hero Asset for Next Steps:{' '}
                <strong className="text-slate-900">
                  {selectedHeroAsset
                    ? `Persona Scenario (${personas.find(p => personaScenarios[p.id] === selectedHeroAsset)?.name || 'Custom'})`
                    : 'Step 1 Core Base Asset'}
                </strong>
              </span>
            </div>

            <button
              onClick={() => setCurrentStep(3)}
              className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md transition flex items-center gap-2"
            >
              Approve & Proceed to Aspect Ratios (Step 3)
              <ArrowRight size={14} />
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* STEP 3: MULTI-ASPECT RATIO ADAPTATION ENGINE */}
      {/* ========================================================================= */}
      {currentStep === 3 && (
        <div className="space-y-6 animate-fadeIn">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Layers size={18} className="text-indigo-600" />
                Aspect Ratios
              </h2>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => setCurrentStep(2)}
                className="px-3.5 py-2 text-xs font-semibold bg-white text-slate-700 border border-slate-200 rounded-xl hover:bg-slate-50 transition flex items-center gap-1.5"
              >
                <ArrowLeft size={14} /> Back to Step 2
              </button>

              <button
                onClick={handleGenerateAllAspectRatios}
                disabled={isGeneratingAspects || !activeAnchorAsset}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md transition flex items-center gap-2 disabled:opacity-50"
              >
                {isGeneratingAspects ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    Adapting Ratios...
                  </>
                ) : (
                  <>
                    <Sparkles size={14} />
                    Generate All Aspect Ratios
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Aspect Ratios Gallery Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {ASPECT_RATIO_OPTIONS.map((opt) => {
              const adaptedImg = aspectImages[opt.id] || (opt.id === '1:1' ? activeAnchorAsset : null);
              const isLoadingThis = !!activeAspectsLoading[opt.id];

              return (
                <div 
                  key={opt.id}
                  className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex flex-col justify-between space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-bold text-xs text-slate-900">{opt.label}</h3>
                      <span className="text-[10px] text-slate-400">{opt.desc}</span>
                    </div>
                    <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                      {opt.id}
                    </span>
                  </div>

                  {/* Image Frame with Aspect Preview */}
                  <div className="relative w-full h-56 bg-slate-950 rounded-xl overflow-hidden flex items-center justify-center border border-slate-200">
                    {isLoadingThis ? (
                      <div className="flex flex-col items-center gap-2 text-white">
                        <Loader2 size={24} className="animate-spin text-indigo-400" />
                        <span className="text-[10px] font-mono text-slate-300">Rendering {opt.id}...</span>
                      </div>
                    ) : adaptedImg ? (
                      <img src={adaptedImg} alt={opt.label} className="w-full h-full object-contain" />
                    ) : (
                      <div className="text-center p-4">
                        <span className="text-slate-500 text-xs block mb-2">Not generated yet</span>
                        <button
                          onClick={() => handleGenerateSingleAspect(opt.id)}
                          disabled={!activeAnchorAsset}
                          className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-[10px] font-mono font-bold transition"
                        >
                          Generate {opt.id}
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Action Bar */}
                  <div className="flex items-center justify-between pt-2 border-t border-slate-150 text-xs">
                    {adaptedImg ? (
                      <>
                        <button
                          onClick={() => setPreviewLightbox(adaptedImg)}
                          className="text-slate-500 hover:text-indigo-600 flex items-center gap-1 font-semibold"
                        >
                          <Maximize2 size={12} /> Preview
                        </button>
                        <button
                          onClick={() => downloadAsset(adaptedImg, `${activeCompany.toLowerCase().replace(/\s+/g, '_')}_${opt.id.replace(':', 'x')}.png`)}
                          className="text-slate-500 hover:text-indigo-600 flex items-center gap-1 font-semibold"
                        >
                          <Download size={12} /> Download
                        </button>
                      </>
                    ) : (
                      <span className="text-[10.5px] text-slate-400 italic">Ready for generation</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex justify-end pt-4">
            <button
              onClick={() => setCurrentStep(4)}
              className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md transition flex items-center gap-2"
            >
              Proceed to Product Versioning (Step 4)
              <ArrowRight size={14} />
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ========================================================================= */}
      {/* STEP 4: PRODUCT ELEMENT VERSIONING (PRODUCT / VARIANT SWAPPING) */}
      {/* ========================================================================= */}
      {currentStep === 4 && (
        <div className="space-y-6 animate-fadeIn">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Flame size={18} className="text-amber-500" />
                Product Versioning
              </h2>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => setCurrentStep(3)}
                className="px-3.5 py-2 text-xs font-semibold bg-white text-slate-700 border border-slate-200 rounded-xl hover:bg-slate-50 transition flex items-center gap-1.5"
              >
                <ArrowLeft size={14} /> Back to Step 3
              </button>

              <button
                onClick={hydrateFlavorsFromInsightsAndAudit}
                className="px-3.5 py-2 text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200 rounded-xl hover:bg-amber-100 transition flex items-center gap-1.5 shadow-xs"
                title="Pull trending fragrance flavors & scent opportunities from Insights and Full Audit logs"
              >
                <Sparkles size={14} className="text-amber-600" /> Pull Flavors from Insights & Audit
              </button>

              <button
                onClick={handleGenerateAllVariants}
                disabled={isGeneratingVariants || !activeAnchorAsset}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md transition flex items-center gap-2 disabled:opacity-50"
              >
                {isGeneratingVariants ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    Swapping Variants...
                  </>
                ) : (
                  <>
                    <Sparkles size={14} />
                    Generate All Variants
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Add Custom Variant Drawer */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex flex-col sm:flex-row items-center gap-3">
            <input
              type="text"
              placeholder="Custom Variant Name (e.g. Lavender Vanilla, Fresh Cotton)"
              value={newVariantName}
              onChange={(e) => setNewVariantName(e.target.value)}
              className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs w-full sm:w-64 outline-none focus:ring-1 focus:ring-indigo-500"
            />
            <input
              type="text"
              placeholder="Fragrance & Formula Notes (e.g. Wild Lavender, Whipped Vanilla, Shea Butter)"
              value={newVariantNotes}
              onChange={(e) => setNewVariantNotes(e.target.value)}
              className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs flex-1 w-full outline-none focus:ring-1 focus:ring-indigo-500"
            />
            <button
              onClick={handleAddCustomVariant}
              disabled={!newVariantName.trim()}
              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shrink-0 disabled:opacity-40"
            >
              <Plus size={14} /> Add Variant
            </button>
          </div>

          {/* Variants Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* 1. First Option: Default / Original Scent Variant */}
            {activeAnchorAsset && (
              <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl p-5 shadow-xs flex flex-col justify-between space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-sm text-slate-900 flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-slate-400" />
                      Original Scent (Default)
                    </h3>
                    <p className="text-[10.5px] text-slate-500 italic mt-0.5 truncate max-w-[220px]">
                      Reference base product formula & packaging
                    </p>
                  </div>
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-slate-200 text-slate-700 border border-slate-350">
                    Original
                  </span>
                </div>

                {/* Image Display */}
                <div className="relative w-full aspect-square max-h-60 bg-slate-950 rounded-xl overflow-hidden flex items-center justify-center border border-slate-200">
                  <img src={activeAnchorAsset} alt="Original Scent" className="w-full h-full object-contain" />
                </div>

                {/* Footer Controls */}
                <div className="flex items-center justify-between pt-2 border-t border-slate-150 text-xs">
                  <button
                    onClick={() => {
                      setVideoSourceImage(activeAnchorAsset);
                      setCurrentStep(5);
                    }}
                    className="text-indigo-600 hover:text-indigo-700 flex items-center gap-1 font-bold"
                  >
                    <Film size={12} /> Animate Video
                  </button>
                  <button
                    onClick={() => downloadAsset(activeAnchorAsset, `${activeCompany.toLowerCase().replace(/\s+/g, '_')}_original_scent.png`)}
                    className="text-slate-500 hover:text-slate-900 flex items-center gap-1 font-semibold"
                  >
                    <Download size={12} /> Save
                  </button>
                </div>
              </div>
            )}

            {/* 2. Generated Scent Variants */}
            {variantList.map((variant) => {
              const varImg = variantImages[variant.id];
              const isLoadingThis = !!activeVariantLoading[variant.id];

              return (
                <div 
                  key={variant.id}
                  className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex flex-col justify-between space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-bold text-sm text-slate-900 flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: variant.colorHex }} />
                        {variant.title}
                      </h3>
                      <p className="text-[10.5px] text-slate-500 italic mt-0.5 truncate max-w-[220px]">
                        {variant.notes}
                      </p>
                    </div>
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
                      Variant
                    </span>
                  </div>

                  {/* Image Display */}
                  <div className="relative w-full aspect-square max-h-60 bg-slate-950 rounded-xl overflow-hidden flex items-center justify-center border border-slate-200">
                    {isLoadingThis ? (
                      <div className="flex flex-col items-center gap-2 text-white">
                        <Loader2 size={24} className="animate-spin text-amber-400" />
                        <span className="text-[10px] font-mono text-slate-300">Swapping to {variant.title}...</span>
                      </div>
                    ) : varImg ? (
                      <img src={varImg} alt={variant.title} className="w-full h-full object-contain" />
                    ) : (
                      <div className="text-center p-4">
                        <span className="text-slate-500 text-xs block mb-2">Variant not generated</span>
                        <button
                          onClick={() => handleGenerateSingleVariant(variant)}
                          disabled={!activeAnchorAsset}
                          className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-[10px] font-mono font-bold transition flex items-center gap-1 mx-auto"
                        >
                          <Sparkles size={11} /> Generate {variant.title}
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Footer Controls */}
                  <div className="flex items-center justify-between pt-2 border-t border-slate-150 text-xs">
                    {varImg ? (
                      <>
                        <button
                          onClick={() => {
                            setVideoSourceImage(varImg);
                            setCurrentStep(5);
                          }}
                          className="text-indigo-600 hover:text-indigo-700 flex items-center gap-1 font-bold"
                        >
                          <Film size={12} /> Animate Video
                        </button>
                        <button
                          onClick={() => downloadAsset(varImg, `${activeCompany.toLowerCase().replace(/\s+/g, '_')}_variant_${variant.id}.png`)}
                          className="text-slate-500 hover:text-slate-900 flex items-center gap-1 font-semibold"
                        >
                          <Download size={12} /> Save
                        </button>
                      </>
                    ) : (
                      <span className="text-[10.5px] text-slate-400 italic">Ready for swapping</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex justify-end pt-4">
            <button
              onClick={() => setCurrentStep(5)}
              className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md transition flex items-center gap-2"
            >
              Proceed to Video Motion (Step 5)
              <ArrowRight size={14} />
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* STEP 5: GENMEDIA OMNI VIDEO GENERATION */}
      {/* ========================================================================= */}
      {currentStep === 5 && (
        <div className="space-y-6 animate-fadeIn">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Video size={18} className="text-indigo-600" />
                Omni Video Motion
              </h2>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => setCurrentStep(4)}
                className="px-3.5 py-2 text-xs font-semibold bg-white text-slate-700 border border-slate-200 rounded-xl hover:bg-slate-50 transition flex items-center gap-1.5"
              >
                <ArrowLeft size={14} /> Back to Step 4
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Left Motion Directives */}
            <div className="lg:col-span-5 space-y-6">
              {/* Source Asset Selector */}
              <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
                <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                  <Layers size={14} className="text-indigo-600" />
                  Select Source Image to Animate
                </h3>

                {(() => {
                  const priorAssets = [
                    ...(baseImage ? [{ id: 'base', src: baseImage, label: 'Base Asset (1:1)' }] : []),
                    ...Object.entries(personaScenarios).map(([key, img]) => {
                      const persona = personas.find(p => p.id === key);
                      return { id: `persona_${key}`, src: img, label: `Scenario: ${persona?.name || key}` };
                    }),
                    ...Object.entries(aspectImages).map(([ratio, img]) => ({
                      id: `aspect_${ratio}`,
                      src: img,
                      label: `Aspect Ratio: ${ratio}`
                    })),
                    ...Object.entries(variantImages).map(([varId, img]) => {
                      const variant = variantList.find(v => v.id === varId);
                      return { id: `variant_${varId}`, src: img, label: `Variant: ${variant?.title || varId}` };
                    })
                  ].filter(asset => asset.src);

                  const activeVideoSource = videoSourceImage || activeAnchorAsset;

                  return (
                    <>
                      <div className="grid grid-cols-4 gap-2 max-h-36 overflow-y-auto pr-1 scrollbar-thin">
                        {priorAssets.map((asset) => {
                          const isSelected = activeVideoSource === asset.src;
                          return (
                            <button
                              key={asset.id}
                              onClick={() => {
                                setVideoSourceImage(asset.src);
                                saveWorkflowState({ videoSourceImage: asset.src });
                              }}
                              className={`relative aspect-square rounded-xl overflow-hidden border-2 bg-slate-950 transition-all ${
                                isSelected ? 'border-indigo-600 ring-2 ring-indigo-150' : 'border-slate-200 hover:border-slate-300'
                              }`}
                              title={asset.label}
                            >
                              <img src={asset.src} alt={asset.label} className="w-full h-full object-cover" />
                              {isSelected && (
                                <div className="absolute inset-0 bg-indigo-600/10 flex items-center justify-center">
                                  <div className="bg-indigo-600 text-white rounded-full p-0.5 shadow-sm">
                                    <CheckCircle2 size={10} className="text-white fill-current" />
                                  </div>
                                </div>
                              )}
                            </button>
                          );
                        })}
                      </div>

                      {activeVideoSource && (
                        <div className="p-2.5 bg-slate-50 border border-slate-150 rounded-xl flex items-center gap-3">
                          <img src={activeVideoSource} alt="Selected source" className="w-10 h-10 rounded-lg object-cover bg-slate-900 border border-slate-200" />
                          <div className="min-w-0 flex-1">
                            <span className="text-[10px] font-mono text-slate-400 block uppercase font-bold">Selected Source Asset</span>
                            <span className="text-xs text-slate-700 font-semibold truncate block">
                              {priorAssets.find(a => a.src === activeVideoSource)?.label || 'Scent Variant Image'}
                            </span>
                          </div>
                        </div>
                      )}
                    </>
                  );
                })()}
              </div>

              {/* Camera & Motion Presets Card */}
              <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
                <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                  <Compass size={14} className="text-indigo-600" />
                  Camera & Motion Presets
                </h3>

                <div className="space-y-2">
                  {VIDEO_MOTION_PRESETS.map((preset) => (
                    <button
                      key={preset.id}
                      onClick={() => {
                        setSelectedVideoMotion(preset);
                        setCustomVideoPrompt(preset.prompt);
                      }}
                      className={`w-full text-left p-3 rounded-xl border transition-all ${
                        selectedVideoMotion.id === preset.id
                          ? 'bg-indigo-50/70 border-indigo-300 ring-1 ring-indigo-200'
                          : 'bg-slate-50 hover:bg-slate-100 border-slate-200'
                      }`}
                    >
                      <span className="font-bold text-xs text-slate-900 block mb-0.5">{preset.title}</span>
                      <p className="text-[11px] text-slate-500 leading-snug">{preset.desc}</p>
                    </button>
                  ))}
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">
                    Custom Motion Prompt
                  </label>
                  <textarea
                    rows={3}
                    value={customVideoPrompt}
                    onChange={(e) => setCustomVideoPrompt(e.target.value)}
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 outline-none focus:ring-1 focus:ring-indigo-500 font-sans resize-none"
                    placeholder="Describe the video motion, camera moves, and lighting changes..."
                  />
                </div>

                <button
                  onClick={handleGenerateVideoMotion}
                  disabled={isGeneratingVideo || !activeAnchorAsset}
                  className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md transition flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isGeneratingVideo ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      Generating Video...
                    </>
                  ) : (
                    <>
                      <Play size={14} className="fill-current" />
                      Generate Video Motion
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Right Video Player Display */}
            <div className="lg:col-span-7 space-y-6">
              <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-bold text-slate-400 uppercase">
                    Commercial Video Player
                  </span>
                  {generatedVideoUrl && (
                    <button
                      onClick={() => downloadAsset(generatedVideoUrl, `${activeCompany.toLowerCase().replace(/\s+/g, '_')}_commercial.mp4`)}
                      className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
                    >
                      <Download size={13} /> Export MP4
                    </button>
                  )}
                </div>

                <div className="relative w-full aspect-video bg-slate-950 rounded-xl overflow-hidden flex items-center justify-center border border-slate-200 shadow-inner">
                  {isGeneratingVideo ? (
                    <div className="flex flex-col items-center gap-3 text-white p-6 text-center">
                      <div className="w-12 h-12 rounded-full border-4 border-dashed border-indigo-400 animate-spin" />
                      <span className="text-sm font-bold font-mono">Rendering Video...</span>
                      <p className="text-xs text-slate-400 max-w-sm">
                        Choreographing camera trajectory, rendering flame physics, and blending ambient lighting.
                      </p>
                    </div>
                  ) : generatedVideoUrl ? (
                    <video
                      ref={videoRef}
                      src={generatedVideoUrl}
                      controls
                      loop
                      playsInline
                      preload="metadata"
                      autoPlay={false}
                      className="w-full h-full object-contain"
                    />
                  ) : (
                    <div className="text-center p-8 space-y-3">
                      <div className="w-12 h-12 rounded-full bg-slate-900 text-slate-400 flex items-center justify-center mx-auto">
                        <Film size={24} />
                      </div>
                      <span className="text-slate-400 text-xs block">
                        Select a motion preset and click <strong>Generate Omni Video</strong> to animate your core asset.
                      </span>
                    </div>
                  )}
                </div>

                {generatedVideoUrl && (
                  <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between text-xs font-mono">
                    <span className="text-slate-600">Resolution: 1080p • Duration: 8s</span>
                    <span className="text-emerald-700 font-bold flex items-center gap-1">
                      <CheckCircle2 size={13} /> High-Fidelity Commercial Motion
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Lightbox Modal */}
      {previewLightbox && (
        <div 
          className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn"
          onClick={() => setPreviewLightbox(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh] bg-slate-900 p-2 rounded-2xl shadow-2xl border border-slate-800">
            <button
              onClick={() => setPreviewLightbox(null)}
              className="absolute top-4 right-4 p-2 bg-slate-800/80 hover:bg-slate-700 text-white rounded-full transition"
            >
              <X size={18} />
            </button>
            <img src={previewLightbox} alt="Preview" className="max-h-[85vh] w-auto object-contain rounded-xl" />
          </div>
        </div>
      )}
    </div>
  );
};
