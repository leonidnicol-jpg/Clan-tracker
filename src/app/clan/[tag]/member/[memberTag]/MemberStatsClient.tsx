'use client';

import { useState } from 'react';
import Link from 'next/link';

type Stats = {
  war: { made: number; missed: number; stars: number };
  cwl: { made: number; missed: number; stars: number };
  capital: number;
};

export default function MemberStatsClient({
  clanTag,
  member,
  monthly,
  yearly,
}: {
  clanTag: string;
  member: { name: string; role: string; trophies: number };
  monthly: Stats;
  yearly: Stats;
}) {
  const [range, setRange] = useState<'monthly' | 'yearly'>('monthly');
  const stats = range === 'monthly' ? monthly : yearly;

  return (
    <main className="min-h-screen bg-gradient-to-b from-orange-600 to-amber-400 pb-10">
      <header className="p-4 bg-amber-900/80 flex items-center gap-4">
        <Link href={`/clan/${clanTag}`} className="text-amber-100 font-bold">
          ←
        </Link>
        <div>
          <h1 className="text-white font-black text-xl">{member.name}</h1>
          <p className="text-amber-200 text-sm capitalize">
            {member.role} · 🏆 {member.trophies}
          </p>
        </div>
      </header>

      <div className="p-4">
        <div className="flex bg-amber-900/40 rounded-lg p-1 mb-4 w-fit">
          <button
            onClick={() => setRange('monthly')}
            className={`px-4 py-2 rounded-md font-bold text-sm ${
              range === 'monthly' ? 'bg-amber-50 text-amber-900' : 'text-amber-100'
            }`}
          >
            Monthly
          </button>
          <button
            onClick={() => setRange('yearly')}
            className={`px-4 py-2 rounded-md font-bold text-sm ${
              range === 'yearly' ? 'bg-amber-50 text-amber-900' : 'text-amber-100'
            }`}
          >
            Yearly
          </button>
        </div>

        <section className="bg-amber-50/95 border-2 border-amber-800 rounded-xl p-4 mb-4">
          <h2 className="font-black text-amber-900 mb-2">Clan Wars</h2>
          {stats.war.missed > 0 && (
            <p className="text-red-700 font-semibold">
              - missed {stats.war.missed} attack{stats.war.missed === 1 ? '' : 's'}
            </p>
          )}
          <p className="text-green-700 font-semibold">
            + attacked {stats.war.made} time{stats.war.made === 1 ? '' : 's'} with total {stats.war.stars} star{stats.war.stars === 1 ? '' : 's'}
          </p>
        </section>

        <section className="bg-amber-50/95 border-2 border-amber-800 rounded-xl p-4 mb-4">
          <h2 className="font-black text-amber-900 mb-2">CWL</h2>
          {stats.cwl.missed > 0 && (
            <p className="text-red-700 font-semibold">
              - missed {stats.cwl.missed} attack{stats.cwl.missed === 1 ? '' : 's'}
            </p>
          )}
          <p className="text-green-700 font-semibold">
            + attacked {stats.cwl.made} time{stats.cwl.made === 1 ? '' : 's'} with total {stats.cwl.stars} star{stats.cwl.stars === 1 ? '' : 's'}
          </p>
        </section>

        <section className="bg-amber-50/95 border-2 border-amber-800 rounded-xl p-4">
          <h2 className="font-black text-amber-900 mb-2">Clan Capital</h2>
          <p className="text-green-700 font-semibold">+ contributed {stats.capital} points</p>
        </section>
      </div>
    </main>
  );
}