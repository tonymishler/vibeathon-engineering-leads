export class Message {
  id: string;
  text: string;
  timestamp: Date;
  channelId: string;
  author?: string;
  threadId?: string;
  reactions?: any[];
  hasAttachments?: boolean;

  constructor(id: string, text: string, timestamp: Date, channelId: string, author?: string, threadId?: string, reactions?: any[], hasAttachments?: boolean) {
    this.id = id;
    this.text = text;
    this.timestamp = timestamp;
    this.channelId = channelId;
    this.author = author;
    this.threadId = threadId;
    this.reactions = reactions;
    this.hasAttachments = hasAttachments;
  }

  isThreaded(): boolean {
    return this.id.includes('.');
  }

  toDatabase(): any {
    return {
      message_id: this.id,
      channel_id: this.channelId,
      user_id: this.author || 'unknown',
      content: this.text,
      timestamp: this.timestamp.toISOString(),
      thread_ts: this.threadId,
      reply_count: 0, // This will be updated when we process threads
      link_count: (this.text.match(/https?:\/\/[^\s]+/g) || []).length,
      mention_count: (this.text.match(/<@[A-Z0-9]+>/g) || []).length,
      reaction_count: this.reactions?.length || 0
    };
  }

  static fromSlackAPI(msg: any, channelId: string): Message {
    return new Message(
      msg.ts,
      msg.text,
      new Date(parseFloat(msg.ts) * 1000),
      channelId,
      msg.user,
      msg.thread_ts,
      msg.reactions,
      msg.files && msg.files.length > 0
    );
  }
} 