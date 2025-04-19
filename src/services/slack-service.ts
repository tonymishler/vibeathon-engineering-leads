import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import dotenv from 'dotenv';
import { Message } from '../models/message';
import path from 'path';

dotenv.config();

export interface Channel {
  id: string;
  name: string;
  topic: string | null;
  purpose: string | null;
  memberCount: number;
  type: string;
  isMember: boolean;
}

export class SlackService {
  private isInitialized: boolean = false;
  private client: Client | null = null;
  private transport: StdioClientTransport | null = null;
  private userCache: Map<string, any> = new Map();

  async initialize() {
    if (!this.isInitialized) {
      const projectRoot = process.cwd();
      const serverPath = path.join(projectRoot, 'node_modules', '@modelcontextprotocol', 'server-slack', 'dist', 'index.js');
      
      this.transport = new StdioClientTransport({
        command: "node",
        args: [serverPath],
        env: {
          SLACK_BOT_TOKEN: process.env.SLACK_BOT_TOKEN || '',
          SLACK_TEAM_ID: process.env.SLACK_TEAM_ID || '',
          NODE_ENV: "development",
          PATH: process.env.PATH || ''
        }
      });

      this.client = new Client({
        name: "vibeathon-slack-client",
        version: "1.0.0"
      });

      await this.client.connect(this.transport);
      this.isInitialized = true;
    }
  }

  async listChannels(options: { limit?: number; maxTotal?: number } = {}): Promise<{
    channels: Channel[];
    rawChannels: any[];
  }> {
    await this.initialize();

    const channels: Channel[] = [];
    const rawChannels: any[] = [];
    let cursor: string | null = null;
    const limit = options.limit || 200;

    do {
      const response = await this.client!.callTool({
        name: "slack_list_channels",
        arguments: {
          limit,
          ...(cursor ? { cursor } : {})
        }
      });

      const content = response?.content;
      if (Array.isArray(content) && content.length > 0 && content[0]?.text) {
        const slackResponse = JSON.parse(content[0].text);
        if (slackResponse.ok && Array.isArray(slackResponse.channels)) {
          const memberChannels = slackResponse.channels.filter((channel: any) => channel.is_member);
          rawChannels.push(...memberChannels);
          
          const newChannels = memberChannels.map((channel: any) => ({
            id: channel.id,
            name: channel.name,
            topic: channel.topic?.value || null,
            purpose: channel.purpose?.value || null,
            memberCount: channel.num_members || 0,
            type: this.determineChannelType(channel),
            isMember: true
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

    return { channels, rawChannels };
  }

  async listChannelsRaw(options: { limit?: number } = {}): Promise<any[]> {
    await this.initialize();

    const response = await this.client!.callTool({
      name: "slack_list_channels",
      arguments: {
        limit: options.limit || 1000
      }
    });

    const content = response?.content;
    if (Array.isArray(content) && content.length > 0 && content[0]?.text) {
      const slackResponse = JSON.parse(content[0].text);
      if (slackResponse.ok && Array.isArray(slackResponse.channels)) {
        return slackResponse.channels;
      }
    }
    return [];
  }

  private determineChannelType(channel: any): string {
    if (channel.name.startsWith('client-') || channel.name.startsWith('eb-')) {
      return 'priority';
    }
    if (channel.name.includes('off-topic')) {
      return 'off-topic';
    }
    return 'standard';
  }

  async getChannelHistory(channelId: string, options: { limit?: number } = {}): Promise<Message[]> {
    await this.initialize();

    const messages: Message[] = [];
    const limit = Math.min(options.limit || 50, 50);
    let oldestTimestamp: number | null = null;

    while (messages.length < limit) {
      const batchSize = Math.min(50, limit - messages.length);

      const result = await this.client!.callTool({
        name: "slack_get_channel_history",
        arguments: {
          channel_id: channelId,
          limit: batchSize,
          ...(oldestTimestamp && { oldest: oldestTimestamp })
        }
      });

      const content = result?.content;
      if (!Array.isArray(content) || content.length === 0 || !content[0]?.text) {
        break;
      }

      const slackResponse = JSON.parse(content[0].text);
      if (!slackResponse.ok || !Array.isArray(slackResponse.messages)) {
        break;
      }

      const newMessages = slackResponse.messages.map((msg: any) => Message.fromSlackAPI(msg, channelId));
      messages.push(...newMessages);

      if (messages.length > 0) {
        oldestTimestamp = Math.floor(messages[messages.length - 1].timestamp / 1000);
      }

      if (slackResponse.messages.length < batchSize) {
        break;
      }

      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    return messages;
  }

  async getThreadReplies(channelId: string, threadTs: string): Promise<Message[]> {
    await this.initialize();

    await new Promise(resolve => setTimeout(resolve, 1000));

    const result = await this.client!.callTool({
      name: "slack_get_thread_replies",
      arguments: {
        channel_id: channelId,
        thread_ts: threadTs
      }
    });

    const content = result?.content;
    if (!Array.isArray(content) || content.length === 0 || !content[0]?.text) {
      console.warn('Invalid MCP response format:', result);
      return [];
    }

    const slackResponse = JSON.parse(content[0].text);
    if (!slackResponse.ok || !Array.isArray(slackResponse.messages)) {
      console.warn('Invalid Slack response:', slackResponse);
      return [];
    }

    return slackResponse.messages.map((msg: any) => Message.fromSlackAPI(msg, channelId));
  }

  async getChannelMessagesWithThreads(channelId: string, options: { limit?: number } = {}): Promise<{
    messages: Message[];
    threads: Map<string, Message[]>;
  }> {
    const messages = await this.getChannelHistory(channelId, { limit: options.limit || 50 });
    const threadedMessages = messages.filter(msg => msg.isThreaded());

    const threads = new Map<string, Message[]>();
    for (const msg of threadedMessages) {
      const replies = await this.getThreadReplies(channelId, msg.id);
      threads.set(msg.id, replies);
    }

    return {
      messages,
      threads
    };
  }

  async getUserProfile(userId: string): Promise<any> {
    if (this.userCache.has(userId)) {
      return this.userCache.get(userId);
    }

    await this.initialize();
    
    try {
      const result = await this.client!.callTool({
        name: "slack_get_user_profile",
        arguments: {
          user_id: userId
        }
      });

      const content = result?.content;
      if (Array.isArray(content) && content.length > 0 && content[0]?.text) {
        const response = JSON.parse(content[0].text);
        if (response.ok && response.profile) {
          this.userCache.set(userId, response.profile);
          return response.profile;
        }
      }
      return null;
    } catch (error) {
      console.warn(`Failed to fetch user profile for ${userId}:`, error);
      return null;
    }
  }

  async getUserProfiles(userIds: string[]): Promise<Map<string, any>> {
    const uniqueIds = [...new Set(userIds)];
    const profiles = new Map();

    await Promise.all(
      uniqueIds.map(async (userId) => {
        const profile = await this.getUserProfile(userId);
        if (profile) {
          profiles.set(userId, profile);
        }
      })
    );

    return profiles;
  }

  async disconnect() {
    if (this.isInitialized && this.transport) {
      await this.transport.close();
      this.transport = null;
      this.client = null;
      this.isInitialized = false;
    }
  }
}

export const slackService = new SlackService(); 