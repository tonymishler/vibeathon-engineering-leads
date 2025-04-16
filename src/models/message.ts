interface MessageConstructorParams {
  id: string;
  channelId: string;
  author: string;
  content: string;
  timestamp: Date | string | number;
  threadId?: string | null;
  hasAttachments?: boolean;
  reactionCount?: number;
  replyCount?: number;
}

interface DatabaseMessage {
  message_id: string;
  channel_id: string;
  author: string;
  content: string;
  timestamp: string;
  thread_id: string | null;
  has_attachments: number;
  reaction_count: number;
  reply_count: number;
}

interface SlackMessage {
  ts: string;
  user: string;
  text: string;
  thread_ts?: string;
  files?: Array<any>;
  reactions?: Array<any>;
  reply_count?: number;
}

export class Message {
  readonly id: string;
  readonly channelId: string;
  readonly author: string;
  readonly content: string;
  readonly timestamp: Date;
  readonly threadId: string | null;
  readonly hasAttachments: boolean;
  readonly reactionCount: number;
  readonly replyCount: number;

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
  }: MessageConstructorParams) {
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

  private validateTimestamp(timestamp: Date | string | number): Date {
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

  toDatabase(): DatabaseMessage {
    return {
      message_id: this.id,
      channel_id: this.channelId,
      author: this.author,
      content: this.content,
      timestamp: this.timestamp.toISOString(),
      thread_id: this.threadId,
      has_attachments: this.hasAttachments ? 1 : 0,
      reaction_count: this.reactionCount,
      reply_count: this.replyCount
    };
  }

  static fromDatabase(record: DatabaseMessage): Message {
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

  static fromSlackAPI(slackMessage: SlackMessage, channelId: string): Message {
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

  isThreaded(): boolean {
    return this.threadId !== null;
  }

  hasContent(): boolean {
    return Boolean(this.content?.trim() || this.hasAttachments);
  }
} 