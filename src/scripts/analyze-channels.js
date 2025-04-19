import { v4 as uuidv4 } from 'uuid';
import pkg from 'sqlite3';
const { Database } = pkg;
import { DatabaseQueries } from '../database/queries.js';
import { slackService } from '../services/slack-service.js';
import { geminiService } from '../services/gemini-service.js';
import { logger } from '../utils/logger.js';
import path from 'path';
import { initializeDatabase } from '../database/init.js';
import { Message } from '../services/message.js';

const MESSAGE_LIMIT = 50;
const TIME_WINDOW_DAYS = 90;

async function buildChannelContext(channel, messages) {
  // Get the current date
  const now = new Date();
  
  // Set analysis window to last 90 days
  const endDate = now;
  const startDate = new Date(now);
  startDate.setDate(startDate.getDate() - 90);

  return {
    message_window: {
      start_date: startDate.toISOString(),
      end_date: endDate.toISOString(),
      message_count: messages.length,
      window_type: 'rolling_90_days'
    },
    channel_stats: {
      member_count: channel.memberCount || 0,
      total_messages: messages.length,
      active_threads: messages.filter(m => m.thread_ts).length,
      links_shared: messages.filter(m => m.links && m.links.length > 0).length,
      mentions: messages.reduce((acc, m) => acc + (m.mentions?.length || 0), 0)
    }
  };
}

async function processChannel(channel, slackService, geminiService, dbQueries) {
  try {
    console.log(`\nProcessing channel: ${channel.name} (${channel.id})`);
    
    // Begin transaction
    await dbQueries.beginTransaction();
    console.log('✓ Transaction started');

    // First, store the channel
    const now = new Date().toISOString();
    await dbQueries.upsertChannel({
      channel_id: channel.id,
      name: channel.name,
      type: channel.is_private ? 'private' : 'standard',
      team_id: process.env.SLACK_TEAM_ID || '',
      created_at: now,
      last_analyzed: now,
      member_count: channel.num_members || 0,
      message_count: 0,
      link_count: 0,
      mention_count: 0,
      metadata: '{}'
    });
    console.log('✓ Channel stored');

    // Get channel messages with threads
    const { messages, threads } = await slackService.getChannelMessagesWithThreads(channel.id, {
      limit: MESSAGE_LIMIT
    });

    if (messages.length > 0) {
      console.log(`✓ Found ${messages.length} messages and ${threads.size} threads`);
    }

    // Store messages in database
    console.log('Storing messages in database...');
    const messagesToStore = messages.map(msg => msg.toDatabase());
    
    await dbQueries.batchInsertMessages(messagesToStore);
    console.log(`✓ Stored ${messages.length} messages`);
    
    // Store thread messages
    for (const [threadId, replies] of threads.entries()) {
      const threadMessages = replies.map(msg => msg.toDatabase());
      await dbQueries.batchInsertMessages(threadMessages);
    }
    console.log(`✓ Stored ${threads.size} thread replies`);

    // Build and store channel context
    console.log('Building channel context...');
    const context = await buildChannelContext(channel, messages);
    const contextId = `ctx_${channel.id}_${Date.now()}`;
    console.log('✓ Channel context built');

    await dbQueries.upsertChannelContext({
      context_id: contextId,
      channel_id: channel.id,
      start_date: new Date(context.message_window.start_date),
      end_date: new Date(context.message_window.end_date),
      message_count: context.message_window.message_count,
      window_type: context.message_window.window_type,
      context_data: JSON.stringify(context),
      created_at: now
    });
    console.log('✓ Channel context stored');

    // Analyze for opportunities
    console.log('Analyzing for opportunities...');
    const analysis = await geminiService.analyzeChannelContent(messages, channel);
    if (analysis?.opportunities?.length > 0) {
      console.log(`✓ Found ${analysis.opportunities.length} opportunities`);
      
      for (const opportunity of analysis.opportunities) {
        const opportunityId = `opp_${uuidv4()}`;
        console.log(`\nStoring opportunity: ${opportunity.title}`);
        console.log(`Type: ${opportunity.type}`);
        console.log(`Confidence: ${opportunity.confidence_score}`);

        // Store opportunity with all required fields
        await dbQueries.createOpportunity({
          opportunity_id: opportunityId,
          type: opportunity.type,
          title: opportunity.title,
          description: opportunity.description,
          implicit_insights: opportunity.implicit_insights || '',
          key_participants: JSON.stringify(opportunity.key_participants || []),
          potential_solutions: JSON.stringify(opportunity.potential_solutions || []),
          confidence_score: opportunity.confidence_score,
          scope: opportunity.impact_assessment.scope,
          effort_estimate: opportunity.impact_assessment.effort_estimate,
          potential_value: opportunity.impact_assessment.potential_value,
          status: 'new',
          context_id: contextId,
          detected_at: now,
          last_updated: now
        });
        console.log('✓ Opportunity stored');

        // Store evidence with all required fields
        if (opportunity.evidence?.length > 0) {
          console.log(`Storing ${opportunity.evidence.length} pieces of evidence...`);
          for (const evidence of opportunity.evidence) {
            await dbQueries.addOpportunityEvidence({
              evidence_id: `ev_${uuidv4()}`,
              opportunity_id: opportunityId,
              message_id: evidence.message_id,
              author: evidence.author,
              timestamp: now,
              content: evidence.content,
              relevance_note: evidence.relevance_note || ''
            });
          }
          console.log('✓ Evidence stored');
        }
      }
    } else {
      console.log('No opportunities found');
    }

    // Commit transaction
    await dbQueries.commitTransaction();
    console.log('✓ Transaction committed successfully');

  } catch (error) {
    // Rollback on error
    if (dbQueries.isInTransaction()) {
      console.error('Error occurred, rolling back transaction...');
      await dbQueries.rollbackTransaction();
      console.error('Transaction rolled back');
    }
    // Only log errors that aren't "not_in_channel"
    if (error.message !== 'not_in_channel') {
      console.error(`Error processing channel ${channel.name}:`, error);
    }
    throw error;
  }
}

async function analyzeChannels() {
  let dbQueries = null;
  
  try {
    console.log('\n=== Starting Channel Analysis ===');
    
    // Initialize database with path
    console.log('\n1. Database Initialization');
    console.log('Initializing database at opportunities.db...');
    dbQueries = await initializeDatabase('opportunities.db');
    console.log('✓ Database initialized');
    
    // Initialize services
    console.log('\n2. Service Initialization');
    console.log('Initializing Slack service...');
    try {
      await slackService.initialize();
      console.log('✓ Slack service initialized');
    } catch (error) {
      console.error('Failed to initialize Slack service:', error);
      throw error;
    }

    // Fetch and store all workspace users first
    console.log('\n3. User Synchronization');
    console.log('Starting user fetch from Slack...');
    let allUsers;
    try {
      allUsers = await slackService.getAllUsers();
      console.log(`✓ Successfully fetched ${allUsers.length} users from Slack`);
    } catch (error) {
      console.error('Failed to fetch users from Slack:', error);
      throw error;
    }

    // Convert users to database format and store them
    console.log('Converting user data to database format...');
    const usersToStore = allUsers.map(user => ({
      user_id: user.id,
      display_name: user.profile?.display_name || null,
      real_name: user.profile?.real_name || null,
      title: user.profile?.title || null,
      email: user.profile?.email || null,
      avatar_url: user.profile?.image_72 || null,
      team_id: user.team_id || null,
      is_admin: user.is_admin || false,
      is_owner: user.is_owner || false,
      is_primary_owner: user.is_primary_owner || false,
      is_restricted: user.is_restricted || false,
      is_ultra_restricted: user.is_ultra_restricted || false,
      is_bot: user.is_bot || false,
      is_app_user: user.is_app_user || false,
      tz: user.tz || null,
      tz_label: user.tz_label || null,
      tz_offset: user.tz_offset || null,
      phone: user.profile?.phone || null,
      skype: user.profile?.skype || null,
      status_text: user.profile?.status_text || null,
      status_emoji: user.profile?.status_emoji || null,
      first_name: user.profile?.first_name || null,
      last_name: user.profile?.last_name || null,
      deleted: user.deleted || false,
      color: user.color || null,
      who_can_share_contact_card: user.who_can_share_contact_card || null
    }));

    console.log(`Storing ${usersToStore.length} user profiles in database...`);
    try {
      let storedCount = 0;
      const BATCH_SIZE = 50;
      for (let i = 0; i < usersToStore.length; i += BATCH_SIZE) {
        const batchEnd = Math.min(i + BATCH_SIZE, usersToStore.length);
        const batch = usersToStore.slice(i, batchEnd);
        await dbQueries.batchUpsertUsers(batch);
        storedCount += batch.length;
        console.log(`Progress: ${storedCount}/${usersToStore.length} users stored (${Math.round(storedCount/usersToStore.length * 100)}%)`);
      }
      console.log('✓ User profiles successfully stored in database');
    } catch (error) {
      console.error('Failed to store user profiles:', error);
      throw error;
    }
    
    // List all channels
    console.log('\n4. Channel Discovery');
    console.log('Fetching channels from Slack...');
    let channels;
    try {
      const result = await slackService.listChannels();
      channels = result.channels;
      console.log(`✓ Found ${channels.length} channels where bot is a member`);
    } catch (error) {
      console.error('Failed to fetch channels:', error);
      throw error;
    }
    
    // Process channels in batches
    console.log('\n5. Channel Processing');
    const concurrencyLimit = 3;
    let remainingChannels = [...channels];
    let batchNumber = 0;
    
    while (remainingChannels.length > 0) {
      batchNumber++;
      const batch = remainingChannels.splice(0, concurrencyLimit);
      console.log(`\nProcessing batch ${batchNumber} (${batch.length} channels, ${remainingChannels.length} remaining)`);
      
      // Process channels sequentially within the batch
      for (const channel of batch) {
        try {
          console.log(`\nStarting analysis of channel: ${channel.name} (${channel.id})`);
          await processChannel(channel, slackService, geminiService, dbQueries);
          console.log(`✓ Completed analysis of channel: ${channel.name}`);
        } catch (error) {
          if (error.message === 'not_in_channel') {
            console.log(`Skipping channel ${channel.name} - bot is not a member`);
          } else {
            console.error(`Error processing channel ${channel.name}:`, error);
          }
        }
      }
    }
    
    console.log('\n=== Channel Analysis Complete ===');
  } catch (error) {
    console.error('\n!!! Analysis Failed !!!');
    console.error('Error details:', {
      name: error.name,
      message: error.message,
      code: error.code,
      data: error.data,
      stack: error.stack
    });
  } finally {
    console.log('\n=== Cleanup ===');
    if (dbQueries) {
      console.log('Closing database connection...');
      await dbQueries.close();
      console.log('✓ Database connection closed');
    }
    console.log('Disconnecting Slack service...');
    await slackService.disconnect();
    console.log('✓ Slack service disconnected');
  }
}

// Run the analysis
analyzeChannels().catch(error => {
  console.error('Fatal error in analyzeChannels:', error);
  process.exit(1);
});