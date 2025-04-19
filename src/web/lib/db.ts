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
  messages: { content: string; author: string; timestamp: string; thread_id: string | null; authorProfile?: { display_name: string | null; real_name: string | null; avatar_url: string | null; } | null; }[];
} | null> {
  // First get all messages that contain mentions for this opportunity's context
  const mentionsStmt = db.prepare(`
    WITH RECURSIVE
    split_mentions(message_id, mention, remaining, position) AS (
      SELECT 
        m.message_id,
        substr(m.content, instr(m.content, '<@'), instr(m.content, '>') + 1 - instr(m.content, '<@')),
        substr(m.content, instr(m.content, '>') + 1),
        instr(m.content, '<@')
      FROM opportunities o
      JOIN channel_contexts cc ON o.context_id = cc.context_id
      JOIN messages m ON m.channel_id = cc.channel_id 
        AND m.timestamp BETWEEN cc.start_date AND cc.end_date
      WHERE o.opportunity_id = ? AND m.content LIKE '%<@%'
      
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
    (mentionsStmt.all(opportunityId) as { message_id: string; mentioned_users: string }[])
      .map(row => [row.message_id, JSON.parse(row.mentioned_users)])
  );

  // Then get the main context data
  const stmt = db.prepare(`
    SELECT 
      c.*,
      cc.*,
      json_group_array(
        json_object(
          'message_id', m.message_id,
          'content', m.content,
          'author', m.user_id,
          'timestamp', m.timestamp,
          'thread_id', m.thread_ts,
          'display_name', u.display_name,
          'real_name', u.real_name,
          'avatar_url', u.avatar_url
        )
      ) as messages
    FROM opportunities o
    JOIN channel_contexts cc ON o.context_id = cc.context_id
    JOIN channels c ON cc.channel_id = c.channel_id
    LEFT JOIN messages m ON m.channel_id = c.channel_id 
      AND m.timestamp BETWEEN cc.start_date AND cc.end_date
    LEFT JOIN users u ON m.user_id = u.user_id
    WHERE o.opportunity_id = ?
    GROUP BY c.channel_id
  `);
  
  const result = stmt.get(opportunityId) as any;
  if (!result) return null;

  const messages = JSON.parse(result.messages).map((m: any) => {
    // Replace mentions in content with user names
    let enhancedContent = m.content;
    const mentionedUsers = mentionsByMessageId.get(m.message_id);
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
      content: enhancedContent,
      author: m.author,
      timestamp: m.timestamp,
      thread_id: m.thread_id,
      authorProfile: {
        display_name: m.display_name,
        real_name: m.real_name,
        avatar_url: m.avatar_url
      }
    };
  });

  return {
    channel: {
      channel_id: result.channel_id,
      name: result.name,
      type: result.type,
      team_id: result.team_id,
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
    messages
  };
} 