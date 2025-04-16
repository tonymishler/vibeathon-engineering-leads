import assert from 'assert';
import { logger } from '../../../utils/logger.js';

// Mock channel data for testing
const mockChannels = [
  {
    id: 'C001',
    name: 'general',
    topic: 'Company-wide discussions',
    purpose: 'General chat',
    member_count: 100
  },
  {
    id: 'C002',
    name: 'client-acme',
    topic: 'Acme Corp discussions',
    purpose: 'Client communications',
    member_count: 50
  },
  {
    id: 'C003',
    name: 'off-topic-memes',
    topic: 'Fun stuff',
    purpose: 'Entertainment',
    member_count: 75
  },
  {
    id: 'C004',
    name: 'eb-project-alpha',
    topic: 'Project Alpha planning',
    purpose: 'Engineering discussions',
    member_count: 25
  }
];

function testChannelFiltering() {
  logger.info('Starting channel filtering unit tests...');
  const results = {
    priorityChannelDetection: false,
    offTopicExclusion: false,
    standardChannelClassification: false,
    emptyInputHandling: false
  };

  try {
    // Test 1: Priority Channel Detection
    const priorityChannels = mockChannels.filter(channel => 
      channel.name.startsWith('client-') || channel.name.startsWith('eb-')
    );
    assert.strictEqual(priorityChannels.length, 2);
    assert(priorityChannels.some(c => c.name === 'client-acme'));
    assert(priorityChannels.some(c => c.name === 'eb-project-alpha'));
    results.priorityChannelDetection = true;
    logger.info('✓ Priority channel detection successful');

    // Test 2: Off-Topic Exclusion
    const nonOffTopicChannels = mockChannels.filter(channel => 
      !channel.name.includes('off-topic')
    );
    assert.strictEqual(nonOffTopicChannels.length, 3);
    assert(!nonOffTopicChannels.some(c => c.name.includes('off-topic')));
    results.offTopicExclusion = true;
    logger.info('✓ Off-topic channel exclusion successful');

    // Test 3: Standard Channel Classification
    const standardChannels = mockChannels.filter(channel => 
      !channel.name.includes('off-topic') && 
      !channel.name.startsWith('client-') && 
      !channel.name.startsWith('eb-')
    );
    assert.strictEqual(standardChannels.length, 1);
    assert.strictEqual(standardChannels[0].name, 'general');
    results.standardChannelClassification = true;
    logger.info('✓ Standard channel classification successful');

    // Test 4: Empty Input Handling
    const emptyResult = [].filter(channel => 
      !channel.name.includes('off-topic')
    );
    assert.strictEqual(emptyResult.length, 0);
    results.emptyInputHandling = true;
    logger.info('✓ Empty input handling successful');

  } catch (error) {
    logger.error('Channel filtering unit test failed:', error);
    throw error;
  }

  // Summary
  logger.info('\nChannel Filtering Unit Test Summary:');
  Object.entries(results).forEach(([test, passed]) => {
    logger.info(`${passed ? '✓' : '✗'} ${test}`);
  });

  const allPassed = Object.values(results).every(r => r);
  if (allPassed) {
    logger.info('\n✓ All channel filtering unit tests passed successfully');
  } else {
    throw new Error('Some channel filtering unit tests failed');
  }
}

// Run the unit tests
testChannelFiltering(); 