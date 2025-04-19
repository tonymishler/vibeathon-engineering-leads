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
}

interface Context {
  channel: {
    name: string;
    member_count: number;
    message_count: number;
    link_count: number;
    mention_count: number;
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
          <p className="text-gray-600 text-sm mb-8">
            Detected in #{context.channel.name} • {context.channel.member_count} members • {context.channel.message_count} messages
          </p>
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
                          <span className="font-medium">{msg.author}</span>
                          <span className="text-sm text-gray-500">
                            {format(new Date(msg.timestamp), 'MMM d, h:mm a')}
                          </span>
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
        </div>
      </div>
    </div>
  );
} 