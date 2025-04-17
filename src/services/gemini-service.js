import { mcpClient } from './mcp-client.js';

class GeminiService {
  constructor() {
    this.isInitialized = false;
  }

  async initialize() {
    if (!this.isInitialized) {
      await mcpClient.connect('browser');
      this.isInitialized = true;
    }
  }

  async filterChannels(channels) {
    await this.initialize();

    const prompt = `
Analyze this list of Slack channels and categorize them based on the following criteria:

1. Priority Channels (return these first):
   - Channels starting with "client-" or "eb-"
   - Channels that appear to be about specific clients or engineering projects

2. Standard Channels (return these second):
   - General work-related channels
   - Team channels
   - Project channels not matching priority criteria

3. Exclude (do not return):
   - Channels containing "off-topic"
   - Social or non-work channels
   - General chat or random channels

For each channel, determine its category based on its name, topic, and purpose.
Return the results as a JSON object with two arrays: "priority_channels" and "standard_channels".
Each channel in these arrays should keep its original properties and add a "reason" field explaining why it was categorized this way.

Input channels:
${JSON.stringify(channels, null, 2)}
`;

    // TODO: Replace with actual Gemini API call once integrated
    // For now, we'll do the filtering programmatically
    const result = this.simulateGeminiFiltering(channels);
    return result;
  }

  // Temporary method to simulate Gemini's filtering logic
  simulateGeminiFiltering(channels) {
    const priority_channels = [];
    const standard_channels = [];

    for (const channel of channels) {
      // Skip off-topic channels
      if (channel.name.includes('off-topic') || 
          channel.name.includes('random') ||
          channel.name.includes('social')) {
        continue;
      }

      // Check for priority channels
      if (channel.name.startsWith('client-') || 
          channel.name.startsWith('eb-') ||
          channel.name.includes('project-') ||
          channel.purpose?.toLowerCase().includes('client')) {
        priority_channels.push({
          ...channel,
          reason: `Identified as priority due to ${
            channel.name.startsWith('client-') ? 'client prefix' :
            channel.name.startsWith('eb-') ? 'engineering prefix' :
            'project or client-related content'
          }`
        });
      } else {
        standard_channels.push({
          ...channel,
          reason: 'Standard work-related channel'
        });
      }
    }

    return {
      priority_channels,
      standard_channels
    };
  }

  async analyzeChannelContent(messages, channelInfo) {
    await this.initialize();

    const prompt = `
Analyze these Slack messages from the channel "${channelInfo.name}" to identify potential engineering opportunities.
Focus on:
1. Client requests or needs that could benefit from custom development
2. Recurring manual processes that could be automated
3. Integration opportunities between different systems
4. Performance or scaling challenges
5. User experience issues that could be improved
6. Technical debt or maintenance needs
7. Cross-team collaboration bottlenecks

For each opportunity identified, provide:
{
  "type": "feature|integration|automation|optimization",
  "title": "Brief descriptive title",
  "description": "Detailed description of the opportunity",
  "evidence": [{
    "message_id": "ID of the relevant message",
    "author": "message author",
    "content": "relevant message content",
    "relevance_note": "why this message supports the opportunity"
  }],
  "implicit_insights": "patterns or insights not directly stated",
  "confidence_score": 0.0-1.0,
  "impact_assessment": {
    "scope": "team|department|organization",
    "effort_estimate": "small|medium|large",
    "potential_value": "low|medium|high"
  }
}

Channel Context:
${JSON.stringify(channelInfo, null, 2)}

Messages to Analyze:
${JSON.stringify(messages.slice(0, 50), null, 2)}
`;

    try {
      // TODO: Replace with actual Gemini API call once integrated
      const response = await mcpClient.callTool('gemini_generate', {
        prompt,
        temperature: 0.7,
        max_tokens: 2048
      });

      if (!response?.content?.[0]?.text) {
        throw new Error('Invalid response from Gemini API');
      }

      const analysis = JSON.parse(response.content[0].text);
      
      // Validate and transform opportunities
      const opportunities = Array.isArray(analysis.opportunities) 
        ? analysis.opportunities.map(opp => ({
            ...opp,
            confidence_score: parseFloat(opp.confidence_score) || 0.5,
            evidence: Array.isArray(opp.evidence) ? opp.evidence : [],
            impact_assessment: {
              scope: opp.impact_assessment?.scope || 'team',
              effort_estimate: opp.impact_assessment?.effort_estimate || 'medium',
              potential_value: opp.impact_assessment?.potential_value || 'medium'
            }
          }))
        : [];

      return { opportunities };
    } catch (error) {
      logger.error('Failed to analyze channel content:', error);
      return { opportunities: [] };
    }
  }

  async disconnect() {
    if (this.isInitialized) {
      await mcpClient.disconnect();
      this.isInitialized = false;
    }
  }
}

export const geminiService = new GeminiService(); 