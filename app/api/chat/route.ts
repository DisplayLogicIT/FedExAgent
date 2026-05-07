/* eslint-disable @typescript-eslint/no-explicit-any */
import { createAgentUIStreamResponse, ToolLoopAgent, type ToolSet } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';
import { auth } from '@clerk/nextjs/server';
import { z } from 'zod';
import { supabaseAdmin } from '@/lib/supabase';
import { fedexRequest, buildFedexAddress, getFedexToken, SERVICE_NAMES } from '@/lib/fedex';

function buildSystemPrompt(env: string, defaultShipper: Record<string, string> | null): string {
  const shipperText = defaultShipper
    ? `Default shipper: ${defaultShipper.name}${defaultShipper.company ? ` (${defaultShipper.company})` : ''}, ${defaultShipper.street}${defaultShipper.street2 ? ` ${defaultShipper.street2}` : ''}, ${defaultShipper.city}, ${defaultShipper.state} ${defaultShipper.zip}. Phone: ${defaultShipper.phone || 'not set'}. Use this automatically as the shipper unless the user specifies otherwise.`
    : 'No default shipper is configured yet. If the user wants to create a shipment, ask for shipper details or have them add a default address.';

  return `You are a FedEx shipping assistant integrated into an operations dashboard for Display Logic.

${shipperText}

Your workflow for creating a shipment:
1. If the recipient is mentioned by name, use search_addresses to look them up first.
2. If any required fields are missing (phone number especially), ask the user before proceeding.
3. Call get_rates to fetch available services and prices.
4. Present the rate options clearly, then ask the user to confirm which service they want.
5. Only AFTER the user explicitly confirms, call create_shipment.
6. When the label is created, tell the user the tracking number and confirm the label is ready to download.

You can also: track shipments, save/update contacts, list and search the address book, cancel shipments.

If the user attaches an image (e.g., a packing slip, an order form, a screenshot of an address), examine it carefully and extract the recipient name, company, full street address, city, state, ZIP, phone, and any package weight or dimensions you can see. Treat that as the user's intent — proceed to look up the recipient in the address book or call get_rates directly.

Format rates clearly:
  📦 FedEx Ground — $12.50 (est. delivery: Mon, May 6)
  ✈️ Priority Overnight — $47.82 (by 10:30 AM tomorrow)

Current environment: ${env === 'production' ? 'PRODUCTION (real shipments — real charges will apply)' : 'SANDBOX (test mode — labels are not real)'}
Today's date: ${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}.
${env === 'sandbox' ? 'IMPORTANT: You are in sandbox mode.' : 'You are in PRODUCTION mode. Real charges will apply.'}`;
}

const contactFields = z.object({
  id:          z.string().optional(),
  name:        z.string(),
  company:     z.string().optional(),
  phone:       z.string().optional(),
  email:       z.string().optional(),
  street:      z.string(),
  street2:     z.string().optional(),
  city:        z.string(),
  state:       z.string().optional(),
  zip:         z.string().optional(),
  country:     z.string().optional().default('US'),
  residential: z.boolean().optional().default(false),
  isDefault:   z.boolean().optional(),
});

const packageFields = z.object({
  weight:     z.number(),
  weightUnit: z.string().optional().default('LB'),
  length:     z.number().optional(),
  width:      z.number().optional(),
  height:     z.number().optional(),
  dimUnit:    z.string().optional().default('IN'),
});

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return new Response('Unauthorized', { status: 401 });

  const { messages, env = 'sandbox' } = await req.json();

  const { data: defaultShipper } = await supabaseAdmin
    .from('addresses').select('*').eq('user_id', userId).eq('is_default', true).single();

  const tools = {
    search_addresses: {
      description: 'Search the address book by partial name or company name.',
      inputSchema: z.object({ query: z.string() }),
      execute: async (params: { query: string }) => {
        const { data } = await supabaseAdmin.from('addresses').select('*')
          .eq('user_id', userId)
          .or(`name.ilike.%${params.query}%,company.ilike.%${params.query}%`)
          .limit(20);
        return { contacts: data || [] };
      },
    },

    list_addresses: {
      description: 'List all contacts in the address book.',
      inputSchema: z.object({}),
      execute: async () => {
        const { data } = await supabaseAdmin.from('addresses').select('*').eq('user_id', userId).order('name');
        return { contacts: data || [] };
      },
    },

    save_address: {
      description: 'Save or update a contact in the address book.',
      inputSchema: contactFields,
      execute: async (params: z.infer<typeof contactFields>) => {
        const now = new Date().toISOString();
        if (params.isDefault) {
          await supabaseAdmin.from('addresses').update({ is_default: false }).eq('user_id', userId);
        }
        if (params.id) {
          const { data } = await supabaseAdmin.from('addresses')
            .update({ ...params, is_default: params.isDefault ?? false, updated_at: now })
            .eq('id', params.id).eq('user_id', userId).select().single();
          return { saved: data };
        }
        const { data } = await supabaseAdmin.from('addresses')
          .insert({ ...params, user_id: userId, is_default: params.isDefault ?? false, created_at: now, updated_at: now })
          .select().single();
        return { saved: data };
      },
    },

    get_rates: {
      description: 'Fetch FedEx shipping rates for given shipper, recipient, and package details.',
      inputSchema: z.object({
        shipper:    z.object({ street: z.string(), city: z.string(), state: z.string().optional(), zip: z.string().optional(), country: z.string().optional() }),
        recipient:  z.object({ street: z.string(), city: z.string(), state: z.string().optional(), zip: z.string().optional(), country: z.string().optional() }),
        packages:   z.array(packageFields),
        pickupType: z.string().optional(),
      }),
      execute: async (params: { shipper: { street: string; city: string; state?: string; zip?: string; country?: string }; recipient: { street: string; city: string; state?: string; zip?: string; country?: string }; packages: z.infer<typeof packageFields>[]; pickupType?: string }) => {
        const body = {
          accountNumber: { value: process.env.FEDEX_ACCOUNT_NUMBER },
          requestedShipment: {
            shipper: { address: buildFedexAddress(params.shipper) },
            recipient: { address: buildFedexAddress(params.recipient) },
            pickupType: params.pickupType || 'DROPOFF_AT_FEDEX_LOCATION',
            rateRequestType: ['ACCOUNT', 'LIST'],
            requestedPackageLineItems: params.packages.map(pkg => ({
              weight: { value: pkg.weight, units: pkg.weightUnit || 'LB' },
              dimensions: pkg.length ? { length: pkg.length, width: pkg.width, height: pkg.height, units: pkg.dimUnit || 'IN' } : undefined,
            })),
          },
        };
        const data = await fedexRequest(env, '/rate/v1/rates/quotes', body);
        if (data.errors) return { error: data.errors[0]?.message || 'Rate request failed' };
        const rates = (data.output?.rateReplyDetails || []).map((r: Record<string, unknown>) => {
          const details = r.ratedShipmentDetails as Record<string, unknown>[] | undefined;
          const acct = details?.find((d) => (d as Record<string, string>).rateType === 'PAYOR_ACCOUNT_PACKAGE') || details?.[0];
          const list = details?.find((d) => (d as Record<string, string>).rateType === 'PAYOR_LIST_PACKAGE');
          return {
            serviceType: r.serviceType,
            serviceName: SERVICE_NAMES[r.serviceType as string] || r.serviceType,
            price: parseFloat((acct as Record<string, string>)?.totalNetCharge || '0').toFixed(2),
            listPrice: list ? parseFloat((list as Record<string, string>).totalNetCharge || '0').toFixed(2) : null,
            eta: (r.commit as Record<string, Record<string, string>>)?.dateDetail?.dayFormat || (r.commit as Record<string, string>)?.commitMessageDetails || null,
          };
        });
        return { rates };
      },
    },

    create_shipment: {
      description: 'Create a FedEx shipment and generate a shipping label. Only call AFTER the user explicitly confirms.',
      inputSchema: z.object({
        shipper:     contactFields,
        recipient:   contactFields,
        packages:    z.array(packageFields),
        serviceType: z.string(),
        pickupType:  z.string().optional(),
      }),
      execute: async (params: { shipper: z.infer<typeof contactFields>; recipient: z.infer<typeof contactFields>; packages: z.infer<typeof packageFields>[]; serviceType: string; pickupType?: string }) => {
        const body = {
          labelResponseOptions: 'LABEL',
          requestedShipment: {
            shipper: {
              contact: { personName: params.shipper.name || '', companyName: params.shipper.company || '', phoneNumber: params.shipper.phone || '', emailAddress: params.shipper.email || '' },
              address: buildFedexAddress(params.shipper),
            },
            recipients: [{
              contact: { personName: params.recipient.name || '', companyName: params.recipient.company || '', phoneNumber: params.recipient.phone || '', emailAddress: params.recipient.email || '' },
              address: { ...buildFedexAddress(params.recipient), residential: params.recipient.residential || false },
            }],
            pickupType: params.pickupType || 'DROPOFF_AT_FEDEX_LOCATION',
            serviceType: params.serviceType,
            packagingType: 'YOUR_PACKAGING',
            labelSpecification: { labelFormatType: 'COMMON2D', imageType: 'PNG', labelStockType: 'PAPER_4X6' },
            requestedPackageLineItems: params.packages.map((pkg, i) => ({
              sequenceNumber: i + 1,
              weight: { value: pkg.weight, units: pkg.weightUnit || 'LB' },
              dimensions: pkg.length ? { length: pkg.length, width: pkg.width, height: pkg.height, units: pkg.dimUnit || 'IN' } : undefined,
            })),
          },
          accountNumber: { value: process.env.FEDEX_ACCOUNT_NUMBER },
        };

        const data = await fedexRequest(env, '/ship/v1/shipments', body);
        if (data.errors || !data.output) {
          return { error: data.errors?.[0]?.message || 'Shipment creation failed' };
        }

        const shipment = data.output.transactionShipments?.[0];
        const tracking = shipment?.masterTrackingNumber || shipment?.pieceResponses?.[0]?.trackingNumber || 'N/A';
        const labelB64 = shipment?.pieceResponses?.[0]?.packageDocuments?.[0]?.encodedLabel;

        await supabaseAdmin.from('shipments').insert({
          id: `ship-${Date.now()}`,
          user_id: userId,
          tracking, env,
          recipient: params.recipient.name || '',
          to_city: `${params.recipient.city || ''}, ${params.recipient.state || ''}`,
          service: params.serviceType,
          service_name: SERVICE_NAMES[params.serviceType] || params.serviceType,
          cost: null,
          label_b64: labelB64 || null,
          created_at: new Date().toISOString(),
        });

        return {
          success: true,
          trackingNumber: tracking,
          message: `Shipment created. Tracking: ${tracking}`,
          labelB64: labelB64 || null,
          recipientName: params.recipient.name || '',
          toCity: `${params.recipient.city || ''}, ${params.recipient.state || ''}`,
        };
      },
    },

    track_shipment: {
      description: 'Get tracking status for a FedEx tracking number.',
      inputSchema: z.object({ trackingNumber: z.string() }),
      execute: async (params: { trackingNumber: string }) => {
        const data = await fedexRequest(env, '/track/v1/trackingnumbers', {
          includeDetailedScans: true,
          trackingInfo: [{ trackingNumberInfo: { trackingNumber: params.trackingNumber } }],
        });
        if (data.errors) return { error: data.errors[0]?.message };
        const result = data.output?.completeTrackResults?.[0]?.trackResults?.[0];
        return {
          status: result?.latestStatusDetail?.description || 'Unknown',
          events: (result?.dateAndTimes || []).slice(0, 8).map((e: Record<string, string>) => ({ type: e.type, dateTime: e.dateTime })),
        };
      },
    },

    cancel_shipment: {
      description: 'Cancel a FedEx shipment by tracking number.',
      inputSchema: z.object({ trackingNumber: z.string() }),
      execute: async (params: { trackingNumber: string }) => {
        const token = await getFedexToken(env);
        const fedexBase = env === 'production' ? 'https://apis.fedex.com' : 'https://apis-sandbox.fedex.com';
        const res = await fetch(`${fedexBase}/ship/v1/shipments/cancel`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, 'X-locale': 'en_US' },
          body: JSON.stringify({ accountNumber: { value: process.env.FEDEX_ACCOUNT_NUMBER }, trackingNumber: params.trackingNumber }),
        });
        return res.json();
      },
    },
  } as unknown as ToolSet;

  const agent = new ToolLoopAgent({
    model: anthropic('claude-sonnet-4-6'),
    instructions: buildSystemPrompt(env, defaultShipper),
    tools,
  });

  return createAgentUIStreamResponse({ agent: agent as any, uiMessages: messages });
}
