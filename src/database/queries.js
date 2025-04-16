import { initializeDatabase } from './init.js';

class DatabaseQueries {
  constructor() {
    this.db = null;
  }

  async initialize() {
    this.db = await initializeDatabase();
  }

  // Channel Operations
  async upsertChannel(channel) {
    return this.db.run(`
      INSERT INTO channels (channel_id, channel_name, channel_type, topic, purpose, member_count)
      VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT(channel_id) DO UPDATE SET
        channel_name = excluded.channel_name,
        channel_type = excluded.channel_type,
        topic = excluded.topic,
        purpose = excluded.purpose,
        member_count = excluded.member_count
    `, [channel.id, channel.name, channel.type, channel.topic, channel.purpose, channel.memberCount]);
  }

  async getChannelsByType(type) {
    return this.db.all('SELECT * FROM channels WHERE channel_type = ?', [type]);
  }

  async updateChannelProcessedTime(channelId) {
    return this.db.run(
      'UPDATE channels SET last_processed = CURRENT_TIMESTAMP WHERE channel_id = ?',
      [channelId]
    );
  }

  // Message Operations
  async batchInsertMessages(messages) {
    const stmt = await this.db.prepare(`
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

    await stmt.finalize();
  }

  async getChannelMessages(channelId, limit = 1000) {
    return this.db.all(
      'SELECT * FROM messages WHERE channel_id = ? ORDER BY timestamp DESC LIMIT ?',
      [channelId, limit]
    );
  }

  // Document Operations
  async upsertDocument(doc) {
    return this.db.run(`
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

  async getRecentDocuments(limit = 1000) {
    return this.db.all(
      'SELECT * FROM documents ORDER BY last_modified DESC LIMIT ?',
      [limit]
    );
  }

  // Opportunity Operations
  async createOpportunity(opportunity) {
    return this.db.run(`
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

  async updateOpportunityStatus(opportunityId, status, notes) {
    return this.db.run(`
      UPDATE opportunities
      SET status = ?, notes = ?, reviewed_at = CURRENT_TIMESTAMP
      WHERE opportunity_id = ?
    `, [status, notes, opportunityId]);
  }

  async getOpportunitiesByStatus(status, limit = 100) {
    return this.db.all(
      'SELECT * FROM opportunities WHERE status = ? ORDER BY confidence_score DESC LIMIT ?',
      [status, limit]
    );
  }

  // Utility Operations
  async beginTransaction() {
    return this.db.run('BEGIN TRANSACTION');
  }

  async commitTransaction() {
    return this.db.run('COMMIT');
  }

  async rollbackTransaction() {
    return this.db.run('ROLLBACK');
  }

  async close() {
    if (this.db) {
      await this.db.close();
      this.db = null;
    }
  }
}

export const dbQueries = new DatabaseQueries(); 