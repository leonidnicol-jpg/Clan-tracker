import { NextRequest, NextResponse } from 'next/server';
import { getClanData } from '@/lib/getClanData';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ tag: string }> }
) {
  const { tag } = await params;
  const data = await getClanData(tag);
  if (!data) {
    return NextResponse.json({ error: 'Clan not found or API error' }, { status: 404 });
  }
  return NextResponse.json(data);
}