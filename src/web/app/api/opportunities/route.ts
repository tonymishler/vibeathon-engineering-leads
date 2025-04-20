import { getOpportunities, getOpportunitiesByChannel, getChannels } from "@/lib/db";
import { NextResponse } from "next/server";
import { initializeDatabase } from "../../../../database/init";
import { db } from '@/lib/db';

export const runtime = 'nodejs';

export async function GET() {
  try {
    const [opportunities, channelStats, channels] = await Promise.all([
      getOpportunities(),
      getOpportunitiesByChannel(),
      getChannels()
    ]);

    return NextResponse.json({
      opportunities,
      channelStats,
      channels
    });
  } catch (error) {
    console.error('Error fetching opportunities:', error);
    return NextResponse.json(
      { error: 'Failed to fetch opportunities' },
      { status: 500 }
    );
  }
} 