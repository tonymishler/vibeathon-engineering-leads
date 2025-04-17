import dotenv from 'dotenv';
import { logger } from './utils/logger.js';
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { SlackRequest, McpResponse } from './types/slack.js';

// Load environment variables
dotenv.config();

interface ChannelContext {
  channel_name: string;
  channel_type: string;
  topic: string;
  purpose: string;
  message_window: {
    start_date: Date;
    end_date: Date;
    message_count: number;
    window_type: 'message_limit' | 'time_limit';
  };
  messages: {
    author: string;
    content: string;
    timestamp: Date;
    thread_id?: string;
    reactions: string[];
    has_attachments: boolean;
  }[];
  participants: {
    active_count: number;
    key_contributors: string[];
  };
  activity_metrics: {
    messages_per_day: number;
    active_threads: number;
    peak_activity_times: Date[];
  };
}

const REQUIRED_ENV_VARS = [
  'SLACK_BOT_TOKEN',
  'SLACK_TEAM_ID',
  'GEMINI_API_KEY',
  'DATABASE_PATH'
];

function validateEnvironment(): void {
  for (const envVar of REQUIRED_ENV_VARS) {
    if (!process.env[envVar]) {
      logger.error(`Missing required environment variable: ${envVar}`);
      process.exit(1);
    }
  }
}

async function initializeSlackClient(): Promise<Client<SlackRequest, McpResponse>> {
  const transport = new StdioClientTransport({
    command: "/opt/homebrew/bin/node",
    args: ["./node_modules/@modelcontextprotocol/server-slack/dist/index.js"],
    env: {
      SLACK_BOT_TOKEN: process.env.SLACK_BOT_TOKEN!,
      SLACK_TEAM_ID: process.env.SLACK_TEAM_ID!,
      NODE_ENV: "development",
      PATH: process.env.PATH!
    }
  });

  const client = new Client<SlackRequest, McpResponse>({
    name: "slack-channel-analyzer",
    version: "1.0.0"
  });

  await client.connect(transport);
  return client;
}

async function fetchAllChannels(client: Client<SlackRequest, McpResponse>): Promise<any[]> {
  let allChannels: any[] = [];
  let cursor: string | undefined;
  
  do {
    const response = await client.callTool({
      name: "slack_list_channels",
      arguments: { 
        limit: 1000,
        ...(cursor ? { cursor } : {})
      }
    });

    const content = response?.content;
    if (Array.isArray(content) && content.length > 0 && content[0]?.text) {
      const slackResponse = JSON.parse(content[0].text);
      if (slackResponse.ok && Array.isArray(slackResponse.channels)) {
        allChannels = allChannels.concat(slackResponse.channels);
        cursor = slackResponse.response_metadata?.next_cursor;
      }
    }
  } while (cursor);

  return allChannels;
}

async function buildChannelContext(channel: any, messages: any[]): Promise<ChannelContext> {
  const now = new Date();
  const threeMonthsAgo = new Date(now.getTime() - (90 * 24 * 60 * 60 * 1000));

  // Get unique participants and their message counts
  const participantCounts = new Map<string, number>();
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
  const activityByHour = new Map<number, number>();
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

async function analyzeChannelForOpportunities(context: ChannelContext) {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
  const model = genAI.getGenerativeModel({ model: "gemini-pro" });

  const prompt = `Analyze the following Slack channel context for potential engineering opportunities:
${JSON.stringify(context, null, 2)}

Identify opportunities that meet these criteria:
1. Must be based on evidence from the last 3 months
2. Should have clear impact on engineering efficiency or productivity
3. Must be supported by specific message examples
4. Should consider participant engagement and activity patterns

Return the opportunities in this structure:
{
  "opportunities": [{
    "type": "feature|integration|automation|optimization",
    "title": "Brief descriptive title",
    "description": "Detailed description of the opportunity",
    "evidence": [{
      "message_id": "ID if available",
      "author": "message author",
      "timestamp": "message timestamp",
      "content": "relevant message content",
      "relevance_note": "why this message supports the opportunity"
    }],
    "key_participants": ["relevant team members"],
    "implicit_insights": "patterns or insights not directly stated",
    "potential_solutions": ["possible approaches to address the opportunity"],
    "confidence_score": 0.0-1.0,
    "impact_assessment": {
      "scope": "team|department|organization",
      "effort_estimate": "small|medium|large",
      "potential_value": "low|medium|high"
    }
  }]
}`;

  const result = await model.generateContent(prompt);
  const response = await result.response;
  const text = response.text();
  
  try {
    return JSON.parse(text);
  } catch (error) {
    logger.error('Failed to parse Gemini response:', error);
    logger.debug('Raw response:', text);
    return null;
  }
}

async function processChannel(channel: any): Promise<void> {
  try {
    logger.info(`Processing channel: ${channel.name}`);

    // Get channel messages
    const messages = await dbQueries.getChannelMessages(channel.id, 1000);
    
    // Build channel context
    const context = await buildChannelContext(channel, messages);
    
    // Store context
    await dbQueries.upsertChannelContext({
      context_id: `ctx_${channel.id}`,
      channel_id: channel.id,
      start_date: context.message_window.start_date,
      end_date: context.message_window.end_date,
      message_count: context.message_window.message_count,
      window_type: context.message_window.window_type,
      context_data: JSON.stringify(context)
    });

    // Analyze for opportunities
    const analysis = await analyzeChannelForOpportunities(context);
    
    if (analysis?.opportunities) {
      for (const opportunity of analysis.opportunities) {
        // Store opportunity
        const opportunityId = `opp_${channel.id}_${Date.now()}`;
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
          context_id: `ctx_${channel.id}`
        });

        // Store evidence
        for (const evidence of opportunity.evidence) {
          await dbQueries.upsertOpportunityEvidence({
            evidence_id: `ev_${opportunityId}_${Date.now()}`,
            opportunity_id: opportunityId,
            message_id: evidence.message_id || `msg_${Date.now()}`,
            relevance_note: evidence.relevance_note
          });
        }
      }
    }

    logger.info(`Completed analysis for channel: ${channel.name}`);
  } catch (error) {
    logger.error(`Error processing channel ${channel.name}:`, error);
  }
}

async function main() {
  try {
    logger.info('Starting channel analysis process...');

    validateEnvironment();
    await dbQueries.initialize();
    const client = await initializeSlackClient();
    const channels = await fetchAllChannels(client);

    logger.info(`Found ${channels.length} channels to analyze`);

    // Process each channel
    for (const channel of channels) {
      await processChannel(channel);
    }

    logger.info('Channel analysis process completed successfully');
  } catch (error) {
    logger.error('Fatal error during execution:', error);
    process.exit(1);
  } finally {
    await dbQueries.close();
  }
}

// Run the main execution
main().catch(error => {
  logger.error('Unhandled error:', error);
  process.exit(1);
}); 