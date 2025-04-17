import assert from 'assert';
import { RateLimiter } from '../../../utils/rate-limiter.js';
import { logger } from '../../../utils/logger.js';

interface TestResults {
  respectsMaxRequests: boolean;
  respectsTimeWindow: boolean;
  handlesMultipleRequests: boolean;
  wrapsFunction: boolean;
}

async function testRateLimiter(): Promise<void> {
  logger.info('Starting rate limiter tests...');
  const results: TestResults = {
    respectsMaxRequests: false,
    respectsTimeWindow: false,
    handlesMultipleRequests: false,
    wrapsFunction: false
  };

  try {
    // Test 1: Respects Max Requests
    const limiter = new RateLimiter(3, 1000);
    const startTime = Date.now();
    
    // Make 4 requests (1 over limit)
    await limiter.waitForSlot();
    await limiter.waitForSlot();
    await limiter.waitForSlot();
    await limiter.waitForSlot();
    
    const duration = Date.now() - startTime;
    assert(duration >= 1000, 'Should have waited for time window');
    results.respectsMaxRequests = true;
    logger.info('✓ Max requests limit respected');

    // Test 2: Respects Time Window
    const limiter2 = new RateLimiter(1, 500);
    const times: number[] = [];
    
    for (let i = 0; i < 3; i++) {
      const requestStart = Date.now();
      await limiter2.waitForSlot();
      times.push(Date.now() - requestStart);
    }
    
    assert(times[1] >= 500 && times[2] >= 500, 'Should wait between requests');
    results.respectsTimeWindow = true;
    logger.info('✓ Time window respected');

    // Test 3: Handles Multiple Concurrent Requests
    const limiter3 = new RateLimiter(2, 1000);
    const requests: Promise<void>[] = [];
    const start = Date.now();
    
    // Launch 5 concurrent requests
    for (let i = 0; i < 5; i++) {
      requests.push(limiter3.waitForSlot());
    }
    
    await Promise.all(requests);
    assert(Date.now() - start >= 2000, 'Should have rate limited concurrent requests');
    results.handlesMultipleRequests = true;
    logger.info('✓ Multiple concurrent requests handled');

    // Test 4: Function Wrapping
    const limiter4 = new RateLimiter(1, 500);
    let callCount = 0;
    const testFn = (): string => { callCount++; return 'success'; };
    
    const results1 = await limiter4.wrap(testFn);
    const results2 = await limiter4.wrap(testFn);
    
    assert.strictEqual(results1, 'success');
    assert.strictEqual(results2, 'success');
    assert.strictEqual(callCount, 2);
    results.wrapsFunction = true;
    logger.info('✓ Function wrapping successful');

  } catch (error) {
    logger.error('Rate limiter test failed:', error);
    throw error;
  }

  // Summary
  logger.info('\nRate Limiter Test Summary:');
  Object.entries(results).forEach(([test, passed]) => {
    logger.info(`${passed ? '✓' : '✗'} ${test}`);
  });

  const allPassed = Object.values(results).every(r => r);
  if (allPassed) {
    logger.info('\n✓ All rate limiter tests passed successfully');
  } else {
    throw new Error('Some rate limiter tests failed');
  }
}

// Run the tests
export default testRateLimiter; 