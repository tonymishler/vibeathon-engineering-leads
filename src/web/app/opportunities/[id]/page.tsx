"use client";

import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { useEffect, useState, useRef } from "react";
import { useParams } from "next/navigation";
import { SlackMessageThread, SlackMessageThreadHandle } from '@/components/SlackMessageThread';
import '@/styles/slack-messages.css';

interface Message {
  message_id: string;
  content: string;
  author: string;
  timestamp: string;
  thread_id: string | null;
  is_evidence?: boolean;
  trigger_text?: string;
  authorProfile?: {
    display_name: string | null;
    real_name: string | null;
    avatar_url: string | null;
  } | null;
}

interface Opportunity {
  opportunity_id: string;
  title: string;
  type: string;
  confidence_score: number;
  scope: string;
  detected_at: string;
  description: string;
  implicit_insights: string;
  effort_estimate: string;
  potential_value: string;
  status: string;
  last_updated: string;
}

interface Evidence {
  evidence_id: string;
  author: string;
  timestamp: string;
  content: string;
  relevance_note: string | null;
  message_id: string;
  authorProfile?: {
    display_name: string | null;
    real_name: string | null;
    avatar_url: string | null;
  } | null;
}

interface Context {
  channel: {
    channel_id: string;
    name: string;
    member_count: number;
    message_count: number;
    link_count: number;
    mention_count: number;
    team_id: string;
  };
  context: {
    start_date: string;
    end_date: string;
  };
  messages: Message[];
}

function getEstimateColor(estimate: string) {
  switch (estimate.toLowerCase()) {
    case 'small':
      return 'bg-green-100 text-green-800';
    case 'medium':
      return 'bg-yellow-100 text-yellow-800';
    case 'large':
      return 'bg-red-100 text-red-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
}

function getValueColor(value: string) {
  switch (value.toLowerCase()) {
    case 'high':
      return 'bg-green-100 text-green-800';
    case 'medium':
      return 'bg-yellow-100 text-yellow-800';
    case 'low':
      return 'bg-red-100 text-red-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
}

export default function OpportunityPage() {
  const params = useParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [opportunity, setOpportunity] = useState<Opportunity | null>(null);
  const [evidence, setEvidence] = useState<Evidence[]>([]);
  const [context, setContext] = useState<Context | null>(null);
  const threadRef = useRef<SlackMessageThreadHandle>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        const response = await fetch(`/api/opportunities/${params.id}`);
        if (!response.ok) {
          throw new Error('Failed to fetch opportunity');
        }
        const data = await response.json();
        setOpportunity(data.opportunity);
        setEvidence(data.evidence);
        setContext(data.context);
      } catch (err) {
        console.error('Error:', err);
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    }

    if (params.id) {
      fetchData();
    }
  }, [params.id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="container mx-auto py-6">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-gray-200 rounded w-1/2" />
            <div className="flex gap-2">
              <div className="h-6 bg-gray-200 rounded w-24" />
              <div className="h-6 bg-gray-200 rounded w-24" />
            </div>
            <div className="h-4 bg-gray-200 rounded w-96" />
            <div className="space-y-8 mt-8">
              <div className="space-y-4">
                <div className="h-6 bg-gray-200 rounded w-24" />
                <div className="h-20 bg-gray-200 rounded w-full" />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !opportunity) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="container mx-auto py-6">
          <div className="text-red-500">
            {error || 'Opportunity not found'}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto py-6">
        <h1 className="text-2xl font-semibold mb-4">{opportunity.title}</h1>
        
        <div className="flex flex-wrap gap-2 mb-3">
          <Badge variant="secondary" className="bg-gray-100 text-gray-800">
            {opportunity.type}
          </Badge>
          <Badge variant="secondary" className="bg-gray-100 text-gray-800">
            {opportunity.scope}
          </Badge>
          <Badge variant="secondary" className="bg-green-100 text-green-800">
            Confidence: {(opportunity.confidence_score * 100).toFixed(0)}%
          </Badge>
          <Badge variant="secondary" className={getEstimateColor(opportunity.effort_estimate)}>
            Effort: {opportunity.effort_estimate}
          </Badge>
          <Badge variant="secondary" className={getValueColor(opportunity.potential_value)}>
            Value: {opportunity.potential_value}
          </Badge>
        </div>

        {context && (
          <div className="flex items-center gap-2 text-gray-600 text-sm mb-8">
            <a 
              href={`https://slack.com/app_redirect?channel=${context.channel.channel_id}&message_ts=${context.messages[0].timestamp}`}
              target="_blank" 
              rel="noopener noreferrer" 
              className="inline-flex items-center gap-2 px-3 py-1 bg-blue-50 text-blue-700 rounded-full hover:bg-blue-100 transition-colors"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path d="M12.186 8.672L18.743 2.115a1 1 0 00-1.414-1.414l-6.557 6.557L4.215.701a1 1 0 10-1.414 1.414l6.557 6.557L2.801 15.229a1 1 0 101.414 1.414l6.557-6.557 6.557 6.557a1 1 0 001.414-1.414l-6.557-6.557z"/>
              </svg>
              #{context.channel.name}
            </a>
            <span className="text-gray-400">•</span>
            <span>{context.channel.member_count} members</span>
            <span className="text-gray-400">•</span>
            <span>{context.channel.message_count} messages</span>
          </div>
        )}

        <div className="space-y-8">
          <section className="bg-white rounded-lg p-6 shadow-sm">
            <h2 className="text-lg font-semibold mb-4">Details</h2>
            
            <div className="space-y-6">
              <div>
                <h3 className="font-medium text-gray-900 mb-2">Description</h3>
                <p className="text-gray-600">{opportunity.description}</p>
              </div>

              <div>
                <h3 className="font-medium text-gray-900 mb-2">Implicit Insights</h3>
                <p className="text-gray-600">{opportunity.implicit_insights}</p>
              </div>
            </div>
          </section>

          {context && (
            <section className="bg-white rounded-lg p-6 shadow-sm">
              <h2 className="text-lg font-semibold mb-4">Channel Context</h2>
              
              <div className="space-y-6">
                <div>
                  <h3 className="font-medium text-gray-900 mb-2">Analysis Window</h3>
                  <p className="text-gray-600">
                    {format(new Date(context.context.start_date), 'MMM d, yyyy')} to{' '}
                    {format(new Date(context.context.end_date), 'MMM d, yyyy')}
                  </p>
                </div>

                <div>
                  <h3 className="font-medium text-gray-900 mb-2">Channel Activity</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-white rounded-lg p-6 border border-gray-200 shadow-sm">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-gray-500">Messages</p>
                        <div className="bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded">Last 90 days</div>
                      </div>
                      <p className="text-3xl font-bold text-gray-900 mt-2">{context.channel.message_count}</p>
                      <p className="text-sm text-gray-500 mt-1">Total messages in channel</p>
                    </div>
                    <div className="bg-white rounded-lg p-6 border border-gray-200 shadow-sm">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-gray-500">Links Shared</p>
                        <div className="bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded">Last 90 days</div>
                      </div>
                      <p className="text-3xl font-bold text-gray-900 mt-2">{context.channel.link_count}</p>
                      <p className="text-sm text-gray-500 mt-1">Total links shared</p>
                    </div>
                  </div>
                </div>

                {evidence && evidence.length > 0 && (
                  <div>
                    <h3 className="font-medium text-gray-900 mb-2">Supporting Evidence</h3>
                    <div 
                      className="bg-blue-50 border border-blue-100 p-4 rounded-lg mb-6 cursor-pointer hover:bg-blue-100 transition-colors duration-200"
                      onClick={() => threadRef.current?.scrollToEvidence()}
                      role="button"
                      tabIndex={0}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          threadRef.current?.scrollToEvidence();
                        }
                      }}
                    >
                      <div className="flex items-start space-x-3">
                        <div className="flex-shrink-0">
                          <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                          </svg>
                        </div>
                        <div>
                          <p className="text-sm text-blue-700 font-medium">Key messages that support this opportunity</p>
                          <p className="mt-1 text-sm text-blue-600">The following messages have been identified as strong evidence for this opportunity. They are also highlighted in blue in the conversation timeline below.</p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                <div>
                  <h3 className="font-medium text-gray-900 mb-2">Conversation Timeline</h3>
                  <div className="transition-all duration-200 hover:ring-2 hover:ring-blue-100 rounded-lg">
                    <SlackMessageThread 
                      ref={threadRef}
                      messages={context.messages.map(msg => {
                        const evidenceItem = !msg.is_evidence ? evidence.find(e => e.message_id === msg.message_id || e.timestamp === msg.timestamp) : null;
                        return {
                          ...msg,
                          message_id: msg.message_id || `${msg.timestamp}-${msg.author}`,
                          is_evidence: msg.is_evidence || !!evidenceItem,
                          trigger_text: (msg.is_evidence || !!evidenceItem) ? 'This is where we\'ll log things like "Braze + AWS," "Braze for B2B," and our new idea: helping brands' : undefined,
                          channel_id: context.channel.channel_id,
                          team_id: context.channel.team_id
                        };
                      })}
                      maxHeight="400px"
                    />
                  </div>
                </div>
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
} 