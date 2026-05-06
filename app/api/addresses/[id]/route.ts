import { auth } from '@clerk/nextjs/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const { userId } = await auth();
  if (!userId) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { error } = await supabaseAdmin
    .from('addresses')
    .delete()
    .eq('id', params.id)
    .eq('user_id', userId);

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ ok: true });
}
