# System Architecture Overview

```mermaid
graph TD
    A[Slack Integration] --> D[Data Processor]
    B[Google Docs Integration] --> D
    D --> E[SQLite Database]
    D --> F[Gemini Analysis]
    F --> G[Opportunity Detection]
    G --> E
    H[Integration Tests] --> A
    H --> B
    H --> D
```

This diagram shows the high-level system components and their interactions:
1. Data Sources (Slack and Google Docs)
2. Data Processing Layer
3. Storage Layer (SQLite)
4. Analysis Layer (Gemini)
5. Test Coverage 