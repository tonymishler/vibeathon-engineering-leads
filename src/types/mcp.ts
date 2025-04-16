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