export interface SquirtConsumerRecord {
  id: string;
  name: string;
  age: number;
  location: string;
  segmentArchetype: string;
  preferredFlavor: string;
  consumptionFormat: string;
  topChannel: string;
  monthlySpend: number;
  loyaltyTier: 'Squirt VIP' | 'Loyal Enthusiast' | 'Occasional Buyer' | 'Trial Explorer';
  lifestyleBio: string;
  buyingTrigger: string;
  painPointsOrBarriers: string;
  observations: string;
}

export const SQUIRT_SYNTHETIC_DATASET: SquirtConsumerRecord[] = [
  {
    id: 'sq_001',
    name: 'Mateo Alvarez',
    age: 32,
    location: 'El Paso, TX',
    segmentArchetype: 'The Cultural Traditionalist',
    preferredFlavor: 'Squirt Original & Mexican Squirt (Real Cane Sugar)',
    consumptionFormat: '2L Bottles & Mexican Glass Bottles (Hecho en México)',
    topChannel: 'Carnicería, Regional Supermarket & Hispanic Grocer',
    monthlySpend: 46.50,
    loyaltyTier: 'Squirt VIP',
    lifestyleBio: 'Warehouse supervisor and family host living in a multi-generational household. Values cultural continuity, family gatherings, and authentic heritage. Serves Squirt Original and Mexican glass bottles for Sunday carne asadas, tamale making, and holiday fiestas where it pairs naturally with traditional food.',
    buyingTrigger: 'Weekend family cookouts, Sunday dinners, and milestone celebrations.',
    painPointsOrBarriers: 'Rejects overly processed beverages; considers Jarritos Toronja and Peñafiel as competitors if Mexican Squirt glass bottles are out of stock.',
    observations: 'Pantry staple; high household penetration in Hispanic community; habitual bulk buyer of 2L bottles and Mexican glass bottles with real cane sugar.'
  },
  {
    id: 'sq_002',
    name: 'Sofia Ramirez',
    age: 28,
    location: 'Austin, TX',
    segmentArchetype: 'The Modern Mixologist',
    preferredFlavor: 'Squirt Zero Sugar & Ruby Red Squirt',
    consumptionFormat: '7.5 oz Mini-Cans & 12-Pack Fridge Packs',
    topChannel: 'Target, Specialty Liquor Retail & Whole Foods',
    monthlySpend: 42.00,
    loyaltyTier: 'Loyal Enthusiast',
    lifestyleBio: 'Creative director and urban socializer who loves aesthetic hosting and DIY home bartending. Seeks a premium yet unpretentious mixer with genuine tart grapefruit bite for handcrafted Palomas with tequila blanco, chili salt, and fresh lime.',
    buyingTrigger: 'Friday happy hours, dinner parties, patio cocktail gatherings, and bar cart styling.',
    painPointsOrBarriers: 'Frequently targeted by Fever-Tree Pink Grapefruit, Q Mixers, and Topo Chico; wants sleek mini-cans and cocktail recipe inspiration.',
    observations: 'High digital engagement on TikTok and Instagram; posts aesthetic drink tutorials; represents high growth potential for automated dynamic creative.'
  },
  {
    id: 'sq_003',
    name: 'Gary Miller',
    age: 49,
    location: 'Columbus, OH',
    segmentArchetype: 'The Nostalgic Flavor Purist',
    preferredFlavor: 'Squirt Original Grapefruit Soda',
    consumptionFormat: '12-Pack Cans & 20 oz Single Bottles',
    topChannel: 'Traditional Supermarket (Kroger) & Convenience Store',
    monthlySpend: 36.00,
    loyaltyTier: 'Squirt VIP',
    lifestyleBio: 'Facilities manager and DIY hobbyist who has enjoyed Squirt for over 30 years. Values comfort in timeless taste, anti-trend reliability, and no-nonsense crisp citrus thirst-quenching after yard work and road trips.',
    buyingTrigger: 'Weekly grocery stock-up and midday convenience store stops.',
    painPointsOrBarriers: 'Targeted by Fresca, Sun Drop, and Mountain Dew, but stays loyal to Squirt as long as local supermarket distribution is consistent.',
    observations: 'Habitual repeat buyer in traditional retail; low interest in marketing gimmicks; values predictable grapefruit tartness and honest 12-pack pricing.'
  },
  {
    id: 'sq_004',
    name: 'Sofia Morales',
    age: 45,
    location: 'El Paso, TX',
    segmentArchetype: 'Multi-Generational Southwestern Heritage Anchor',
    preferredFlavor: 'Squirt Glass Bottle (Hecho en México with Real Cane Sugar)',
    consumptionFormat: 'Glass Bottles & 12-Pack Cans',
    topChannel: 'Local Carnicería & Regional Supermarket',
    monthlySpend: 58.00,
    loyaltyTier: 'Squirt VIP',
    lifestyleBio: 'Head of household coordinating large Sunday family dinners. Grew up with Squirt in Mexico and treasures the crisp authentic glass bottle recipe with real sugar.',
    buyingTrigger: 'Family milestones, quinceañeras, Sunday barbecue cookouts, and holiday celebrations.',
    painPointsOrBarriers: 'Limited distribution of imported Mexican glass bottles in mainstream non-specialty supermarkets.',
    observations: 'Stocks cases of glass bottles for special occasions and 12-packs for everyday family lunches; loyal to the brand for over 25 years.'
  },
  {
    id: 'sq_005',
    name: 'Jake Callahan',
    age: 28,
    location: 'Denver, CO',
    segmentArchetype: 'Outdoor Adventure & Thirst-Crushing Commuter',
    preferredFlavor: 'Squirt Original Citrus (Extra Ice)',
    consumptionFormat: '32oz Fountain Cup & 20oz Bottles',
    topChannel: 'Gas Station Travel Plaza & Fast Casual Drive-Thru',
    monthlySpend: 32.00,
    loyaltyTier: 'Loyal Enthusiast',
    lifestyleBio: 'Construction project engineer and mountain biker who drinks ice-cold Squirt to cut through dry desert-mountain thirst where heavy colas feel too syrupy.',
    buyingTrigger: 'High-heat outdoor workdays, desert road trips, and trail excursions.',
    painPointsOrBarriers: 'Wishes more convenience stores had Squirt on fountain with crushed nugget ice.',
    observations: 'Grabs a 20oz cold bottle with breakfast burritos; praises Squirt as the best caffeine-free thirst quencher on the market.'
  },
  {
    id: 'sq_006',
    name: 'Chloe Simmons',
    age: 24,
    location: 'Austin, TX',
    segmentArchetype: 'Poolside & Brunch Paloma Mocktail Crafter',
    preferredFlavor: 'Squirt Ruby Red & Squirt Zero Sugar',
    consumptionFormat: '12oz Cans & 6-Pack Mini Cans',
    topChannel: 'Sprouts / Whole Foods & Trader Joe\'s',
    monthlySpend: 28.00,
    loyaltyTier: 'Loyal Enthusiast',
    lifestyleBio: 'Digital marketing strategist who creates non-alcoholic citrus spritzers with fresh mint, grapefruit slices, and sparkling Squirt for weekend poolside brunches.',
    buyingTrigger: 'Sunny weekend patio gatherings, pool days, and mindful alcohol-free socializing.',
    painPointsOrBarriers: 'Desires 7.5oz mini cans to be more widely available in club stores for quick single-drink mixing.',
    observations: 'Tags Squirt in colorful Instagram stories featuring salted-rim Paloma mocktails and outdoor brunch tablescapes.'
  },
  {
    id: 'sq_007',
    name: 'Mateo Rodriguez',
    age: 52,
    location: 'Albuquerque, NM',
    segmentArchetype: 'Southwest Traditionalist & Hatch Chile Griller',
    preferredFlavor: 'Squirt Original Citrus',
    consumptionFormat: '12-Pack Cans & 2L Family Bottles',
    topChannel: 'Costco & Neighborhood Grocery',
    monthlySpend: 44.00,
    loyaltyTier: 'Loyal Enthusiast',
    lifestyleBio: 'Lifelong Southwesterner who pairs ice-cold Squirt with fiery green chile stew, carnitas, and smoked ribs; swears the grapefruit acidity cuts right through bold spices.',
    buyingTrigger: 'Late-summer Hatch chile roasting season, backyard smoker sessions, and football watch parties.',
    painPointsOrBarriers: 'Recent price increases on 12-pack carton packaging.',
    observations: 'Buys 3 cases during holiday sales; relies on Squirt as a household staple that appeals across all generations.'
  },
  {
    id: 'sq_008',
    name: 'Ashley Miller',
    age: 33,
    location: 'Las Vegas, NV',
    segmentArchetype: 'Late-Night Hospitality & Quick Palate Cleanser',
    preferredFlavor: 'Squirt Zero Sugar',
    consumptionFormat: 'Single Cans & 20oz Bottles',
    topChannel: 'Convenience Stores & Hotel Pantry Bodegas',
    monthlySpend: 22.00,
    loyaltyTier: 'Occasional Buyer',
    lifestyleBio: 'Hospitality supervisor working long evening shifts who seeks a crisp, refreshing, non-caffeinated palate cleanser to recharge without disturbing sleep.',
    buyingTrigger: 'Late-night shift breaks and weekend pool relaxation.',
    painPointsOrBarriers: 'Prefers single-serve cold placement right by convenience store checkout registers.',
    observations: 'Drinks Squirt Zero Sugar chilled directly from the can with a lime wedge; highlights the authentic tart citrus notes.'
  }
];

export const SQUIRT_DATASET_SUMMARY = {
  totalRecords: SQUIRT_SYNTHETIC_DATASET.length,
  brandPortfolio: "Squirt (Original Grapefruit Citrus, Zero Sugar, Ruby Red, Mexican Glass Bottle Real Sugar)",
  primaryMarkets: ["Texas & Southwest", "California & West Coast", "Rocky Mountains", "Midwest Urban Hubs"],
  coreChannels: ["Grocery Multi-Pack", "Hispanic Supermarkets & Carnicerías", "C-Store Single Serve", "Mass & Club Stores"],
  keyConsumerSegments: [
    "The Cultural Traditionalist",
    "The Modern Mixologist",
    "The Nostalgic Flavor Purist",
    "Multi-Generational Southwestern Heritage Anchor",
    "Outdoor Adventure & Thirst-Crushing Commuter",
    "Poolside & Brunch Paloma Mocktail Crafter"
  ],
  averageMonthlySpend: "$35.38",
  highestGrowthFlavor: "Squirt Zero Sugar & Squirt Ruby Red Paloma Cocktails"
};

// Backward-compatibility aliases
export type DrPepperConsumerRecord = SquirtConsumerRecord;
export const DR_PEPPER_SYNTHETIC_DATASET = SQUIRT_SYNTHETIC_DATASET;
export const DR_PEPPER_DATASET_SUMMARY = SQUIRT_DATASET_SUMMARY;
