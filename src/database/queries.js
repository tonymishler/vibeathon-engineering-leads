export class DatabaseQueries {
  constructor(db) {
    this.db = db;
    this.isInTransaction = false;
  }

  async beginTransaction() {
    await this.db.run('BEGIN TRANSACTION');
    this.isInTransaction = true;
  }

  async commitTransaction() {
    await this.db.run('COMMIT');
    this.isInTransaction = false;
  }

  async rollbackTransaction() {
    await this.db.run('ROLLBACK');
    this.isInTransaction = false;
  }

  async close() {
    if (this.isInTransaction) {
      await this.rollbackTransaction();
    }
    return new Promise((resolve, reject) => {
      this.db.close((err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }

  async batchUpsertUsers(users) {
    const BATCH_SIZE = 50; // Process 50 users at a time (50 * 27 variables = 1350, well under SQLite's limit)
    const now = new Date().toISOString();
    
    // Process users in batches
    for (let i = 0; i < users.length; i += BATCH_SIZE) {
      const batch = users.slice(i, i + BATCH_SIZE);
      const placeholders = batch.map(() => `(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).join(',');
      const values = batch.flatMap(user => [
        user.user_id,
        user.display_name,
        user.real_name,
        user.title,
        user.email,
        user.avatar_url,
        user.team_id,
        user.is_admin ? 1 : 0,
        user.is_owner ? 1 : 0,
        user.is_primary_owner ? 1 : 0,
        user.is_restricted ? 1 : 0,
        user.is_ultra_restricted ? 1 : 0,
        user.is_bot ? 1 : 0,
        user.is_app_user ? 1 : 0,
        user.tz,
        user.tz_label,
        user.tz_offset,
        user.phone,
        user.skype,
        user.status_text,
        user.status_emoji,
        user.first_name,
        user.last_name,
        user.deleted ? 1 : 0,
        user.color,
        user.who_can_share_contact_card,
        now
      ]);

      const sql = `
        INSERT OR REPLACE INTO users (
          user_id, display_name, real_name, title, email, avatar_url,
          team_id, is_admin, is_owner, is_primary_owner, is_restricted,
          is_ultra_restricted, is_bot, is_app_user, tz, tz_label,
          tz_offset, phone, skype, status_text, status_emoji,
          first_name, last_name, deleted, color,
          who_can_share_contact_card, updated_at
        ) VALUES ${placeholders}
      `;

      await this.db.run(sql, values);
    }
  }

  async upsertChannel(channel) {
    const sql = `
      INSERT OR REPLACE INTO channels (
        channel_id, name, type, team_id, created_at, last_analyzed,
        member_count, message_count, link_count, mention_count, metadata
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    await this.db.run(sql, [
      channel.channel_id,
      channel.name,
      channel.type,
      channel.team_id,
      channel.created_at,
      channel.last_analyzed,
      channel.member_count,
      channel.message_count,
      channel.link_count,
      channel.mention_count,
      channel.metadata
    ]);
  }

  async batchInsertMessages(messages) {
    if (!messages || messages.length === 0) return;

    const placeholders = messages.map(() => '(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').join(',');
    const values = messages.flatMap(msg => [
      msg.message_id,
      msg.channel_id,
      msg.user_id,
      msg.thread_ts,
      msg.timestamp,
      msg.content,
      msg.has_files ? 1 : 0,
      msg.has_links ? 1 : 0,
      msg.link_count,
      msg.mention_count,
      msg.reaction_count,
      msg.reply_count,
      msg.reply_users_count,
      JSON.stringify(msg.metadata || {})
    ]);

    const sql = `
      INSERT OR REPLACE INTO messages (
        message_id, channel_id, user_id, thread_ts, timestamp,
        content, has_files, has_links, link_count, mention_count,
        reaction_count, reply_count, reply_users_count, metadata
      ) VALUES ${placeholders}
    `;

    await this.db.run(sql, values);
  }

  async upsertChannelContext(context) {
    const sql = `
      INSERT OR REPLACE INTO channel_contexts (
        context_id, channel_id, start_date, end_date,
        message_count, window_type, context_data, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;

    await this.db.run(sql, [
      context.context_id,
      context.channel_id,
      context.start_date.toISOString(),
      context.end_date.toISOString(),
      context.message_count,
      context.window_type,
      context.context_data,
      context.created_at
    ]);
  }

  async createOpportunity(opportunity) {
    const sql = `
      INSERT INTO opportunities (
        opportunity_id, type, title, description, implicit_insights,
        key_participants, potential_solutions, confidence_score,
        scope, effort_estimate, potential_value, status,
        context_id, detected_at, last_updated
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    await this.db.run(sql, [
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
    ]);
  }

  async addOpportunityEvidence(evidence) {
    const sql = `
      INSERT INTO opportunity_evidence (
        evidence_id, opportunity_id, message_id, author,
        timestamp, content, relevance_note
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `;

    await this.db.run(sql, [
      evidence.evidence_id,
      evidence.opportunity_id,
      evidence.message_id,
      evidence.author,
      evidence.timestamp,
      evidence.content,
      evidence.relevance_note
    ]);
  }

  async getUsersByIds(userIds) {
    if (!userIds || userIds.length === 0) return [];
    const placeholders = userIds.map(() => '?').join(',');
    const sql = `SELECT * FROM users WHERE user_id IN (${placeholders})`;
    return new Promise((resolve, reject) => {
      this.db.all(sql, userIds, (err, rows) => {
        if (err) reject(err);
        else resolve(rows || []);
      });
    });
  }
} 