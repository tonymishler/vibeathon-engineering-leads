# Opportunity Detection Through Channel Analysis

## Channel Context Analysis

### Processing Constraints
- Time Window: Maximum 3 months from current date
  - Ensures opportunities are current and relevant
  - Reduces noise from outdated discussions
  - Focuses on active, unresolved needs
  - Helps maintain reasonable context sizes

### Batch Processing Approach
- Process channel contexts as a single unit with constraints:
  - Last 1000 messages OR
  - Messages within last 3 months
  - Whichever yields the smaller set
- Benefits:
  - Provides LLM with full conversation context
  - Enables detection of patterns across multiple interactions
  - Allows for understanding of evolving discussions
  - Can identify implicit needs that emerge over time
  - Maintains focus on current opportunities

### Context Structure
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

## Opportunity Detection

### Analysis Prompt Strategy
```text
You will receive a channel context containing Slack messages and metadata in the following structure:
{
  "channel_context": {
    "channel_name": string,
    "channel_type": "priority|standard",
    "topic": string,
    "purpose": string,
    "message_window": {
      "start_date": timestamp,
      "end_date": timestamp,
      "message_count": number,
      "window_type": "message_limit|time_limit"
    },
    "messages": [...],
    "participants": {
      "active_count": number,
      "key_contributors": [string]
    },
    "activity_metrics": {...}
  }
}

Analyze this channel context to identify potential engineering opportunities. You must return your analysis as an array of opportunities, each matching this exact structure:
{
  "opportunity": {
    "id": uuid,
    "type": "feature|integration|automation|optimization",
    "title": string,
    "description": string,
    "evidence": [
      {
        "message_id": string,
        "author": string,
        "timestamp": datetime,
        "content": string,
        "relevance_note": string
      }
    ],
    "key_participants": [string],
    "implicit_insights": string,
    "potential_solutions": [string],
    "confidence_score": float,
    "impact_assessment": {
      "scope": "team|department|organization",
      "effort_estimate": "small|medium|large",
      "potential_value": "low|medium|high"
    },
    "metadata": {
      "channel_id": string,
      "detected_at": datetime,
      "last_updated": datetime
    }
  }
}

In your analysis:

1. Look for patterns indicating:
   - Recurring technical challenges
   - Manual processes that could be automated
   - Integration points between systems
   - Performance or scaling concerns
   - Feature requests or user pain points
   - Cross-team collaboration needs

2. Pay special attention to:
   - Discussions spanning multiple messages/participants
   - Problems mentioned repeatedly over time
   - Workarounds being used
   - Expressions of frustration or inefficiency
   - Questions about system capabilities
   - References to external tools or services

3. For each opportunity you identify:
   - Include exact message excerpts as evidence
   - Reference specific authors and timestamps
   - Explain insights that participants may have missed
   - Suggest concrete engineering solutions
   - Assign confidence scores based on evidence strength
   - Assess impact across team/department/organization

4. Consider broader implications:
   - How this opportunity might affect other teams/channels
   - Potential for reusable solutions
   - Integration with existing systems
   - Scalability across the organization

Remember:
- Only include opportunities from the last 3 months
- Focus on actionable engineering solutions
- Provide specific evidence for each insight
- Structure your response exactly as specified
```

### Opportunity Structure
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

## Implementation Considerations

### Database Schema Updates
- Add new tables for storing channel contexts
- Implement efficient storage of message groups
- Create relationships between opportunities and their evidence
- Store LLM analysis results and confidence scores

### Processing Pipeline
1. Channel Selection
   - Prioritize channels based on activity and type
   - Consider temporal relevance (recent discussions)
   - Filter out noise (off-topic channels)
   - **Apply 3-month cutoff filter**
   - Calculate activity metrics within time window

2. Context Building
   - Aggregate messages with metadata
   - Build participant profiles
   - Include channel statistics
   - **Track message velocity and trends**
   - **Flag channels with increasing activity**

3. LLM Analysis
   - Batch process channel contexts
   - Store intermediate analysis results
   - Track confidence scores

4. Opportunity Management
   - De-duplicate similar opportunities
   - Track opportunity lifecycle
   - Enable human review and validation

### Integration Points
- Connect with project management tools
- Feed into resource planning
- Link to documentation systems
- Enable feedback loops from implementation teams

## Next Steps

1. Schema Updates
   - Design new table structures
   - Plan migration strategy
   - Implement versioning

2. Prompt Engineering
   - Test different prompt structures
   - Tune for precision vs. recall
   - Develop evaluation metrics

3. UI/UX Considerations
   - Design opportunity review interface
   - Create opportunity management workflow
   - Implement feedback mechanisms

4. Validation Process
   - Define success metrics
   - Create feedback loops
   - Implement quality controls 