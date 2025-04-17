import { initializeDatabase } from '../database/init.js';
import { logger } from '../utils/logger.js';
import path from 'path';

async function main() {
  try {
    const dbPath = path.join(process.cwd(), 'data', 'analysis.sqlite');
    await initializeDatabase(dbPath);
    logger.info('Database initialized successfully');
  } catch (error) {
    logger.error('Failed to initialize database:', error);
    process.exit(1);
  }
}

main(); 