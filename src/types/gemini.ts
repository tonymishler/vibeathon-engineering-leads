import { McpResponse } from './mcp.js';

export interface GeminiRequest {
  name: "gemini_generate" | "gemini_embed";
  arguments: {
    prompt?: string;
    text?: string;
    temperature?: number;
    max_tokens?: number;
  };
}

export interface GeminiResponse {
  content: [{
    type: string;
    text: string;
  }];
}

export interface GeminiEmbedding {
  values: number[];
  dimensions: number;
} 