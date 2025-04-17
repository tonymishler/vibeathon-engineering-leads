export interface Opportunity {
  opportunity_id: string;
  type: string;
  title: string;
  description: string;
  implicit_insights: string;
  confidence_score: number;
  scope: string;
  effort_estimate: string;
  potential_value: string;
  status: string;
  context_id: string;
  detected_at: string;
  last_updated: string;
}

export interface OpportunityEvidence {
  evidence_id: string;
  opportunity_id: string;
  message_id: string;
  author: string;
  timestamp: string;
  content: string;
  relevance_note: string;
}

export interface ChannelContext {
  context_id: string;
  channel_id: string;
  start_date: string;
  end_date: string;
  message_count: number;
  window_type: string;
  context_data: string;
}

export interface Channel {
  channel_id: string;
  name: string;
  type: string;
  created_at: string;
  last_analyzed: string | null;
  member_count: number | null;
  message_count: number;
  link_count: number;
  mention_count: number;
  metadata: string;
} 