export interface Channel {
  id: string;
  name: string;
  topic: string | null;
  purpose: string | null;
  memberCount: number;
  type: string;
}

export interface Message {
  id: string;
  text: string;
  timestamp: Date;
  isThreaded(): boolean;
}

export class SlackService {
  initialize(): Promise<void>;
  listChannels(options?: { limit?: number; maxTotal?: number }): Promise<Channel[]>;
  getChannelHistory(channelId: string, options?: { limit?: number }): Promise<Message[]>;
  getThreadReplies(channelId: string, threadTs: string): Promise<Message[]>;
  getChannelMessagesWithThreads(channelId: string, options?: { limit?: number }): Promise<{
    messages: Message[];
    threads: Map<string, Message[]>;
  }>;
  disconnect(): Promise<void>;
}

export const slackService: SlackService; 