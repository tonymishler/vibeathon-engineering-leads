import { logger } from '../utils/logger.js';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const __dirname = dirname(fileURLToPath(import.meta.url));

interface TestResults {
  unit: {
    rateLimiter: boolean;
    channelFilter: boolean;
    configValidator: boolean;
  };
  integration: {
    slack: boolean;
    database: boolean;
  };
}

async function runAllTests(): Promise<void> {
  const results: TestResults = {
    unit: {
      rateLimiter: false,
      channelFilter: false,
      configValidator: false
    },
    integration: {
      slack: false,
      database: false
    }
  };

  try {
    logger.info('Running all tests...\n');
    
    // Run unit tests
    logger.info('Running unit tests...');
    
    try {
      const rateLimiterTest = await import('./tests/unit/rate-limiter.test.js');
      await rateLimiterTest.default();
      results.unit.rateLimiter = true;
    } catch (error) {
      logger.error('Rate limiter tests failed:', error);
    }

    try {
      const channelFilterTest = await import('./tests/unit/channel-filter.test.js');
      await channelFilterTest.default();
      results.unit.channelFilter = true;
    } catch (error) {
      logger.error('Channel filter tests failed:', error);
    }

    try {
      const configValidatorTest = await import('./tests/unit/config-validator.test.js');
      await configValidatorTest.default();
      results.unit.configValidator = true;
    } catch (error) {
      logger.error('Config validator tests failed:', error);
    }
    
    // Run integration tests
    logger.info('\nRunning integration tests...');
    
    try {
      const slackTest = await import('./tests/integration/slack-integration.test.js');
      await slackTest.default();
      results.integration.slack = true;
    } catch (error) {
      logger.error('Slack integration tests failed:', error);
    }
    
    try {
      const dbTest = await import('./tests/integration/database.test.js');
      await dbTest.default();
      results.integration.database = true;
    } catch (error) {
      logger.error('Database integration tests failed:', error);
    }
    
    // Final Summary
    logger.info('\nFinal Test Summary:');
    logger.info('\nUnit Tests:');
    Object.entries(results.unit).forEach(([test, passed]) => {
      logger.info(`${passed ? '✓' : '✗'} ${test}`);
    });
    
    logger.info('\nIntegration Tests:');
    Object.entries(results.integration).forEach(([test, passed]) => {
      logger.info(`${passed ? '✓' : '✗'} ${test}`);
    });

    const allPassed = Object.values(results.unit).every(r => r) && 
                     Object.values(results.integration).every(r => r);
    
    if (allPassed) {
      logger.info('\n✓ All tests passed successfully!');
      process.exit(0);
    } else {
      throw new Error('Some tests failed');
    }
  } catch (error) {
    logger.error('\nTest suite failed:', error);
    process.exit(1);
  }
}

// Run all tests
runAllTests(); 