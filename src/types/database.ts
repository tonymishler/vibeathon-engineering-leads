export interface DatabaseChannel {
  channel_id: string;
  name: string;
  type: string;
  created_at: string;
  last_analyzed: string;
  member_count: number;
  message_count: number;
  link_count: number;
  mention_count: number;
  metadata: string;
}

export interface DatabaseMessage {
  message_id: string;
  channel_id: string;
  user_id: string;
  content: string;
  timestamp: string;
  thread_ts: string | null;
  reply_count: number;
  link_count: number;
  mention_count: number;
  reaction_count: number;
}

export interface DatabaseOpportunity {
  opportunity_id: string;
  type: string;
  title: string;
  description: string;
  implicit_insights: string;
  key_participants: string;
  potential_solutions: string;
  confidence_score: number;
  scope: string;
  effort_estimate: string;
  potential_value: string;
  status: string;
  context_id: string;
  detected_at: string;
  last_updated: string;
}

export interface DatabaseOpportunityEvidence {
  evidence_id: string;
  opportunity_id: string;
  message_id: string;
  author: string;
  timestamp: string;
  content: string;
  relevance_note: string;
} 