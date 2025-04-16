import { dbQueries } from '../database/queries.js';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import dotenv from 'dotenv';

// Get the directory name of the current module
const __dirname = dirname(fileURLToPath(import.meta.url));

// Load environment variables
dotenv.config({
  path: join(__dirname, '../../.env')
});

async function initializeDatabase() {
  try {
    console.log('Initializing database...');
    await dbQueries.initialize();
    console.log('Database initialized successfully!');
    
    // Close the database connection
    await dbQueries.close();
    console.log('Database connection closed.');
    
    process.exit(0);
  } catch (error) {
    console.error('Error initializing database:', error);
    process.exit(1);
  }
}

// Run the initialization
initializeDatabase(); 