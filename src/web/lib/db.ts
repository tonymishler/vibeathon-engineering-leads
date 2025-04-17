import Database from 'better-sqlite3';
import path from 'path';
import { Opportunity, OpportunityEvidence, ChannelContext, Channel } from '@/types/database';

const dbPath = path.join(process.cwd(), '..', '..', 'opportunities.db');
const db = new Database(dbPath);

export async function getOpportunities(): Promise<Opportunity[]> {
  const stmt = db.prepare('SELECT * FROM opportunities ORDER BY detected_at DESC');
  return stmt.all() as Opportunity[];
}

export async function getOpportunityById(id: string): Promise<Opportunity | null> {
  const stmt = db.prepare('SELECT * FROM opportunities WHERE opportunity_id = ?');
  return stmt.get(id) as Opportunity | null;
}

export async function getOpportunityEvidence(opportunityId: string): Promise<OpportunityEvidence[]> {
  const stmt = db.prepare('SELECT * FROM opportunity_evidence WHERE opportunity_id = ? ORDER BY timestamp ASC');
  return stmt.all(opportunityId) as OpportunityEvidence[];
}

export async function getChannelContexts(): Promise<ChannelContext[]> {
  const stmt = db.prepare('SELECT * FROM channel_contexts');
  return stmt.all() as ChannelContext[];
}

export async function getChannels(): Promise<Channel[]> {
  const stmt = db.prepare('SELECT * FROM channels');
  return stmt.all() as Channel[];
}

export async function getOpportunitiesByChannel(): Promise<{ channel_id: string; count: number }[]> {
  const stmt = db.prepare(`
    SELECT c.channel_id, COUNT(o.opportunity_id) as count
    FROM opportunities o
    JOIN channel_contexts cc ON o.context_id = cc.context_id
    JOIN channels c ON cc.channel_id = c.channel_id
    GROUP BY c.channel_id
    ORDER BY count DESC
  `);
  return stmt.all() as { channel_id: string; count: number }[];
}

export async function getOpportunitiesByType(): Promise<{ type: string; count: number }[]> {
  const stmt = db.prepare(`
    SELECT type, COUNT(*) as count
    FROM opportunities
    GROUP BY type
    ORDER BY count DESC
  `);
  return stmt.all() as { type: string; count: number }[];
} 