import pkg from 'sqlite3';
const { Database } = pkg;
import { DatabaseQueries } from './queries.js';
import { logger } from '../utils/logger.ts';

export async function initializeDatabase(dbPath) {
  logger.info(`Initializing database at ${dbPath}`);
  
  const db = new Database(dbPath);
  
  // Create users table
  await db.run(`CREATE TABLE IF NOT EXISTS users (
            user_id TEXT PRIMARY KEY,
            display_name TEXT,
            real_name TEXT,
            title TEXT,
            email TEXT,
            avatar_url TEXT,
            team_id TEXT,
            is_admin INTEGER,
            is_owner INTEGER,
            is_primary_owner INTEGER,
            is_restricted INTEGER,
            is_ultra_restricted INTEGER,
            is_bot INTEGER,
            is_app_user INTEGER,
            tz TEXT,
            tz_label TEXT,
            tz_offset INTEGER,
            phone TEXT,
            skype TEXT,
            status_text TEXT,
            status_emoji TEXT,
            first_name TEXT,
            last_name TEXT,
            deleted INTEGER,
            color TEXT,
            who_can_share_contact_card TEXT,
            updated_at TEXT NOT NULL
          )`);

  // Create channels table
  await db.run(`CREATE TABLE IF NOT EXISTS channels (
            channel_id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            type TEXT NOT NULL,
            team_id TEXT NOT NULL,
            created_at TEXT NOT NULL,
            last_analyzed TEXT NOT NULL,
            member_count INTEGER,
            message_count INTEGER,
            link_count INTEGER,
            mention_count INTEGER,
            metadata TEXT
          )`);

  // Create messages table
  await db.run(`CREATE TABLE IF NOT EXISTS messages (
            message_id TEXT PRIMARY KEY,
            channel_id TEXT NOT NULL,
            user_id TEXT,
            thread_ts TEXT,
            timestamp REAL NOT NULL,
            content TEXT,
            has_files INTEGER,
            has_links INTEGER,
            link_count INTEGER,
            mention_count INTEGER,
            reaction_count INTEGER,
            reply_count INTEGER,
            reply_users_count INTEGER,
            metadata TEXT,
            FOREIGN KEY(channel_id) REFERENCES channels(channel_id)
          )`);

  // Create channel_contexts table
  await db.run(`CREATE TABLE IF NOT EXISTS channel_contexts (
            context_id TEXT PRIMARY KEY,
            channel_id TEXT NOT NULL,
            start_date TEXT NOT NULL,
            end_date TEXT NOT NULL,
            message_count INTEGER,
            window_type TEXT,
            context_data TEXT,
            created_at TEXT NOT NULL,
            FOREIGN KEY(channel_id) REFERENCES channels(channel_id)
          )`);

  // Create opportunities table
  await db.run(`CREATE TABLE IF NOT EXISTS opportunities (
            opportunity_id TEXT PRIMARY KEY,
            type TEXT NOT NULL,
            title TEXT NOT NULL,
            description TEXT,
            implicit_insights TEXT,
            key_participants TEXT,
            potential_solutions TEXT,
            confidence_score REAL,
            scope TEXT,
            effort_estimate TEXT,
            potential_value TEXT,
            status TEXT NOT NULL,
            context_id TEXT NOT NULL,
            detected_at TEXT NOT NULL,
            last_updated TEXT NOT NULL,
            FOREIGN KEY(context_id) REFERENCES channel_contexts(context_id)
          )`);

  // Create opportunity_evidence table
  await db.run(`CREATE TABLE IF NOT EXISTS opportunity_evidence (
            evidence_id TEXT PRIMARY KEY,
            opportunity_id TEXT NOT NULL,
            message_id TEXT NOT NULL,
            author TEXT,
            timestamp TEXT NOT NULL,
            content TEXT NOT NULL,
            relevance_note TEXT,
            FOREIGN KEY(opportunity_id) REFERENCES opportunities(opportunity_id),
            FOREIGN KEY(message_id) REFERENCES messages(message_id)
          )`);

  logger.info('Database schema created successfully');
  
  return new DatabaseQueries(db);
} 