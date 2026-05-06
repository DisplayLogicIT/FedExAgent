import { auth } from '@clerk/nextjs/server';
import { supabaseAdmin } from '@/lib/supabase';
import { NextRequest } from 'next/server';

export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const q = req.nextUrl.searchParams.get('q');
  let query = supabaseAdmin.from('addresses').select('*').eq('user_id', userId);

  if (q) {
    query = query.or(`name.ilike.%${q}%,company.ilike.%${q}%`);
  } else {
    query = query.order('name');
  }

  const { data, error } = await query;
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json(data);
}

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const input = await req.json();
  const now = new Date().toISOString();

  if (input.isDefault || input.is_default) {
    await supabaseAdmin.from('addresses').update({ is_default: false }).eq('user_id', userId);
  }

  if (input.id) {
    const { data, error } = await supabaseAdmin
      .from('addresses')
      .update({ ...input, is_default: input.isDefault ?? input.is_default ?? false, updated_at: now })
      .eq('id', input.id)
      .eq('user_id', userId)
      .select()
      .single();
    if (error) return Response.json({ error: error.message }, { status: 500 });
    return Response.json(data);
  }

  const { data, error } = await supabaseAdmin
    .from('addresses')
    .insert({ ...input, user_id: userId, is_default: input.isDefault ?? false, created_at: now, updated_at: now })
    .select()
    .single();
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json(data);
}
