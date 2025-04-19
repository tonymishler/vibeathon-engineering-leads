import { getOpportunityById, getOpportunityEvidence, getOpportunityContext } from '@/lib/db';
import { NextResponse } from 'next/server';
import { initializeDatabase } from '../../../../../database/init';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  console.log(`GET /api/opportunities/${params.id} - Starting request`);
  try {
    console.log('Fetching opportunity...');
    const opportunity = await getOpportunityById(params.id);
    console.log('Opportunity found:', !!opportunity);
    
    if (!opportunity) {
      console.log(`Opportunity ${params.id} not found`);
      return new NextResponse(null, { status: 404 });
    }

    console.log('Fetching evidence and context...');
    const [evidence, context] = await Promise.all([
      getOpportunityEvidence(params.id),
      getOpportunityContext(params.id)
    ]);
    console.log(`Retrieved ${evidence?.length ?? 0} pieces of evidence`);
    console.log('Context found:', !!context);

    // Get all unique user IDs from evidence and messages
    const userIds = new Set<string>();
    evidence?.forEach(e => e.author && userIds.add(e.author));
    context?.messages?.forEach(m => m.author && userIds.add(m.author));

    // Fetch user profiles from database
    console.log('Fetching user profiles from database...');
    const dbQueries = await initializeDatabase('opportunities.db');
    const userProfiles = await dbQueries.getUsersByIds(Array.from(userIds));
    const userProfileMap = new Map(userProfiles.map(p => [p.user_id, p]));
    console.log(`Retrieved ${userProfiles.length} user profiles`);

    // Enhance evidence and messages with user info
    const enhancedEvidence = evidence?.map(e => ({
      ...e,
      authorProfile: userProfileMap.get(e.author) || null
    }));

    const enhancedMessages = context?.messages?.map(m => ({
      ...m,
      authorProfile: userProfileMap.get(m.author) || null
    }));

    const enhancedContext = context ? {
      ...context,
      messages: enhancedMessages
    } : null;

    const response = {
      opportunity,
      evidence: enhancedEvidence,
      context: enhancedContext
    };
    
    console.log(`GET /api/opportunities/${params.id} - Success`, {
      hasOpportunity: !!opportunity,
      evidenceCount: enhancedEvidence?.length,
      hasContext: !!enhancedContext,
      userProfileCount: userProfiles.length
    });

    await dbQueries.close();
    return NextResponse.json(response);
  } catch (error) {
    console.error(`Error fetching opportunity ${params.id}:`, {
      error: error instanceof Error ? error.message : error,
      stack: error instanceof Error ? error.stack : undefined
    });
    return new NextResponse(null, { status: 500 });
  }
} 