import { v4 as uuidv4 } from 'uuid';
import pkg from 'sqlite3';
const { Database } = pkg;
import { DatabaseQueries } from '../database/queries.js';
import { slackService } from '../services/slack-service.js';
import { geminiService } from '../services/gemini-service.js';
import { logger } from '../utils/logger.js';
import path from 'path';
import { initializeDatabase } from '../database/init.js';

const MESSAGE_LIMIT = 1000;
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
      return date;
    });

  return {
    channel_name: channel.name,
    channel_type: channel.is_private ? 'private' : 'standard',
    topic: channel.topic?.value || '',
    purpose: channel.purpose?.value || '',
    message_window: {
      start_date: threeMonthsAgo,
      end_date: now,
      message_count: messages.length,
      window_type: 'time_limit'
    },
    messages: messages.map(msg => ({
      author: msg.author,
      content: msg.content,
      timestamp: new Date(msg.timestamp),
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
    logger.info(`Processing channel: ${channel.name}`);

    // Begin transaction
    await dbQueries.beginTransaction();

    // Get channel messages with threads
    const { messages, threads } = await slackService.getChannelMessagesWithThreads(channel.id, {
      limit: MESSAGE_LIMIT,
      oldest: new Date(Date.now() - TIME_WINDOW_DAYS * 24 * 60 * 60 * 1000).getTime() / 1000
    });

    // Store messages in database
    await dbQueries.batchInsertMessages(messages.map(msg => msg.toDatabase()));
    for (const [threadId, replies] of threads.entries()) {
      await dbQueries.batchInsertMessages(replies.map(msg => msg.toDatabase()));
    }

    // Build channel context
    const context = await buildChannelContext(channel, messages);
    const contextId = `ctx_${channel.id}_${Date.now()}`;

    // Store context
    await dbQueries.upsertChannelContext({
      context_id: contextId,
      channel_id: channel.id,
      start_date: context.message_window.start_date,
      end_date: context.message_window.end_date,
      message_count: context.message_window.message_count,
      window_type: context.message_window.window_type,
      context_data: JSON.stringify(context)
    });

    // Analyze for opportunities
    const analysis = await geminiService.analyzeChannelContent(messages, channel);

    if (analysis?.opportunities) {
      for (const opportunity of analysis.opportunities) {
        const opportunityId = `opp_${uuidv4()}`;

        // Store opportunity
        await dbQueries.upsertOpportunity({
          opportunity_id: opportunityId,
          type: opportunity.type,
          title: opportunity.title,
          description: opportunity.description,
          implicit_insights: opportunity.implicit_insights,
          confidence_score: opportunity.confidence_score,
          scope: opportunity.impact_assessment.scope,
          effort_estimate: opportunity.impact_assessment.effort_estimate,
          potential_value: opportunity.impact_assessment.potential_value,
          status: 'new',
          context_id: contextId
        });

        // Store evidence
        for (const evidence of opportunity.evidence) {
          await dbQueries.upsertOpportunityEvidence({
            evidence_id: `ev_${uuidv4()}`,
            opportunity_id: opportunityId,
            message_id: evidence.message_id,
            relevance_note: evidence.relevance_note
          });
        }
      }
    }

    // Commit transaction
    await dbQueries.commitTransaction();
    logger.info(`Successfully processed channel: ${channel.name}`);

  } catch (error) {
    // Rollback on error
    if (dbQueries.isInTransaction()) {
      await dbQueries.rollbackTransaction();
    }
    logger.error(`Error processing channel ${channel.name}:`, error);
    throw error;
  }
}

async function analyzeChannels() {
  try {
    // Initialize database
    const dbPath = path.join(process.cwd(), 'data', 'analysis.sqlite');
    await initializeDatabase(dbPath);
    
    // Create database instance and queries
    const db = new Database(dbPath);
    const dbQueries = new DatabaseQueries(db);

    await slackService.initialize();
    await geminiService.initialize();

    // Get all channels
    const channels = await slackService.listChannels();
    logger.info(`Found ${channels.length} channels to process`);

    // Process each channel
    for (const channel of channels) {
      try {
        await processChannel(channel, slackService, geminiService, dbQueries);
      } catch (error) {
        logger.error(`Failed to process channel ${channel.name}:`, error);
        // Continue with next channel
      }
    }

    logger.info('Channel analysis completed successfully');

  } catch (error) {
    logger.error('Failed to complete channel analysis:', error);
    process.exit(1);
  } finally {
    try {
      // Clean up all services
      await Promise.all([
        slackService.disconnect(),
        geminiService.disconnect(),
        dbQueries.close()
      ]);
    } catch (cleanupError) {
      logger.error('Error during cleanup:', cleanupError);
    }
  }
}

analyzeChannels(); 