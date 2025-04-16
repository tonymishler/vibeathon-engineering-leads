import assert from 'assert';
import { logger } from '../../../utils/logger.js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import { GoogleGenerativeAI } from '@google/generative-ai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables from project root
dotenv.config({ path: resolve(__dirname, '../../../../.env') });

interface TestResults {
  configValidation: boolean;
  textGeneration: boolean;
  embedding: boolean;
}

async function testGeminiIntegration(): Promise<void> {
  logger.info('Starting Gemini integration tests...');
  const results: TestResults = {
    configValidation: false,
    textGeneration: false,
    embedding: false
  };

  try {
    // Test 1: Configuration Validation
    const requiredEnvVars = ['GEMINI_API_KEY'];
    const missingVars = requiredEnvVars.filter(v => !process.env[v]);
    
    if (missingVars.length > 0) {
      logger.warn('Skipping Gemini integration tests - missing environment variables:', missingVars);
      return;
    }
    
    results.configValidation = true;
    logger.info('✓ Configuration validation successful');

    // Initialize Gemini
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY as string);
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
    
    // Test text generation
    const prompt = "Write a haiku about coding";
    logger.info('\nGemini Text Generation Test:');
    logger.info('Prompt:', prompt);
    
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    logger.info('Response:', text);
    assert.ok(text.length > 0, 'Generated text should not be empty');
    results.textGeneration = true;
    logger.info('✓ Text generation test successful');

    // Test embedding model
    const embeddingModel = genAI.getGenerativeModel({ model: "embedding-001" });
    const textToEmbed = "This is a test of the embedding functionality";
    
    logger.info('\nGemini Embedding Test:');
    const embedding = await embeddingModel.embedContent(textToEmbed);
    const values = embedding.embedding.values;
    
    assert.ok(Array.isArray(values), 'Embedding should contain values array');
    assert.ok(values.length > 0, 'Embedding values should not be empty');
    results.embedding = true;
    logger.info('✓ Embedding test successful');

  } catch (error) {
    logger.error('Gemini integration test failed:', error);
    throw error;
  }

  // Summary
  logger.info('\nGemini Integration Test Summary:');
  Object.entries(results).forEach(([test, passed]) => {
    logger.info(`${passed ? '✓' : '✗'} ${test}`);
  });

  const allPassed = Object.values(results).every(r => r);
  if (allPassed) {
    logger.info('\n✓ All Gemini integration tests completed');
  } else {
    throw new Error('Some Gemini integration tests failed');
  }
}

export default testGeminiIntegration;

// Run the test
testGeminiIntegration().catch(error => {
  console.error('Test failed:', error);
  process.exit(1);
}); 