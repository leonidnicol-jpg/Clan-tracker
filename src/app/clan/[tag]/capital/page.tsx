import { supabaseAdmin } from '@/lib/supabase-admin';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function CapitalHistoryPage({
  params,
}: {
  params: Promise<{ tag: string }>;
}) {
  const { tag } = await params;
  const fullTag = `#${tag.toUpperCase()}`;

  const { data: clan } = await supabaseAdmin
    .from('clans')
    .select('id')
    .eq('tag', fullTag)
    .single();

  if (!clan) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gradient-to-b from-orange-600 to-amber-400">
        <p className="text-white font-bold text-xl">Clan not found.</p>
      </main>
    );
  }

  const { data: rows } = await supabaseAdmin
    .from('capital_participations')
    .select('raid_weekend_end_date, capital_resources_looted, attacks_used, members(name)')
    .eq('clan_id', clan.id)
    .order('capital_resources_looted', { ascending: false });

  const byYear = new Map<string, typeof rows>();
  for (const r of rows ?? []) {
    const year = r.raid_weekend_end_date.slice(0, 4);
    if (!byYear.has(year)) byYear.set(year, []);
    byYear.get(year)!.push(r);
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-orange-600 to-amber-400 pb-24">
      <header className="p-4 bg-amber-900/80 flex items-center gap-4">
        <Link href={`/clan/${tag}`} className="text-amber-100 font-bold">
          ←
        </Link>
        <h1 className="text-white font-black text-xl">Clan Capital History</h1>
      </header>

      <div className="p-4">
        {(!rows || rows.length === 0) && (
          <p className="text-amber-50 font-medium">No capital history recorded yet.</p>
        )}

        {[...byYear.entries()]
          .sort((a, b) => b[0].localeCompare(a[0]))
          .map(([year, yearRows]) => (
            <div key={year} className="mb-6">
              <h2 className="text-white font-black text-lg mb-2">{year}</h2>
              <div className="flex flex-col gap-2">
                {yearRows!.map((r, i) => (
                  <div
                    key={i}
                    className="bg-amber-50/95 border-2 border-amber-800 rounded-xl px-4 py-3 flex justify-between items-center"
                  >
                    <p className="font-bold text-amber-950">
                      {(r.members as unknown as { name: string })?.name ?? 'Unknown'}
                    </p>
                    <p className="text-amber-900 font-bold">  💰 {r.capital_resources_looted} points · {r.attacks_used} attacks</p>
                  </div>
                ))}
              </div>
            </div>
          ))}
      </div>
    </main>
  );
}