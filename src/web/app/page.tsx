"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { PieChartComponent } from "@/components/pie-chart";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
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

interface ChannelStat {
  channel_id: string;
  count: number;
}

interface Channel {
  channel_id: string;
  name: string;
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

export default function OppVibePage() {
  const router = useRouter();
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [channelStats, setChannelStats] = useState<ChannelStat[]>([]);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewData, setPreviewData] = useState<PreviewData | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        const response = await fetch('/api/opportunities');
        if (!response.ok) {
          throw new Error('Failed to fetch data');
        }
        const data = await response.json();
        setOpportunities(data.opportunities);
        setChannelStats(data.channelStats);
        setChannels(data.channels);
      } catch (err) {
        console.error('Error fetching data:', err);
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    }

    fetchData();
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

  if (loading) {
    return (
      <div className="container mx-auto p-6 bg-gray-50 min-h-screen">
        <h1 className="text-2xl font-semibold mb-6">OppVibe</h1>
        <div className="space-y-6">
          {/* Loading states */}
          <Card className="bg-white">
            <CardHeader>
              <CardTitle>Opportunities by Channel</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[300px] flex items-center justify-center">
                <div className="w-[200px] h-[200px] rounded-full bg-gray-200 animate-pulse" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white">
            <CardHeader>
              <CardTitle>Recent Opportunities</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="animate-pulse space-y-4">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="h-12 bg-gray-200 rounded" />
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (error) {
    return <div className="container mx-auto p-6 text-red-500">Error: {error}</div>;
  }

  // Create channel name mapping
  const channelMap = new Map(channels.map(c => [c.channel_id, c.name]));

  // Prepare data for pie chart
  const pieData = channelStats.map(stat => ({
    name: channelMap.get(stat.channel_id) || stat.channel_id,
    value: stat.count
  }));

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

  return (
    <div className="container mx-auto p-6 bg-gray-50 min-h-screen">
      <h1 className="text-2xl font-semibold mb-6">OppVibe</h1>
      
      <div className="space-y-6">
        {/* Pie Chart */}
        <Card className="bg-white">
          <CardHeader>
            <CardTitle>Opportunities by Channel</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              {pieData.length > 0 ? (
                <PieChartComponent data={pieData} />
              ) : (
                <div className="flex items-center justify-center h-full text-gray-500">
                  No data available
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Recent Opportunities */}
        <Card className="bg-white">
          <CardHeader>
            <CardTitle>Recent Opportunities</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Confidence</TableHead>
                  <TableHead>Scope</TableHead>
                  <TableHead>Detected</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {opportunities.map((opportunity) => (
                  <TableRow 
                    key={opportunity.opportunity_id}
                    onClick={() => handlePreviewClick(opportunity.opportunity_id)}
                    className="cursor-pointer hover:bg-gray-50"
                  >
                    <TableCell className="font-medium">{opportunity.title}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="capitalize">
                        {opportunity.type}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="w-32 bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-blue-500 h-2 rounded-full"
                          style={{ width: `${opportunity.confidence_score * 100}%` }}
                        />
                      </div>
                    </TableCell>
                    <TableCell className="capitalize">{opportunity.scope}</TableCell>
                    <TableCell className="text-gray-600">
                      {format(new Date(opportunity.detected_at), 'MMM d, yyyy')}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
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
              <a
                href={`/opportunities/${previewData.opportunity.opportunity_id}`}
                className="inline-flex items-center justify-center rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
              >
                View Full Details
              </a>
            </div>
          </div>
        )}
      </Flyout>
    </div>
  );
} 