const FEDEX_BASE = {
  sandbox: 'https://apis-sandbox.fedex.com',
  production: 'https://apis.fedex.com',
};

const tokenCache: Record<string, { token: string; expiresAt: number }> = {};

export function getFedexCredentials(env: string) {
  if (env === 'production') {
    const id = process.env.FEDEX_PROD_CLIENT_ID;
    const sec = process.env.FEDEX_PROD_CLIENT_SECRET;
    if (!id || !sec) throw new Error('Production FedEx credentials not configured. Add FEDEX_PROD_CLIENT_ID and FEDEX_PROD_CLIENT_SECRET to your environment.');
    return { client_id: id, client_secret: sec };
  }
  return {
    client_id: process.env.FEDEX_CLIENT_ID!,
    client_secret: process.env.FEDEX_CLIENT_SECRET!,
  };
}

export async function getFedexToken(env: string): Promise<string> {
  const cached = tokenCache[env];
  if (cached && Date.now() < cached.expiresAt) return cached.token;

  const creds = getFedexCredentials(env);
  const res = await fetch(`${FEDEX_BASE[env as keyof typeof FEDEX_BASE]}/oauth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'client_credentials', ...creds }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`FedEx auth failed: ${err}`);
  }

  const data = await res.json();
  tokenCache[env] = {
    token: data.access_token,
    expiresAt: Date.now() + (data.expires_in - 60) * 1000,
  };
  return data.access_token;
}

export async function fedexRequest(env: string, endpoint: string, body: object) {
  const token = await getFedexToken(env);
  const base = FEDEX_BASE[env as keyof typeof FEDEX_BASE];
  const res = await fetch(`${base}${endpoint}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      'X-locale': 'en_US',
    },
    body: JSON.stringify(body),
  });
  return res.json();
}

export function buildFedexAddress(contact: {
  street: string; street2?: string; city: string;
  state?: string; zip?: string; country?: string;
}) {
  return {
    streetLines: [contact.street, contact.street2].filter(Boolean),
    city: contact.city,
    stateOrProvinceCode: (contact.state || '').toUpperCase(),
    postalCode: contact.zip || '',
    countryCode: contact.country || 'US',
  };
}

export const SERVICE_NAMES: Record<string, string> = {
  FEDEX_GROUND: 'FedEx Ground',
  FEDEX_2_DAY: 'FedEx 2Day',
  FEDEX_2_DAY_AM: 'FedEx 2Day A.M.',
  PRIORITY_OVERNIGHT: 'FedEx Priority Overnight',
  STANDARD_OVERNIGHT: 'FedEx Standard Overnight',
  FIRST_OVERNIGHT: 'FedEx First Overnight',
  FEDEX_EXPRESS_SAVER: 'FedEx Express Saver',
  GROUND_HOME_DELIVERY: 'FedEx Home Delivery',
  SMART_POST: 'FedEx Ground Economy',
  INTERNATIONAL_PRIORITY: 'FedEx International Priority',
  INTERNATIONAL_ECONOMY: 'FedEx International Economy',
};
