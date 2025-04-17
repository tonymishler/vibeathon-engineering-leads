import assert from 'assert';
import { validateConfig, validators, configSchemas } from '../../../config/validator.js';
import { ConfigurationError } from '../../../utils/errors.js';
import { logger } from '../../../utils/logger.js';

interface TestResults {
  detectsMissingKeys: boolean;
  detectsInvalidValues: boolean;
  validatesSlackToken: boolean;
  validatesPositiveIntegers: boolean;
  validatesBoolean: boolean;
}

function testConfigValidator(): void {
  logger.info('Starting configuration validator tests...');
  const results: TestResults = {
    detectsMissingKeys: false,
    detectsInvalidValues: false,
    validatesSlackToken: false,
    validatesPositiveIntegers: false,
    validatesBoolean: false
  };

  try {
    // Test 1: Missing Keys Detection
    try {
      validateConfig([{ key: 'NON_EXISTENT_KEY' }]);
      throw new Error('Should have thrown ConfigurationError');
    } catch (error) {
      assert(error instanceof ConfigurationError);
      assert(error.details.missingKeys.includes('NON_EXISTENT_KEY'));
      results.detectsMissingKeys = true;
      logger.info('✓ Missing keys detection successful');
    }

    // Test 2: Invalid Values Detection
    process.env.TEST_NUMBER = 'not-a-number';
    try {
      validateConfig([
        { key: 'TEST_NUMBER', validator: validators.isPositiveInteger }
      ]);
      throw new Error('Should have thrown ConfigurationError');
    } catch (error) {
      assert(error instanceof ConfigurationError);
      assert(error.details.invalidValues.includes('TEST_NUMBER'));
      results.detectsInvalidValues = true;
      logger.info('✓ Invalid values detection successful');
    }

    // Test 3: Slack Token Validation
    assert(!validators.isSlackToken('invalid-token'));
    assert(validators.isSlackToken('xoxb-valid-format'));
    results.validatesSlackToken = true;
    logger.info('✓ Slack token validation successful');

    // Test 4: Positive Integer Validation
    assert(!validators.isPositiveInteger('0'));
    assert(!validators.isPositiveInteger('-1'));
    assert(!validators.isPositiveInteger('not-a-number'));
    assert(validators.isPositiveInteger('1'));
    assert(validators.isPositiveInteger('100'));
    results.validatesPositiveIntegers = true;
    logger.info('✓ Positive integer validation successful');

    // Test 5: Boolean Validation
    assert(!validators.isBoolean('yes'));
    assert(!validators.isBoolean('1'));
    assert(validators.isBoolean('true'));
    assert(validators.isBoolean('false'));
    results.validatesBoolean = true;
    logger.info('✓ Boolean validation successful');

  } catch (error) {
    logger.error('Configuration validator test failed:', error);
    throw error;
  } finally {
    // Cleanup
    delete process.env.TEST_NUMBER;
  }

  // Summary
  logger.info('\nConfiguration Validator Test Summary:');
  Object.entries(results).forEach(([test, passed]) => {
    logger.info(`${passed ? '✓' : '✗'} ${test}`);
  });

  const allPassed = Object.values(results).every(r => r);
  if (allPassed) {
    logger.info('\n✓ All configuration validator tests passed successfully');
  } else {
    throw new Error('Some configuration validator tests failed');
  }
}

// Run the tests
testConfigValidator(); 