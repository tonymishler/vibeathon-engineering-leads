import assert from 'assert';
import { dbQueries } from '../../../database/queries.js';
import { Channel } from '../../../models/channel.js';
import { Message } from '../../../models/message.js';
import { logger } from '../../../utils/logger.js';

interface TestResults {
  channelOperations: boolean;
  messageOperations: boolean;
  transactionHandling: boolean;
}

async function testDatabaseIntegration(): Promise<void> {
  logger.info('Starting database integration tests...');
  const results: TestResults = {
    channelOperations: false,
    messageOperations: false,
    transactionHandling: false
  };

  let isInTransaction = false;

  try {
    // Initialize database connection
    await dbQueries.initialize();

    // Test 1: Channel Operations
    const testChannel = new Channel({
      id: 'TEST001',
      name: 'test-channel',
      type: 'standard',
      topic: 'Test Topic',
      purpose: 'Testing',
      memberCount: 1
    });

    await dbQueries.upsertChannel(testChannel);
    const channels = await dbQueries.getChannelsByType('standard');
    assert(channels.some(c => c.id === testChannel.id));
    results.channelOperations = true;
    logger.info('✓ Channel operations successful');

    // Test 2: Message Operations
    const testMessage = new Message({
      id: 'MSG001',
      channelId: testChannel.id,
      author: 'test-user',
      content: 'Test message',
      timestamp: new Date(),
      threadId: null,
      hasAttachments: false,
      reactionCount: 0,
      replyCount: 0
    });

    await dbQueries.batchInsertMessages([testMessage]);
    const messages = await dbQueries.getChannelMessages(testChannel.id, 1);
    assert.strictEqual(messages.length, 1);
    assert.strictEqual(messages[0].id, testMessage.id);
    results.messageOperations = true;
    logger.info('✓ Message operations successful');

    // Test 3: Transaction Handling
    try {
      await dbQueries.beginTransaction();
      isInTransaction = true;
      
      // Perform some operations
      await dbQueries.updateChannelProcessedTime(testChannel.id);
      
      // Simulate an error condition
      const invalidMessage = new Message({
        id: 'MSG002',
        channelId: 'INVALID_CHANNEL',  // This should fail due to foreign key constraint
        author: 'test-user',
        content: 'Test message',
        timestamp: new Date()
      });

      try {
        await dbQueries.batchInsertMessages([invalidMessage]);
      } catch (error) {
        // Expected error due to foreign key constraint
        if (isInTransaction) {
          await dbQueries.rollbackTransaction();
          isInTransaction = false;
        }
        results.transactionHandling = true;
        logger.info('✓ Transaction handling successful');
      }
    } catch (error) {
      if (isInTransaction) {
        await dbQueries.rollbackTransaction();
        isInTransaction = false;
      }
      throw error;
    }

  } catch (error) {
    logger.error('Database integration test failed:', error);
    throw error;
  } finally {
    try {
      // Ensure any open transaction is rolled back
      if (isInTransaction) {
        await dbQueries.rollbackTransaction();
      }
      // Wait a bit before closing to allow any pending operations to complete
      await new Promise(resolve => setTimeout(resolve, 100));
      await dbQueries.close();
    } catch (error) {
      logger.warn('Error while closing database connection:', error);
    }
  }

  // Summary
  logger.info('\nDatabase Integration Test Summary:');
  Object.entries(results).forEach(([test, passed]) => {
    logger.info(`${passed ? '✓' : '✗'} ${test}`);
  });

  const allPassed = Object.values(results).every(r => r);
  if (allPassed) {
    logger.info('\n✓ All database integration tests passed successfully');
  } else {
    throw new Error('Some database integration tests failed');
  }
}

export default testDatabaseIntegration; 