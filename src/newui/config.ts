/**
 * Feature switches and static catalogues for the new interface.
 *
 * IMPORTANT - honesty rules:
 *  - Nothing here is customer data. Balances, products, orders, purchases and rewards
 *    always come from the database; when no backend exists yet the screens show a clear
 *    "not active yet" state instead of invented numbers.
 *  - Flip a flag to true only after the matching secure backend (Supabase tables / RPCs /
 *    Edge Functions) has been built and tested.
 */
export const FEATURES = {
  /** Monnify dedicated virtual account + wallet ledger (needs Edge Function + wallet tables) */
  wallet: false,
  /** Gbagede OJA products, orders and seller tools (needs marketplace tables) */
  marketplace: false,
  /** Airtime / data / electricity / TV purchases (needs a bills provider Edge Function) */
  bills: false,
  /** Daily login streak tracking (needs a streak table/RPC) */
  loginStreak: false
} as const;

export const NOT_LIVE_NOTE = 'Not active yet - nothing will be charged or recorded.';

export type SectionKey =
  | 'home' | 'ajo' | 'wallet' | 'oja' | 'bills'
  | 'rewards' | 'referrals' | 'advertise' | 'profile';

/** Marketplace taxonomy (labels only; no products are implied). */
export const OJA_CATEGORIES = ['All', 'Electronics', 'Fashion', 'Food', 'Phones', 'Home', 'Beauty', 'Services'] as const;

export const AIRTIME_NETWORKS = [
  { id: 'mtn', name: 'MTN', color: 'bg-yellow-400 text-black' },
  { id: 'airtel', name: 'Airtel', color: 'bg-red-600 text-white' },
  { id: 'glo', name: 'Glo', color: 'bg-green-600 text-white' },
  { id: '9mobile', name: '9mobile', color: 'bg-emerald-900 text-white' }
] as const;

export const ELECTRICITY_DISCOS = [
  'Ikeja Electric (IKEDC)', 'Eko Electricity (EKEDC)', 'Abuja Electricity (AEDC)',
  'Ibadan Electricity (IBEDC)', 'Enugu Electricity (EEDC)', 'Kano Electricity (KEDCO)',
  'Port Harcourt Electricity (PHED)', 'Benin Electricity (BEDC)', 'Kaduna Electric',
  'Jos Electricity (JED)', 'Yola Electricity (YEDC)'
] as const;

export const TV_PROVIDERS = [
  { id: 'dstv', name: 'DStv', color: 'from-sky-600 to-blue-800' },
  { id: 'gotv', name: 'GOtv', color: 'from-lime-500 to-green-700' },
  { id: 'startimes', name: 'StarTimes', color: 'from-orange-500 to-amber-700' }
] as const;

export const QUICK_AMOUNTS = [100, 200, 500, 1000, 2000, 5000] as const;

/**
 * Advertising packages.
 * TODO(owner): replace names, benefits and prices with your real offers. Prices are
 * deliberately null so the UI says "Contact us for pricing" rather than inventing a figure.
 */
export interface AdPackage {
  id: string;
  title: string;
  blurb: string;
  includes: string[];
  price: number | null;
}
export const AD_PACKAGES: AdPackage[] = [
  {
    id: 'spotlight',
    title: 'Spotlight Banner',
    blurb: 'Your business on the home-screen promotion carousel.',
    includes: ['Banner slot on the customer home screen', 'Your image and short message', 'Link to your WhatsApp or page'],
    price: null
  },
  {
    id: 'featured',
    title: 'Featured Product',
    blurb: 'Put a product at the top of Gbagede OJA.',
    includes: ['Top placement in the marketplace', 'Featured badge on your product', 'Shown in the relevant category'],
    price: null
  },
  {
    id: 'campaign',
    title: 'Campaign Package',
    blurb: 'Banner plus featured product for a launch or sale.',
    includes: ['Home-screen banner', 'Featured marketplace placement', 'Help preparing your advert'],
    price: null
  }
];
