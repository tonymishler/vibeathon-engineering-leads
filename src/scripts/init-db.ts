import { initializeDatabase } from '../database/init.js';
import { logger } from '../utils/logger.js';

async function main() {
  try {
    const db = await initializeDatabase();
    logger.info('Database initialized successfully');
    await db.close();
  } catch (error) {
    logger.error('Failed to initialize database:', error);
    process.exit(1);
  }
}

main(); 