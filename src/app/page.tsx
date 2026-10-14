'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

export default function LoginPage() {
  const [clanTag, setClanTag] = useState('');
  const [error, setError] = useState('');
  const router = useRouter();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanTag = clanTag.trim().replace('#', '').toUpperCase();
    if (!cleanTag) {
      setError('Enter a clan tag');
      return;
    }
    router.push(`/clan/${cleanTag}`);
  };

  return (
    <main className="relative min-h-screen flex items-center justify-center overflow-hidden bg-gradient-to-b from-orange-600 via-orange-500 to-amber-400">
      <Image
        src="/images/barbarian.png"
        alt=""
        width={220}
        height={220}
        className="absolute left-4 bottom-0 hidden sm:block drop-shadow-2xl select-none pointer-events-none"
      />
      <Image
        src="/images/archer-queen.png"
        alt=""
        width={220}
        height={220}
        className="absolute right-4 bottom-0 hidden sm:block drop-shadow-2xl select-none pointer-events-none"
      />

      <div className="relative z-10 flex flex-col items-center px-6">
        <h1 className="text-5xl sm:text-6xl font-black text-center tracking-wide text-yellow-300 drop-shadow-[0_4px_0_rgba(120,53,15,1)] [-webkit-text-stroke:2px_#7c2d12]">
          CLASH OF CLANS
        </h1>
        <p className="mt-2 text-amber-100 font-semibold tracking-wider text-sm sm:text-base">
          CLAN TRACKER
        </p>

        <form
          onSubmit={handleSubmit}
          className="mt-8 w-full max-w-sm bg-amber-50/95 border-4 border-amber-800 rounded-2xl shadow-2xl p-6 flex flex-col gap-4"
        >
          <label className="text-amber-900 font-bold text-sm uppercase tracking-wide">
            Enter Clan Tag
          </label>
          <input
            value={clanTag}
            onChange={(e) => setClanTag(e.target.value)}
            placeholder="#2YLV89JQ"
            className="rounded-lg border-2 border-amber-700 px-4 py-3 text-lg font-semibold text-amber-900 bg-white focus:outline-none focus:ring-2 focus:ring-orange-500"
          />
          {error && <p className="text-red-600 text-sm font-medium">{error}</p>}
          <button
            type="submit"
            className="mt-1 bg-gradient-to-b from-orange-500 to-orange-700 hover:from-orange-400 hover:to-orange-600 text-white font-bold py-3 rounded-lg border-2 border-orange-800 shadow-md transition-colors"
          >
            View Clan
          </button>
        </form>
      </div>
    </main>
  );
}