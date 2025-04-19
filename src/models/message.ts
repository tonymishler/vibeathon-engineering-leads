import { DatabaseMessage } from '../types/database.js';

export interface MessageConstructorParams {
  id: string;
  channelId: string;
  userId: string;
  content: string;
  threadTs?: string | null;
  replyCount?: number;
  reactionCount?: number;
  linkCount?: number;
  mentionCount?: number;
  timestamp?: number;
}

export class Message {
  readonly id: string;
  readonly channelId: string;
  readonly userId: string;
  readonly content: string;
  readonly threadTs: string | null;
  readonly replyCount: number;
  readonly reactionCount: number;
  readonly linkCount: number;
  readonly mentionCount: number;
  readonly timestamp: number;

  constructor(params: MessageConstructorParams) {
    this.id = params.id;
    this.channelId = params.channelId;
    this.userId = params.userId;
    this.content = params.content;
    this.threadTs = params.threadTs || null;
    this.replyCount = params.replyCount || 0;
    this.reactionCount = params.reactionCount || 0;
    this.linkCount = params.linkCount || 0;
    this.mentionCount = params.mentionCount || 0;
    this.timestamp = params.timestamp || Date.now();
  }

  isThreaded(): boolean {
    return this.threadTs !== null;
  }

  hasContent(): boolean {
    return this.content.trim().length > 0;
  }

  toDatabase(): DatabaseMessage {
    return {
      message_id: this.id,
      channel_id: this.channelId,
      user_id: this.userId,
      content: this.content,
      thread_ts: this.threadTs,
      reply_count: this.replyCount,
      reaction_count: this.reactionCount,
      link_count: this.linkCount,
      mention_count: this.mentionCount,
      timestamp: this.timestamp.toString()
    };
  }

  static fromDatabase(record: DatabaseMessage): Message {
    return new Message({
      id: record.message_id,
      channelId: record.channel_id,
      userId: record.user_id,
      content: record.content,
      threadTs: record.thread_ts,
      replyCount: record.reply_count,
      reactionCount: record.reaction_count,
      linkCount: record.link_count,
      mentionCount: record.mention_count,
      timestamp: parseInt(record.timestamp, 10)
    });
  }

  static fromSlackAPI(msg: any, channelId: string): Message {
    return new Message({
      id: msg.ts,
      channelId: channelId,
      userId: msg.user || 'unknown',
      content: msg.text || '',
      threadTs: msg.thread_ts || null,
      replyCount: msg.reply_count || 0,
      reactionCount: (msg.reactions || []).length,
      linkCount: ((msg.text || '').match(/https?:\/\/[^\s]+/g) || []).length,
      mentionCount: ((msg.text || '').match(/<@[A-Z0-9]+>/g) || []).length,
      timestamp: Math.floor(parseFloat(msg.ts) * 1000)
    });
  }
} 