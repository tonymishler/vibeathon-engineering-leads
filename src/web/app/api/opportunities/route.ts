import { getOpportunities, getOpportunitiesByChannel, getChannels } from "@/lib/db";
import { NextResponse } from "next/server";
import { initializeDatabase } from "../../../../database/init";

export const runtime = 'nodejs';

export async function GET() {
  console.log('GET /api/opportunities - Starting request');
  try {
    console.log('Fetching opportunities...');
    const opportunities = await getOpportunities();
    console.log(`Retrieved ${opportunities?.length ?? 0} opportunities`);

    console.log('Fetching channel stats...');
    const channelStats = await getOpportunitiesByChannel();
    console.log(`Retrieved stats for ${channelStats?.length ?? 0} channels`);

    console.log('Fetching channels...');
    const channels = await getChannels();
    console.log(`Retrieved ${channels?.length ?? 0} channels`);

    // Get all unique user IDs from opportunities
    const userIds = new Set<string>();
    opportunities?.forEach(opp => {
      // Add any user IDs from key_participants if it's a JSON string
      try {
        const participants = JSON.parse(opp.key_participants || '[]');
        participants.forEach((p: string) => userIds.add(p));
      } catch (e) {
        console.warn('Failed to parse key_participants:', e);
      }
    });

    // Fetch user profiles from database if we have any user IDs
    let userProfiles = new Map();
    if (userIds.size > 0) {
      console.log('Fetching user profiles from database...');
      const dbQueries = await initializeDatabase('opportunities.db');
      const profiles = await dbQueries.getUsersByIds(Array.from(userIds));
      userProfiles = new Map(profiles.map(p => [p.user_id, p]));
      console.log(`Retrieved ${userProfiles.size} user profiles`);
      await dbQueries.close();
    }

    // Enhance opportunities with user info
    const enhancedOpportunities = opportunities?.map(opp => {
      let keyParticipants;
      try {
        keyParticipants = JSON.parse(opp.key_participants || '[]');
      } catch (e) {
        keyParticipants = [];
      }

      return {
        ...opp,
        key_participants: keyParticipants,
        participant_profiles: keyParticipants.map((userId: string) => userProfiles.get(userId) || null)
      };
    });

    const response = {
      opportunities: enhancedOpportunities,
      channelStats,
      channels
    };
    
    console.log('GET /api/opportunities - Success', { 
      opportunityCount: enhancedOpportunities?.length,
      channelStatsCount: channelStats?.length,
      channelCount: channels?.length,
      userProfileCount: userProfiles.size
    });
    
    return NextResponse.json(response);
  } catch (error) {
    console.error("Error fetching opportunities:", {
      error: error instanceof Error ? error.message : error,
      stack: error instanceof Error ? error.stack : undefined
    });
    return NextResponse.json(
      { error: "Failed to fetch opportunities" },
      { status: 500 }
    );
  }
} 