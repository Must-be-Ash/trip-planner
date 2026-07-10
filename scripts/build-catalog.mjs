#!/usr/bin/env node
// build-catalog.mjs — regenerate reference/endpoints/*.json for the trip-planner skill.
//
// Reads the MasterKey curated registry (data/registry/by-subcat/*.json), selects the travel-relevant
// services listed in TRAVEL_SKILL_SPEC.md §6, and emits one JSON file per capability + an index.json.
// Also bakes in two non-registry sources: the Bazaar routing endpoints (§6 Phase D / T1b) and the
// Apify direct-x402 scraper actors (§6.5 / T1a).
//
// Usage:  node scripts/build-catalog.mjs            (registry auto-located as ../../masterkey/data/registry)
//         MASTERKEY_REGISTRY=/abs/path node scripts/build-catalog.mjs
//
// Re-runnable and idempotent. Never pays anything; pure file transform.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const SKILL_DIR = path.resolve(SCRIPT_DIR, '..');
const REGISTRY = process.env.MASTERKEY_REGISTRY
  || path.resolve(SKILL_DIR, '../masterkey/data/registry');
const BY_SUBCAT = path.join(REGISTRY, 'by-subcat');
const OUT = path.join(SKILL_DIR, 'reference', 'endpoints');

// ---------------------------------------------------------------------------
// Selection: capability file -> [ [subcategory, registryServiceId], ... ]
// Faithful to TRAVEL_SKILL_SPEC.md §6. Only verified+active unless noted.
// ---------------------------------------------------------------------------
const SELECTION = {
  flights: [
    ['flight-aviation', 'stabletravel-google-flights-search'],
    ['flight-aviation', 'stabletravel-google-flights-booking'],       // read-only deep-links
    ['flight-aviation', 'stabletravel-amadeus-flight-search-get'],
    ['flight-aviation', 'stabletravel-award-seats-search-seats-aero'],
    ['flight-aviation', 'stabletravel-award-trip-detail-seats-aero'],
    ['flight-aviation', 'stabletravel-award-availability-sweep-seats-aero'],
    ['flight-aviation', 'stabletravel-amadeus-flight-seatmap'],
    ['flight-aviation', 'stabletravel-amadeus-flight-status'],
    ['flight-aviation', 'stabletravel-amadeus-check-in-links'],
    ['flight-aviation', 'stabletravel-flightaware-flight-by-ident'],
    ['flight-aviation', 'stabletravel-flightaware-airport-delays-specific'],
    ['flight-aviation', 'stabletravel-flightaware-disruption-counts-by-type'],
    ['flight-aviation', 'stabletravel-reference-airport-routes'],
    ['flight-aviation', 'stabletravel-reference-locations-search'],
    ['flight-aviation', 'flight-delay-predictor'],                    // needs-review
  ],
  lodging: [
    ['scheduling-booking', 'stabletravel-hotel-autocomplete'],
    ['scheduling-booking', 'stabletravel-hotel-list-by-city'],
    ['scheduling-booking', 'stabletravel-hotel-list-by-geocode'],
    ['scheduling-booking', 'stabletravel-hotel-offers-search'],
    ['scheduling-booking', 'stabletravel-hotel-offers-by-hotel'],
    ['scheduling-booking', 'stabletravel-hotel-offer-detail'],
    ['scheduling-booking', 'stabletravel-hotel-booking'],             // RED
    ['scheduling-booking', 'stabletravel-activities-search'],
    ['scheduling-booking', 'stabletravel-transfers-search'],
    ['scheduling-booking', 'stabletravel-transfers-book'],            // RED
    ['scheduling-booking', 'stabletravel-transfers-cancel'],          // RED
  ],
  'ground-transport': [
    ['traffic-transportation', 'nyc-transit-live-subway-nearest'],
    ['traffic-transportation', 'nyc-transit-live-bus-nearest'],
    ['traffic-transportation', 'japan-transit-station-search'],
    ['traffic-transportation', 'japan-transit-station-status'],
    ['traffic-transportation', 'waze-traffic'],
    // + Bazaar routing endpoints appended from MANUAL_ROUTING below (T1b)
  ],
  'places-reviews': [
    ['maps-geolocation', 'x402node-geocoding-forward'],
    ['maps-geolocation', 'google-maps-text-search-stableenrich'],
    ['maps-geolocation', 'google-maps-nearby-search-stableenrich'],
    ['maps-geolocation', 'google-maps-place-details-stableenrich'],
    ['maps-geolocation', 'tripadvisor-location-search'],
    ['maps-geolocation', 'tripadvisor-nearby-search'],
    ['maps-geolocation', 'tripadvisor-location-details'],
    ['maps-geolocation', 'tripadvisor-location-reviews'],
    ['maps-geolocation', 'tripadvisor-location-photos'],
    ['serp-seo-apis', 'serper-maps'],
    ['serp-seo-apis', 'serper-places'],
  ],
  'social-sentiment': [
    ['social-media-data', 'reddit-search-stableenrich'],
    ['social-media-data', 'reddit-post-comments-stableenrich'],
    ['social-media-data', 'twit-sh-tweet-search'],
    ['social-media-data', 'scrape-creators-tiktok-video'],
    ['social-media-data', 'social-trend-predictor'],
  ],
  'web-research': [
    ['web-search-apis', 'tavily-search'],
    ['web-search-apis', 'parallel-search'],
    ['web-search-apis', 'parallel-extract'],
    ['web-search-apis', 'parallel-deep-research-task'],
    ['web-search-apis', 'perplexity-search'],
    ['web-search-apis', 'perplexity-sonar-deep-research-async'],
    ['ai-semantic-search', 'exa'],
    ['ai-semantic-search', 'exa-find-similar'],
    ['ai-semantic-search', 'exa-answer'],
    ['ai-semantic-search', 'exa-contents'],
    ['ai-semantic-search', 'perplexica-ai-search'],
    ['ai-semantic-search', 'honcho-agent-memory'],
  ],
  weather: [
    ['weather', 'hugen-weather-forecast'],
    ['weather', 'hugen-weather-current'],
    ['weather', 'x402-deployer-weather'],
    ['weather', 'open-meteo-weather'],
    ['weather', '2s-io-weather'],
    ['weather', 'openweather'],
    ['weather', 'japan-weather-jma'],
    ['weather', 'precip-ai'],
  ],
  'news-safety': [
    ['news-media', 'stableenrich-news'],
    ['serp-seo-apis', 'serper-news'],
    ['news-media', 'httpay-news-headlines'],
  ],
  'fx-budget': [
    ['stocks-financial-data', 'fx-price'],
    ['stocks-financial-data', 'fx-symbols'],
  ],
  'prepare-buy': [
    ['storefront-commerce-apis', 'channel3-commerce-product-search'],
    ['storefront-commerce-apis', 'stableninja-retail-products'],
    ['storefront-commerce-apis', 'stablemerch-custom-merch'],        // RED
    ['payment-processing', 'stablegiftcards-search'],
    ['payment-processing', 'stablegiftcards-product-details'],
    ['payment-processing', 'stablegiftcards-buy'],                   // RED, registry-hidden, user-confirmed
    ['payment-processing', 'stablegiftcards-invoice-status'],
    ['payment-processing', 'laso-finance-order-usa-prepaid-card'],   // RED
    ['payment-processing', 'laso-finance-order-international-prepaid-card'], // RED
    ['payment-processing', 'laso-finance-auth'],
    ['payment-processing', 'laso-finance-get-card-data'],            // registry-hidden, needed for card flow
    ['payment-processing', 'laso-finance-merchant-acceptance-search'], // registry-hidden
  ],
  deliverables: [
    ['image-generation', 'gpt-image-2-generate'],
    ['image-generation', 'nano-banana-2'],
    ['image-generation', 'nano-banana-pro-generate'],
    ['image-generation', 'flux-2-pro-generate'],
    ['pdf-generation-processing', 'makespdf-markdown-to-pdf'],
    ['pdf-generation-processing', 'html-to-pdf-raw-html'],
    ['pdf-generation-processing', 'makespdf-template-render'],
    ['object-file-storage', 'stableupload-file-upload'],
    ['voice-tts', 'text-to-speech-elevenlabs'],
    ['voice-tts', 'openai-tts'],
    ['voice-tts', 'voices-free'],
    ['email', 'stableemail-send'],                                   // RED
    ['email', 'agentmail-send-email'],                               // RED
    ['email', 'agentmail-create-inbox'],                             // RED
    ['sms-phone', 'send-sms'],                                       // RED (Textbelt)
    ['sms-phone', 'agentphone-number'],                              // RED
    ['sms-phone', 'agentphone-messaging-calls'],                     // RED, registry-hidden, user-confirmed
    ['video-voice-calls', 'ai-phone-call'],                          // RED (StablePhone)
  ],
};

// ---------------------------------------------------------------------------
// T1b — Bazaar-sourced routing/ETA endpoints (not in the registry). accepts[] from the
// Bazaar _meta.x402/payment-required captured during spec research.
// ---------------------------------------------------------------------------
const USDC_BASE = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';
const MANUAL_ROUTING = [
  {
    id: 'keyronne-directions-travel-times',
    name: 'Directions + Travel Times (keyronne)',
    provider: 'keyronne', kind: 'api',
    category: 'maps-location', subcategory: 'routing',
    description: 'Point-to-point directions between 2-10 stops by car/bike/foot: total + per-leg distance and travel time, plus route geometry (encoded polyline). Stops can be place names (geocoded) or {lat,lon}. Global, OpenStreetMap data. Fills the routing/ETA gap.',
    pricing: { headline: '$0.010', amount: 0.01, currency: 'USD', unit: 'per call' },
    confirmGate: 'GREEN', status: 'active', registryStatus: 'bazaar', verified: true,
    source: 'bazaar',
    usage: {
      callShape: 'POST https://keyronne.com/api/route  body {"stops":["Shinjuku, Tokyo","Shibuya, Tokyo"],"mode":"car"}',
      inputExample: { stops: ['Shinjuku, Tokyo', 'Shibuya, Tokyo'], mode: 'car' },
      outputShape: 'distanceKm, durationMinutes, legs[].{distanceKm,durationMinutes,from,to}, geometryPolyline, stops[].{lat,lon,name,snappedName}',
      quirks: [
        'stops: 2-10 items; each a place-name string (auto-geocoded) OR a {lat,lon} object.',
        'mode enum: car | bike | foot (default car).',
        'Returns an encoded polyline, NOT a rendered map image (see gaps.md for static-map rendering).',
      ],
      guide: 'POST a JSON body {stops:[...], mode} to sequence an itinerary and check a day is feasible. Total and per-leg distanceKm/durationMinutes come back plus a geometry polyline. Pay ~$0.01 USDC on Base via x402.',
      resultPull: 'sync', auth: 'none',
    },
    endpoints: [{
      provider: 'keyronne', url: 'https://keyronne.com/api/route', method: 'POST',
      priceDisplay: '$0.010', priceUsd: 0.01, networks: ['Base'],
      accepts: [{ scheme: 'exact', network: 'eip155:8453', asset: USDC_BASE, amount: '10000', payTo: '0xB86F95EF5FA904318Ea9Df3b59AdCe099b478fC4' }],
      status: 'active', needsApproval: false,
    }],
  },
  {
    id: 'relaystation-route',
    name: 'Relaystation Route (OSRM mirror)',
    provider: 'relaystation', kind: 'api',
    category: 'maps-location', subcategory: 'routing',
    description: 'Route between two points — distance, duration, geometry as JSON. Redundant fallback for keyronne.',
    pricing: { headline: '$0.010', amount: 0.01, currency: 'USD', unit: 'per route' },
    confirmGate: 'GREEN', status: 'active', registryStatus: 'bazaar', verified: false, source: 'bazaar',
    usage: {
      callShape: 'POST https://api.relaystation.ai/v1/location/route body {origin:[lat,lng], destination:[lat,lng], travelMode:"Car", departNow:true}',
      inputExample: { origin: [35.6896, 139.7006], destination: [35.6580, 139.7016], travelMode: 'Car', departNow: true },
      outputShape: 'route distance/duration/geometry JSON',
      quirks: ['travelMode enum: Car|Truck|Pedestrian|Scooter.', 'Also accepts EURC on Base.'],
      guide: 'Fallback point-to-point route if keyronne is unavailable. ~$0.01 USDC on Base.',
      resultPull: 'sync', auth: 'none',
    },
    endpoints: [{
      provider: 'relaystation', url: 'https://api.relaystation.ai/v1/location/route', method: 'POST',
      priceDisplay: '$0.010', priceUsd: 0.01, networks: ['Base'],
      accepts: [{ scheme: 'exact', network: 'eip155:8453', asset: USDC_BASE, amount: '10000', payTo: '0x5F7254f252eF9b9f92B6B4F2cF91205eD7A96C7A' }],
      status: 'active', needsApproval: false,
    }],
  },
];

// ---------------------------------------------------------------------------
// Purch — real gear PURCHASE + ship (Amazon/Shopify) via x402 on Solana. Not in the MasterKey registry;
// hand-authored from api.purch.xyz OpenAPI. Fills the in-flow gear-checkout gap. Solana USDC only.
// ---------------------------------------------------------------------------
const USDC_SOL = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';
const PURCH_PAYTO_SOL = '8LiXrHC61irY8qwj6qevoiRXxYfrTgSaHVbm8rav6HT2';
const MANUAL_COMMERCE = [
  {
    id: 'purch-search', name: 'Purch Product Search', provider: 'Purch', kind: 'api',
    category: 'ecommerce', subcategory: 'storefront-commerce-apis',
    description: 'Search real, buyable Amazon/Shopify products by keyword (with price filters). Returns products with title/price/ASIN so you can then BUY + ship one via /x402/buy.',
    pricing: { headline: '$0.010', amount: 0.01, currency: 'USD', unit: 'per call' },
    confirmGate: 'GREEN', status: 'active', registryStatus: 'purch', verified: false, source: 'purch',
    usage: {
      callShape: 'GET https://api.purch.xyz/x402/search?q=universal%20travel%20adapter&priceMin=10&priceMax=40',
      inputExample: { q: 'universal travel adapter', priceMax: 40 },
      outputShape: 'products[].{title, price, currency, asin, source(amazon|shopify), productUrl, imageUrl}, totalResults, page, hasMore',
      quirks: ['Solana USDC only ($0.01).', 'Keyword search; use /x402/shop for natural-language assistant ($0.10).', 'Capture asin (Amazon) or productUrl+variantId (Shopify) to feed /x402/buy.'],
      guide: 'Find a buyable product. GET with q (+ optional priceMin/priceMax). Pay ~$0.01 USDC on Solana. Take the asin/productUrl of the chosen item into purch-buy.',
      resultPull: 'sync', auth: 'none',
    },
    endpoints: [{
      provider: 'Purch', url: 'https://api.purch.xyz/x402/search', method: 'GET',
      priceDisplay: '$0.010', priceUsd: 0.01, networks: ['Solana'],
      accepts: [{ scheme: 'exact', network: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp', asset: USDC_SOL, amount: '10000', payTo: PURCH_PAYTO_SOL }],
      status: 'active', needsApproval: false,
    }],
  },
  {
    id: 'purch-shop', name: 'Purch AI Shopping Assistant', provider: 'Purch', kind: 'api',
    category: 'ecommerce', subcategory: 'storefront-commerce-apis',
    description: 'Natural-language shopping assistant: describe the gear you need (e.g. "universal travel adapter for Japan under $30") and get a curated set of buyable products back.',
    pricing: { headline: '$0.100', amount: 0.1, currency: 'USD', unit: 'per call' },
    confirmGate: 'GREEN', status: 'active', registryStatus: 'purch', verified: false, source: 'purch',
    usage: {
      callShape: 'POST https://api.purch.xyz/x402/shop  body {"message":"universal travel adapter for Japan under $30","context":{"priceRange":{"max":30}}}',
      inputExample: { message: 'comfortable walking shoes for a week in Tokyo under $120' },
      outputShape: 'reply (assistant text), products[].{asin,title,price,currency,source}',
      quirks: ['Solana USDC only ($0.10 — 10x a plain search).', 'Body requires `message`; optional `context.priceRange`/`preferences`.', 'Prefer purch-search ($0.01) when you already know the query.'],
      guide: 'Use when the user describes gear loosely. POST {message, context?}; pay ~$0.10 USDC on Solana. Pick a product and feed its asin/productUrl into purch-buy.',
      resultPull: 'sync', auth: 'none',
    },
    endpoints: [{
      provider: 'Purch', url: 'https://api.purch.xyz/x402/shop', method: 'POST',
      priceDisplay: '$0.100', priceUsd: 0.1, networks: ['Solana'],
      accepts: [{ scheme: 'exact', network: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp', asset: USDC_SOL, amount: '100000', payTo: PURCH_PAYTO_SOL }],
      status: 'active', needsApproval: false,
    }],
  },
  {
    id: 'purch-buy', name: 'Purch Buy + Ship', provider: 'Purch', kind: 'api',
    category: 'ecommerce', subcategory: 'storefront-commerce-apis',
    description: 'BUY a real Amazon/Shopify product and ship it to an address — paid in USDC. The x402 charge EQUALS the product total (incl. tax/shipping). Outward/irreversible: real purchase.',
    pricing: { headline: '= product total', amount: null, currency: 'USD', unit: 'per order', dynamic: true },
    confirmGate: 'RED', status: 'active', registryStatus: 'purch', verified: false, source: 'purch',
    usage: {
      callShape: 'POST https://api.purch.xyz/x402/buy  body {asin OR productUrl (+variantId for Shopify), shippingAddress:{name,line1,line2?,city,state,postalCode,country(ISO-2),phone?}, email}',
      inputExample: { asin: 'B0CXYZ1234', shippingAddress: { name: 'Jane Doe', line1: '123 Main St', city: 'San Francisco', state: 'CA', postalCode: '94102', country: 'US' }, email: 'jane@example.com' },
      outputShape: 'orderId, status, product.{title,imageUrl,price}, totalPrice',
      quirks: [
        'RED / needsApproval — this SPENDS REAL MONEY on a real good and ships it. Confirm the exact total + address + item with the user first.',
        'The x402 402 quote (and the charge) EQUALS the product total incl. tax/shipping — not a flat fee.',
        'shippingAddress + email are REQUIRED; Amazon needs asin OR productUrl; Shopify needs productUrl + variantId.',
        'Solana USDC only. country is ISO 3166-1 alpha-2 (e.g. US, JP).',
      ],
      guide: 'Buy + ship a chosen product. Get the asin/productUrl from purch-search/shop, collect the shipping address + email from the user, show the confirm-gate summary (item + total + address), and only on explicit yes POST /x402/buy. The USDC charge equals the product total.',
      resultPull: 'sync', auth: 'none', needsApproval: true,
    },
    endpoints: [{
      provider: 'Purch', url: 'https://api.purch.xyz/x402/buy', method: 'POST',
      priceDisplay: '= product total', priceUsd: null, networks: ['Solana'],
      accepts: [{ scheme: 'exact', network: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp', asset: USDC_SOL, amount: 'dynamic', payTo: PURCH_PAYTO_SOL }],
      status: 'active', needsApproval: true,
    }],
  },
];

// capability -> hand-authored (non-registry) services appended after the registry selection
const MANUAL = { 'ground-transport': MANUAL_ROUTING, 'prepare-buy': MANUAL_COMMERCE };

// ---------------------------------------------------------------------------
// T1a — Apify direct-x402 scraper layer (§6.5). Not in the registry; hand-authored.
// ---------------------------------------------------------------------------
const APIFY = {
  capability: 'apify',
  source: 'apify-direct-x402',
  confirmGate: 'GREEN',            // read-only scrapes; but PAY_PER_EVENT -> maxTotalChargeUsd cap is mandatory
  note: 'Direct x402 on api.apify.com — offline-core, NOT via any MCP. 13,898 x402-enabled actors, all PAY_PER_EVENT.',
  auth: 'x402 via X402-PAYMENT-SIGNATURE header (USDC; treat as Base, confirm chain from the 402 challenge)',
  runEndpoints: {
    syncGetDatasetItems: 'POST https://api.apify.com/v2/actors/{actorId}/run-sync-get-dataset-items',
    sync: 'POST https://api.apify.com/v2/actors/{actorId}/run-sync',
    async: 'POST https://api.apify.com/v2/actors/{actorId}/runs',
  },
  actorIdFormat: 'username~actorName (tilde, not slash)',
  costControl: {
    maxTotalChargeUsd: 'query param, mandatory hard USD ceiling, e.g. ?maxTotalChargeUsd=1.00',
    maxItems: 'query param for dataset-priced actors',
    note: 'Cost is PAY_PER_EVENT (not fixed). ALWAYS set maxTotalChargeUsd. If a cap would exceed ~$1, soft-confirm with the user.',
  },
  discovery: 'GET https://api.apify.com/v2/store?allowsAgenticUsers=true&search=<kw>&responseFormat=agent (runtime lookup; not needed given the baked actors below)',
  errorCodes: ['x402-payment-required (missing header)', 'x402-agentic-payment-insufficient-amount', 'x402-agentic-payment-unauthorized', 'unsupported-actor-pricing-model-for-agentic-payments'],
  actors: [
    { need: 'Booking.com listings + prices', actorId: 'voyager~booking-scraper', fills: 'OTA lodging breadth beyond Amadeus GDS' },
    { need: 'Booking.com listings (fast)', actorId: 'voyager~fast-booking-scraper', fills: 'faster Booking.com discovery' },
    { need: 'Booking.com reviews', actorId: 'voyager~booking-reviews-scraper', fills: 'real guest reviews at scale' },
    { need: 'Airbnb stays', actorId: 'tri_angle~airbnb-scraper', fills: 'non-hotel lodging (Airbnb gap)' },
    { need: 'Airbnb reviews', actorId: 'tri_angle~airbnb-reviews-scraper', fills: 'Airbnb guest reviews' },
    { need: 'Hotel review aggregator', actorId: 'tri_angle~hotel-review-aggregator', fills: 'cross-source hotel review truth' },
    { need: 'Google Maps places', actorId: 'compass~crawler-google-places', fills: 'POIs, hours, ratings' },
    { need: 'Google Maps extractor', actorId: 'compass~google-maps-extractor', fills: 'place extraction' },
    { need: 'Google Maps reviews (text at scale)', actorId: 'compass~Google-Maps-Reviews-Scraper', fills: 'review text -> LLM scores sentiment free' },
    { need: 'Tripadvisor', actorId: 'maxcopell~tripadvisor', fills: 'attractions/restaurants + reviews' },
    { need: 'TikTok by keyword/hashtag', actorId: 'clockworks~tiktok-hashtag-scraper', fills: 'TikTok discovery (no known URL needed)' },
    { need: 'TikTok scraper', actorId: 'clockworks~tiktok-scraper', fills: 'TikTok posts/videos' },
    { need: 'TikTok by location', actorId: 'apidojo~tiktok-location-scraper', fills: 'geo-tagged TikTok (what is happening at a place)' },
    { need: 'Instagram by hashtag', actorId: 'apify~instagram-hashtag-scraper', fills: 'Instagram discovery gap' },
    { need: 'Instagram scraper', actorId: 'apify~instagram-scraper', fills: 'IG posts/profiles' },
    { need: 'Instagram reels', actorId: 'apify~instagram-reel-scraper', fills: 'IG reels (destination inspo)' },
    { need: 'YouTube videos', actorId: 'streamers~youtube-scraper', fills: 'travel vlogs (3 days in X)' },
    { need: 'YouTube transcripts', actorId: 'pintostudio~youtube-transcript-scraper', fills: 'vlog transcripts to read' },
    { need: 'Reddit', actorId: 'trudax~reddit-scraper-lite', fills: 'social layer redundancy' },
    { need: 'X/Twitter', actorId: 'apidojo~tweet-scraper', fills: 'social layer redundancy' },
    { need: 'Google Flights (redundancy)', actorId: 'johnvc~Google-Flights-Data-Scraper-Flight-and-Price-Search', fills: 'backup to StableTravel flight search' },
  ],
};

// ---------------------------------------------------------------------------
// helpers
// ---------------------------------------------------------------------------
function netName(n) {
  if (!n) return 'Base';
  const s = String(n).toLowerCase();
  if (s === 'eip155:8453' || s === 'base') return 'Base';
  if (s === 'eip155:137') return 'Polygon';
  if (s === 'eip155:43114') return 'Avalanche';
  if (s === 'eip155:1') return 'Ethereum';
  if (s.startsWith('solana:') || s === 'solana') return 'Solana';
  return n;
}

const GOODS_SUBCATS = new Set(['payment-processing', 'storefront-commerce-apis', 'shipping-logistics']);

const _cache = new Map();
function loadSubcat(slug) {
  if (_cache.has(slug)) return _cache.get(slug);
  const fp = path.join(BY_SUBCAT, `${slug}.json`);
  const data = JSON.parse(fs.readFileSync(fp, 'utf8'));
  _cache.set(slug, data);
  return data;
}

function pickAccepts(payment) {
  const accepts = (payment && payment.accepts) || [];
  return accepts.map((a) => ({
    scheme: a.scheme, network: a.network, asset: a.asset, amount: a.amount, payTo: a.payTo,
  }));
}

function trimUsage(u) {
  if (!u) return null;
  return {
    status: u.status,
    resultPull: u.resultPull,
    auth: u.auth,
    callShape: u.callShape,
    inputExample: u.inputExample,
    outputShape: u.outputShape,
    quirks: u.quirks || [],
    guide: u.guide,
    costObservedUsd: u.costObservedUsd,
    needsApproval: u.needsApproval,
  };
}

function transform(service, subcat) {
  const backends = service.backends || [];
  const ops = service.operations || [];
  const usage = service.usage || null;

  const anyApproval = backends.some((b) => b.needsApproval)
    || ops.some((o) => o.needsApproval)
    || (usage && usage.needsApproval) || false;
  const dynamicGoods = GOODS_SUBCATS.has(subcat)
    && (service.pricing && (service.pricing.amount == null));
  const confirmGate = (anyApproval || dynamicGoods) ? 'RED' : 'GREEN';

  // Emit one endpoint entry per backend (or per operation when there are no backends).
  const emitFrom = backends.length ? backends : ops;
  const endpoints = emitFrom.map((e) => ({
    provider: e.provider || service.provider,
    name: e.name,                                 // present for operations
    url: e.url,
    method: e.method,
    modelParam: e.modelParam,
    priceDisplay: (e.price && e.price.display) || (service.pricing && service.pricing.headline),
    priceUsd: (e.price && e.price.amount != null) ? e.price.amount : (service.pricing && service.pricing.amount),
    networks: [...new Set(pickAccepts(e.payment).map((a) => netName(a.network)))],
    accepts: pickAccepts(e.payment),
    status: e.status || service.status,
    needsApproval: e.needsApproval || false,
    async: !!e.async,
  }));

  return {
    id: service.id,
    name: service.name,
    provider: service.provider,
    kind: service.kind,
    category: service.category,
    subcategory: service.subcategory,
    description: service.description,
    pricing: service.pricing,
    confirmGate,
    verified: !!(usage && usage.status === 'verified'),
    registryStatus: service.status,
    hiddenReason: service.hiddenReason,
    modality: service.modality,
    usage: trimUsage(usage),
    endpoints,
  };
}

// ---------------------------------------------------------------------------
// build
// ---------------------------------------------------------------------------
function main() {
  if (!fs.existsSync(BY_SUBCAT)) {
    console.error(`Registry not found at ${BY_SUBCAT}. Set MASTERKEY_REGISTRY.`);
    process.exit(1);
  }
  fs.mkdirSync(OUT, { recursive: true });

  const index = {};       // capability -> [ {id, verified, priceDisplay, confirmGate, networks} ]
  const missing = [];
  let totalServices = 0;

  for (const [capability, entries] of Object.entries(SELECTION)) {
    const services = [];
    for (const [subcat, id] of entries) {
      const data = loadSubcat(subcat);
      const svc = data.find((s) => s.id === id);
      if (!svc) { missing.push(`${capability}: ${subcat}/${id}`); continue; }
      services.push(transform(svc, subcat));
    }

    // append hand-authored (non-registry) services: Bazaar routing (ground-transport), Purch (prepare-buy)
    if (MANUAL[capability]) services.push(...MANUAL[capability]);

    fs.writeFileSync(path.join(OUT, `${capability}.json`), JSON.stringify(services, null, 2) + '\n');
    totalServices += services.length;
    index[capability] = services.map((s) => ({
      id: s.id, name: s.name, verified: s.verified, confirmGate: s.confirmGate,
      priceDisplay: (s.endpoints[0] && s.endpoints[0].priceDisplay) || (s.pricing && s.pricing.headline),
      networks: [...new Set(s.endpoints.flatMap((e) => e.networks || []))],
      registryStatus: s.registryStatus,
    }));
    console.log(`  ${capability}.json — ${services.length} services`);
  }

  // T1a — Apify
  fs.writeFileSync(path.join(OUT, 'apify.json'), JSON.stringify(APIFY, null, 2) + '\n');
  index.apify = {
    note: APIFY.note, confirmGate: APIFY.confirmGate, actorCount: APIFY.actors.length,
    auth: APIFY.auth,
  };
  console.log(`  apify.json — ${APIFY.actors.length} actors`);

  // index.json
  fs.writeFileSync(path.join(OUT, 'index.json'), JSON.stringify({
    generatedFrom: 'MasterKey registry by-subcat + Bazaar routing + Apify direct x402',
    registryPath: BY_SUBCAT,
    capabilities: index,
  }, null, 2) + '\n');
  console.log(`  index.json`);

  console.log(`\nDone. ${totalServices} registry+bazaar services across ${Object.keys(SELECTION).length} capability files, plus apify.json.`);
  if (missing.length) {
    console.error(`\nWARNING — ${missing.length} selected id(s) not found in the registry:`);
    for (const m of missing) console.error(`  - ${m}`);
    process.exitCode = 2;
  }
}

main();
