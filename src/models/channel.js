export class Channel {
  constructor({
    id,
    name,
    type = 'standard',
    topic = '',
    purpose = '',
    memberCount = 0
  }) {
    this.id = id;
    this.name = name;
    this.type = this.validateType(type);
    this.topic = topic;
    this.purpose = purpose;
    this.memberCount = memberCount;
  }

  validateType(type) {
    const validTypes = ['priority', 'standard', 'off-topic'];
    if (!validTypes.includes(type)) {
      throw new Error(`Invalid channel type: ${type}. Must be one of: ${validTypes.join(', ')}`);
    }
    return type;
  }

  // Determine channel type based on name
  determineType() {
    if (this.name.startsWith('client-') || this.name.startsWith('eb-')) {
      return 'priority';
    }
    if (this.name.includes('off-topic')) {
      return 'off-topic';
    }
    return 'standard';
  }

  // Convert to database format
  toDatabase() {
    return {
      id: this.id,
      name: this.name,
      type: this.type,
      topic: this.topic,
      purpose: this.purpose,
      memberCount: this.memberCount
    };
  }

  // Create from database record
  static fromDatabase(record) {
    return new Channel({
      id: record.channel_id,
      name: record.channel_name,
      type: record.channel_type,
      topic: record.topic,
      purpose: record.purpose,
      memberCount: record.member_count
    });
  }

  // Create from Slack API response
  static fromSlackAPI(slackChannel) {
    const channel = new Channel({
      id: slackChannel.id,
      name: slackChannel.name,
      topic: slackChannel.topic?.value || '',
      purpose: slackChannel.purpose?.value || '',
      memberCount: slackChannel.num_members || 0
    });
    
    // Set type based on channel name
    channel.type = channel.determineType();
    
    return channel;
  }
} 