import { slackService } from '../services/slack-service.js';
import { geminiService } from '../services/gemini-service.js';
import { dbQueries } from '../database/queries.js';
import dotenv from 'dotenv';

dotenv.config();

async function analyzeChannels() {
  try {
    // Initialize database
    await dbQueries.initialize();
    console.log('Database initialized');

    // Get all channels
    console.log('Fetching channels from Slack...');
    const channels = await slackService.listChannels();
    console.log(`Found ${channels.length} channels`);

    // Filter channels using Gemini
    console.log('Analyzing channels...');
    const categorizedChannels = await geminiService.filterChannels(channels);
    
    console.log(`
Channel Analysis Results:
- Priority Channels: ${categorizedChannels.priority_channels.length}
- Standard Channels: ${categorizedChannels.standard_channels.length}
- Excluded Channels: ${channels.length - (categorizedChannels.priority_channels.length + categorizedChannels.standard_channels.length)}
`);

    // Store channels in database
    console.log('Storing channel data...');
    
    // Start a transaction
    await dbQueries.beginTransaction();
    
    try {
      // Store priority channels
      for (const channel of categorizedChannels.priority_channels) {
        await dbQueries.upsertChannel({
          ...channel,
          type: 'priority'
        });
      }

      // Store standard channels
      for (const channel of categorizedChannels.standard_channels) {
        await dbQueries.upsertChannel({
          ...channel,
          type: 'standard'
        });
      }

      // Commit the transaction
      await dbQueries.commitTransaction();
      console.log('All channel data stored successfully');
    } catch (error) {
      // Rollback on error
      await dbQueries.rollbackTransaction();
      throw error;
    }

    // Print summary
    const summary = {
      priority: categorizedChannels.priority_channels.map(c => c.name),
      standard: categorizedChannels.standard_channels.map(c => c.name)
    };

    console.log('\nChannel Classification Summary:');
    console.log('\nPriority Channels:');
    summary.priority.forEach(name => console.log(`- ${name}`));
    
    console.log('\nStandard Channels:');
    summary.standard.forEach(name => console.log(`- ${name}`));

  } catch (error) {
    console.error('Error during channel analysis:', error);
    process.exit(1);
  } finally {
    // Clean up
    await Promise.all([
      slackService.disconnect(),
      geminiService.disconnect(),
      dbQueries.close()
    ]);
  }
}

// Run the analysis
analyzeChannels(); 