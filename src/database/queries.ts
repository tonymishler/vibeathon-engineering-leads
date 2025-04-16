import { Database } from 'sqlite';
import { initializeDatabase } from '../database/init';
import { Channel } from '../models/channel';
import { Message } from '../models/message';

interface Document {
  id: string;
  title: string;
  content: string;
  lastModified: Date;
  type: string;
  url: string;
  author: string;
  collaboratorCount: number;
}

interface Opportunity {
  sourceType: 'slack' | 'gdocs';
  sourceId: string;
  description: string;
  confidenceScore: number;
  status?: 'new' | 'reviewed' | 'approved' | 'rejected';
}

interface DatabaseRecord {
  channel_id: string;
  channel_name: string;
  channel_type: 'priority' | 'standard' | 'off-topic';
  topic: string | null;
  purpose: string | null;
  member_count: number;
  message_id: string;
  author: string;
  content: string;
  timestamp: string;
  thread_id: string | null;
  has_attachments: number;
  reaction_count: number;
  reply_count: number;
}

class DatabaseQueries {
  private db: Database | null = null;

  constructor() {
    this.db = null;
  }

  async initialize(): Promise<void> {
    this.db = await initializeDatabase();
  }

  private checkConnection(): void {
    if (!this.db) {
      throw new Error('Database not initialized');
    }
  }

  // Channel Operations
  async upsertChannel(channel: Channel): Promise<void> {
    this.checkConnection();
    const { id, name, type, topic, purpose, memberCount } = channel;
    await this.db!.run(`
      INSERT INTO channels (channel_id, channel_name, channel_type, topic, purpose, member_count)
      VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT(channel_id) DO UPDATE SET
        channel_name = excluded.channel_name,
        channel_type = excluded.channel_type,
        topic = excluded.topic,
        purpose = excluded.purpose,
        member_count = excluded.member_count
    `, [id, name, type, topic, purpose, memberCount]);
  }

  async getChannelsByType(type: string): Promise<Channel[]> {
    this.checkConnection();
    const records = await this.db!.all<DatabaseRecord[]>('SELECT * FROM channels WHERE channel_type = ?', [type]);
    return records.map((record: DatabaseRecord) => Channel.fromDatabase(record));
  }

  async updateChannelProcessedTime(channelId: string): Promise<void> {
    this.checkConnection();
    await this.db!.run(
      'UPDATE channels SET last_processed = CURRENT_TIMESTAMP WHERE channel_id = ?',
      [channelId]
    );
  }

  // Message Operations
  async batchInsertMessages(messages: Message[]): Promise<void> {
    this.checkConnection();
    const stmt = await this.db!.prepare(`
      INSERT INTO messages (
        message_id, channel_id, author, content, timestamp,
        thread_id, has_attachments, reaction_count, reply_count
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(message_id) DO UPDATE SET
        content = excluded.content,
        reaction_count = excluded.reaction_count,
        reply_count = excluded.reply_count
    `);

    try {
      for (const msg of messages) {
        await stmt.run([
          msg.id,
          msg.channelId,
          msg.author,
          msg.content,
          msg.timestamp,
          msg.threadId,
          msg.hasAttachments,
          msg.reactionCount,
          msg.replyCount
        ]);
      }
    } finally {
      await stmt.finalize();
    }
  }

  async getChannelMessages(channelId: string, limit = 1000): Promise<Message[]> {
    this.checkConnection();
    const records = await this.db!.all<DatabaseRecord[]>(
      'SELECT * FROM messages WHERE channel_id = ? ORDER BY timestamp DESC LIMIT ?',
      [channelId, limit]
    );
    return records.map((record: DatabaseRecord) => Message.fromDatabase(record));
  }

  // Document Operations
  async upsertDocument(doc: Document): Promise<void> {
    this.checkConnection();
    await this.db!.run(`
      INSERT INTO documents (
        doc_id, title, content, last_modified,
        doc_type, url, author, collaborator_count
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(doc_id) DO UPDATE SET
        title = excluded.title,
        content = excluded.content,
        last_modified = excluded.last_modified,
        doc_type = excluded.doc_type,
        url = excluded.url,
        author = excluded.author,
        collaborator_count = excluded.collaborator_count
    `, [
      doc.id, doc.title, doc.content, doc.lastModified,
      doc.type, doc.url, doc.author, doc.collaboratorCount
    ]);
  }

  async getRecentDocuments(limit = 1000): Promise<Document[]> {
    this.checkConnection();
    const records = await this.db!.all<Document[]>(
      'SELECT * FROM documents ORDER BY last_modified DESC LIMIT ?',
      [limit]
    );
    return records;
  }

  // Opportunity Operations
  async createOpportunity(opportunity: Opportunity): Promise<void> {
    this.checkConnection();
    await this.db!.run(`
      INSERT INTO opportunities (
        source_type, source_id, opportunity_description,
        confidence_score, status
      )
      VALUES (?, ?, ?, ?, ?)
    `, [
      opportunity.sourceType,
      opportunity.sourceId,
      opportunity.description,
      opportunity.confidenceScore,
      opportunity.status || 'new'
    ]);
  }

  async updateOpportunityStatus(opportunityId: number, status: Opportunity['status'], notes?: string): Promise<void> {
    this.checkConnection();
    await this.db!.run(`
      UPDATE opportunities
      SET status = ?, notes = ?, reviewed_at = CURRENT_TIMESTAMP
      WHERE opportunity_id = ?
    `, [status, notes, opportunityId]);
  }

  async getOpportunitiesByStatus(status: Opportunity['status'], limit = 100): Promise<Opportunity[]> {
    this.checkConnection();
    const records = await this.db!.all<Opportunity[]>(
      'SELECT * FROM opportunities WHERE status = ? ORDER BY confidence_score DESC LIMIT ?',
      [status, limit]
    );
    return records;
  }

  // Utility Operations
  async beginTransaction(): Promise<void> {
    this.checkConnection();
    await this.db!.run('BEGIN TRANSACTION');
  }

  async commitTransaction(): Promise<void> {
    this.checkConnection();
    await this.db!.run('COMMIT');
  }

  async rollbackTransaction(): Promise<void> {
    this.checkConnection();
    await this.db!.run('ROLLBACK');
  }

  async close(): Promise<void> {
    if (this.db) {
      await this.db.close();
      this.db = null;
    }
  }
}

export const dbQueries = new DatabaseQueries(); 