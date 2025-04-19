import { getOpportunityById, getOpportunityEvidence, getOpportunityContext } from '@/lib/db';
import { NextResponse } from 'next/server';

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

    const response = {
      opportunity,
      evidence,
      context
    };
    
    console.log(`GET /api/opportunities/${params.id} - Success`, {
      hasOpportunity: !!opportunity,
      evidenceCount: evidence?.length,
      hasContext: !!context
    });

    return NextResponse.json(response);
  } catch (error) {
    console.error(`Error fetching opportunity ${params.id}:`, {
      error: error instanceof Error ? error.message : error,
      stack: error instanceof Error ? error.stack : undefined
    });
    return new NextResponse(null, { status: 500 });
  }
} 