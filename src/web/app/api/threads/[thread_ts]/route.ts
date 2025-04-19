import { NextResponse } from 'next/server';
import Database from 'better-sqlite3';
import path from 'path';

const dbPath = path.join(process.cwd(), '..', '..', 'opportunities.db');
const db = new Database(dbPath);

export async function GET(
  request: Request,
  { params }: { params: { thread_ts: string } }
) {
  try {
    const stmt = db.prepare(`
      WITH RECURSIVE
      split_mentions(message_id, mention, remaining, position) AS (
        SELECT 
          m.message_id,
          substr(m.content, instr(m.content, '<@'), instr(m.content, '>') + 1 - instr(m.content, '<@')),
          substr(m.content, instr(m.content, '>') + 1),
          instr(m.content, '<@')
        FROM messages m
        WHERE m.thread_ts = ? AND m.content LIKE '%<@%'
        
        UNION ALL
        
        SELECT
          message_id,
          substr(remaining, instr(remaining, '<@'), instr(remaining, '>') + 1 - instr(remaining, '<@')),
          substr(remaining, instr(remaining, '>') + 1),
          instr(remaining, '<@')
        FROM split_mentions
        WHERE position > 0 AND remaining LIKE '%<@%'
      ),
      mentions AS (
        SELECT DISTINCT
          message_id,
          trim(mention, '<@>') as user_id
        FROM split_mentions
        WHERE mention IS NOT NULL
      )
      SELECT 
        m.message_id,
        m.content,
        m.user_id as author,
        m.timestamp,
        m.thread_ts as thread_id,
        u.display_name,
        u.real_name,
        u.avatar_url,
        json_group_array(
          json_object(
            'user_id', men.user_id,
            'display_name', ref_u.display_name,
            'real_name', ref_u.real_name
          )
        ) as mentioned_users
      FROM messages m
      LEFT JOIN users u ON m.user_id = u.user_id
      LEFT JOIN mentions men ON m.message_id = men.message_id
      LEFT JOIN users ref_u ON men.user_id = ref_u.user_id
      WHERE m.thread_ts = ?
      GROUP BY m.message_id
      ORDER BY m.timestamp ASC
    `);

    const replies = stmt.all(params.thread_ts, params.thread_ts) as any[];

    const messages = replies.map(reply => ({
      message_id: reply.message_id,
      content: reply.content,
      author: reply.author,
      timestamp: reply.timestamp,
      thread_id: reply.thread_id,
      authorProfile: {
        display_name: reply.display_name,
        real_name: reply.real_name,
        avatar_url: reply.avatar_url
      }
    }));

    return NextResponse.json({ messages });
  } catch (error) {
    console.error('Error fetching thread replies:', error);
    return new NextResponse(null, { status: 500 });
  }
} 