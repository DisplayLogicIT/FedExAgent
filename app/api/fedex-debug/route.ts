import { auth } from '@clerk/nextjs/server';
import { getFedexCredentials } from '@/lib/fedex';

export async function GET() {
  const { userId } = await auth();
  if (!userId) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const results: Record<string, unknown> = {};

  // Step 1: get token
  let token: string;
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
    if (!tokenRes.ok) { results.tokenError = tokenData; return Response.json(results); }
    results.tokenOk = true;
    token = tokenData.access_token;
  } catch (e) {
    results.exception = String(e);
    return Response.json(results);
  }

  const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, 'X-locale': 'en_US' };
  const accountNumber = process.env.FEDEX_ACCOUNT_NUMBER;

  // Step 2: rate check
  const rateRes = await fetch('https://apis-sandbox.fedex.com/rate/v1/rates/quotes', {
    method: 'POST', headers,
    body: JSON.stringify({
      accountNumber: { value: accountNumber },
      requestedShipment: {
        shipper: { address: { streetLines: ['40 Oser Ave Ste 4'], city: 'Hauppauge', stateOrProvinceCode: 'NY', postalCode: '11788', countryCode: 'US' } },
        recipient: { address: { streetLines: ['123 Main St'], city: 'Atlanta', stateOrProvinceCode: 'GA', postalCode: '30301', countryCode: 'US' } },
        pickupType: 'DROPOFF_AT_FEDEX_LOCATION',
        rateRequestType: ['LIST'],
        requestedPackageLineItems: [{ weight: { value: 1, units: 'LB' } }],
      },
    }),
  });
  const rateData = await rateRes.json();
  results.rateStatus = rateRes.status;
  results.rateErrors = rateData.errors || null;
  results.rateOk = !rateData.errors;

  // Step 3: shipment creation test
  const shipRes = await fetch('https://apis-sandbox.fedex.com/ship/v1/shipments', {
    method: 'POST', headers,
    body: JSON.stringify({
      labelResponseOptions: 'LABEL',
      accountNumber: { value: accountNumber },
      requestedShipment: {
        shipper: {
          contact: { personName: 'Jeremy Schleimer', companyName: 'Display Logic USA Inc', phoneNumber: '6316943200', emailAddress: '' },
          address: { streetLines: ['40 Oser Ave Ste 4'], city: 'Hauppauge', stateOrProvinceCode: 'NY', postalCode: '11788', countryCode: 'US' },
        },
        recipients: [{
          contact: { personName: 'John Smith', companyName: '', phoneNumber: '4045550123', emailAddress: '' },
          address: { streetLines: ['123 Main St'], city: 'Atlanta', stateOrProvinceCode: 'GA', postalCode: '30301', countryCode: 'US', residential: false },
        }],
        pickupType: 'DROPOFF_AT_FEDEX_LOCATION',
        serviceType: 'FEDEX_GROUND',
        packagingType: 'YOUR_PACKAGING',
        labelSpecification: { labelFormatType: 'COMMON2D', imageType: 'PNG', labelStockType: 'PAPER_4X6' },
        requestedPackageLineItems: [{ sequenceNumber: 1, weight: { value: 1, units: 'LB' } }],
      },
    }),
  });
  const shipData = await shipRes.json();
  results.shipStatus = shipRes.status;
  results.shipErrors = shipData.errors || null;
  results.shipOk = !shipData.errors && !!shipData.output;
  if (results.shipOk) {
    const t = shipData.output?.transactionShipments?.[0];
    results.trackingNumber = t?.masterTrackingNumber || t?.pieceResponses?.[0]?.trackingNumber;
    results.labelGenerated = !!t?.pieceResponses?.[0]?.packageDocuments?.[0]?.encodedLabel;
  }

  return Response.json(results);
}
