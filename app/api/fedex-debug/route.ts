import { auth } from '@clerk/nextjs/server';
import { getFedexCredentials } from '@/lib/fedex';

export async function GET() {
  const { userId } = await auth();
  if (!userId) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const results: Record<string, unknown> = {};

  // Step 1: test token
  try {
    const creds = getFedexCredentials('sandbox');
    results.clientIdPrefix = creds.client_id?.slice(0, 6) + '...';

    const tokenRes = await fetch('https://apis-sandbox.fedex.com/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ grant_type: 'client_credentials', ...creds }),
    });

    const tokenData = await tokenRes.json();
    results.tokenStatus = tokenRes.status;

    if (!tokenRes.ok) {
      results.tokenError = tokenData;
      return Response.json(results);
    }

    results.tokenOk = true;
    const token = tokenData.access_token;

    // Step 2: test rates
    const rateRes = await fetch('https://apis-sandbox.fedex.com/rate/v1/rates/quotes', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        'X-locale': 'en_US',
      },
      body: JSON.stringify({
        accountNumber: { value: process.env.FEDEX_ACCOUNT_NUMBER },
        requestedShipment: {
          shipper: { address: { streetLines: ['2610 Pinehurst Dr'], city: 'Madison Heights', stateOrProvinceCode: 'MI', postalCode: '48071', countryCode: 'US' } },
          recipient: { address: { streetLines: ['123 Main St'], city: 'Atlanta', stateOrProvinceCode: 'GA', postalCode: '30301', countryCode: 'US' } },
          pickupType: 'DROPOFF_AT_FEDEX_LOCATION',
          rateRequestType: ['LIST'],
          requestedPackageLineItems: [{ weight: { value: 1, units: 'LB' } }],
        },
      }),
    });

    const rateData = await rateRes.json();
    results.rateStatus = rateRes.status;
    results.rateResponse = rateData;
  } catch (e) {
    results.exception = String(e);
  }

  return Response.json(results);
}
