import { auth } from '@clerk/nextjs/server';

export async function GET() {
  const { userId } = await auth();
  if (!userId) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  return Response.json({
    configured: !!(process.env.FEDEX_CLIENT_ID && process.env.FEDEX_CLIENT_SECRET && process.env.FEDEX_ACCOUNT_NUMBER),
    prodConfigured: !!(process.env.FEDEX_PROD_CLIENT_ID && process.env.FEDEX_PROD_CLIENT_SECRET),
    anthropicConfigured: !!process.env.ANTHROPIC_API_KEY,
    accountNumber: process.env.FEDEX_ACCOUNT_NUMBER
      ? '****' + process.env.FEDEX_ACCOUNT_NUMBER.slice(-4)
      : null,
  });
}
