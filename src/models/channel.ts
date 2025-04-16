type ChannelType = 'priority' | 'standard' | 'off-topic';

interface ChannelConstructorParams {
  id: string;
  name: string;
  type?: ChannelType;
  topic?: string;
  purpose?: string;
  memberCount?: number;
}

interface DatabaseChannel {
  channel_id: string;
  channel_name: string;
  channel_type: ChannelType;
  topic: string | null;
  purpose: string | null;
  member_count: number;
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
  type: ChannelType;
  topic: string;
  purpose: string;
  memberCount: number;

  constructor({
    id,
    name,
    type = 'standard',
    topic = '',
    purpose = '',
    memberCount = 0
  }: ChannelConstructorParams) {
    this.id = id;
    this.name = name;
    this.type = this.validateType(type);
    this.topic = topic;
    this.purpose = purpose;
    this.memberCount = memberCount;
  }

  private validateType(type: string): ChannelType {
    const validTypes: ChannelType[] = ['priority', 'standard', 'off-topic'];
    if (!validTypes.includes(type as ChannelType)) {
      throw new Error(`Invalid channel type: ${type}. Must be one of: ${validTypes.join(', ')}`);
    }
    return type as ChannelType;
  }

  determineType(): ChannelType {
    if (this.name.startsWith('client-') || this.name.startsWith('eb-')) {
      return 'priority';
    }
    if (this.name.includes('off-topic')) {
      return 'off-topic';
    }
    return 'standard';
  }

  toDatabase(): DatabaseChannel {
    return {
      channel_id: this.id,
      channel_name: this.name,
      channel_type: this.type,
      topic: this.topic || null,
      purpose: this.purpose || null,
      member_count: this.memberCount
    };
  }

  static fromDatabase(record: DatabaseChannel): Channel {
    return new Channel({
      id: record.channel_id,
      name: record.channel_name,
      type: record.channel_type,
      topic: record.topic || '',
      purpose: record.purpose || '',
      memberCount: record.member_count
    });
  }

  static fromSlackAPI(slackChannel: SlackChannel): Channel {
    const channel = new Channel({
      id: slackChannel.id,
      name: slackChannel.name,
      topic: slackChannel.topic?.value || '',
      purpose: slackChannel.purpose?.value || '',
      memberCount: slackChannel.num_members || 0
    });
    
    channel.type = channel.determineType();
    
    return channel;
  }
} 