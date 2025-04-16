# Data Collection and Analysis Script Plan

## Technology Stack
- Node.js
- MCP SDK (@modelcontextprotocol/sdk)
- SQLite3
- Slack MCP Integration
- Google Docs MCP Integration

## Environment Setup
```json
{
  "dependencies": {
    "@modelcontextprotocol/sdk": "latest",
    "@browsermcp/mcp": "latest",
    "sqlite3": "latest",
    "dotenv": "latest"
  }
}
```

## Objective
Create a script to collect and analyze data from Slack and Google Docs to identify potential opportunities for custom development projects.

## Data Collection Components

### 1. Slack Data Collection
- Use Slack MCP server to:
  - Iterate through all accessible channels in the workspace
  - Pull last 1000 messages from each channel
  - Store messages in memory for processing
  - Include metadata like:
    - Channel name
    - Timestamp
    - Author
    - Message content
    - Thread information (if applicable)

## Slack Data Collection Strategy

### Channel Filtering Process
1. Initial Channel Collection
   - Collect all channels from Slack workspace
   - Structure channel data as JSON:
   ```json
   {
     "channels": [
       {
         "id": "string",
         "name": "string",
         "topic": "string",
         "purpose": "string",
         "member_count": "number"
       }
     ]
   }
   ```

2. Gemini Pre-filtering
   - Send channel list to Gemini for initial filtering
   - Filtering criteria:
     - EXCLUDE: Channels containing "off-topic"
     - PRIORITIZE: Channels prefixed with "client-" or "eb-"
   - Gemini prompt template:
   ```text
   Analyze this list of Slack channels and:
   1. Remove any channels containing "off-topic" in their name
   2. Prioritize channels that start with "client-" or "eb-"
   3. Return a JSON object with two arrays:
      - priority_channels: Channels matching priority criteria
      - standard_channels: Other channels (excluding off-topic)
   ```

3. Message Collection Priority
   - Process priority channels first
   - Collect last 1000 messages from each channel
   - Store with channel priority metadata

### 2. Google Docs Data Collection
- Use Google Docs MCP to:
  - Retrieve last 1000 updated files
  - Store document content and metadata in memory
  - Include metadata like:
    - Document title
    - Last modified date
    - Document content
    - Document type
    - Contributors

## Data Structure

### JSON Format Structure
```json
{
  "slack_data": {
    "channels": [
      {
        "channel_name": "string",
        "messages": [
          {
            "timestamp": "datetime",
            "author": "string",
            "content": "string",
            "thread_id": "string",
            "reactions": []
          }
        ]
      }
    ]
  },
  "gdocs_data": {
    "documents": [
      {
        "title": "string",
        "last_modified": "datetime",
        "content": "string",
        "doc_type": "string",
        "contributors": [],
        "url": "string"
      }
    ]
  }
}
```

## Database Schema

### SQLite Tables

1. Channels Table
```sql
CREATE TABLE channels (
    channel_id TEXT PRIMARY KEY,
    channel_name TEXT,
    last_processed TIMESTAMP
);
```

2. Messages Table
```sql
CREATE TABLE messages (
    message_id TEXT PRIMARY KEY,
    channel_id TEXT,
    author TEXT,
    content TEXT,
    timestamp TIMESTAMP,
    thread_id TEXT,
    FOREIGN KEY (channel_id) REFERENCES channels(channel_id)
);
```

3. Documents Table
```sql
CREATE TABLE documents (
    doc_id TEXT PRIMARY KEY,
    title TEXT,
    content TEXT,
    last_modified TIMESTAMP,
    doc_type TEXT,
    url TEXT
);
```

4. Analysis Results Table
```sql
CREATE TABLE opportunities (
    opportunity_id INTEGER PRIMARY KEY AUTOINCREMENT,
    source_type TEXT,  -- 'slack' or 'gdocs'
    source_id TEXT,    -- message_id or doc_id
    opportunity_description TEXT,
    confidence_score FLOAT,
    identified_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## Processing Flow

1. Data Collection
   - Run Slack collection process
   - Run Google Docs collection process
   - Store all data in memory using the defined JSON structure

2. Data Processing
   - Format collected data for Gemini processing
   - Create prompt template for identifying development opportunities
   - Process data in appropriate batch sizes
   - Extract and structure identified opportunities

3. Data Storage
   - Initialize SQLite database with schema
   - Store raw collected data
   - Store processed results and identified opportunities

## Implementation Notes

- Use Node.js with MCP SDK for browser automation
- Implement async/await for efficient API calls
- Use MCP client setup pattern:
  ```javascript
  const transport = new StdioClientTransport({
    command: "npx",
    args: ["@browsermcp/mcp"]
  });
  const client = new Client({
    name: "data-collection-client",
    version: "1.0.0"
  });
  ```
- Implement rate limiting for API requests
- Add error handling and logging
- Include progress tracking for long-running operations
- Implement data validation before storage
- Add capability to resume interrupted operations
- Use environment variables for sensitive configuration
- Implement connection retry logic for MCP services
