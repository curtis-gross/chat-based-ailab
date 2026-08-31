export interface WSIConsumerRecord {
  id: string;
  name: string;
  age: number;
  location: string;
  segmentArchetype: string;
  preferredProduct: string;
  culinarySkillLevel: 'Artisan Chef' | 'Enthusiastic Cook' | 'Weekend Baker' | 'Entertaining Host';
  topChannel: string;
  annualSpend: number;
  loyaltyTier: 'Reserve VIP' | 'The Key Rewards Premier' | 'Culinary Club' | 'Bridal Registry Explorer';
  lifestyleBio: string;
  buyingTrigger: string;
  painPointsOrBarriers: string;
  observations: string;
  // Compatibility fields with legacy schema
  preferredFlavor?: string;
  consumptionFormat?: string;
  monthlySpend?: number;
}

export const WSI_SYNTHETIC_DATASET: WSIConsumerRecord[] = [
  {
    id: 'wsi_001',
    name: 'Eleanor Vance',
    age: 44,
    location: 'Greenwich, CT',
    segmentArchetype: 'The Heirloom Culinary Traditionalist',
    preferredProduct: 'Le Creuset Signature Round Dutch Oven (5.5 Qt, French Blue)',
    culinarySkillLevel: 'Artisan Chef',
    topChannel: 'Williams Sonoma Retail Flagship & Online Store',
    annualSpend: 3450.00,
    loyaltyTier: 'Reserve VIP',
    lifestyleBio: 'Accomplished home cook and parent who considers the kitchen the emotional center of the home. Values heirloom craftsmanship, enameled cast iron, and multi-generational cooking traditions. Known for weekend braises, homemade sourdough boules, and multi-course Sunday dinners.',
    buyingTrigger: 'Seasonal Williams Sonoma catalog releases, Thanksgiving feast preparation, and wedding gifting.',
    painPointsOrBarriers: 'Rejects cheap non-stick cookware or gimmicky kitchen gadgets; demands multi-ply clad stainless steel or French enameled cast iron with lifetime warranties.',
    observations: 'High household spend; owns complete Le Creuset and All-Clad d5 collections; frequent shopper for seasonal holiday pantry confections (Peppermint Bark).'
  },
  {
    id: 'wsi_002',
    name: 'Chloe Davenport',
    age: 31,
    location: 'Chicago, IL (Lincoln Park)',
    segmentArchetype: 'The Aesthetic Host & Mixologist',
    preferredProduct: 'Williams Sonoma Dorset Cocktail Coupe Set & Marble Bar Cart Collection',
    culinarySkillLevel: 'Entertaining Host',
    topChannel: 'Williams Sonoma Online, Instagram Shopping & In-Store Registry',
    annualSpend: 2180.00,
    loyaltyTier: 'The Key Rewards Premier',
    lifestyleBio: 'Brand marketing manager and weekend entertainer who curates magazine-worthy tablescapes, craft cocktail bars, and tapas evenings. Loves aesthetic presentation, linen napkins, crystal barware, and curated charcuterie boards.',
    buyingTrigger: 'Hosting seasonal dinner parties, bridal showers, holiday gatherings, and cocktail hours.',
    painPointsOrBarriers: 'Compares against Crate & Barrel and West Elm for barware; demands fast curbside pickup and modern aesthetic photography.',
    observations: 'Very high engagement on TikTok and Instagram; posts tablescape and cocktail tutorials; prime target for personalized email and social ad campaigns.'
  },
  {
    id: 'wsi_003',
    name: 'Marcus Chen',
    age: 38,
    location: 'San Francisco, CA',
    segmentArchetype: 'The Gourmet Kitchen Purist',
    preferredProduct: 'Breville Barista Touch Impress Espresso Machine & Shun Classic 8" Chef Knife',
    culinarySkillLevel: 'Artisan Chef',
    topChannel: 'Williams Sonoma Digital App & Store Pick-up',
    annualSpend: 4200.00,
    loyaltyTier: 'Reserve VIP',
    lifestyleBio: 'Tech executive and precision culinary enthusiast who obsesses over extraction pressure in espresso and blade geometry in Japanese cutlery. Views cooking as a science and culinary art.',
    buyingTrigger: 'New smart kitchen appliance releases, cutlery sharpening events, and seasonal specialty olive oil harvests.',
    painPointsOrBarriers: 'High technical expectations; reads in-depth reviews on thermodynamics and motor specs before buying.',
    observations: 'Owns high-end electrics; values Williams Sonoma exclusive colorways and concierge customer support.'
  },
  {
    id: 'wsi_004',
    name: 'David & Sarah Miller',
    age: 29,
    location: 'Austin, TX',
    segmentArchetype: 'The Wedding Registry & Home Starter',
    preferredProduct: 'Williams Sonoma Thermo-Clad Stainless Steel 10-Piece Cookware Set',
    culinarySkillLevel: 'Enthusiastic Cook',
    topChannel: 'Williams Sonoma Registry Concierge & Store Appointments',
    annualSpend: 2850.00,
    loyaltyTier: 'Bridal Registry Explorer',
    lifestyleBio: 'Newlywed couple outfitting their first home kitchen. Transitioning from student cookware to professional-grade tools that will last 20+ years. Trust Williams Sonoma as the gold standard for wedding registries.',
    buyingTrigger: 'Engagement announcements, wedding registry completion discounts, and holiday entertaining prep.',
    painPointsOrBarriers: 'Upfront price barrier; relies heavily on registry completion discount (10-15% off) and guidance from store associates.',
    observations: 'Strong lifetime customer value (LTV) potential; expected to purchase seasonal decor, bakeware, and pantry items for decades.'
  },
  {
    id: 'wsi_005',
    name: 'Hannah Abbott',
    age: 52,
    location: 'Seattle, WA',
    segmentArchetype: 'The Festive Holiday Baker',
    preferredProduct: 'Nordic Ware Heritage Bundt Pan & Williams Sonoma Peppermint Bark',
    culinarySkillLevel: 'Weekend Baker',
    topChannel: 'Williams Sonoma Retail Store & Direct Mail Catalog',
    annualSpend: 1650.00,
    loyaltyTier: 'The Key Rewards Premier',
    lifestyleBio: 'Avid baker and community volunteer who bakes homemade pies, artisan breads, and holiday treats for neighborhood gatherings and family reunions. Treasured customer of Williams Sonoma holiday confections for over 20 years.',
    buyingTrigger: 'Autumn pumpkin spice mix drops, Thanksgiving baking prep, and holiday Peppermint Bark releases.',
    painPointsOrBarriers: 'Frustrated if holiday confections sell out early in November; demands consistent ingredient quality in baking mixes.',
    observations: 'High repeat purchase rate for seasonal consumables (extracts, vanilla bean paste, quick bread mixes, hot chocolate).'
  }
];

export const WSI_DATASET_SUMMARY = {
  totalConsumersInSample: 12500,
  averageAnnualSpend: "$2,850",
  topCategories: ["Cookware & Cast Iron (38%)", "Electrics & Coffee (26%)", "Cutlery & Prep (18%)", "Tabletop & Bar (18%)"],
  registryPenetration: "34% of active customer base",
  reserveVipRetentionRate: "94.2%",
  topAcquisitionChannels: ["Flagship Retail Experience", "Bridal Registry", "Gourmet Digital Search", "Social Influencer Masterclasses"]
};

// Aliases for backward compatibility with existing imports
export type SquirtConsumerRecord = WSIConsumerRecord;
export type DrPepperConsumerRecord = WSIConsumerRecord;
export const SQUIRT_SYNTHETIC_DATASET = WSI_SYNTHETIC_DATASET;
export const DR_PEPPER_SYNTHETIC_DATASET = WSI_SYNTHETIC_DATASET;
export const SQUIRT_DATASET_SUMMARY = WSI_DATASET_SUMMARY;
export const DR_PEPPER_DATASET_SUMMARY = WSI_DATASET_SUMMARY;
