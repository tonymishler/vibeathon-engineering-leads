"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { getOpportunities } from "@/lib/db";
import { format } from "date-fns";
import Link from "next/link";
import { Flyout } from "@/components/ui/flyout";

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

interface PreviewData {
  opportunity: Opportunity;
  channel?: {
    name: string;
    channel_id: string;
    team_id: string;
    message_count: number;
  };
}

export default function OpportunitiesPage() {
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewData, setPreviewData] = useState<PreviewData | null>(null);

  useEffect(() => {
    async function fetchOpportunities() {
      try {
        const response = await fetch('/api/opportunities');
        if (!response.ok) {
          throw new Error('Failed to fetch opportunities');
        }
        const data = await response.json();
        setOpportunities(data);
      } catch (err) {
        console.error('Error:', err);
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    }

    fetchOpportunities();
  }, []);

  const handlePreviewClick = async (opportunityId: string) => {
    try {
      const response = await fetch(`/api/opportunities/${opportunityId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch opportunity details');
      }
      const data = await response.json();
      setPreviewData({
        opportunity: data.opportunity,
        channel: data.context?.channel
      });
      setPreviewOpen(true);
    } catch (err) {
      console.error('Error:', err);
    }
  };

  function getConfidenceColor(score: number) {
    if (score >= 0.7) return 'bg-green-100 text-green-800';
    if (score >= 0.4) return 'bg-yellow-100 text-yellow-800';
    return 'bg-red-100 text-red-800';
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

  if (loading) {
    return (
      <div className="container mx-auto py-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4" />
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-24 bg-gray-200 rounded" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto py-6">
        <div className="text-red-500">{error}</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6">
      <h1 className="text-2xl font-semibold mb-6">Opportunities</h1>
      
      <div className="space-y-4">
        {opportunities.map((opportunity) => (
          <div
            key={opportunity.opportunity_id}
            className="bg-white rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
            onClick={() => handlePreviewClick(opportunity.opportunity_id)}
          >
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-lg font-medium text-gray-900">{opportunity.title}</h2>
                <p className="text-sm text-gray-500 mt-1">
                  Detected {format(new Date(opportunity.detected_at), 'MMM d, yyyy')}
                </p>
              </div>
              <div className="flex gap-2">
                <Badge variant="secondary" className="bg-gray-100 text-gray-800">
                  {opportunity.type}
                </Badge>
                <Badge variant="secondary" className={getConfidenceColor(opportunity.confidence_score)}>
                  {(opportunity.confidence_score * 100).toFixed(0)}%
                </Badge>
              </div>
            </div>
          </div>
        ))}
      </div>

      <Flyout
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        title={previewData?.opportunity.title}
      >
        {previewData && (
          <div className="space-y-6">
            <div className="flex flex-wrap gap-2">
              <Badge variant="secondary" className="bg-gray-100 text-gray-800">
                {previewData.opportunity.type}
              </Badge>
              <Badge variant="secondary" className="bg-gray-100 text-gray-800">
                {previewData.opportunity.scope}
              </Badge>
              <Badge variant="secondary" className={getConfidenceColor(previewData.opportunity.confidence_score)}>
                Confidence: {(previewData.opportunity.confidence_score * 100).toFixed(0)}%
              </Badge>
              <Badge variant="secondary" className={getEstimateColor(previewData.opportunity.effort_estimate)}>
                Effort: {previewData.opportunity.effort_estimate}
              </Badge>
              <Badge variant="secondary" className={getValueColor(previewData.opportunity.potential_value)}>
                Value: {previewData.opportunity.potential_value}
              </Badge>
            </div>

            {previewData.channel && (
              <div className="flex items-center gap-2 text-gray-600 text-sm">
                <a 
                  href={`https://slack.com/app_redirect?channel=${previewData.channel.channel_id}`} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="inline-flex items-center gap-2 px-3 py-1 bg-blue-50 text-blue-700 rounded-full hover:bg-blue-100 transition-colors"
                  onClick={(e) => e.stopPropagation()}
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M12.186 8.672L18.743 2.115a1 1 0 00-1.414-1.414l-6.557 6.557L4.215.701a1 1 0 10-1.414 1.414l6.557 6.557L2.801 15.229a1 1 0 101.414 1.414l6.557-6.557 6.557 6.557a1 1 0 001.414-1.414l-6.557-6.557z"/>
                  </svg>
                  #{previewData.channel.name}
                </a>
              </div>
            )}

            <div>
              <h3 className="font-medium text-gray-900 mb-2">Description</h3>
              <p className="text-gray-600">{previewData.opportunity.description}</p>
            </div>

            <div>
              <h3 className="font-medium text-gray-900 mb-2">Implicit Insights</h3>
              <p className="text-gray-600">{previewData.opportunity.implicit_insights}</p>
            </div>

            <div className="border-t pt-4 mt-6">
              <Link
                href={`/opportunities/${previewData.opportunity.opportunity_id}`}
                className="inline-flex items-center justify-center rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
                onClick={(e) => e.stopPropagation()}
              >
                View Full Details
              </Link>
            </div>
          </div>
        )}
      </Flyout>
    </div>
  );
} 