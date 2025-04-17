import assert from 'assert';
import { logger } from '../../../utils/logger.js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import { slackService, Channel } from '../../../services/slack-service.ts';

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
    // Test 1: Validate configuration
    logger.info('Testing Slack configuration...');
    if (!process.env.SLACK_BOT_TOKEN) {
      throw new Error('SLACK_BOT_TOKEN is not set');
    }
    results.configValidation = true;
    logger.info('✓ Configuration test passed');

    // Test 2: Test connection and channel access
    logger.info('\nTesting Slack connection...');
    await slackService.initialize();
    
    // Get all channels using the Slack service
    const { channels, rawChannels } = await slackService.listChannels();
    
    if (channels.length === 0) {
      throw new Error('No channels returned from Slack service');
    }
    
    // Log all channel names for debugging
    logger.info('All channels:', channels.map(c => c.name));
    
    // Filter for braze channels
    const brazeChannels = channels.filter(c => c.name.toLowerCase().includes('braze'));
    const rawBrazeChannels = rawChannels.filter(c => c.name.toLowerCase().includes('braze'));
    
    if (brazeChannels.length === 0) {
      throw new Error('No channels containing "braze" found');
    }
    
    // Log raw channel data
    logger.info('Raw Braze channel data:', JSON.stringify(rawBrazeChannels, null, 2));
    
    logger.info(`Found ${brazeChannels.length} channels containing "braze":`);
    brazeChannels.forEach((channel: Channel) => {
      logger.info(`\nChannel: ${channel.name}`);
      logger.info(`ID: ${channel.id}`);
      logger.info(`Members: ${channel.memberCount}`);
      logger.info(`Topic: ${channel.topic || 'No topic'}`);
      logger.info(`Purpose: ${channel.purpose || 'No purpose'}`);
    });
    
    results.connectionTest = true;
    logger.info('✓ Connection test successful');

    // Test 3: Test channel history access for the first braze channel
    logger.info('\nTesting channel history access...');
    const firstBrazeChannel = brazeChannels[0];
    const messages = await slackService.getChannelHistory(firstBrazeChannel.id, { limit: 10 });
    
    logger.info(`Found ${messages.length} messages in ${firstBrazeChannel.name} channel`);
    if (messages.length > 0) {
      logger.info('Sample message:', JSON.stringify(messages[0], null, 2));
    }

    // Test 4: Test rate limiting
    logger.info('\nTesting rate limiting...');
    const startTime = Date.now();
    const requests = [
      slackService.listChannels({ limit: 5 }),
      slackService.listChannels({ limit: 5 }),
      slackService.listChannels({ limit: 5 })
    ];
    
    await Promise.all(requests.map(async (request, index) => {
      await request;
      logger.info(`Request ${index + 1} completed at ${Date.now() - startTime}ms`);
    }));
    
    const totalDuration = Date.now() - startTime;
    logger.info(`Total duration: ${totalDuration}ms`);
    results.rateLimiting = true;
    logger.info('✓ Rate limiting test passed');

  } catch (error) {
    logger.error('Test failed:', error);
    throw error;
  } finally {
    // Clean up
    await slackService.disconnect();
  }

  // Print summary
  logger.info('\nSlack Integration Test Summary:');
  Object.entries(results).forEach(([test, passed]) => {
    logger.info(`${passed ? '✓' : '✗'} ${test}`);
  });

  if (Object.values(results).every(Boolean)) {
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