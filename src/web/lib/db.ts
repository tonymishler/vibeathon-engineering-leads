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

export async function getOpportunityContext(opportunityId: string): Promise<{
  channel: Channel;
  context: ChannelContext;
  messages: { content: string; author: string; timestamp: string; thread_id: string | null }[];
} | null> {
  const stmt = db.prepare(`
    SELECT 
      c.*,
      cc.*,
      json_group_array(json_object(
        'content', m.content,
        'author', m.user_id,
        'timestamp', m.timestamp,
        'thread_id', m.thread_ts
      )) as messages
    FROM opportunities o
    JOIN channel_contexts cc ON o.context_id = cc.context_id
    JOIN channels c ON cc.channel_id = c.channel_id
    LEFT JOIN messages m ON m.channel_id = c.channel_id 
      AND m.timestamp BETWEEN cc.start_date AND cc.end_date
    WHERE o.opportunity_id = ?
    GROUP BY c.channel_id
  `);
  
  const result = stmt.get(opportunityId);
  if (!result) return null;

  return {
    channel: {
      channel_id: result.channel_id,
      name: result.name,
      type: result.type,
      created_at: result.created_at,
      last_analyzed: result.last_analyzed,
      member_count: result.member_count,
      message_count: result.message_count,
      link_count: result.link_count,
      mention_count: result.mention_count,
      metadata: result.metadata
    },
    context: {
      context_id: result.context_id,
      channel_id: result.channel_id,
      start_date: result.start_date,
      end_date: result.end_date,
      message_count: result.message_count,
      window_type: result.window_type,
      context_data: result.context_data
    },
    messages: JSON.parse(result.messages)
  };
} 