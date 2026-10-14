import { supabaseAdmin } from '@/lib/supabase-admin';
import MemberStatsClient from './MemberStatsClient';

export const dynamic = 'force-dynamic';

function startOfMonth() {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
}
function startOfYear() {
  const d = new Date();
  return new Date(d.getFullYear(), 0, 1).toISOString().slice(0, 10);
}

async function getStatsForRange(memberId: string, since: string) {
  const [{ data: wars }, { data: capital }] = await Promise.all([
    supabaseAdmin
      .from('war_participations')
      .select('war_type, attacks_used, attacks_possible, stars')
      .eq('member_id', memberId)
      .gte('war_end_date', since),
    supabaseAdmin
      .from('capital_participations')
      .select('capital_resources_looted')
      .eq('member_id', memberId)
      .gte('raid_weekend_end_date', since),
  ]);

  const sum = (type: 'war' | 'cwl') => {
    const rows = (wars || []).filter((w) => w.war_type === type);
    return {
      made: rows.reduce((s, r) => s + r.attacks_used, 0),
      missed: rows.reduce((s, r) => s + (r.attacks_possible - r.attacks_used), 0),
      stars: rows.reduce((s, r) => s + r.stars, 0),
    };
  };

  return {
    war: sum('war'),
    cwl: sum('cwl'),
    capital: (capital || []).reduce((s, r) => s + r.capital_resources_looted, 0),
  };
}

export default async function MemberPage({
  params,
}: {
  params: Promise<{ tag: string; memberTag: string }>;
}) {
  const { tag, memberTag } = await params;
  const fullMemberTag = `#${memberTag.toUpperCase()}`;

  const { data: member } = await supabaseAdmin
    .from('members')
    .select('id, name, role, trophies')
    .eq('tag', fullMemberTag)
    .single();

  if (!member) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gradient-to-b from-orange-600 to-amber-400">
        <p className="text-white font-bold text-xl">Member not found.</p>
      </main>
    );
  }

  const [monthly, yearly] = await Promise.all([
    getStatsForRange(member.id, startOfMonth()),
    getStatsForRange(member.id, startOfYear()),
  ]);

  return (
    <MemberStatsClient clanTag={tag} member={member} monthly={monthly} yearly={yearly} />
  );
}