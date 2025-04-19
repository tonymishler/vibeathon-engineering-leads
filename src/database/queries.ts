import pkg from 'sqlite3';
const { Database } = pkg;
import { logger } from '../utils/logger';
import { DatabaseChannel, DatabaseMessage, DatabaseOpportunity, DatabaseOpportunityEvidence } from '../types/database';

export class DatabaseQueries {
  private db: InstanceType<typeof Database>;
  private inTransaction: boolean = false;

  constructor(db: InstanceType<typeof Database>) {
    this.db = db;
  }

  async beginTransaction(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.db.run('BEGIN TRANSACTION', (err: Error | null) => {
        if (err) {
          logger.error('Error beginning transaction:', err);
          reject(err);
        } else {
          this.inTransaction = true;
          resolve();
        }
      });
    });
  }

  async commitTransaction(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.db.run('COMMIT', (err: Error | null) => {
        if (err) {
          logger.error('Error committing transaction:', err);
          reject(err);
        } else {
          this.inTransaction = false;
          resolve();
        }
      });
    });
  }

  async rollbackTransaction(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.db.run('ROLLBACK', (err: Error | null) => {
        if (err) {
          logger.error('Error rolling back transaction:', err);
          reject(err);
        } else {
          this.inTransaction = false;
          resolve();
        }
      });
    });
  }

  isInTransaction(): boolean {
    return this.inTransaction;
  }

  async close(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.inTransaction) {
        this.rollbackTransaction()
          .catch(err => logger.error('Error rolling back transaction during close:', err))
          .finally(() => {
            this.db.close((err: Error | null) => {
              if (err) {
                reject(err);
              } else {
                resolve();
              }
            });
          });
      } else {
        this.db.close((err: Error | null) => {
          if (err) {
            reject(err);
          } else {
            resolve();
          }
        });
      }
    });
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
        // Only start a transaction if we're not already in one
        const needsTransaction = !this.inTransaction;
        
        if (needsTransaction) {
          this.db.run('BEGIN TRANSACTION');
        }
        
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
        
        if (needsTransaction) {
          this.db.run('COMMIT', (err: Error | null) => {
            if (err) {
              logger.error('Error committing transaction:', err);
              reject(err);
            } else {
              resolve();
            }
          });
        } else {
          resolve();
        }
      } catch (error) {
        if (!this.inTransaction) {
          this.db.run('ROLLBACK');
        }
        reject(error);
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

  async upsertChannelContext(context: {
    context_id: string;
    channel_id: string;
    start_date: Date;
    end_date: Date;
    message_count: number;
    window_type: string;
    context_data: string;
  }): Promise<void> {
    return new Promise((resolve, reject) => {
      const sql = `
        INSERT INTO channel_contexts (
          context_id, channel_id, start_date, end_date,
          message_count, window_type, context_data
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(context_id) DO UPDATE SET
          channel_id = excluded.channel_id,
          start_date = excluded.start_date,
          end_date = excluded.end_date,
          message_count = excluded.message_count,
          window_type = excluded.window_type,
          context_data = excluded.context_data`;
      
      this.db.run(sql, [
        context.context_id,
        context.channel_id,
        context.start_date.toISOString(),
        context.end_date.toISOString(),
        context.message_count,
        context.window_type,
        context.context_data
      ], (err: Error | null) => {
        if (err) {
          logger.error('Error upserting channel context:', err);
          reject(err);
        } else {
          resolve();
        }
      });
    });
  }

  async upsertUser(user: {
    user_id: string;
    display_name?: string;
    real_name?: string;
    title?: string;
    email?: string;
    avatar_url?: string;
  }): Promise<void> {
    return new Promise((resolve, reject) => {
      const now = new Date().toISOString();
      const sql = `
        INSERT INTO users (
          user_id, display_name, real_name, title, email, avatar_url, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(user_id) DO UPDATE SET
          display_name = excluded.display_name,
          real_name = excluded.real_name,
          title = excluded.title,
          email = excluded.email,
          avatar_url = excluded.avatar_url,
          updated_at = excluded.updated_at`;
      
      this.db.run(sql, [
        user.user_id,
        user.display_name || null,
        user.real_name || null,
        user.title || null,
        user.email || null,
        user.avatar_url || null,
        now
      ], function(err) {
        if (err) {
          logger.error('Error upserting user:', err);
          reject(err);
        } else {
          resolve();
        }
      });
    });
  }

  async batchUpsertUsers(users: Array<{
    user_id: string;
    display_name?: string;
    real_name?: string;
    title?: string;
    email?: string;
    avatar_url?: string;
  }>): Promise<void> {
    return new Promise((resolve, reject) => {
      const now = new Date().toISOString();
      this.db.serialize(() => {
        const stmt = this.db.prepare(`
          INSERT INTO users (
            user_id, display_name, real_name, title, email, avatar_url, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(user_id) DO UPDATE SET
            display_name = excluded.display_name,
            real_name = excluded.real_name,
            title = excluded.title,
            email = excluded.email,
            avatar_url = excluded.avatar_url,
            updated_at = excluded.updated_at`);

        try {
          for (const user of users) {
            stmt.run(
              user.user_id,
              user.display_name || null,
              user.real_name || null,
              user.title || null,
              user.email || null,
              user.avatar_url || null,
              now
            );
          }
          stmt.finalize();
          resolve();
        } catch (err) {
          logger.error('Error in batch user upsert:', err);
          reject(err);
        }
      });
    });
  }

  async getUserById(userId: string): Promise<any> {
    return new Promise((resolve, reject) => {
      this.db.get(
        'SELECT * FROM users WHERE user_id = ?',
        [userId],
        (err, row) => {
          if (err) {
            reject(err);
            return;
          }
          resolve(row);
        }
      );
    });
  }

  async getUsersByIds(userIds: string[]): Promise<any[]> {
    return new Promise((resolve, reject) => {
      const placeholders = userIds.map(() => '?').join(',');
      this.db.all(
        `SELECT * FROM users WHERE user_id IN (${placeholders})`,
        userIds,
        (err, rows) => {
          if (err) {
            reject(err);
            return;
          }
          resolve(rows || []);
        }
      );
    });
  }
} 