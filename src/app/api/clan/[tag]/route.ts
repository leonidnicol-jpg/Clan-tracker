import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ tag: string }> }
) {
  const { tag } = await params;
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

  if (!res.ok) {
    return NextResponse.json(
      { error: 'Clan not found or API error' },
      { status: res.status }
    );
  }

  const data = await res.json();

  const { data: clanRow } = await supabaseAdmin
    .from('clans')
    .upsert({ tag: clanTag, name: data.name }, { onConflict: 'tag' })
    .select()
    .single();

  if (clanRow) {
    for (const member of data.memberList) {
      await supabaseAdmin.from('members').upsert(
        {
          clan_id: clanRow.id,
          tag: member.tag,
          name: member.name,
          role: member.role,
          trophies: member.trophies,
        },
        { onConflict: 'clan_id,tag' }
      );
    }
  }

  return NextResponse.json(data);
}