import { auth } from '@clerk/nextjs/server';
import { supabaseAdmin } from '@/lib/supabase';
import legacy from '@/data/legacy-recipients.json';

type LegacyContact = {
  name: string; company: string; phone: string; street: string; street2: string;
  city: string; state: string; zip: string; country: string; residential: boolean;
};

export async function POST() {
  const { userId } = await auth();
  if (!userId) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { count: existing } = await supabaseAdmin
    .from('addresses').select('*', { count: 'exact', head: true }).eq('user_id', userId);

  const now = new Date().toISOString();
  const rows = (legacy as LegacyContact[])
    .filter(c => c.street && c.city)
    .map(c => ({
      user_id: userId,
      name: c.name || c.company || 'Unnamed',
      company: c.company || null,
      phone: c.phone || null,
      street: c.street,
      street2: c.street2 || null,
      city: c.city,
      state: c.state || null,
      zip: c.zip || null,
      country: c.country || 'US',
      residential: c.residential,
      is_default: false,
      created_at: now,
      updated_at: now,
    }));

  const BATCH = 200;
  let inserted = 0;
  let failed = 0;
  for (let i = 0; i < rows.length; i += BATCH) {
    const slice = rows.slice(i, i + BATCH);
    const { error } = await supabaseAdmin.from('addresses').insert(slice);
    if (error) failed += slice.length;
    else inserted += slice.length;
  }

  return Response.json({ ok: true, inserted, failed, existingBefore: existing ?? 0 });
}
