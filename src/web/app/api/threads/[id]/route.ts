import { db } from '@/lib/db';
import { NextResponse } from 'next/server';

interface ThreadMessageRow {
  id: string;
  thread_ts: string;
  text: string;
  user_id: string;
  ts: string;
  display_name: string;
  real_name: string;
  avatar_url: string;
  mentioned_users: string;
}

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const threadId = params.id;
  
  const stmt = db.prepare(`
    WITH RECURSIVE mentions(message_id, mention) AS (
      SELECT m.id, json_each.value
      FROM messages m, json_each(json_extract(m.text, '$.mentions'))
      WHERE m.thread_ts = ? OR m.timestamp = ?
    )
    SELECT 
      m.message_id as id,
      COALESCE(m.thread_ts, m.timestamp) as thread_ts,
      m.content as text,
      m.user_id,
      m.timestamp as ts,
      u.display_name,
      u.real_name,
      u.avatar_url,
      json_group_array(
        json_object(
          'user_id', mu.id,
          'display_name', mu.display_name,
          'real_name', mu.real_name
        )
      ) as mentioned_users
    FROM messages m
    LEFT JOIN users u ON m.user_id = u.user_id
    LEFT JOIN mentions men ON m.message_id = men.message_id
    LEFT JOIN users mu ON men.mention = mu.id
    WHERE m.thread_ts = ? OR (m.timestamp = ? AND m.thread_ts IS NULL)
    GROUP BY m.message_id
    ORDER BY m.timestamp ASC
  `);

  const rows = stmt.all(threadId, threadId, threadId, threadId) as ThreadMessageRow[];
  
  const messages = rows.map(row => ({
    id: row.id,
    threadTs: row.thread_ts,
    text: row.text,
    userId: row.user_id,
    ts: row.ts,
    author: {
      id: row.user_id,
      displayName: row.display_name,
      realName: row.real_name,
      avatarUrl: row.avatar_url
    },
    mentionedUsers: JSON.parse(row.mentioned_users)
  }));

  return NextResponse.json({ messages });
} 