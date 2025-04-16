import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

interface DatabasePragmas {
  foreign_keys: 'ON' | 'OFF';
  journal_mode: 'WAL' | 'DELETE' | 'TRUNCATE' | 'PERSIST' | 'MEMORY' | 'OFF';
  synchronous: 'OFF' | 'NORMAL' | 'FULL' | 'EXTRA';
}

interface QueryLimits {
  maxBatchSize: number;
  maxChannelMessages: number;
  maxDocuments: number;
}

interface TableIndexes {
  channels: string[];
  messages: string[];
  documents: string[];
  opportunities: string[];
}

interface DatabaseConfig {
  path: string;
  pragmas: DatabasePragmas;
  limits: QueryLimits;
  indexes: TableIndexes;
}

export const dbConfig: DatabaseConfig = {
  path: process.env.DB_PATH || path.join(process.cwd(), 'data', 'analysis.sqlite'),
  
  // SQLite configuration
  pragmas: {
    foreign_keys: 'ON',
    journal_mode: 'WAL',  // Write-Ahead Logging for better concurrency
    synchronous: 'NORMAL' // Good balance between safety and performance
  },
  
  // Query limits
  limits: {
    maxBatchSize: parseInt(process.env.BATCH_SIZE || '100', 10),
    maxChannelMessages: parseInt(process.env.SLACK_MESSAGE_LIMIT || '1000', 10),
    maxDocuments: parseInt(process.env.GDOCS_LIMIT || '1000', 10)
  },
  
  // Indexes
  indexes: {
    channels: ['channel_type', 'channel_name'],
    messages: ['channel_id', 'timestamp', 'thread_id'],
    documents: ['last_modified', 'doc_type'],
    opportunities: ['source_type', 'status', 'confidence_score']
  }
}; 