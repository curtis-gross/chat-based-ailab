export enum AppMode {
  // Existing QVC Modes
  HOME = 'HOME', // Use Home as the dashboard
  PDP_PERSONALIZATION = 'PDP_PERSONALIZATION',
  PDP_ENRICHMENT = 'PDP_ENRICHMENT',
  E_SPOTS = 'E_SPOTS',
  GEN_SITE = 'GEN_SITE',

  // Lowe's / Example Features
  AD_ANALYSIS = 'AD_ANALYSIS',
  AD_COMPARISON = 'AD_COMPARISON',
  INFLUENCER_ANALYSIS = 'INFLUENCER_ANALYSIS',
  AUDIENCE_CREATION = 'AUDIENCE_CREATION',
  SYNTHETIC_ANALYSIS = 'SYNTHETIC_ANALYSIS',
  AGENTSPACE = 'AGENTSPACE',
  LANDING_PAGE = 'LANDING_PAGE',
  PROJECT_HELPER = 'PROJECT_HELPER',
  TASK_LIST = 'TASK_LIST',

  // Target App Modes
  ROOM_DESIGNER = 'ROOM_DESIGNER',
  LIFESTYLE_GEN = 'LIFESTYLE_GEN',
  VIBE_MATCH = 'VIBE_MATCH',
  AUDIENCE_GEN = 'AUDIENCE_GEN',
  MARKETING_CAMPAIGN = 'MARKETING_CAMPAIGN',
  PRODUCT_VARIANT = 'PRODUCT_VARIANT',
  MARKETING_BRIEF = 'MARKETING_BRIEF',
  SYNTHETIC_CHAT = 'SYNTHETIC_CHAT',

  // New Modes
  INSIGHTS = 'INSIGHTS',
  BULK_INSIGHTS = 'BULK_INSIGHTS',
  CONCIERGE = 'CONCIERGE',
  PDP_HUB = 'PDP_HUB',
  MARKETING_HUB = 'MARKETING_HUB',
  SYNTHETIC_FOCUS_GROUP = 'SYNTHETIC_FOCUS_GROUP',
  MULTI_IMAGE = 'MULTI_IMAGE',
  CONTENT_VERSIONING = 'CONTENT_VERSIONING',
  FEASIBILITY_ANALYSIS = 'FEASIBILITY_ANALYSIS',
  ASSISTANT = 'ASSISTANT',
  SYNTHETIC_USERS = 'SYNTHETIC_USERS',
  COMPANY_CONTEXT = 'COMPANY_CONTEXT',
  PRODUCT_SPIN = 'PRODUCT_SPIN',
  YOUTUBE_BANNER = 'YOUTUBE_BANNER',
  CONTENT_AUDIT = 'CONTENT_AUDIT',
  METADATA = 'METADATA',
  AGENT_PLAYGROUND = 'AGENT_PLAYGROUND',
  ADMIN = 'ADMIN',
  INGESTION_ENGINE = 'INGESTION_ENGINE',
  PREDICTIVE_DELIVERY = 'PREDICTIVE_DELIVERY',
  CONTENT_HUB = 'CONTENT_HUB',
  PERSONALIZE_CONTENT = 'PERSONALIZE_CONTENT',
  AUDIT = 'AUDIT',
  STRATEGIZE = 'STRATEGIZE',
  CREATIVE = 'CREATIVE',
  AUDIT_AGENT = 'AUDIT_AGENT',
  ORCHESTRATION = 'ORCHESTRATION'
}

export interface FeasibilityReport {
  score: number;
  summary: string;
  risks: string[];
  opportunities: string[];
  tactical_improvements: Array<{
    area: string;
    suggestion: string;
    priority: 'High' | 'Medium' | 'Low';
  }>;
}

export interface MarketingBriefData {
  title: string;
  timestamp: string;
  campaignGoal: string;
  productName: string;
  companyName: string;
  assumptions: {
    budget: string;
    timeline: string;
    primarySalesFocus: string;
    mitigationStrategy: string;
  };
  objective: {
    goal: { en: string; es: string };
    targetKpi: { en: string; es: string };
  };
  audiences: Array<{
    name: string;
    sourceSegment: string;
    ageRange: string;
    painPoints: string[];
    drivers: string[];
    messagingAngle: { en: string; es: string };
  }>;
  kpis: Array<{
    title: string;
    description: string;
  }>;
  valueProp: {
    main: { en: string; es: string };
    againstCompetitors: string;
    addressingTrends: string;
  };
  messaging: {
    primaryHook: { en: string; es: string };
    supporting1: { title: string; content: { en: string; es: string } };
    supporting2: { title: string; content: { en: string; es: string } };
  };
  channels: Array<{
    name: string;
    justification: string;
  }>;
  phases: Array<{
    title: string;
    dates: string;
    focus: string;
    goal: string;
  }>;
  campaignAssets?: MarketingAssets;
  campaignAssetsMap?: Record<string, MarketingAssets>;
}

export interface MarketingAssets {
  image: string | null;
  imagePrompt?: string;
  social: {
    caption: string;
    hashtags: string[];
  };
  search: {
    headline: string;
    description: string;
    url: string;
  };
  email: {
    subject: string;
    preheader: string;
    body: string;
  };
  youtube: {
    title: string;
    script: string;
  };
  sms?: {
    body: string;
  };
  web?: {
    header: string;
    body: string;
  };
  website: {
    recommendations: Array<{
      name: string;
      price: string;
      image: string | null;
    }>;
  };
}

export interface Persona {
  id: string;
  name: string;
  age: number;
  job_title: string;
  bio: string;
  income: string;
  lifestyle_tags: string[];
  pain_points: string[];
  goals: string[];
  imageUrl?: string;
}

export interface GeneratedImageResult {
  imageUrl: string | null;
  description: string;
  loading: boolean;
  error: string | null;
}

export interface Product {
  id: string;
  name: string;
  price: number;
  image: string;
  description: string;
  tags: string[];
}

export interface VibeMatchResult {
  colors: string[];
  mood: string;
  suggestedProducts: Product[];
}

export enum GenerationMode {
  TEXT_TO_VIDEO = 'TEXT_TO_VIDEO',
  FRAMES_TO_VIDEO = 'FRAMES_TO_VIDEO',
  REFERENCES_TO_VIDEO = 'REFERENCES_TO_VIDEO',
  EXTEND_VIDEO = 'EXTEND_VIDEO'
}

export interface GenerateVideoParams {
  prompt?: string;
  model: string;
  resolution?: string;
  aspectRatio?: string;
  mode: GenerationMode;
  startFrame?: { base64: string; file: { type: string; name: string } };
  endFrame?: { base64: string; file: { type: string; name: string } };
  isLooping?: boolean;
  referenceImages?: { base64: string; file: { type: string; name: string } }[];
  styleImage?: { base64: string; file: { type: string; name: string } };
  inputVideoObject?: any;
  durationSeconds?: number;
  personGeneration?: string;
}

export interface SimulationResult {
  personaId: string;
  personaName: string;
  briefMetrics: {
    interestScore: number;
    clarityScore: number;
    relevanceScore: number;
    feedback: string;
    negativeFeedback: string;
  };
  cart: {
    productName: string;
    purchased: boolean;
    reason: string;
  }[];
  emailEngagement: {
    subjectLine: string;
    opened: boolean;
    clicked: boolean;
  }[];
  messageReactions?: { // Restored to fix syntax error
    message: string;
    score: number;
    sentiment: string;
  }[];
}

export interface CreativeResult {
  personaId: string;
  personaName: string;
  visualAppeal: number;
  brandFit: number;
  stoppingPower: number;
  sentiment: string;
  feedback: string;
  conversionLikelihood: number; // 0-100
  suggestedProduct?: string;
  suggestedMessaging?: string;
  suggestedImage?: string;
  copyEdit?: string;
  audienceGroup?: string; // The creative variant/audience this result belongs to
}

export interface ABTestResult {
  personaId: string;
  personaName: string;
  rankings: {
    variantName: string;
    score: number;
    rationale: string;
  }[];
  selectedVariant: string;
  overallFeedback: string;
  sentiment: string;
}

export interface AggregatedSimulationResult {
  timestamp: string;
  results: SimulationResult[];
}

export interface AcquisitionResult {
  personaId: string;
  personaName: string;
  likelihoodToJoin: number; // 0-100
  perceivedValue: number; // 0-100
  barriers: string;
  feedback: string;
  winningOffer?: string; // Which offer tempted them the most
}

export type SavedSimulation =
  | {
    type: 'ACQUISITION_SIMULATION';
    id: string;
    name: string;
    timestamp: string;
    results: AcquisitionResult[];
    stats: any;
  }
  | {
    type: 'MEMBER_SIMULATION';
    id: string;
    name: string;
    timestamp: string;
    results: SimulationResult[];
    emailBodies?: { [key: string]: string };
  }
  | {
    type: 'CHAT_SESSION';
    id: string;
    name: string;
    timestamp: string;
    messages: { role: 'user' | 'persona'; content: string }[];
    personaId: string;
  }
  | {
    type: 'CREATIVE_SIMULATION';
    id: string;
    name: string;
    timestamp: string;
    results: CreativeResult[];
  }
  | {
    type: 'AB_TEST_SIMULATION';
    id: string;
    name: string;
    timestamp: string;
    results: ABTestResult[];
    variants: { region: string; image: string }[];
  }
  | {
    type: 'INTERVIEW_SESSION';
    id: string;
    name: string;
    timestamp: string;
    question: string;
    results: InterviewResult[];
  };

export interface InterviewResult {
  personaId: string;
  personaName: string;
  transcript: { role: 'interviewer' | 'interviewee'; content: string }[];
  summary: string;
  quote: string;
  sentiment: string;
}

export interface Audience {
  id: string;
  name: string;
  description: string;
  image: string;
}

export interface AudienceSegment {
  name: string;
  personaName: string;
  bio: string;
  demographics: string;
  imagePrompt: string;
  imageUrl?: string;
}

export interface DetailedPersona {
  name: string;
  age: number;
  job_title: string;
  bio: string;
  income: string;
  net_worth: string;
  household_size: string;
  lifestyle_tags: string[];
  preferred_products: string[];
  pain_points: string[];
  goals: string[];
  charts: {
    brand_affinity: { labels: string[], data: number[] };
  };
}

export interface PersonaPsychographics {
  personalityTraits: string[];
  beverageRituals: string;
  flavorAffinity: string;
  sugarPreference: 'Original Full Sugar' | 'Zero Sugar' | 'Mixes Both' | string;
  shoppingValues: string;
  mediaHabits: string;
}

export interface CombinedPersona extends AudienceSegment {
  id?: string;
  details?: DetailedPersona;
  psychographics?: PersonaPsychographics;
  score?: {
    propensity: number;
    value: number;
    reason: string;
  };
}

export interface CognitiveStyle {
  informationDensityPreference: string;
  primaryTrustSignal: string;
  decisionVelocity: string;
  riskTolerance: string;
}

export interface LifestyleFriction {
  dailyGrindContext: string;
  financialMindset: string;
  brandLoyaltyQuotient: string;
  householdPowerDynamic: string;
}

export interface DigitalFootprint {
  last3SearchQueries: string[];
  unsubscribeTrigger: string;
  platformEcosystem: string;
  recentBigLifeEvent: string;
}

export interface PsychographicFlavor {
  theOneLuxury: string;
  aspirationVsReality: string;
  socialCauseAlignment: string;
}

export interface SyntheticUserProfile extends CombinedPersona {
  baseAudienceName?: string;
  baseAudienceBio?: string;
  cognitiveStyle?: CognitiveStyle;
  lifestyleFriction?: LifestyleFriction;
  digitalFootprint?: DigitalFootprint;
  psychographicFlavor?: PsychographicFlavor;
}

export interface MetadataProduct {
  name: string;
  description: string;
  timestamp?: string;
}

export interface MetadataTheme {
  name: string;
  description: string;
}

export interface MetadataCharacter {
  name: string;
  role_description: string;
  appearance_timestamp?: string;
}

export interface MetadataMusic {
  description: string;
  vibe: string;
  duration?: string;
}

export interface MetadataTalkingPoint {
  point: string;
  speaker?: string;
  timestamp?: string;
}

export interface MetadataAnalysisResult {
  summary: string;
  products: MetadataProduct[];
  themes: MetadataTheme[];
  characters: MetadataCharacter[];
  music: MetadataMusic[];
  talking_points: MetadataTalkingPoint[];
  timestamp: string;
  videoId?: string;
  word_cloud?: string[];
}

export interface StitchedProfile {
  id: string;
  name: string;
  avatarUrl: string;
  channelPreference: 'Email' | 'SMS' | 'Push Notification' | 'In-App';
  intentScores: {
    purchaseIntent: number;
    churnRisk: number;
    categoryAffinity: string;
    purchaseIntentReason?: string;
    churnRiskReason?: string;
  };
  behavioralTags: string[];
  observations: string;
  metrics: {
    emailsOpened: number;
    smsClicked: number;
    totalSearches: number;
    pageViews: number;
  };
  touchpoints: Array<{
    timestamp: string;
    channel: string;
    action: string;
    label: string;
  }>;
}

export interface IngestionEngineRun {
  stitchedProfiles: StitchedProfile[];
  timestamp: string;
}

export const formatTouchpointLabel = (label: string | object | undefined | null, action?: string): string => {
  if (!label) return 'No details available';
  
  let dataObj: any = label;
  if (typeof label === 'string') {
    const trimmed = label.trim();
    if (!trimmed.startsWith('{') && !trimmed.startsWith('[')) {
      return label; // Already formatted human-readable text
    }
    try {
      dataObj = JSON.parse(trimmed);
    } catch (e) {
      return label;
    }
  }

  if (typeof dataObj !== 'object' || dataObj === null) return String(dataObj);

  // Friendly human-readable mappings for telemetry, marketing, identity events
  if (dataObj.query) {
    return `Searched for "${dataObj.query}"${dataObj.category ? ` (${dataObj.category})` : ''}`;
  }
  if (dataObj.variant || dataObj.campaign_id) {
    if (dataObj.variant) return `Viewed ad "${dataObj.variant}"`;
    return `Engaged campaign ${dataObj.campaign_id}`;
  }
  if (dataObj.promo_code || dataObj.link_id) {
    if (dataObj.promo_code) return `Claimed offer: ${dataObj.promo_code}`;
    return `Clicked promo link (${dataObj.link_id})`;
  }
  if (dataObj.transaction_id || dataObj.total) {
    return `Completed checkout ($${dataObj.total || dataObj.price || '14.99'})`;
  }
  if (dataObj.product_id) {
    return `Added item to cart ($${dataObj.price || '14.99'})`;
  }
  if (dataObj.session_id) {
    const statusText = dataObj.status ? `${dataObj.status} ` : '';
    const deviceText = dataObj.device ? ` on ${dataObj.device}` : '';
    return `Session ${statusText}started${deviceText}`;
  }
  if (dataObj.user_id) {
    return `User account login (${dataObj.status || 'success'})`;
  }

  // General object key-value formatter fallback
  return Object.entries(dataObj)
    .map(([k, v]) => `${k.replace(/_/g, ' ')}: ${v}`)
    .join(' • ');
};

// --- Full Audit Types ---
export interface AuditStageStatus {
  stage: 'insights' | 'profiles' | 'personas' | 'brief' | 'content' | 'synthetic_testing';
  label: string;
  status: 'pass' | 'warning' | 'flagged';
  score: number;
  keyFinding: string;
  summary: string;
}

export interface AuditCategory {
  id: 'legal' | 'financial' | 'brand';
  title: string;
  riskLevel: 'Low' | 'Medium' | 'High' | 'Critical';
  score: number;
  summary: string;
  issues: string[];
  mitigations: string[];
}

export interface AsymmetricInsight {
  id: string;
  audienceName: string;
  tagline: string;
  rationale: string;
  probability: 'Low (< 15%)' | 'Moderate (< 30%)';
  upsidePayoff: 'Very High (5x-10x Lift)' | 'High (3x-5x Lift)' | 'Transformational Growth';
  actionableMicroTest: string;
  estimatedImpact: string;
  signals: string[];
}

export interface AuditActionItem {
  id: string;
  priority: 'P0 Critical' | 'P1 High' | 'P2 Medium' | 'P3 Opportunity';
  category: 'Legal/Compliance' | 'Financial/Margin' | 'Brand/Strategy' | 'Audience Growth';
  affectedStage: string;
  action: string;
  impact: string;
  status?: 'pending' | 'resolved';
}

export interface ScentOpportunity {
  id: string;
  scentName: string;
  tagline: string;
  targetOccasion: string;
  marketDemandRationale: string;
  scentNotes: string[];
  actionableProductConcept: string;
  estimatedMarketPayoff: string;
}

export interface FullAuditReport {
  overallScore: number;
  readinessLevel: 'Ready to Launch' | 'Caution Required' | 'Action Required Before Launch';
  executiveSummary: string;
  categories: AuditCategory[];
  asymmetricInsights: AsymmetricInsight[];
  scentOpportunities?: ScentOpportunity[];
  creatorSignOff?: {
    campaign_name?: string;
    creator_handle?: string;
    reviewer_name?: string;
    review_date?: string;
    final_decision?: string;
    compliance_score?: number;
    review_table?: any[];
  };
  stageMatrix: AuditStageStatus[];
  actionLedger: AuditActionItem[];
  timestamp: string;
  companyName: string;
}

export interface GoogleAdsAdAsset {
  type: 'headline' | 'longHeadline' | 'description' | 'sitelink' | 'callout' | 'structuredSnippet';
  text: string;
  charCount: number;
  maxChars: number;
  pinnedPosition?: '1' | '2' | '3' | 'any';
  personaAlignment: string;
  performanceScore?: 'EXCELLENT' | 'GOOD' | 'LEARNING';
  descriptionLine2?: string;
  finalUrl?: string;
}

export interface GoogleAdsKeyword {
  keyword: string;
  matchType: 'Exact' | 'Phrase' | 'Broad';
  formattedText: string;
  searchIntent: 'High Commercial' | 'Transactional' | 'Informational' | 'Competitor Conquesting';
  estimatedCpc: string;
  personaTrigger: string;
  monthlyVolumeTier: 'High (10k-50k)' | 'Medium (1k-10k)' | 'Niche (500-1k)';
}

export interface GoogleAdsAdGroup {
  id: string;
  name: string;
  targetPersona: string;
  targetPersonaName: string;
  coreAngle: string;
  headlines: GoogleAdsAdAsset[];
  descriptions: GoogleAdsAdAsset[];
  keywords: GoogleAdsKeyword[];
  negativeKeywords: string[];
  recommendedBidCpa?: string;
}

export interface GoogleAdsAudienceSignal {
  category: 'Custom Intent' | 'In-Market' | 'Affinity' | 'First-Party / Demographics';
  name: string;
  details: string;
  personaLink: string;
}

export interface GoogleAdsCampaignPackage {
  campaignName: string;
  brandName: string;
  campaignType: 'Google Search & Performance Max' | 'Google Search' | 'Demand Gen & YouTube';
  biddingStrategy: string;
  dailyBudget: number;
  monthlyBudget: number;
  targetGeos: string[];
  targetLanguages: string[];
  adSchedule: string;
  strategicRationale: string;
  personasInvolved: string[];
  adGroups: GoogleAdsAdGroup[];
  sitelinks: Array<{ linkText: string; line1: string; line2: string; url: string }>;
  callouts: string[];
  structuredSnippets: { header: string; values: string[] };
  audienceSignals: GoogleAdsAudienceSignal[];
  timestamp: string;
}

