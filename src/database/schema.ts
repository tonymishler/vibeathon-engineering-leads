import { Database, open } from 'sqlite';
import sqlite3 from 'sqlite3';

export async function initializeSchema(): Promise<Database> {
  const db = await open({
    filename: ':memory:',
    driver: sqlite3.Database
  });

  // Enable foreign key constraints
  await db.exec('PRAGMA foreign_keys = ON;');

  await db.exec(`
    CREATE TABLE IF NOT EXISTS channels (
      channel_id TEXT PRIMARY KEY,
      channel_name TEXT NOT NULL,
      channel_type TEXT NOT NULL,
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
      timestamp TEXT NOT NULL,
      thread_id TEXT,
      has_attachments INTEGER DEFAULT 0,
      reaction_count INTEGER DEFAULT 0,
      reply_count INTEGER DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (channel_id) REFERENCES channels(channel_id)
    );

    CREATE TABLE IF NOT EXISTS documents (
      doc_id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      content TEXT,
      last_modified TIMESTAMP,
      doc_type TEXT,
      url TEXT,
      author TEXT,
      collaborator_count INTEGER DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS opportunities (
      opportunity_id INTEGER PRIMARY KEY AUTOINCREMENT,
      source_type TEXT NOT NULL,
      source_id TEXT NOT NULL,
      opportunity_description TEXT,
      confidence_score FLOAT,
      status TEXT DEFAULT 'new',
      identified_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      reviewed_at TIMESTAMP,
      notes TEXT
    );
  `);

  return db;
} 