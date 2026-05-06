import { auth } from '@clerk/nextjs/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET() {
  const { userId } = await auth();
  if (!userId) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { data, error } = await supabaseAdmin
    .from('shipments')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json(data);
}

export async function DELETE() {
  const { userId } = await auth();
  if (!userId) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { error } = await supabaseAdmin
    .from('shipments')
    .delete()
    .eq('user_id', userId);

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ ok: true });
}
