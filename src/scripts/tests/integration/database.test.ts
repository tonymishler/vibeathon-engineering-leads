import { initializeDatabase } from '../../../database/init.js';
import { Channel } from '../../../models/channel.js';
import { Message } from '../../../models/message.js';
import { logger } from '../../../utils/logger.js';
import { DatabaseChannel, DatabaseMessage } from '../../../types/database.js';
import { DatabaseQueries } from '../../../database/queries.js';

async function testDatabaseIntegration(): Promise<void> {
  const dbPath = ':memory:';
  let dbQueries: DatabaseQueries;

  try {
    // Initialize database
    dbQueries = await initializeDatabase(dbPath);
    logger.info('Database initialized successfully');

    // Test channel operations
    const now = Date.now();
    const testChannel = new Channel({
      id: 'C123',
      name: 'test-channel',
      type: 'standard',
      createdAt: now,
      memberCount: 10,
      messageCount: 0,
      linkCount: 0,
      mentionCount: 0,
      metadata: '{}'
    });

    await dbQueries.upsertChannel(testChannel.toDatabase());
    const foundChannels = await dbQueries.getChannelsByType('standard');
    
    if (foundChannels.length !== 1) {
      throw new Error(`Expected 1 channel, found ${foundChannels.length}`);
    }

    const foundChannel = foundChannels[0] as DatabaseChannel;
    if (foundChannel.channel_id !== 'C123' || foundChannel.name !== 'test-channel') {
      throw new Error('Channel data mismatch');
    }

    logger.info('Channel operations tested successfully');

    // Test message operations
    const testMessages = [
      new Message({
        id: 'M123',
        channelId: 'C123',
        userId: 'U123',
        content: 'Test message 1',
        timestamp: now,
        linkCount: 0,
        mentionCount: 0,
        reactionCount: 0
      }),
      new Message({
        id: 'M124',
        channelId: 'C123',
        userId: 'U123',
        content: 'Test message 2',
        timestamp: now,
        linkCount: 0,
        mentionCount: 0,
        reactionCount: 0
      })
    ];

    await dbQueries.batchInsertMessages(testMessages.map(msg => msg.toDatabase()));
    const foundMessages = await dbQueries.getChannelMessages('C123');

    if (foundMessages.length !== 2) {
      throw new Error(`Expected 2 messages, found ${foundMessages.length}`);
    }

    logger.info('Message operations tested successfully');

    // Test additional message insert
    const newMessage = new Message({
      id: 'M125',
      channelId: 'C123',
      userId: 'U123',
      content: 'Test message in transaction',
      timestamp: now,
      linkCount: 0,
      mentionCount: 0,
      reactionCount: 0
    });

    await dbQueries.batchInsertMessages([newMessage.toDatabase()]);
    logger.info('Additional message insert successful');

    // Verify final message count
    const finalMessages = await dbQueries.getChannelMessages('C123');
    if (finalMessages.length !== 3) {
      throw new Error(`Expected 3 messages after all operations, found ${finalMessages.length}`);
    }

    logger.info('All database integration tests passed successfully');
  } catch (error) {
    logger.error('Database integration tests failed:', error);
    throw error;
  }
}

// Export the test function as default
export default testDatabaseIntegration; 