# Vibeathon Engineering Leads Analysis Tool

A Node.js-based tool that analyzes Slack channels and Google Docs to identify potential engineering opportunities.

## Features

- Automated Slack channel analysis
  - Prioritizes client and engineering-focused channels
  - Filters out off-topic discussions
  - Collects and analyzes recent messages
- Google Docs integration
  - Analyzes recently updated documents
  - Identifies potential engineering opportunities
- SQLite storage for data persistence
- Gemini-powered analysis for opportunity detection

## Prerequisites

- Node.js (v16 or higher)
- NPM (v8 or higher)
- Slack workspace access
- Google Workspace access
- MCP Browser access

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
   Then edit `.env` with your configuration values.

## Usage

1. Start the analysis:
   ```bash
   npm start
   ```

2. View results:
   ```bash
   npm run report
   ```

## Development

- `npm run dev` - Start in development mode
- `npm test` - Run tests
- `npm run lint` - Run linter

## License

ISC 