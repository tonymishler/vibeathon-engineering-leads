import sqlite3 from 'sqlite3';
import { Database as SQLiteDatabase, open } from 'sqlite';
import path from 'path';
import { logger } from '../utils/logger';

interface Channel {
  channel_id: string;
  channel_name: string;
  channel_type: 'priority' | 'standard' | 'off-topic';
  topic?: string;
  purpose?: string;
  member_count?: number;
  last_processed?: Date;
  created_at?: Date;
}

interface Message {
  message_id: string;
  channel_id: string;
  author: string;
  content?: string;
  timestamp: Date;
  thread_id?: string;
  has_attachments?: boolean;
  reaction_count?: number;
  reply_count?: number;
  created_at?: Date;
}

interface ChannelFilter {
  name?: string;
  type?: 'priority' | 'standard' | 'off-topic';
}

interface MessageFilter {
  channel_id?: string;
  thread_id?: string;
  after?: Date;
}

export class Database {
  private db: SQLiteDatabase | null;
  private dbPath: string;

  constructor() {
    this.db = null;
    this.dbPath = process.env.DB_PATH || path.join(process.cwd(), 'data', 'analysis.sqlite');
  }

  async init(): Promise<void> {
    try {
      this.db = await open({
        filename: this.dbPath,
        driver: sqlite3.Database
      });

      // Enable foreign keys
      await this.db.exec('PRAGMA foreign_keys = ON');

      // Create tables if they don't exist
      await this.db.exec(`
        CREATE TABLE IF NOT EXISTS channels (
          channel_id TEXT PRIMARY KEY,
          channel_name TEXT NOT NULL,
          channel_type TEXT CHECK(channel_type IN ('priority', 'standard', 'off-topic')),
          topic TEXT,
          purpose TEXT,
          member_count INTEGER,
          last_processed TIMESTAMP,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS messages (
          message_id TEXT PRIMARY KEY,
          channel_id TEXT NOT NULL,
          author TEXT NOT NULL,
          content TEXT,
          timestamp TIMESTAMP NOT NULL,
          thread_id TEXT,
          has_attachments BOOLEAN DEFAULT FALSE,
          reaction_count INTEGER DEFAULT 0,
          reply_count INTEGER DEFAULT 0,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (channel_id) REFERENCES channels(channel_id) ON DELETE CASCADE
        );
      `);

      logger.info('Database initialized at:', this.dbPath);
    } catch (error) {
      logger.error('Failed to initialize database:', error);
      throw error;
    }
  }

  async close(): Promise<void> {
    if (this.db) {
      await this.db.close();
      this.db = null;
    }
  }

  async beginTransaction(): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');
    await this.db.run('BEGIN TRANSACTION');
  }

  async commitTransaction(): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');
    await this.db.run('COMMIT');
  }

  async rollbackTransaction(): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');
    await this.db.run('ROLLBACK');
  }

  async executeQuery<T>(query: string, params: any[] = []): Promise<T[]> {
    if (!this.db) throw new Error('Database not initialized');
    return await this.db.all(query, params);
  }

  async storeChannel(channel: Channel): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');
    const { channel_id, channel_name, channel_type, topic, purpose, member_count } = channel;
    
    const sql = `
      INSERT INTO channels (channel_id, channel_name, channel_type, topic, purpose, member_count)
      VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT(channel_id) DO UPDATE SET
        channel_name = excluded.channel_name,
        channel_type = excluded.channel_type,
        topic = excluded.topic,
        purpose = excluded.purpose,
        member_count = excluded.member_count,
        last_processed = CURRENT_TIMESTAMP
    `;

    await this.db.run(sql, [
      channel_id,
      channel_name,
      channel_type,
      topic,
      purpose,
      member_count
    ]);
  }

  async storeMessage(message: Message): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');
    const { message_id, channel_id, author, content, timestamp, thread_id } = message;
    
    const sql = `
      INSERT INTO messages (message_id, channel_id, author, content, timestamp, thread_id)
      VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT(message_id) DO UPDATE SET
        author = excluded.author,
        content = excluded.content,
        timestamp = excluded.timestamp,
        thread_id = excluded.thread_id
    `;

    await this.db.run(sql, [
      message_id,
      channel_id,
      author,
      content,
      timestamp,
      thread_id
    ]);
  }

  async getChannels(filter: ChannelFilter = {}): Promise<Channel[]> {
    if (!this.db) throw new Error('Database not initialized');
    let sql = 'SELECT * FROM channels WHERE 1=1';
    const params: any[] = [];

    if (filter.name) {
      sql += ' AND channel_name LIKE ?';
      params.push(`%${filter.name}%`);
    }

    if (filter.type) {
      sql += ' AND channel_type = ?';
      params.push(filter.type);
    }

    const results = await this.db.all(sql, params);
    return results as Channel[];
  }

  async getMessages(filter: MessageFilter = {}): Promise<Message[]> {
    if (!this.db) throw new Error('Database not initialized');
    let sql = 'SELECT * FROM messages WHERE 1=1';
    const params: any[] = [];

    if (filter.channel_id) {
      sql += ' AND channel_id = ?';
      params.push(filter.channel_id);
    }

    if (filter.thread_id) {
      sql += ' AND thread_id = ?';
      params.push(filter.thread_id);
    }

    if (filter.after) {
      sql += ' AND timestamp > ?';
      params.push(filter.after);
    }

    const results = await this.db.all(sql, params);
    return results as Message[];
  }
} 