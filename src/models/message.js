export class Message {
  constructor({
    id,
    channelId,
    author,
    content,
    timestamp,
    threadId = null,
    hasAttachments = false,
    reactionCount = 0,
    replyCount = 0
  }) {
    this.id = id;
    this.channelId = channelId;
    this.author = author;
    this.content = content;
    this.timestamp = this.validateTimestamp(timestamp);
    this.threadId = threadId;
    this.hasAttachments = hasAttachments;
    this.reactionCount = reactionCount;
    this.replyCount = replyCount;
  }

  validateTimestamp(timestamp) {
    if (timestamp instanceof Date) {
      return timestamp;
    }
    // Handle Slack's timestamp format (Unix timestamp with milliseconds)
    if (typeof timestamp === 'string' && timestamp.includes('.')) {
      return new Date(parseFloat(timestamp) * 1000);
    }
    // Handle Unix timestamp in seconds
    if (typeof timestamp === 'number') {
      return new Date(timestamp * 1000);
    }
    // Try to parse as ISO string
    const date = new Date(timestamp);
    if (isNaN(date.getTime())) {
      throw new Error(`Invalid timestamp format: ${timestamp}`);
    }
    return date;
  }

  // Convert to database format
  toDatabase() {
    return {
      id: this.id,
      channelId: this.channelId,
      author: this.author,
      content: this.content,
      timestamp: this.timestamp.toISOString(),
      threadId: this.threadId,
      hasAttachments: this.hasAttachments,
      reactionCount: this.reactionCount,
      replyCount: this.replyCount
    };
  }

  // Create from database record
  static fromDatabase(record) {
    return new Message({
      id: record.message_id,
      channelId: record.channel_id,
      author: record.author,
      content: record.content,
      timestamp: record.timestamp,
      threadId: record.thread_id,
      hasAttachments: record.has_attachments === 1,
      reactionCount: record.reaction_count,
      replyCount: record.reply_count
    });
  }

  // Create from Slack API response
  static fromSlackAPI(slackMessage, channelId) {
    return new Message({
      id: slackMessage.ts,
      channelId: channelId,
      author: slackMessage.user,
      content: slackMessage.text,
      timestamp: slackMessage.ts,
      threadId: slackMessage.thread_ts || null,
      hasAttachments: (slackMessage.files?.length || 0) > 0,
      reactionCount: (slackMessage.reactions?.length || 0),
      replyCount: slackMessage.reply_count || 0
    });
  }

  // Helper method to check if message is in a thread
  isThreaded() {
    return this.threadId !== null;
  }

  // Helper method to check if message has meaningful content
  hasContent() {
    return Boolean(this.content?.trim() || this.hasAttachments);
  }
} 