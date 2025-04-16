import { McpResponse } from './mcp.js';

export interface SlackChannel {
  id: string;
  name: string;
  topic: {
    value: string;
    creator?: string;
    last_set?: number;
  };
  purpose: {
    value: string;
    creator?: string;
    last_set?: number;
  };
  num_members: number;
  is_general?: boolean;
  is_private?: boolean;
  properties?: {
    posting_restricted_to?: {
      type: string[];
      user: string[];
    };
  };
  previous_names?: string[];
}

export interface McpContent {
  type: string;
  text: string;
}

export interface McpResponse {
  method: string;
  content: McpContent[];
  params?: {
    [key: string]: unknown;
    _meta?: { [key: string]: unknown; };
  };
}

export type SlackRequest = {
  method: "slack_list_channels";
  params?: {
    limit?: number;
    cursor?: string;
  };
};

export type SlackResponse = {
  method: "slack_list_channels";
  result: SlackChannel[];
  response_metadata?: {
    next_cursor?: string;
  };
}; 