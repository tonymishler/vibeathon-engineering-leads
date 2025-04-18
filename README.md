# Vibeathon Engineering Leads Analysis Tool

An AI-powered Slack integration that analyzes channel conversations to identify opportunities, improvements, and insights.

## Features

- Slack Channel Analysis
  - Analyzes messages and threads in channels where the bot is a member
  - Processes message context, reactions, and participant engagement
  - Handles threaded conversations and maintains conversation context
- Opportunity Detection
  - Uses Google's Gemini AI to identify various types of opportunities:
    - Process improvements
    - Technical debt
    - Feature requests
    - Team collaboration opportunities
  - Provides confidence scores and impact assessments
  - Captures supporting evidence from messages
- Data Storage
  - SQLite database for storing channels, messages, and opportunities
  - Maintains relationships between opportunities and their evidence
  - Tracks opportunity status and updates

## Prerequisites

- Node.js (v18 or higher)
- NPM (v9 or higher)
- Slack workspace with bot user access
- Google Cloud account for Gemini API access

## Installation

1. Clone the repository:
   ```bash
   git clone [repository-url]
   cd vibeathon-engineering-leads
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create environment file:
   ```bash
   cp .env.example .env
   ```

4. Configure the following environment variables in `.env`:
   ```
   # Database Configuration
   DB_PATH=./data/analysis.sqlite

   # Slack Configuration
   SLACK_BOT_TOKEN=xoxb-your-bot-token
   SLACK_TEAM_ID=T01234567

   # Analysis Configuration
   BATCH_SIZE=100
   DEBUG=false                    # Set to true for debug logging
   DEBUG_MODE=false

   # Gemini Configuration
   GEMINI_API_KEY=your-gemini-api-key
   ```

## Usage

1. Run the Slack integration tests to verify setup:
   ```bash
   npm run test:integration
   ```
   This will verify your Slack bot has proper access and can read messages.

2. Start the channel analysis:
   ```bash
   npm run analyze:channels
   ```
   This will:
   - Connect to your Slack workspace
   - Find channels where the bot is a member
   - Analyze recent messages (up to 90 days)
   - Identify opportunities using Gemini AI
   - Store results in the SQLite database

3. View opportunities in the database:
   ```bash
   sqlite3 ./data/analysis.sqlite
   ```
   You can then query the opportunities table:
   ```sql
   SELECT * FROM opportunities ORDER BY detected_at DESC;
   ```

## Development

- `npm run dev` - Start in development mode with hot reloading
- `npm test` - Run all tests
- `npm run test:integration` - Run integration tests only
- `npm run lint` - Run ESLint
- `npm run build` - Build the TypeScript files

## Database Schema

The SQLite database includes the following main tables:
- `channels` - Channel information and metadata
- `messages` - Message content and metadata
- `channel_contexts` - Analyzed context for channel time windows
- `opportunities` - Detected opportunities and their assessments
- `opportunity_evidence` - Supporting evidence for opportunities

## Troubleshooting

1. **Slack Bot Access**: Ensure your bot is invited to the channels you want to analyze
2. **Database Issues**: Check the `DB_PATH` exists and is writable
3. **Rate Limiting**: The tool includes built-in rate limiting for Slack API calls
4. **Debug Mode**: Set `DEBUG=true` in `.env` for detailed logging

## License

ISC 