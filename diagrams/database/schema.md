# Database Schema

```mermaid
erDiagram
    CHANNELS ||--o{ MESSAGES : contains
    CHANNELS {
        string channel_id PK
        string channel_name
        string channel_type
        string topic
        string purpose
        int member_count
        timestamp last_processed
        timestamp created_at
    }
    MESSAGES ||--o{ OPPORTUNITIES : generates
    MESSAGES {
        string message_id PK
        string channel_id FK
        string author
        string content
        timestamp timestamp
        string thread_id
        boolean has_attachments
        int reaction_count
        int reply_count
        timestamp created_at
    }
    OPPORTUNITIES {
        int opportunity_id PK
        string source_type
        string source_id FK
        string description
        float confidence_score
        timestamp identified_at
    }
```

This diagram shows the database schema relationships:
1. Channels to Messages (one-to-many)
2. Messages to Opportunities (one-to-many)
3. Key fields and their types
4. Foreign key relationships 