import Database from 'better-sqlite3';
import path from 'path';
import { Opportunity, OpportunityEvidence, ChannelContext, Channel } from '@/types/database';

const dbPath = path.join(process.cwd(), '..', '..', 'opportunities.db');
const db = new Database(dbPath);

export { db };

export async function getOpportunities(): Promise<Opportunity[]> {
  const stmt = db.prepare('SELECT * FROM opportunities ORDER BY detected_at DESC');
  return stmt.all() as Opportunity[];
}

export async function getOpportunityById(id: string): Promise<Opportunity | null> {
  const stmt = db.prepare('SELECT * FROM opportunities WHERE opportunity_id = ?');
  return stmt.get(id) as Opportunity | null;
}

export async function getOpportunityEvidence(opportunityId: string): Promise<OpportunityEvidence[]> {
  const stmt = db.prepare(`
    WITH RECURSIVE
    split_mentions(evidence_id, mention, remaining, position) AS (
      SELECT 
        evidence_id,
        substr(content, instr(content, '<@'), instr(content, '>') + 1 - instr(content, '<@')),
        substr(content, instr(content, '>') + 1),
        instr(content, '<@')
      FROM opportunity_evidence
      WHERE opportunity_id = ? AND content LIKE '%<@%'
      
      UNION ALL
      
      SELECT
        evidence_id,
        substr(remaining, instr(remaining, '<@'), instr(remaining, '>') + 1 - instr(remaining, '<@')),
        substr(remaining, instr(remaining, '>') + 1),
        instr(remaining, '<@')
      FROM split_mentions
      WHERE position > 0 AND remaining LIKE '%<@%'
    ),
    mentions AS (
      SELECT DISTINCT
        evidence_id,
        trim(mention, '<@>') as user_id
      FROM split_mentions
      WHERE mention IS NOT NULL
    )
    SELECT 
      oe.*,
      author_u.display_name as author_display_name,
      author_u.real_name as author_real_name,
      author_u.avatar_url as author_avatar_url,
      json_group_array(
        json_object(
          'user_id', m.user_id,
          'display_name', ref_u.display_name,
          'real_name', ref_u.real_name
        )
      ) as mentioned_users
    FROM opportunity_evidence oe
    LEFT JOIN users author_u ON oe.author = author_u.user_id
    LEFT JOIN mentions m ON oe.evidence_id = m.evidence_id
    LEFT JOIN users ref_u ON m.user_id = ref_u.user_id
    WHERE oe.opportunity_id = ?
    GROUP BY oe.evidence_id
    ORDER BY oe.timestamp ASC
  `);

  const evidence = stmt.all(opportunityId, opportunityId) as (OpportunityEvidence & {
    author_display_name: string | null;
    author_real_name: string | null;
    author_avatar_url: string | null;
    mentioned_users: string;
  })[];

  return evidence.map(e => {
    // Parse the mentioned users JSON array
    const mentionedUsers = JSON.parse(e.mentioned_users || '[]');
    
    // Replace mentions in content with user names
    let enhancedContent = e.content;
    mentionedUsers.forEach((user: any) => {
      if (user.display_name || user.real_name) {
        const mention = `<@${user.user_id}>`;
        const name = user.display_name || user.real_name;
        enhancedContent = enhancedContent.replace(mention, `@${name}`);
      }
    });

    return {
      ...e,
      content: enhancedContent,
      authorProfile: {
        display_name: e.author_display_name,
        real_name: e.author_real_name,
        avatar_url: e.author_avatar_url
      }
    };
  });
}

export async function getChannelContexts(): Promise<ChannelContext[]> {
  const stmt = db.prepare('SELECT * FROM channel_contexts');
  return stmt.all() as ChannelContext[];
}

export async function getChannels(): Promise<Channel[]> {
  const stmt = db.prepare('SELECT * FROM channels');
  return stmt.all() as Channel[];
}

export async function getOpportunitiesByChannel(): Promise<{ channel_id: string; count: number; opportunity_ids: string[] }[]> {
  const stmt = db.prepare(`
    SELECT 
      c.channel_id, 
      COUNT(o.opportunity_id) as count,
      json_group_array(o.opportunity_id) as opportunity_ids
    FROM opportunities o
    JOIN channel_contexts cc ON o.context_id = cc.context_id
    JOIN channels c ON cc.channel_id = c.channel_id
    GROUP BY c.channel_id
    ORDER BY count DESC
  `);
  
  const results = stmt.all() as { channel_id: string; count: number; opportunity_ids: string }[];
  return results.map(row => ({
    ...row,
    opportunity_ids: JSON.parse(row.opportunity_ids)
  }));
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
  messages: { 
    content: string; 
    author: string; 
    timestamp: string; 
    thread_id: string | null; 
    is_evidence?: boolean;
    authorProfile?: { 
      display_name: string | null; 
      real_name: string | null; 
      avatar_url: string | null; 
    } | null; 
  }[];
} | null> {
  // First get the channel and context data
  const channelStmt = db.prepare(`
    SELECT 
      c.*,
      cc.*,
      strftime('%s', cc.start_date) * 1000 as start_ts,
      strftime('%s', cc.end_date) * 1000 as end_ts
    FROM opportunities o
    JOIN channel_contexts cc ON o.context_id = cc.context_id
    JOIN channels c ON cc.channel_id = c.channel_id
    WHERE o.opportunity_id = ?
  `);

  const channelData = channelStmt.get(opportunityId) as any;
  if (!channelData) return null;

  // Then get all messages that contain mentions for this opportunity's context
  const mentionsStmt = db.prepare(`
    WITH RECURSIVE
    split_mentions(message_id, mention, remaining, position) AS (
      SELECT 
        m.message_id,
        substr(m.content, instr(m.content, '<@'), instr(m.content, '>') + 1 - instr(m.content, '<@')),
        substr(m.content, instr(m.content, '>') + 1),
        instr(m.content, '<@')
      FROM messages m
      WHERE m.channel_id = ? 
        AND m.timestamp BETWEEN ? AND ?
        AND m.content LIKE '%<@%'
      
      UNION ALL
      
      SELECT
        message_id,
        substr(remaining, instr(remaining, '<@'), instr(remaining, '>') + 1 - instr(remaining, '<@')),
        substr(remaining, instr(remaining, '>') + 1),
        instr(remaining, '<@')
      FROM split_mentions
      WHERE position > 0 AND remaining LIKE '%<@%'
    )
    SELECT 
      message_id,
      json_group_array(
        json_object(
          'user_id', trim(mention, '<@>'),
          'display_name', u.display_name,
          'real_name', u.real_name
        )
      ) as mentioned_users
    FROM split_mentions
    LEFT JOIN users u ON trim(mention, '<@>') = u.user_id
    WHERE mention IS NOT NULL
    GROUP BY message_id
  `);

  const mentionsByMessageId = new Map(
    (mentionsStmt.all(
      channelData.channel_id,
      channelData.start_ts - 86400000, // Subtract 1 day in milliseconds
      channelData.end_ts + 86400000    // Add 1 day in milliseconds
    ) as { message_id: string; mentioned_users: string }[])
      .map(row => [row.message_id, JSON.parse(row.mentioned_users)])
  );

  // Get all messages within the context window
  const messagesStmt = db.prepare(`
    SELECT 
      m.message_id,
      m.content,
      m.user_id as author,
      m.timestamp,
      m.thread_ts as thread_id,
      u.display_name,
      u.real_name,
      u.avatar_url,
      CASE 
        WHEN m.message_id IN (
          SELECT message_id 
          FROM opportunity_evidence 
          WHERE opportunity_id = ?
        ) THEN 1 
        ELSE 0 
      END as is_evidence,
      (
        SELECT COUNT(*)
        FROM messages replies
        WHERE replies.thread_ts = m.timestamp
          AND replies.timestamp != m.timestamp
      ) as thread_reply_count
    FROM messages m
    LEFT JOIN users u ON m.user_id = u.user_id
    WHERE m.channel_id = ?
      AND m.timestamp BETWEEN ? AND ?
      AND m.content IS NOT NULL
    ORDER BY m.timestamp ASC
  `);

  const messages = (messagesStmt.all(
    opportunityId,
    channelData.channel_id,
    channelData.start_ts - 86400000,
    channelData.end_ts + 86400000
  ) as any[]).map(row => {
    // Replace mentions in content with user names
    let enhancedContent = row.content;
    const mentionedUsers = mentionsByMessageId.get(row.message_id);
    if (mentionedUsers) {
      mentionedUsers.forEach((user: any) => {
        if (user.display_name || user.real_name) {
          const mention = `<@${user.user_id}>`;
          const name = user.display_name || user.real_name;
          enhancedContent = enhancedContent.replace(mention, `@${name}`);
        }
      });
    }

    return {
      message_id: row.message_id,
      content: enhancedContent,
      author: row.author,
      timestamp: row.timestamp,
      thread_id: row.thread_id || row.timestamp, // Use message timestamp as thread_id if not explicitly set
      thread_reply_count: row.thread_reply_count,
      is_evidence: row.is_evidence === 1,
      authorProfile: {
        display_name: row.display_name,
        real_name: row.real_name,
        avatar_url: row.avatar_url
      }
    };
  });

  return {
    channel: {
      channel_id: channelData.channel_id,
      name: channelData.name,
      type: channelData.type,
      team_id: channelData.team_id,
      created_at: channelData.created_at,
      last_analyzed: channelData.last_analyzed,
      member_count: channelData.member_count,
      message_count: channelData.message_count,
      link_count: channelData.link_count,
      mention_count: channelData.mention_count,
      metadata: channelData.metadata
    },
    context: {
      context_id: channelData.context_id,
      channel_id: channelData.channel_id,
      start_date: channelData.start_date,
      end_date: channelData.end_date,
      message_count: channelData.message_count,
      window_type: channelData.window_type,
      context_data: channelData.context_data
    },
    messages
  };
} 