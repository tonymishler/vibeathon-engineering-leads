# Data Collection and Analysis Script Plan

## Technology Stack
- Node.js
- MCP SDK (@modelcontextprotocol/sdk)
- SQLite3
- Slack MCP Integration
- Gemini Pro API

## Environment Setup
```json
{
  "dependencies": {
    "@modelcontextprotocol/sdk": "latest",
    "@browsermcp/mcp": "latest",
    "sqlite3": "latest",
    "dotenv": "latest",
    "@google/generative-ai": "latest"
  }
}
```

## Objective
Create a script to collect and analyze data from Slack channels to identify potential opportunities for custom development projects, focusing on recent (3-month) conversations and patterns that might not be obvious to participants.

## Data Collection Components

### 1. Slack Data Collection
- Use Slack MCP server to:
  - Collect all accessible channels in the workspace
  - For each relevant channel:
    - Pull messages from last 3 months (or last 1000 messages, whichever is smaller)
    - Include metadata like channel info and participant stats
    - Store complete channel contexts for analysis
  - Include context data:
    - Channel metadata (name, type, topic, purpose)
    - Message window information
    - Participant statistics
    - Activity metrics

## Channel Context Structure
```json
{
  "channel_context": {
    "channel_name": "string",
    "channel_type": "priority|standard",
    "topic": "string",
    "purpose": "string",
    "message_window": {
      "start_date": "timestamp",
      "end_date": "timestamp",
      "message_count": "number",
      "window_type": "message_limit|time_limit"
    },
    "messages": [
      {
        "author": "string",
        "content": "string",
        "timestamp": "datetime",
        "thread_id": "string?",
        "reactions": ["string"],
        "has_attachments": "boolean"
      }
    ],
    "participants": {
      "active_count": "number",
      "key_contributors": ["string"]
    },
    "activity_metrics": {
      "messages_per_day": "number",
      "active_threads": "number",
      "peak_activity_times": ["datetime"]
    }
  }
}
```

## Opportunity Structure
```json
{
  "opportunity": {
    "id": "uuid",
    "type": "feature|integration|automation|optimization",
    "title": "string",
    "description": "string",
    "evidence": [
      {
        "message_id": "string",
        "author": "string",
        "timestamp": "datetime",
        "content": "string",
        "relevance_note": "string"
      }
    ],
    "key_participants": ["string"],
    "implicit_insights": "string",
    "potential_solutions": ["string"],
    "confidence_score": "float",
    "impact_assessment": {
      "scope": "team|department|organization",
      "effort_estimate": "small|medium|large",
      "potential_value": "low|medium|high"
    },
    "metadata": {
      "channel_id": "string",
      "detected_at": "datetime",
      "last_updated": "datetime"
    }
  }
}
```

## Database Schema

### SQLite Tables

1. Channels Table
```sql
CREATE TABLE channels (
    channel_id TEXT PRIMARY KEY,
    channel_name TEXT NOT NULL,
    channel_type TEXT NOT NULL,
    topic TEXT,
    purpose TEXT,
    member_count INTEGER,
    last_processed TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

2. Messages Table
```sql
CREATE TABLE messages (
    message_id TEXT PRIMARY KEY,
    channel_id TEXT NOT NULL,
    author TEXT NOT NULL,
    content TEXT,
    timestamp TIMESTAMP NOT NULL,
    thread_id TEXT,
    has_attachments INTEGER DEFAULT 0,
    reaction_count INTEGER DEFAULT 0,
    reply_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (channel_id) REFERENCES channels(channel_id)
);
```

3. Channel Contexts Table
```sql
CREATE TABLE channel_contexts (
    context_id TEXT PRIMARY KEY,
    channel_id TEXT NOT NULL,
    start_date TIMESTAMP NOT NULL,
    end_date TIMESTAMP NOT NULL,
    message_count INTEGER NOT NULL,
    window_type TEXT NOT NULL,
    context_data JSON NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (channel_id) REFERENCES channels(channel_id)
);
```

4. Opportunities Table
```sql
CREATE TABLE opportunities (
    opportunity_id TEXT PRIMARY KEY,
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    implicit_insights TEXT,
    confidence_score FLOAT NOT NULL,
    scope TEXT NOT NULL,
    effort_estimate TEXT NOT NULL,
    potential_value TEXT NOT NULL,
    status TEXT DEFAULT 'new',
    detected_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_updated TIMESTAMP,
    context_id TEXT NOT NULL,
    FOREIGN KEY (context_id) REFERENCES channel_contexts(context_id)
);
```

5. Opportunity Evidence Table
```sql
CREATE TABLE opportunity_evidence (
    evidence_id TEXT PRIMARY KEY,
    opportunity_id TEXT NOT NULL,
    message_id TEXT NOT NULL,
    relevance_note TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (opportunity_id) REFERENCES opportunities(opportunity_id),
    FOREIGN KEY (message_id) REFERENCES messages(message_id)
);
```

## Processing Flow

1. Data Collection
   - Run Slack collection process with 3-month window
   - Build complete channel contexts
   - Store raw data and contexts in database

2. Opportunity Analysis
   - Process each channel context through Gemini
   - Store identified opportunities and evidence
   - Track confidence scores and impact assessments

3. Review Interface
   - Present opportunities for human review
   - Enable filtering by confidence/impact
   - Allow feedback and status updates

## Implementation Notes

- Use Node.js with MCP SDK for Slack integration
- Implement rate limiting and pagination
- Use Gemini Pro for opportunity analysis
- Store complete conversation contexts
- Track processing history and results
- Enable opportunity lifecycle management
