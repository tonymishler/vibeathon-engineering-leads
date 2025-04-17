import assert from 'assert';
import pkg from 'sqlite3';
const { Database } = pkg;
import { DatabaseQueries } from '../../../database/queries.js';
import { Channel } from '../../../models/channel.js';
import { Message } from '../../../models/message.js';
import { logger } from '../../../utils/logger.js';
import { DatabaseChannel, DatabaseMessage } from '../../../types/database.js';
import { initializeDatabase } from '../../../database/init.js';
import path from 'path';

interface TestResults {
  channelOperations: boolean;
  messageOperations: boolean;
  transactionHandling: boolean;
}

async function testDatabaseIntegration(): Promise<TestResults> {
  logger.info('Starting database integration tests...');
  const results: TestResults = {
    channelOperations: false,
    messageOperations: false,
    transactionHandling: false
  };

  const testDbPath = path.join(process.cwd(), 'data', 'test.sqlite');
  let db: InstanceType<typeof Database>;
  let queries: DatabaseQueries;

  try {
    // Initialize database
    await initializeDatabase(testDbPath);
    db = new Database(testDbPath);
    queries = new DatabaseQueries(db);

    // Test 1: Channel Operations
    const testChannel = new Channel({
      id: 'TEST001',
      name: 'test-channel',
      type: 'standard',
      memberCount: 1,
      messageCount: 0,
      linkCount: 0,
      mentionCount: 0
    });

    const dbChannel = testChannel.toDatabase();

    await queries.upsertChannel(dbChannel);
    const channels = await queries.getChannelsByType('standard');
    const foundChannel = channels.find((c: DatabaseChannel) => c.channel_id === testChannel.id);
    assert(foundChannel);
    const retrievedChannel = Channel.fromDatabase(foundChannel);
    assert.strictEqual(retrievedChannel.id, testChannel.id);
    results.channelOperations = true;
    logger.info('✓ Channel operations successful');

    // Test 2: Message Operations
    const testMessage = new Message({
      id: 'MSG001',
      channelId: testChannel.id,
      userId: 'test-user',
      content: 'Test message',
      timestamp: Date.now(),
      threadTs: null,
      reactionCount: 0,
      replyCount: 0,
      linkCount: 0,
      mentionCount: 0
    });

    const dbMessage = testMessage.toDatabase();

    await queries.batchInsertMessages([dbMessage]);
    const messages = await queries.getChannelMessages(testChannel.id);
    assert.strictEqual(messages.length, 1);
    const retrievedMessage = Message.fromDatabase(messages[0]);
    assert.strictEqual(retrievedMessage.id, testMessage.id);
    results.messageOperations = true;
    logger.info('✓ Message operations successful');

    // Test 3: Transaction Handling
    const batchMessages = Array(5).fill(null).map((_, i) => {
      const msg = new Message({
        id: `MSG00${i + 2}`,
        channelId: testChannel.id,
        userId: 'test-user',
        content: `Test message ${i + 2}`,
        timestamp: Date.now(),
        threadTs: null,
        reactionCount: 0,
        replyCount: 0,
        linkCount: 0,
        mentionCount: 0
      });
      return msg.toDatabase();
    });

    try {
      await queries.batchInsertMessages(batchMessages);
      results.transactionHandling = true;
      logger.info('✓ Transaction handling successful');
    } catch (error) {
      logger.error('Transaction handling failed:', error);
      throw error;
    }

  } catch (error) {
    logger.error('Database integration tests failed:', error);
    throw error;
  }

  logger.info('All database integration tests completed successfully!');
  return results;
}

testDatabaseIntegration().catch(error => {
  logger.error('Test execution failed:', error);
  process.exit(1);
}); 