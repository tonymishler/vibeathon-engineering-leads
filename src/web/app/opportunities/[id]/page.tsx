"use client";

import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

interface Message {
  id: string;
  content: string;
  author: string;
  timestamp: string;
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

export default function OpportunityPage() {
  const params = useParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [opportunity, setOpportunity] = useState<Opportunity | null>(null);
  const [evidence, setEvidence] = useState<Evidence[]>([]);
  const [context, setContext] = useState<Context | null>(null);

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
        </div>

        {context && (
          <div className="flex items-center gap-2 text-gray-600 text-sm mb-8">
            <a 
              href={`https://slack.com/app_redirect?channel=${context.channel.channel_id}`} 
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

              <div className="grid grid-cols-2 gap-8">
                <div>
                  <h3 className="font-medium text-gray-900 mb-2">Effort Estimate</h3>
                  <p className="text-gray-600">{opportunity.effort_estimate}</p>
                </div>
                <div>
                  <h3 className="font-medium text-gray-900 mb-2">Potential Value</h3>
                  <p className="text-gray-600">{opportunity.potential_value}</p>
                </div>
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
                  <div className="grid grid-cols-2 gap-8">
                    <div>
                      <p className="text-gray-500">Messages</p>
                      <p className="text-4xl font-medium">{context.channel.message_count}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Links Shared</p>
                      <p className="text-4xl font-medium">{context.channel.link_count}</p>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="font-medium text-gray-900 mb-2">Recent Messages</h3>
                  <div className="space-y-4">
                    {evidence.map((msg) => (
                      <div key={msg.evidence_id} className="bg-white rounded p-4">
                        <div className="flex items-center justify-between">
                          <span className="font-medium">{msg.authorProfile?.display_name || msg.authorProfile?.real_name || msg.author}</span>
                          <a 
                            href={`https://slack.com/app_redirect?channel=${context?.channel.channel_id}&message_ts=${msg.message_id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-gray-500 hover:text-blue-600"
                          >
                            {format(new Date(msg.timestamp), 'MMM d, h:mm a')}
                          </a>
                        </div>
                        <p className="text-gray-600 mt-1">{msg.content}</p>
                        {msg.relevance_note && (
                          <p className="text-sm text-gray-500 mt-2">{msg.relevance_note}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </section>
          )}

          {evidence && evidence.length > 0 && (
            <section className="bg-white rounded-lg p-6 shadow-sm">
              <h2 className="text-lg font-semibold mb-4">Supporting Evidence</h2>
              <div className="space-y-6">
                {evidence.map((item) => (
                  <div key={item.evidence_id} className="border-b border-gray-100 last:border-0 pb-6 last:pb-0">
                    <div className="flex items-start gap-3 mb-2">
                      {item.authorProfile?.avatar_url ? (
                        <img 
                          src={item.authorProfile.avatar_url} 
                          alt={item.authorProfile.display_name || item.authorProfile.real_name || 'User'} 
                          className="w-8 h-8 rounded-full"
                        />
                      ) : (
                        <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                          <span className="text-gray-500 text-sm">?</span>
                        </div>
                      )}
                      <div>
                        <div className="flex items-center gap-2">
                          <a 
                            href={`https://slack.com/app_redirect?team=${context?.channel.team_id}&user=${item.author}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-medium text-gray-900 hover:underline"
                          >
                            {item.authorProfile?.display_name || item.authorProfile?.real_name || item.author}
                          </a>
                          <a 
                            href={`https://slack.com/app_redirect?channel=${context?.channel.channel_id}&message_ts=${item.message_id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-gray-500 hover:underline"
                          >
                            {format(new Date(item.timestamp), 'MMM d, yyyy h:mm a')}
                          </a>
                        </div>
                        <p className="text-gray-600 mt-1">{item.content}</p>
                        {item.relevance_note && (
                          <p className="text-sm text-gray-500 mt-2 italic">
                            {item.relevance_note}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
} 