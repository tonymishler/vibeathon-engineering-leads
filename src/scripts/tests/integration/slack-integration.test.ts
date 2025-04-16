import assert from 'assert';
import { logger } from '../../../utils/logger.js';
import dotenv from 'dotenv';
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import fs from 'fs';
import { SlackChannel, McpResponse, SlackRequest } from '../../../types/slack.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables from project root
dotenv.config({ path: resolve(__dirname, '../../../../.env') });

// Debug logging
logger.info('Environment variables loaded from:', resolve(__dirname, '../../../../.env'));
logger.info('SLACK_BOT_TOKEN exists:', !!process.env.SLACK_BOT_TOKEN);
logger.info('SLACK_TEAM_ID exists:', !!process.env.SLACK_TEAM_ID);

interface TestResults {
  configValidation: boolean;
  connectionTest: boolean;
  rateLimiting: boolean;
}

async function testSlackIntegration(): Promise<void> {
  logger.info('Starting Slack integration tests...');
  const results: TestResults = {
    configValidation: false,
    connectionTest: false,
    rateLimiting: false
  };

  try {
    // Test 1: Configuration Validation
    const requiredEnvVars = ['SLACK_BOT_TOKEN', 'SLACK_TEAM_ID'];
    const missingVars = requiredEnvVars.filter(v => !process.env[v]);
    
    if (missingVars.length > 0) {
      logger.warn('Skipping Slack integration tests - missing environment variables:', missingVars);
      return;
    }
    
    results.configValidation = true;
    logger.info('✓ Configuration validation successful');

    // Test 2: Connect to Slack and list channels
    const transport = new StdioClientTransport({
      command: "/opt/homebrew/bin/node",
      args: ["./node_modules/@modelcontextprotocol/server-slack/dist/index.js"],
      env: {
        SLACK_BOT_TOKEN: process.env.SLACK_BOT_TOKEN as string,
        SLACK_TEAM_ID: process.env.SLACK_TEAM_ID as string,
        NODE_ENV: "development",
        PATH: process.env.PATH as string
      }
    });

    const client = new Client<SlackRequest, McpResponse>({
      name: "slack-integration-test",
      version: "1.0.0"
    });

    await client.connect(transport);
    
    // List channels using the Slack MCP tool with pagination
    let allChannels: any[] = [];
    let cursor: string | undefined;
    
    do {
      const response = await client.callTool({
        name: "slack_list_channels",
        arguments: { 
          limit: 1000,
          ...(cursor ? { cursor } : {})
        }
      });

      logger.info('Response:', response);
      fs.writeFileSync('response.json', JSON.stringify(response, null, 2));

      const content = response?.content;
      if (Array.isArray(content) && content.length > 0 && content[0]?.text) {
        const slackResponse = JSON.parse(content[0].text);
        if (slackResponse.ok && Array.isArray(slackResponse.channels)) {
          allChannels = allChannels.concat(slackResponse.channels);
          cursor = slackResponse.response_metadata?.next_cursor;
        } else {
          logger.warn('Invalid Slack response:', slackResponse);
          throw new Error('Invalid response from Slack API');
        }
      } else {
        logger.warn('No channels returned in response:', response);
        throw new Error('No channels returned from Slack API');
      }
    } while (cursor);

    logger.info('\nFound Slack channels:');
    logger.info(`Total channels found: ${allChannels.length}`);
    allChannels.forEach((channel: any) => {
      logger.info(`\n- ${channel.name} (${channel.id})`);
      logger.info(`  Members: ${channel.num_members}`);
      logger.info(`  Topic: ${channel.topic?.value || 'No topic'}`);
      logger.info(`  Purpose: ${channel.purpose?.value || 'No purpose'}`);
      if (channel.is_general) logger.info('  [General Channel]');
      if (channel.is_private) logger.info('  [Private Channel]');
      if (channel.properties?.posting_restricted_to) logger.info('  [Posting Restricted]');
      if (channel.previous_names?.length > 0) logger.info(`  Previously known as: ${channel.previous_names.join(', ')}`);
    });

    assert.strictEqual(allChannels.length > 0, true, 'No channels found');
    results.connectionTest = true;
    logger.info('\n✓ Connection test successful');

    // Test 3: Rate Limiting
    // Test rapid channel listing to verify rate limiting
    logger.info('\nTesting rate limiting...');
    const startTime = Date.now();
    for (let i = 0; i < 3; i++) {
      await client.callTool({
        name: "slack_list_channels",
        arguments: {
          limit: 5
        }
      });
      logger.info(`Request ${i + 1} completed at ${Date.now() - startTime}ms`);
    }
    const endTime = Date.now();
    const duration = endTime - startTime;
    logger.info(`Total duration: ${duration}ms`);
    
    // Verify that the requests took at least some time due to rate limiting
    // We expect each request to take at least 50ms on average
    assert.strictEqual(duration >= 150, true, 'Rate limiting not detected');
    results.rateLimiting = true;
    logger.info('✓ Rate limiting test passed');

  } catch (error) {
    logger.error('Slack integration test failed:', error);
    throw error;
  }

  // Summary
  logger.info('\nSlack Integration Test Summary:');
  Object.entries(results).forEach(([test, passed]) => {
    logger.info(`${passed ? '✓' : '✗'} ${test}`);
  });

  const allPassed = Object.values(results).every(r => r);
  if (allPassed) {
    logger.info('\n✓ All Slack integration tests completed');
  } else {
    throw new Error('Some Slack integration tests failed');
  }
}

export default testSlackIntegration; 

// Run the test
testSlackIntegration().catch(error => {
  console.error('Test failed:', error);
  process.exit(1);
}); 