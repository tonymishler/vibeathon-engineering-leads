import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

export const dbConfig = {
  path: process.env.DB_PATH || path.join(process.cwd(), 'data', 'analysis.sqlite'),
  
  // SQLite configuration
  pragmas: {
    foreign_keys: 'ON',
    journal_mode: 'WAL',  // Write-Ahead Logging for better concurrency
    synchronous: 'NORMAL' // Good balance between safety and performance
  },
  
  // Query limits
  limits: {
    maxBatchSize: parseInt(process.env.BATCH_SIZE, 10) || 100,
    maxChannelMessages: parseInt(process.env.SLACK_MESSAGE_LIMIT, 10) || 1000,
    maxDocuments: parseInt(process.env.GDOCS_LIMIT, 10) || 1000
  },
  
  // Indexes
  indexes: {
    channels: ['channel_type', 'channel_name'],
    messages: ['channel_id', 'timestamp', 'thread_id'],
    documents: ['last_modified', 'doc_type'],
    opportunities: ['source_type', 'status', 'confidence_score']
  }
}; 