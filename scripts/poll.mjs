import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const PROXY = 'https://cocproxy.royaleapi.dev/v1';
const TOKEN = process.env.SUPERCELL_API_TOKEN;

function toDate(apiTime) {
  // "20261014T120000.000Z" -> "2026-10-14"
  return `${apiTime.slice(0, 4)}-${apiTime.slice(4, 6)}-${apiTime.slice(6, 8)}`;
}

async function cocFetch(path) {
  const res = await fetch(`${PROXY}${path}`, {
    headers: { Authorization: `Bearer ${TOKEN}` },
  });
  if (!res.ok) return null;
  return res.json();
}

async function getMemberId(clanId, tag) {
  const { data } = await supabase
    .from('members')
    .select('id')
    .eq('clan_id', clanId)
    .eq('tag', tag)
    .single();
  return data?.id ?? null;
}

async function pollWar(clan) {
  const war = await cocFetch(`/clans/${encodeURIComponent(clan.tag)}/currentwar`);
  if (!war || war.state !== 'warEnded') return;

  const warTag = `${clan.tag}_${war.endTime}`;
  const attacksPossible = war.attacksPerMember ?? 1;

  for (const m of war.clan.members ?? []) {
    const memberId = await getMemberId(clan.id, m.tag);
    if (!memberId) continue;
    const attacks = m.attacks ?? [];
    const stars = attacks.reduce((s, a) => s + a.stars, 0);
    const avgDestruction = attacks.length
      ? attacks.reduce((s, a) => s + a.destructionPercentage, 0) / attacks.length
      : 0;

    await supabase.from('war_participations').upsert(
      {
        member_id: memberId,
        clan_id: clan.id,
        war_type: 'war',
        war_tag: warTag,
        war_end_date: toDate(war.endTime),
        attacks_used: attacks.length,
        attacks_possible: attacksPossible,
        stars,
        avg_destruction: avgDestruction,
      },
      { onConflict: 'member_id,war_tag' }
    );
  }
}

async function pollCWL(clan) {
  const group = await cocFetch(`/clans/${encodeURIComponent(clan.tag)}/currentwar/leaguegroup`);
  if (!group?.rounds) return;

  const warTags = group.rounds.flatMap((r) => r.warTags).filter((t) => t !== '#0');

  for (const warTag of warTags) {
    const war = await cocFetch(`/clanwarleagues/wars/${encodeURIComponent(warTag)}`);
    if (!war || war.state !== 'warEnded') continue;

    const side = [war.clan, war.opponent].find((c) => c.tag === clan.tag);
    if (!side) continue;

    for (const m of side.members ?? []) {
      const memberId = await getMemberId(clan.id, m.tag);
      if (!memberId) continue;
      const attacks = m.attacks ?? [];
      const stars = attacks.reduce((s, a) => s + a.stars, 0);
      const avgDestruction = attacks.length
        ? attacks.reduce((s, a) => s + a.destructionPercentage, 0) / attacks.length
        : 0;

      await supabase.from('war_participations').upsert(
        {
          member_id: memberId,
          clan_id: clan.id,
          war_type: 'cwl',
          war_tag: warTag,
          war_end_date: toDate(war.endTime),
          attacks_used: attacks.length,
          attacks_possible: 1,
          stars,
          avg_destruction: avgDestruction,
        },
        { onConflict: 'member_id,war_tag' }
      );
    }
  }
}

async function pollCapital(clan) {
  const data = await cocFetch(`/clans/${encodeURIComponent(clan.tag)}/capitalraidseasons?limit=3`);
  if (!data?.items) return;

  for (const season of data.items) {
    if (season.state !== 'ended') continue;

    for (const m of season.members ?? []) {
      const memberId = await getMemberId(clan.id, m.tag);
      if (!memberId) continue;

      await supabase.from('capital_participations').upsert(
        {
          member_id: memberId,
          clan_id: clan.id,
          raid_weekend_id: season.endTime,
          raid_weekend_end_date: toDate(season.endTime),
          capital_resources_looted: m.capitalResourcesLooted ?? 0,
          attacks_used: m.attacks ?? 0,
        },
        { onConflict: 'member_id,raid_weekend_id' }
      );
    }
  }
}

async function main() {
  const { data: clans } = await supabase.from('clans').select('id, tag');
  for (const clan of clans ?? []) {
    console.log(`Polling ${clan.tag}...`);
    await pollWar(clan);
    await pollCWL(clan);
    await pollCapital(clan);
  }
  console.log('Done.');
}

main();