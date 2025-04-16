import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

const dbPath = process.env.DB_PATH || './data/analysis.sqlite';

// Ensure the directory exists
import { mkdir } from 'fs/promises';
await mkdir(path.dirname(dbPath), { recursive: true });

async function initializeDatabase() {
  try {
    const db = await open({
      filename: dbPath,
      driver: sqlite3.Database
    });

    // Enable foreign keys
    await db.exec('PRAGMA foreign_keys = ON');

    // Create channels table
    await db.exec(`
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

      CREATE INDEX IF NOT EXISTS idx_channels_type ON channels(channel_type);
      CREATE INDEX IF NOT EXISTS idx_channels_name ON channels(channel_name);
    `);

    // Create messages table
    await db.exec(`
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

      CREATE INDEX IF NOT EXISTS idx_messages_channel ON messages(channel_id);
      CREATE INDEX IF NOT EXISTS idx_messages_timestamp ON messages(timestamp);
      CREATE INDEX IF NOT EXISTS idx_messages_thread ON messages(thread_id);
    `);

    // Create documents table
    await db.exec(`
      CREATE TABLE IF NOT EXISTS documents (
        doc_id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        content TEXT,
        last_modified TIMESTAMP NOT NULL,
        doc_type TEXT,
        url TEXT,
        author TEXT,
        collaborator_count INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_documents_modified ON documents(last_modified);
      CREATE INDEX IF NOT EXISTS idx_documents_type ON documents(doc_type);
    `);

    // Create opportunities table
    await db.exec(`
      CREATE TABLE IF NOT EXISTS opportunities (
        opportunity_id INTEGER PRIMARY KEY AUTOINCREMENT,
        source_type TEXT NOT NULL CHECK(source_type IN ('slack', 'gdocs')),
        source_id TEXT NOT NULL,
        opportunity_description TEXT NOT NULL,
        confidence_score FLOAT CHECK(confidence_score BETWEEN 0 AND 1),
        status TEXT DEFAULT 'new' CHECK(status IN ('new', 'reviewed', 'approved', 'rejected')),
        identified_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        reviewed_at TIMESTAMP,
        notes TEXT
      );

      CREATE INDEX IF NOT EXISTS idx_opportunities_source ON opportunities(source_type, source_id);
      CREATE INDEX IF NOT EXISTS idx_opportunities_status ON opportunities(status);
      CREATE INDEX IF NOT EXISTS idx_opportunities_confidence ON opportunities(confidence_score);
    `);

    console.log('Database initialized successfully');
    return db;
  } catch (error) {
    console.error('Error initializing database:', error);
    throw error;
  }
}

export { initializeDatabase }; 