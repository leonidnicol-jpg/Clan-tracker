import Image from 'next/image';
import Link from 'next/link';

async function getClan(tag: string) {
  const baseUrl = process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : 'http://localhost:3000';
  const res = await fetch(`${baseUrl}/api/clan/${tag}`, { cache: 'no-store' });
  if (!res.ok) return null;
  return res.json();
}
}

export default async function ClanPage({
  params,
}: {
  params: Promise<{ tag: string }>;
}) {
  const { tag } = await params;
  const clan = await getClan(tag);

  if (!clan) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gradient-to-b from-orange-600 to-amber-400">
        <p className="text-white font-bold text-xl">Clan not found.</p>
      </main>
    );
  }

  const sortedMembers = [...clan.memberList].sort(
    (a, b) => b.trophies - a.trophies
  );

  return (
    <main className="min-h-screen bg-gradient-to-b from-orange-600 to-amber-400 pb-24">
      <header className="flex items-center gap-4 p-4 bg-amber-900/80">
        <Image
          src={clan.badgeUrls.medium}
          alt={clan.name}
          width={64}
          height={64}
        />
        <div>
          <h1 className="text-white font-black text-xl">{clan.name}</h1>
          <p className="text-amber-200 text-sm">
            {clan.tag} · {clan.members} members
          </p>
        </div>
      </header>

      <div className="p-4 flex flex-col gap-2">
        {sortedMembers.map((member, i) => (
          <Link
            key={member.tag}
            href={`/clan/${tag}/member/${encodeURIComponent(member.tag.replace('#', ''))}`}
            className="flex items-center justify-between bg-amber-50/95 border-2 border-amber-800 rounded-xl px-4 py-3 shadow hover:bg-amber-100 transition-colors"
          >
            <div className="flex items-center gap-3">
              <span className="font-black text-amber-700 w-6 text-right">
                {i + 1}
              </span>
              <div>
                <p className="font-bold text-amber-950">{member.name}</p>
                <p className="text-xs text-amber-700 capitalize">
                  {member.role} · TH{member.townHallLevel}
                </p>
              </div>
            </div>
            <p className="font-bold text-orange-700">
              🏆 {member.trophies}
            </p>
          </Link>
        ))}
      </div>

      <nav className="fixed bottom-0 left-0 right-0 bg-amber-900 flex border-t-4 border-amber-700">
        <Link
          href={`/clan/${tag}/cwl`}
          className="flex-1 text-center py-4 text-amber-100 font-bold hover:bg-amber-800"
        >
          CWL
        </Link>
        <Link
          href={`/clan/${tag}/wars`}
          className="flex-1 text-center py-4 text-amber-100 font-bold hover:bg-amber-800 border-x-2 border-amber-700"
        >
          Clan Wars
        </Link>
        <Link
          href={`/clan/${tag}/capital`}
          className="flex-1 text-center py-4 text-amber-100 font-bold hover:bg-amber-800"
        >
          Clan Capital
        </Link>
      </nav>
    </main>
  );
}