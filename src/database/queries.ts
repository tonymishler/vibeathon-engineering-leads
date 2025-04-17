import pkg from 'sqlite3';
const { Database } = pkg;
import { logger } from '../utils/logger.js';
import { DatabaseChannel, DatabaseMessage, DatabaseOpportunity, DatabaseOpportunityEvidence } from '../types/database.js';

export class DatabaseQueries {
  private db: InstanceType<typeof Database>;

  constructor(db: InstanceType<typeof Database>) {
    this.db = db;
  }

  // Channel queries
  async getChannelsByType(type: string): Promise<DatabaseChannel[]> {
    return new Promise((resolve, reject) => {
      const sql = 'SELECT * FROM channels WHERE type = ?';
      this.db.all(sql, [type], (err: Error | null, rows: any[]) => {
        if (err) {
          logger.error('Error getting channels by type:', err);
          reject(err);
        } else {
          resolve(rows as DatabaseChannel[]);
        }
      });
    });
  }

  async getChannelMessages(channelId: string): Promise<DatabaseMessage[]> {
    return new Promise((resolve, reject) => {
      const sql = 'SELECT * FROM messages WHERE channel_id = ?';
      this.db.all(sql, [channelId], (err: Error | null, rows: any[]) => {
        if (err) {
          logger.error('Error getting channel messages:', err);
          reject(err);
        } else {
          resolve(rows as DatabaseMessage[]);
        }
      });
    });
  }

  async upsertChannel(channel: DatabaseChannel): Promise<void> {
    return new Promise((resolve, reject) => {
      const sql = `
        INSERT INTO channels (
          channel_id, name, type, created_at, last_analyzed,
          member_count, message_count, link_count, mention_count, metadata
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(channel_id) DO UPDATE SET
          name = excluded.name,
          type = excluded.type,
          last_analyzed = excluded.last_analyzed,
          member_count = excluded.member_count,
          message_count = excluded.message_count,
          link_count = excluded.link_count,
          mention_count = excluded.mention_count,
          metadata = excluded.metadata`;
      
      this.db.run(sql, [
        channel.channel_id,
        channel.name,
        channel.type,
        channel.created_at,
        channel.last_analyzed,
        channel.member_count,
        channel.message_count,
        channel.link_count,
        channel.mention_count,
        channel.metadata
      ], (err: Error | null) => {
        if (err) {
          logger.error('Error upserting channel:', err);
          reject(err);
        } else {
          resolve();
        }
      });
    });
  }

  async batchInsertMessages(messages: DatabaseMessage[]): Promise<void> {
    return new Promise((resolve, reject) => {
      const sql = `
        INSERT INTO messages (
          message_id, channel_id, user_id, content, timestamp,
          thread_ts, reply_count, link_count, mention_count, reaction_count
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(message_id) DO UPDATE SET
          content = excluded.content,
          thread_ts = excluded.thread_ts,
          reply_count = excluded.reply_count,
          link_count = excluded.link_count,
          mention_count = excluded.mention_count,
          reaction_count = excluded.reaction_count`;

      const stmt = this.db.prepare(sql);
      
      try {
        this.db.serialize(() => {
          this.db.run('BEGIN TRANSACTION');
          
          for (const msg of messages) {
            stmt.run([
              msg.message_id,
              msg.channel_id,
              msg.user_id,
              msg.content,
              msg.timestamp,
              msg.thread_ts,
              msg.reply_count,
              msg.link_count,
              msg.mention_count,
              msg.reaction_count
            ], (err: Error | null) => {
              if (err) {
                logger.error('Error in batch message insert:', err);
                throw err;
              }
            });
          }
          
          this.db.run('COMMIT', (err: Error | null) => {
            if (err) {
              logger.error('Error committing transaction:', err);
              reject(err);
            } else {
              resolve();
            }
          });
        });
      } catch (err) {
        this.db.run('ROLLBACK');
        reject(err);
      } finally {
        stmt.finalize();
      }
    });
  }

  // Opportunity queries
  async createOpportunity(opportunity: DatabaseOpportunity): Promise<string> {
    return new Promise((resolve, reject) => {
      const sql = `
        INSERT INTO opportunities (
          opportunity_id, type, title, description, implicit_insights,
          key_participants, potential_solutions, confidence_score,
          scope, effort_estimate, potential_value, status,
          context_id, detected_at, last_updated
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
      
      this.db.run(sql, [
        opportunity.opportunity_id,
        opportunity.type,
        opportunity.title,
        opportunity.description,
        opportunity.implicit_insights,
        opportunity.key_participants,
        opportunity.potential_solutions,
        opportunity.confidence_score,
        opportunity.scope,
        opportunity.effort_estimate,
        opportunity.potential_value,
        opportunity.status,
        opportunity.context_id,
        opportunity.detected_at,
        opportunity.last_updated
      ], function(err) {
        if (err) {
          logger.error('Error creating opportunity:', err);
          reject(err);
        } else {
          resolve(opportunity.opportunity_id);
        }
      });
    });
  }

  async addOpportunityEvidence(evidence: DatabaseOpportunityEvidence): Promise<string> {
    return new Promise((resolve, reject) => {
      const sql = `
        INSERT INTO opportunity_evidence (
          evidence_id, opportunity_id, message_id, author,
          timestamp, content, relevance_note
        ) VALUES (?, ?, ?, ?, ?, ?, ?)`;
      
      this.db.run(sql, [
        evidence.evidence_id,
        evidence.opportunity_id,
        evidence.message_id,
        evidence.author,
        evidence.timestamp,
        evidence.content,
        evidence.relevance_note
      ], function(err) {
        if (err) {
          logger.error('Error adding opportunity evidence:', err);
          reject(err);
        } else {
          resolve(evidence.evidence_id);
        }
      });
    });
  }

  async getOpportunitiesByStatus(status: string): Promise<DatabaseOpportunity[]> {
    return new Promise((resolve, reject) => {
      const sql = 'SELECT * FROM opportunities WHERE status = ? ORDER BY detected_at DESC';
      this.db.all(sql, [status], (err, rows) => {
        if (err) {
          logger.error('Error getting opportunities by status:', err);
          reject(err);
        } else {
          resolve(rows as DatabaseOpportunity[]);
        }
      });
    });
  }

  async getOpportunityEvidence(opportunityId: string): Promise<DatabaseOpportunityEvidence[]> {
    return new Promise((resolve, reject) => {
      const sql = 'SELECT * FROM opportunity_evidence WHERE opportunity_id = ? ORDER BY timestamp ASC';
      this.db.all(sql, [opportunityId], (err, rows) => {
        if (err) {
          logger.error('Error getting opportunity evidence:', err);
          reject(err);
        } else {
          resolve(rows as DatabaseOpportunityEvidence[]);
        }
      });
    });
  }

  async updateOpportunityStatus(opportunityId: string, status: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.db.run(
        'UPDATE opportunities SET status = ?, last_updated = ? WHERE opportunity_id = ?',
        [status, new Date().toISOString(), opportunityId],
        (err) => {
          if (err) {
            reject(err);
            return;
          }
          resolve();
        }
      );
    });
  }
} 