import { config } from 'dotenv';
import { SlackService } from '../services/SlackService.js';
import { GeminiService } from '../services/GeminiService.js';
import { Database } from '../db/Database.js';
import { logger } from '../utils/logger.js';

config();

const TEST_PREFIX = '[TEST]';
const TEST_CHANNEL_LIMIT = 10;

async function runIntegrationTest() {
  logger.info('Starting integration test...');
  const results = {
    dbConnection: false,
    slackChannels: false,
    geminiFiltering: false,
    messageRetrieval: false,
    dbStorage: false
  };

  const db = new Database();
  const slackService = new SlackService();
  const geminiService = new GeminiService();

  try {
    // Step 1: Test database connection
    await db.init();
    results.dbConnection = true;
    logger.info('✓ Database connection successful');

    // Step 2: Test Slack channel fetching
    const channels = await slackService.getChannels(TEST_CHANNEL_LIMIT);
    if (channels && channels.length > 0) {
      results.slackChannels = true;
      logger.info(`✓ Successfully fetched ${channels.length} channels`);
      logger.info('Sample channel names:', channels.slice(0, 3).map(c => c.name));
    }

    // Step 3: Test Gemini filtering
    const filteredChannels = await geminiService.filterChannels(channels);
    if (filteredChannels) {
      results.geminiFiltering = true;
      const { priorityChannels, standardChannels } = filteredChannels;
      logger.info(`✓ Gemini filtering successful - Priority: ${priorityChannels.length}, Standard: ${standardChannels.length}`);
    }

    // Step 4: Test message retrieval
    const testChannel = filteredChannels.priorityChannels[0] || filteredChannels.standardChannels[0];
    if (testChannel) {
      const messages = await slackService.getMessages(testChannel.id, 1);
      if (messages && messages.length > 0) {
        results.messageRetrieval = true;
        logger.info('✓ Successfully retrieved latest message from channel:', testChannel.name);
      }

      // Step 5: Test database storage
      await db.beginTransaction();
      try {
        // Store test channel
        const testChannelData = {
          ...testChannel,
          name: `${TEST_PREFIX}${testChannel.name}`,
          priority: true
        };
        await db.storeChannel(testChannelData);

        // Store test message
        if (messages && messages.length > 0) {
          const testMessage = {
            ...messages[0],
            text: `${TEST_PREFIX}${messages[0].text}`,
            channel_id: testChannel.id
          };
          await db.storeMessage(testMessage);
        }

        await db.commitTransaction();
        results.dbStorage = true;
        logger.info('✓ Successfully stored test data in database');

        // Step 6: Verify storage
        const testChannels = await db.getChannels({ name: TEST_PREFIX });
        logger.info(`Found ${testChannels.length} test channels in database`);
      } catch (error) {
        await db.rollbackTransaction();
        throw error;
      }
    }
  } catch (error) {
    logger.error('Integration test failed:', error);
    throw error;
  } finally {
    // Cleanup
    await Promise.all([
      db.close(),
      slackService.disconnect(),
      geminiService.disconnect()
    ]);
  }

  // Summary
  logger.info('\nIntegration Test Summary:');
  Object.entries(results).forEach(([test, passed]) => {
    logger.info(`${passed ? '✓' : '✗'} ${test}`);
  });

  const allPassed = Object.values(results).every(r => r);
  if (allPassed) {
    logger.info('\n✓ All integration tests passed successfully');
  } else {
    throw new Error('Some integration tests failed');
  }
}

// Handle unhandled promise rejections
process.on('unhandledRejection', (error) => {
  logger.error('Unhandled promise rejection:', error);
  process.exit(1);
});

// Run the integration test
runIntegrationTest().catch((error) => {
  logger.error('Integration test failed:', error);
  process.exit(1);
}); 