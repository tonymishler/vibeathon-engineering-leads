import { mcpClient } from './mcp-client.js';
import { Channel } from '../models/channel.js';
import { Message } from '../models/message.js';
import dotenv from 'dotenv';

dotenv.config();

class SlackService {
  constructor() {
    this.isInitialized = false;
  }

  async initialize() {
    if (!this.isInitialized) {
      await mcpClient.connect('slack');
      this.isInitialized = true;
    }
  }

  async listChannels(options = {}) {
    await this.initialize();

    const channels = [];
    let cursor = null;
    const limit = options.limit || 200; // Maximum allowed by Slack API

    do {
      const response = await mcpClient.callTool('slack_list_channels', {
        limit,
        ...(cursor ? { cursor } : {})
      });

      const content = response?.content;
      if (Array.isArray(content) && content.length > 0 && content[0]?.text) {
        const slackResponse = JSON.parse(content[0].text);
        if (slackResponse.ok && Array.isArray(slackResponse.channels)) {
          const newChannels = slackResponse.channels.map(channel => ({
            id: channel.id,
            name: channel.name,
            topic: channel.topic?.value || null,
            purpose: channel.purpose?.value || null,
            memberCount: channel.num_members || 0,
            type: this.determineChannelType(channel)
          }));
          channels.push(...newChannels);
          cursor = slackResponse.response_metadata?.next_cursor;
        } else {
          console.warn('Invalid Slack response:', slackResponse);
          break;
        }
      } else {
        console.warn('No channels returned in response:', response);
        break;
      }
    } while (cursor && (!options.maxTotal || channels.length < options.maxTotal));

    return channels;
  }

  determineChannelType(channel) {
    if (channel.name.startsWith('client-') || channel.name.startsWith('eb-')) {
      return 'priority';
    }
    if (channel.name.includes('off-topic')) {
      return 'off-topic';
    }
    return 'standard';
  }

  async getChannelHistory(channelId, options = {}) {
    await this.initialize();

    const messages = [];
    const limit = Math.min(options.limit || 1000, 1000); // Cap at 1000 messages
    let oldestTimestamp = null;

    while (messages.length < limit) {
      const batchSize = Math.min(100, limit - messages.length); // Slack API limit is 100 per request

      const result = await mcpClient.callTool('slack_get_channel_history', {
        channel_id: channelId,
        limit: batchSize,
        ...(oldestTimestamp && { oldest: oldestTimestamp })
      });

      if (!result.messages || result.messages.length === 0) {
        break;
      }

      const newMessages = result.messages.map(msg => Message.fromSlackAPI(msg, channelId));
      messages.push(...newMessages);

      // Update oldest timestamp for pagination
      oldestTimestamp = messages[messages.length - 1].timestamp.getTime() / 1000;

      // If we got fewer messages than requested, we've reached the end
      if (result.messages.length < batchSize) {
        break;
      }

      // Add a small delay to respect rate limits
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    return messages;
  }

  async getThreadReplies(channelId, threadTs) {
    await this.initialize();

    const result = await mcpClient.callTool('slack_get_thread_replies', {
      channel_id: channelId,
      thread_ts: threadTs
    });

    if (!result.messages) {
      return [];
    }

    return result.messages.map(msg => Message.fromSlackAPI(msg, channelId));
  }

  // Helper method to process messages with their threads
  async getChannelMessagesWithThreads(channelId, options = {}) {
    const messages = await this.getChannelHistory(channelId, options);
    const threadedMessages = messages.filter(msg => msg.isThreaded());

    // Fetch thread replies in parallel with rate limiting
    const threadPromises = threadedMessages.map((msg, index) => 
      new Promise(resolve => {
        // Stagger requests to avoid rate limits
        setTimeout(async () => {
          const replies = await this.getThreadReplies(channelId, msg.id);
          resolve({ threadId: msg.id, replies });
        }, index * 100); // 100ms between each request
      })
    );

    const threads = await Promise.all(threadPromises);
    
    // Create a map of thread replies
    const threadMap = new Map(
      threads.map(({ threadId, replies }) => [threadId, replies])
    );

    // Combine original messages with their thread replies
    return {
      messages,
      threads: threadMap
    };
  }

  async disconnect() {
    if (this.isInitialized) {
      await mcpClient.disconnect();
      this.isInitialized = false;
    }
  }
}

// Create singleton instance
export const slackService = new SlackService(); 