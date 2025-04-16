import { dbQueries } from '../database/queries';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import dotenv from 'dotenv';
import { logger } from '../utils/logger';

// Get the directory name of the current module
const __dirname = dirname(fileURLToPath(import.meta.url));

// Load environment variables
dotenv.config({
  path: join(__dirname, '../../.env')
});

async function initializeDatabase(): Promise<void> {
  try {
    logger.info('Initializing database...');
    await dbQueries.initialize();
    logger.info('Database initialized successfully!');
    
    // Close the database connection
    await dbQueries.close();
    logger.info('Database connection closed.');
    
    process.exit(0);
  } catch (error) {
    logger.error('Error initializing database:', error);
    process.exit(1);
  }
}

// Run the initialization
initializeDatabase(); 