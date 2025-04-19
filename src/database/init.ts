import pkg from 'sqlite3';
const { Database } = pkg;
import { logger } from '../utils/logger';
import path from 'path';
import { DatabaseQueries } from './queries';

export async function initializeDatabase(dbPath: string): Promise<DatabaseQueries> {
  return new Promise((resolve, reject) => {
    const db = new Database(dbPath, (err) => {
      if (err) {
        logger.error(`Failed to open database: ${err.message}`);
        reject(err);
        return;
      }

      logger.info(`Initializing database at ${dbPath}`);

      db.serialize(() => {
        // Drop existing tables if they exist
        db.run('DROP TABLE IF EXISTS opportunity_evidence');
        db.run('DROP TABLE IF EXISTS opportunities');
        db.run('DROP TABLE IF EXISTS channel_contexts');
        db.run('DROP TABLE IF EXISTS messages');
        db.run('DROP TABLE IF EXISTS channels');

        // Create channels table
        db.run(`
          CREATE TABLE IF NOT EXISTS channels (
            channel_id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            type TEXT NOT NULL,
            created_at TEXT NOT NULL,
            last_analyzed TEXT,
            member_count INTEGER,
            message_count INTEGER DEFAULT 0,
            link_count INTEGER DEFAULT 0,
            mention_count INTEGER DEFAULT 0,
            metadata TEXT
          )
        `);

        // Create messages table
        db.run(`
          CREATE TABLE IF NOT EXISTS messages (
            message_id TEXT PRIMARY KEY,
            channel_id TEXT NOT NULL,
            user_id TEXT NOT NULL,
            content TEXT,
            timestamp TEXT NOT NULL,
            thread_ts TEXT,
            reply_count INTEGER DEFAULT 0,
            link_count INTEGER DEFAULT 0,
            mention_count INTEGER DEFAULT 0,
            reaction_count INTEGER DEFAULT 0,
            FOREIGN KEY (channel_id) REFERENCES channels(channel_id)
          )
        `);

        // Create channel_contexts table
        db.run(`
          CREATE TABLE IF NOT EXISTS channel_contexts (
            context_id TEXT PRIMARY KEY,
            channel_id TEXT NOT NULL,
            start_date TEXT NOT NULL,
            end_date TEXT NOT NULL,
            message_count INTEGER NOT NULL,
            window_type TEXT NOT NULL,
            context_data TEXT,
            FOREIGN KEY (channel_id) REFERENCES channels(channel_id)
          )
        `);

        // Create users table
        db.run(`
          CREATE TABLE IF NOT EXISTS users (
            user_id TEXT PRIMARY KEY,
            display_name TEXT,
            real_name TEXT,
            title TEXT,
            email TEXT,
            avatar_url TEXT,
            updated_at TEXT NOT NULL
          )
        `);

        // Create opportunities table
        db.run(`
          CREATE TABLE IF NOT EXISTS opportunities (
            opportunity_id TEXT PRIMARY KEY,
            type TEXT NOT NULL,
            title TEXT NOT NULL,
            description TEXT NOT NULL,
            implicit_insights TEXT,
            key_participants TEXT,
            potential_solutions TEXT,
            confidence_score REAL NOT NULL,
            scope TEXT NOT NULL,
            effort_estimate TEXT NOT NULL,
            potential_value TEXT NOT NULL,
            status TEXT NOT NULL DEFAULT 'pending',
            context_id TEXT NOT NULL,
            detected_at TEXT NOT NULL,
            last_updated TEXT NOT NULL,
            FOREIGN KEY (context_id) REFERENCES channel_contexts(context_id)
          )
        `);

        // Create opportunity_evidence table
        db.run(`
          CREATE TABLE IF NOT EXISTS opportunity_evidence (
            evidence_id TEXT PRIMARY KEY,
            opportunity_id TEXT NOT NULL,
            message_id TEXT NOT NULL,
            author TEXT NOT NULL,
            timestamp TEXT NOT NULL,
            content TEXT NOT NULL,
            relevance_note TEXT,
            FOREIGN KEY (opportunity_id) REFERENCES opportunities(opportunity_id),
            FOREIGN KEY (message_id) REFERENCES messages(message_id)
          )
        `);

        // Verify tables were created
        db.get("SELECT name FROM sqlite_master WHERE type='table' AND name='opportunities'", (err) => {
          if (err) {
            logger.error(`Failed to verify database setup: ${err.message}`);
            reject(err);
            return;
          }

          // Create indexes for better query performance
          db.serialize(() => {
            db.run('CREATE INDEX IF NOT EXISTS idx_messages_channel_id ON messages(channel_id)');
            db.run('CREATE INDEX IF NOT EXISTS idx_messages_timestamp ON messages(timestamp)');
            db.run('CREATE INDEX IF NOT EXISTS idx_channel_contexts_channel_id ON channel_contexts(channel_id)');
            db.run('CREATE INDEX IF NOT EXISTS idx_opportunities_context_id ON opportunities(context_id)');
            db.run('CREATE INDEX IF NOT EXISTS idx_opportunities_type ON opportunities(type)');
            db.run('CREATE INDEX IF NOT EXISTS idx_opportunities_status ON opportunities(status)');
            db.run('CREATE INDEX IF NOT EXISTS idx_opportunity_evidence_opportunity_id ON opportunity_evidence(opportunity_id)');
            db.run('CREATE INDEX IF NOT EXISTS idx_opportunity_evidence_message_id ON opportunity_evidence(message_id)');

            logger.info('Database schema created successfully');
            resolve(new DatabaseQueries(db));
          });
        });
      });
    });
  });
} 