import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import dotenv from 'dotenv';

dotenv.config();

class MCPClient {
  constructor(options = {}) {
    this.options = {
      name: options.name || 'vibeathon-mcp-client',
      version: options.version || '1.0.0',
      maxRetries: options.maxRetries || 3,
      retryDelay: options.retryDelay || 1000, // ms
      connectionTimeout: options.connectionTimeout || 5000 // ms
    };

    this.client = null;
    this.transport = null;
    this.isConnected = false;
  }

  async connect(serverType) {
    try {
      // Create transport based on server type
      const transportConfig = this.getTransportConfig(serverType);
      this.transport = new StdioClientTransport(transportConfig);

      // Create client
      this.client = new Client({
        name: this.options.name,
        version: this.options.version
      });

      // Connect with retry logic
      await this.connectWithRetry();

      return true;
    } catch (error) {
      console.error(`Failed to connect to ${serverType} MCP server:`, error);
      throw error;
    }
  }

  getTransportConfig(serverType) {
    const baseConfig = {
      command: "/opt/homebrew/bin/node",
      env: {
        NODE_ENV: "development",
        PATH: process.env.PATH
      }
    };

    switch (serverType) {
      case 'slack':
        return {
          ...baseConfig,
          args: ["./node_modules/@modelcontextprotocol/server-slack/dist/index.js"],
          env: {
            ...baseConfig.env,
            SLACK_BOT_TOKEN: process.env.SLACK_BOT_TOKEN,
            SLACK_TEAM_ID: process.env.SLACK_TEAM_ID
          }
        };
      case 'browser':
        return {
          ...baseConfig,
          args: ["./node_modules/@browsermcp/mcp/dist/index.js"]
        };
      default:
        throw new Error(`Unsupported MCP server type: ${serverType}`);
    }
  }

  async connectWithRetry(attempt = 1) {
    try {
      await this.client.connect(this.transport);
      
      // Wait for connection to stabilize
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      this.isConnected = true;
      console.log('Successfully connected to MCP server');
    } catch (error) {
      if (attempt < this.options.maxRetries) {
        console.warn(`Connection attempt ${attempt} failed, retrying in ${this.options.retryDelay}ms...`);
        await new Promise(resolve => setTimeout(resolve, this.options.retryDelay));
        return this.connectWithRetry(attempt + 1);
      }
      throw new Error(`Failed to connect after ${this.options.maxRetries} attempts: ${error.message}`);
    }
  }

  async callTool(toolName, args = {}) {
    if (!this.isConnected) {
      throw new Error('Not connected to MCP server');
    }

    try {
      const result = await this.client.callTool({
        name: toolName,
        arguments: args
      });

      if (result.isError) {
        throw new Error(`Tool call failed: ${JSON.stringify(result)}`);
      }

      return result;
    } catch (error) {
      console.error(`Error calling tool ${toolName}:`, error);
      throw error;
    }
  }

  async disconnect() {
    if (this.transport) {
      await this.transport.close();
      this.transport = null;
      this.client = null;
      this.isConnected = false;
    }
  }
}

// Create singleton instance
export const mcpClient = new MCPClient(); 