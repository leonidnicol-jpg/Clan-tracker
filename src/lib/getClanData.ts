import { supabaseAdmin } from '@/lib/supabase-admin';

export async function getClanData(tag: string) {
  const clanTag = `#${tag.toUpperCase()}`;

  const res = await fetch(
    `https://cocproxy.royaleapi.dev/v1/clans/${encodeURIComponent(clanTag)}`,
    {
      headers: {
        Authorization: `Bearer ${process.env.SUPERCELL_API_TOKEN}`,
      },
      cache: 'no-store',
    }
  );

  if (!res.ok) return null;

  const data = await res.json();

  const { data: clanRow } = await supabaseAdmin
    .from('clans')
    .upsert({ tag: clanTag, name: data.name }, { onConflict: 'tag' })
    .select()
    .single();

  if (clanRow) {
    const memberRows = data.memberList.map((member: {
      tag: string;
      name: string;
      role: string;
      trophies: number;
    }) => ({
      clan_id: clanRow.id,
      tag: member.tag,
      name: member.name,
      role: member.role,
      trophies: member.trophies,
    }));

    await supabaseAdmin
      .from('members')
      .upsert(memberRows, { onConflict: 'clan_id,tag' });
  }

  return data;
}