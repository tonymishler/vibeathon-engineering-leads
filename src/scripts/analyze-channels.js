import { v4 as uuidv4 } from 'uuid';
import pkg from 'sqlite3';
const { Database } = pkg;
import { DatabaseQueries } from '../database/queries.js';
import { slackService } from '../services/slack-service.js';
import { geminiService } from '../services/gemini-service.js';
import { logger } from '../utils/logger.js';
import path from 'path';
import { initializeDatabase } from '../database/init.js';
import { SlackService } from '../services/slack-service.js';
import { Message } from '../services/message.js';

const MESSAGE_LIMIT = 50;
const TIME_WINDOW_DAYS = 90;

async function buildChannelContext(channel, messages) {
  const now = new Date();
  const threeMonthsAgo = new Date(now.getTime() - (TIME_WINDOW_DAYS * 24 * 60 * 60 * 1000));

  // Get unique participants and their message counts
  const participantCounts = new Map();
  messages.forEach(msg => {
    participantCounts.set(msg.author, (participantCounts.get(msg.author) || 0) + 1);
  });

  // Sort participants by message count to find key contributors
  const keyContributors = Array.from(participantCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([author]) => author);

  // Calculate messages per day
  const daysDiff = (now.getTime() - threeMonthsAgo.getTime()) / (24 * 60 * 60 * 1000);
  const messagesPerDay = messages.length / daysDiff;

  // Count active threads
  const activeThreads = new Set(messages.filter(m => m.thread_id).map(m => m.thread_id)).size;

  // Find peak activity times
  const activityByHour = new Map();
  messages.forEach(msg => {
    const hour = new Date(msg.timestamp).getHours();
    activityByHour.set(hour, (activityByHour.get(hour) || 0) + 1);
  });

  const peakHours = Array.from(activityByHour.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([hour]) => {
      const date = new Date();
      date.setHours(hour, 0, 0, 0);
      return date.toISOString();
    });

  return {
    channel_name: channel.name,
    channel_type: channel.is_private ? 'private' : 'standard',
    topic: channel.topic?.value || '',
    purpose: channel.purpose?.value || '',
    message_window: {
      start_date: threeMonthsAgo.toISOString(),
      end_date: now.toISOString(),
      message_count: messages.length,
      window_type: 'time_limit'
    },
    messages: messages.map(msg => ({
      author: msg.author,
      content: msg.content,
      timestamp: new Date(msg.timestamp).toISOString(),
      thread_id: msg.thread_id,
      reactions: msg.reactions || [],
      has_attachments: msg.has_attachments
    })),
    participants: {
      active_count: participantCounts.size,
      key_contributors: keyContributors
    },
    activity_metrics: {
      messages_per_day: messagesPerDay,
      active_threads: activeThreads,
      peak_activity_times: peakHours
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
    console.log('First message:', JSON.stringify(messages[0], null, 2));
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
  let slackService = null;
  
  try {
    // Initialize database with path
    dbQueries = await initializeDatabase('opportunities.db');
    
    // Initialize services
    slackService = new SlackService();
    await slackService.initialize();
    
    // List all channels (now only returns channels where bot is a member)
    const { channels } = await slackService.listChannels();
    console.log(`Found ${channels.length} channels where bot is a member`);
    
    // Process channels in batches with controlled concurrency
    const concurrencyLimit = 3;
    let remainingChannels = [...channels];
    
    while (remainingChannels.length > 0) {
      const batch = remainingChannels.splice(0, concurrencyLimit);
      console.log(`Processing batch of ${batch.length} channels (${remainingChannels.length} remaining)`);
      
      // Process channels sequentially within the batch
      for (const channel of batch) {
        try {
          await processChannel(channel, slackService, geminiService, dbQueries);
        } catch (error) {
          // Only log errors that aren't "not_in_channel"
          if (error.message !== 'not_in_channel') {
            console.error(`Error processing channel ${channel.name}:`, error.message);
          }
        }
      }
    }
    
    console.log('Channel analysis completed');
  } catch (error) {
    console.error('Error in channel analysis:', error);
  } finally {
    // Cleanup
    if (dbQueries) {
      await dbQueries.close();
    }
    if (slackService) {
      await slackService.disconnect();
    }
  }
}

// Run the analysis
analyzeChannels();