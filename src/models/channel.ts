import { DatabaseChannel } from '../types/database.js';

export interface ChannelConstructorParams {
  id: string;
  name: string;
  type: string;
  memberCount: number;
  messageCount?: number;
  linkCount?: number;
  mentionCount?: number;
  metadata?: string;
  createdAt?: number;
  lastAnalyzed?: number;
}

interface SlackChannel {
  id: string;
  name: string;
  topic?: { value: string };
  purpose?: { value: string };
  num_members?: number;
}

export class Channel {
  readonly id: string;
  readonly name: string;
  readonly type: string;
  readonly memberCount: number;
  readonly messageCount: number;
  readonly linkCount: number;
  readonly mentionCount: number;
  readonly metadata: string;
  readonly createdAt: number;
  readonly lastAnalyzed: number;

  constructor(params: ChannelConstructorParams) {
    this.validateType(params.type);
    
    this.id = params.id;
    this.name = params.name;
    this.type = params.type;
    this.memberCount = params.memberCount;
    this.messageCount = params.messageCount || 0;
    this.linkCount = params.linkCount || 0;
    this.mentionCount = params.mentionCount || 0;
    this.metadata = params.metadata || '{}';
    this.createdAt = params.createdAt || Date.now();
    this.lastAnalyzed = params.lastAnalyzed || Date.now();
  }

  private validateType(type: string): void {
    const validTypes = ['priority', 'standard', 'off-topic'];
    if (!validTypes.includes(type)) {
      throw new Error(`Invalid channel type: ${type}. Must be one of: ${validTypes.join(', ')}`);
    }
  }

  toDatabase(): DatabaseChannel {
    return {
      channel_id: this.id,
      name: this.name,
      type: this.type,
      member_count: this.memberCount,
      message_count: this.messageCount,
      link_count: this.linkCount,
      mention_count: this.mentionCount,
      metadata: this.metadata,
      created_at: this.createdAt.toString(),
      last_analyzed: this.lastAnalyzed.toString()
    };
  }

  static fromDatabase(record: DatabaseChannel): Channel {
    return new Channel({
      id: record.channel_id,
      name: record.name,
      type: record.type,
      memberCount: record.member_count,
      messageCount: record.message_count,
      linkCount: record.link_count,
      mentionCount: record.mention_count,
      metadata: record.metadata,
      createdAt: parseInt(record.created_at),
      lastAnalyzed: parseInt(record.last_analyzed)
    });
  }

  static fromSlackAPI(slackChannel: SlackChannel): Channel {
    const channel = new Channel({
      id: slackChannel.id,
      name: slackChannel.name,
      type: 'standard',
      memberCount: slackChannel.num_members || 0
    });
    
    return channel;
  }
} 