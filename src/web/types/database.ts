export interface Opportunity {
  opportunity_id: string;
  type: string;
  title: string;
  description: string;
  implicit_insights: string;
  key_participants: string;
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
  relevance_note: string | null;
  authorProfile?: {
    display_name: string | null;
    real_name: string | null;
    avatar_url: string | null;
  } | null;
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
  team_id: string;
  created_at: string;
  last_analyzed: string;
  member_count: number;
  message_count: number;
  link_count: number;
  mention_count: number;
  metadata: string;
} 