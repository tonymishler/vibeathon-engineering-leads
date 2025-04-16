import { config } from 'dotenv';
import { Database } from '../../../db/Database.js';
import { logger } from '../../../utils/logger.js';
import assert from 'assert';

config();

const TEST_PREFIX = '[TEST_DB]';

async function runDatabaseTests() {
  logger.info('Starting database integration tests...');
  const results = {
    connection: false,
    channelOperations: false,
    messageOperations: false,
    transactionRollback: false,
    constraintChecks: false
  };

  const db = new Database();

  try {
    // Test 1: Database Connection
    await db.init();
    results.connection = true;
    logger.info('✓ Database connection successful');

    // Test 2: Channel Operations
    const testChannel = {
      channel_id: `${TEST_PREFIX}_CH1`,
      channel_name: `${TEST_PREFIX}_test_channel`,
      channel_type: 'priority',
      topic: 'Test Topic',
      purpose: 'Integration Testing',
      member_count: 1
    };

    await db.beginTransaction();
    try {
      await db.storeChannel(testChannel);
      const storedChannel = await db.getChannels({ name: testChannel.channel_name });
      assert.strictEqual(storedChannel.length, 1, 'Channel should be stored');
      assert.strictEqual(storedChannel[0].channel_name, testChannel.channel_name);
      
      results.channelOperations = true;
      logger.info('✓ Channel operations successful');

      // Test 3: Message Operations
      const testMessage = {
        message_id: `${TEST_PREFIX}_MSG1`,
        channel_id: testChannel.channel_id,
        author: 'test_user',
        content: 'Test message content',
        timestamp: new Date().toISOString(),
        thread_id: null
      };

      await db.storeMessage(testMessage);
      const storedMessages = await db.getMessages({ channel_id: testChannel.channel_id });
      assert.strictEqual(storedMessages.length, 1, 'Message should be stored');
      assert.strictEqual(storedMessages[0].content, testMessage.content);

      results.messageOperations = true;
      logger.info('✓ Message operations successful');

      await db.commitTransaction();
    } catch (error) {
      await db.rollbackTransaction();
      throw error;
    }

    // Test 4: Transaction Rollback
    await db.beginTransaction();
    try {
      const invalidChannel = {
        ...testChannel,
        channel_id: `${TEST_PREFIX}_CH2`,
        channel_type: 'invalid_type' // This should trigger a constraint error
      };
      await db.storeChannel(invalidChannel);
      await db.commitTransaction();
      throw new Error('Should not reach here - invalid channel type should fail');
    } catch (error) {
      await db.rollbackTransaction();
      if (error.message.includes('constraint')) {
        results.transactionRollback = true;
        logger.info('✓ Transaction rollback successful');
      } else {
        throw error;
      }
    }

    // Test 5: Foreign Key Constraints
    await db.beginTransaction();
    try {
      const orphanMessage = {
        message_id: `${TEST_PREFIX}_MSG2`,
        channel_id: 'NON_EXISTENT_CHANNEL',
        author: 'test_user',
        content: 'This should fail',
        timestamp: new Date().toISOString()
      };
      await db.storeMessage(orphanMessage);
      await db.commitTransaction();
      throw new Error('Should not reach here - foreign key constraint should fail');
    } catch (error) {
      await db.rollbackTransaction();
      if (error.message.includes('FOREIGN KEY')) {
        results.constraintChecks = true;
        logger.info('✓ Constraint checks successful');
      } else {
        throw error;
      }
    }

  } catch (error) {
    logger.error('Database integration test failed:', error);
    throw error;
  } finally {
    // Cleanup test data
    await db.beginTransaction();
    try {
      await db.executeQuery('DELETE FROM messages WHERE message_id LIKE ?', [`${TEST_PREFIX}%`]);
      await db.executeQuery('DELETE FROM channels WHERE channel_id LIKE ?', [`${TEST_PREFIX}%`]);
      await db.commitTransaction();
      logger.info('✓ Test data cleanup successful');
    } catch (error) {
      await db.rollbackTransaction();
      logger.error('Failed to clean up test data:', error);
    }
    await db.close();
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

// Handle unhandled promise rejections
process.on('unhandledRejection', (error) => {
  logger.error('Unhandled promise rejection:', error);
  process.exit(1);
});

// Run the database tests
runDatabaseTests().catch((error) => {
  logger.error('Database tests failed:', error);
  process.exit(1);
}); 