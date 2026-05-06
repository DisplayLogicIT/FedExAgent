import { auth, currentUser } from '@clerk/nextjs/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET() {
  const { userId } = await auth();
  if (!userId) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const clerkUser = await currentUser();
  const { data: profile } = await supabaseAdmin
    .from('user_profiles')
    .select('*')
    .eq('user_id', userId)
    .single();

  return Response.json({
    name: `${clerkUser?.firstName || ''} ${clerkUser?.lastName || ''}`.trim() || 'User',
    email: clerkUser?.emailAddresses?.[0]?.emailAddress || '',
    initials: profile?.initials || (clerkUser?.firstName?.[0] || 'U').toUpperCase(),
    company: profile?.company || '',
  });
}

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { initials, company } = await req.json();
  const { error } = await supabaseAdmin
    .from('user_profiles')
    .upsert({ user_id: userId, initials, company, updated_at: new Date().toISOString() });

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ ok: true });
}
