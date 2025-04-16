# Data Collection Flow

```mermaid
sequenceDiagram
    participant S as Slack
    participant P as Processor
    participant G as Gemini
    participant DB as Database

    P->>S: Get Channels
    S-->>P: Channel List
    P->>G: Filter Channels
    G-->>P: Prioritized Channels
    
    loop For Each Channel
        P->>S: Get Messages
        S-->>P: Message Batch
        P->>G: Analyze Content
        G-->>P: Opportunities
        P->>DB: Store Results
        DB-->>P: Confirmation
    end
```

This diagram illustrates the data collection and processing flow:
1. Initial channel collection
2. Channel prioritization
3. Message batch processing
4. Content analysis
5. Data storage 