/**
 * Indian states/UTs and their districts, plus PIN code lookup.
 *
 * Every screen gets location data through these functions, never from the JSON directly, so the
 * source can later move to an API or the database without touching the UI.
 *
 * Data: src/data/india-states-districts.json (36 states/UTs, built from Wikipedia's
 * "List of districts in India", December 2025). Districts change often; update the JSON when they do.
 */

export interface StateOption {
  /** Stable 2-letter code, stored alongside the display name. */
  code: string;
  name: string;
}

export interface PinLookup {
  pin: string;
  /** Matched state, or null if India Post's state name is not one we recognise. */
  state: StateOption | null;
  /** Our canonical district name when it matches the list, otherwise India Post's name. */
  district: string;
  /** False when India Post's district is not in our list (e.g. "Mumbai" for City/Suburban). */
  districtInList: boolean;
}

export const PIN_PATTERN = /^[1-9][0-9]{5}$/;

const STATE_CODES: Record<string, string> = {
  'Andaman and Nicobar Islands': 'AN',
  'Andhra Pradesh': 'AP',
  'Arunachal Pradesh': 'AR',
  'Assam': 'AS',
  'Bihar': 'BR',
  'Chandigarh': 'CH',
  'Chhattisgarh': 'CG',
  'Dadra and Nagar Haveli and Daman and Diu': 'DD',
  'Delhi': 'DL',
  'Goa': 'GA',
  'Gujarat': 'GJ',
  'Haryana': 'HR',
  'Himachal Pradesh': 'HP',
  'Jammu and Kashmir': 'JK',
  'Jharkhand': 'JH',
  'Karnataka': 'KA',
  'Kerala': 'KL',
  'Ladakh': 'LA',
  'Lakshadweep': 'LD',
  'Madhya Pradesh': 'MP',
  'Maharashtra': 'MH',
  'Manipur': 'MN',
  'Meghalaya': 'ML',
  'Mizoram': 'MZ',
  'Nagaland': 'NL',
  'Odisha': 'OD',
  'Puducherry': 'PY',
  'Punjab': 'PB',
  'Rajasthan': 'RJ',
  'Sikkim': 'SK',
  'Tamil Nadu': 'TN',
  'Telangana': 'TG',
  'Tripura': 'TR',
  'Uttar Pradesh': 'UP',
  'Uttarakhand': 'UK',
  'West Bengal': 'WB',
};

/** Older or postal spellings of state names (India Post still uses some of these). */
const STATE_ALIASES: Record<string, string[]> = {
  DD: ['Dadra and Nagar Haveli', 'Daman and Diu', 'DNH and DD'],
  DL: ['NCT of Delhi', 'New Delhi'],
  OD: ['Orissa'],
  PY: ['Pondicherry'],
  UK: ['Uttaranchal'],
  CG: ['Chattisgarh'],
  AN: ['Andaman and Nicobar'],
};

/**
 * Old and postal names for districts, per state. Used for search ("Aurangabad" finds
 * Chhatrapati Sambhajinagar) and to match India Post's names to ours.
 */
export const DISTRICT_ALIASES: Record<string, Record<string, string[]>> = {
  MH: {
    'Chhatrapati Sambhajinagar': ['Aurangabad'],
    'Dharashiv': ['Osmanabad'],
    'Ahilyanagar': ['Ahmednagar', 'Ahmed Nagar'],
    'Raigad': ['Raigarh'],
  },
  HR: { 'Gurugram': ['Gurgaon'], 'Nuh': ['Mewat'] },
  MP: { 'Narmadapuram': ['Hoshangabad'] },
  KA: {
    'Mysuru': ['Mysore'],
    'Shivamogga': ['Shimoga'],
    'Vijayapura': ['Bijapur'],
    'Chikkamagaluru': ['Chikmagalur'],
    'Bengaluru Urban': ['Bangalore', 'Bangalore Urban', 'Bengaluru'],
    'Bengaluru Rural': ['Bangalore Rural'],
    'Belagavi': ['Belgaum'],
    'Ballari': ['Bellary'],
    'Kalaburagi': ['Gulbarga'],
    'Tumakuru': ['Tumkur'],
  },
  UP: { 'Prayagraj': ['Allahabad'], 'Ayodhya': ['Faizabad'] },
  TG: { 'Ranga Reddy': ['Rangareddy', 'K.V. Rangareddy'] },
  PB: {
    'Sahibzada Ajit Singh Nagar': ['Mohali', 'SAS Nagar'],
    'Shahid Bhagat Singh Nagar': ['Nawanshahr'],
    'Rupnagar': ['Ropar'],
  },
  UK: { 'Pauri Garhwal': ['Garhwal'] },
  WB: {
    'Paschim Medinipur': ['West Midnapore', 'Paschim Midnapore'],
    'Purba Medinipur': ['East Midnapore', 'Purba Midnapore'],
    'North 24 Parganas': ['Uttar 24 Parganas'],
    'South 24 Parganas': ['Dakshin 24 Parganas'],
    'Cooch Behar': ['Koch Bihar'],
  },
  GJ: { 'Mehsana': ['Mahesana'], 'Dang': ['The Dangs'], 'Kutch': ['Kachchh'] },
  TN: {
    'Thoothukudi': ['Tuticorin'],
    'Tiruchirappalli': ['Trichy'],
    'Nilgiris': ['The Nilgiris'],
    'Viluppuram': ['Villupuram'],
    'Kanchipuram': ['Kancheepuram'],
    'Tiruvallur': ['Thiruvallur'],
    'Tiruvarur': ['Thiruvarur'],
    'Kanyakumari': ['Kanniyakumari'],
  },
  KL: {
    'Thiruvananthapuram': ['Trivandrum'],
    'Kozhikode': ['Calicut'],
    'Thrissur': ['Trichur'],
    'Alappuzha': ['Alleppey'],
    'Kollam': ['Quilon'],
    'Kannur': ['Cannanore'],
    'Palakkad': ['Palghat'],
  },
  AP: {
    'Ananthapuramu': ['Anantapur', 'Ananthapur'],
    'Nellore': ['Sri Potti Sriramulu Nellore', 'SPSR Nellore'],
    'YSR Kadapa': ['Cuddapah', 'Kadapa', 'YSR'],
  },
  OD: {
    'Kendujhar': ['Keonjhar'],
    'Debagarh': ['Deogarh'],
    'Boudh': ['Baudh'],
    'Subarnapur': ['Sonepur'],
    'Balangir': ['Bolangir'],
    'Balasore': ['Baleshwar'],
  },
  AS: { 'Kamrup Metropolitan': ['Kamrup Metro'], 'Morigaon': ['Marigaon'], 'Sivasagar': ['Sibsagar'] },
  BR: { 'East Champaran': ['Purba Champaran', 'Motihari'], 'West Champaran': ['Pashchim Champaran'] },
  JK: { 'Bandipore': ['Bandipora'], 'Budgam': ['Badgam'] },
  RJ: { 'Sri Ganganagar': ['Ganganagar'], 'Jalore': ['Jalor'], 'Chittorgarh': ['Chittaurgarh'] },
  CG: { 'Kabirdham': ['Kawardha'], 'Dantewada': ['Dakshin Bastar Dantewada'], 'Kanker': ['Uttar Bastar Kanker'] },
  JH: {
    'Seraikela-Kharsawan': ['Saraikela Kharsawan'],
    'Hazaribag': ['Hazaribagh'],
    'Palamu': ['Palamau'],
    'East Singhbhum': ['Purbi Singhbhum'],
    'West Singhbhum': ['Pashchimi Singhbhum'],
  },
};

/** Case-, accent- and punctuation-insensitive form used for search and matching. */
export function normalize(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/\([^)]*\)/g, ' ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

type LocationData = Record<string, string[]>;
let dataPromise: Promise<LocationData> | null = null;

// Loaded on first use (its own small chunk), so pages that never show a location field don't pay for it.
function loadData(): Promise<LocationData> {
  dataPromise ??= import('@/data/india-states-districts.json').then((m) => m.default as LocationData);
  return dataPromise;
}

export async function getStates(): Promise<StateOption[]> {
  const data = await loadData();
  return Object.keys(data).map((name) => ({ code: STATE_CODES[name], name }));
}

export async function getDistricts(stateCode: string): Promise<string[]> {
  const data = await loadData();
  const name = Object.keys(STATE_CODES).find((n) => STATE_CODES[n] === stateCode);
  return name ? data[name] ?? [] : [];
}

export async function matchState(name: string): Promise<StateOption | null> {
  const wanted = normalize(name);
  if (!wanted) return null;
  for (const state of await getStates()) {
    const names = [state.name, ...(STATE_ALIASES[state.code] ?? [])];
    if (names.some((n) => normalize(n) === wanted)) return state;
  }
  return null;
}

export async function matchDistrict(stateCode: string, name: string): Promise<string | null> {
  const wanted = normalize(name);
  if (!wanted) return null;
  const aliases = DISTRICT_ALIASES[stateCode] ?? {};
  for (const district of await getDistricts(stateCode)) {
    if ([district, ...(aliases[district] ?? [])].some((n) => normalize(n) === wanted)) return district;
  }
  return null;
}

/**
 * Looks a PIN up with India Post (https://api.postalpincode.in). Returns null when the PIN does
 * not exist; throws when the service can't be reached, so callers can let the user continue manually.
 */
export async function lookupPincode(pin: string, signal?: AbortSignal): Promise<PinLookup | null> {
  if (!PIN_PATTERN.test(pin)) return null;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  signal?.addEventListener('abort', () => controller.abort(), { once: true });
  try {
    const res = await fetch(`https://api.postalpincode.in/pincode/${pin}`, { signal: controller.signal });
    if (!res.ok) throw new Error(`India Post lookup failed (${res.status})`);
    const body = (await res.json()) as { Status: string; PostOffice: { District: string; State: string }[] | null }[];
    const offices = body?.[0]?.Status === 'Success' ? body[0].PostOffice ?? [] : [];
    if (offices.length === 0) return null;

    // A PIN's post offices almost always share one district; take the most common just in case.
    const tally = new Map<string, number>();
    for (const o of offices) tally.set(o.District, (tally.get(o.District) ?? 0) + 1);
    const rawDistrict = [...tally.entries()].sort((a, b) => b[1] - a[1])[0][0];

    const state = await matchState(offices[0].State);
    const district = state ? await matchDistrict(state.code, rawDistrict) : null;
    return {
      pin,
      state,
      district: district ?? rawDistrict.replace(/\s*\([^)]*\)\s*/g, ' ').trim(),
      districtInList: district !== null,
    };
  } finally {
    clearTimeout(timeout);
  }
}
