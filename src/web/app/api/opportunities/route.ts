import { getOpportunities, getOpportunitiesByChannel, getChannels } from "@/lib/db";
import { NextResponse } from "next/server";

export const runtime = 'nodejs';

export async function GET() {
  try {
    const opportunities = await getOpportunities();
    const channelStats = await getOpportunitiesByChannel();
    const channels = await getChannels();

    return NextResponse.json({
      opportunities,
      channelStats,
      channels
    });
  } catch (error) {
    console.error("Error fetching opportunities:", error);
    return NextResponse.json(
      { error: "Failed to fetch opportunities" },
      { status: 500 }
    );
  }
} 