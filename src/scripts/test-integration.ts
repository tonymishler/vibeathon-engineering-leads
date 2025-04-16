import { logger } from '../utils/logger.js';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

async function runIntegrationTests(): Promise<void> {
  let slackTestsPassed = false;
  let dbTestsPassed = false;

  try {
    logger.info('Running integration tests...');
    
    // Run Slack integration tests
    logger.info('Running Slack integration tests...');
    try {
      const slackTestPath = join(__dirname, 'tests/integration/slack-integration.test.js');
      const slackTest = await import(slackTestPath);
      await slackTest.default();
      slackTestsPassed = true;
    } catch (error) {
      logger.warn('Slack integration tests failed:', error);
    }
    
    // Run database integration tests
    logger.info('\nRunning database integration tests...');
    try {
      const dbTestPath = join(__dirname, 'tests/integration/database.test.js');
      const dbTest = await import(dbTestPath);
      await dbTest.default();
      dbTestsPassed = true;
    } catch (error) {
      logger.error('Database integration tests failed:', error);
    }
    
    // Summary
    logger.info('\nIntegration Tests Summary:');
    logger.info(`${slackTestsPassed ? '✓' : '✗'} Slack Integration Tests`);
    logger.info(`${dbTestsPassed ? '✓' : '✗'} Database Integration Tests`);
    
    if (dbTestsPassed) {
      logger.success('\nAll required integration tests passed successfully!');
      process.exit(0);
    } else {
      throw new Error('Required integration tests failed');
    }
  } catch (error) {
    logger.error('Integration tests failed:', error);
    process.exit(1);
  }
}

// Run the tests
runIntegrationTests(); 