"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { PieChartComponent } from "@/components/pie-chart";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface Opportunity {
  opportunity_id: string;
  title: string;
  type: string;
  confidence_score: number;
  scope: string;
  detected_at: string;
}

interface ChannelStat {
  channel_id: string;
  count: number;
}

interface Channel {
  channel_id: string;
  name: string;
}

export default function OppVibePage() {
  const router = useRouter();
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [channelStats, setChannelStats] = useState<ChannelStat[]>([]);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  const handleOpportunityClick = (opportunityId: string) => {
    router.push(`/opportunities/${opportunityId}`);
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
                {opportunities.map((opp) => (
                  <TableRow 
                    key={opp.opportunity_id}
                    onClick={() => handleOpportunityClick(opp.opportunity_id)}
                    className="cursor-pointer hover:bg-gray-50"
                  >
                    <TableCell className="font-medium">{opp.title}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="capitalize">
                        {opp.type}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="w-32 bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-blue-500 h-2 rounded-full"
                          style={{ width: `${opp.confidence_score * 100}%` }}
                        />
                      </div>
                    </TableCell>
                    <TableCell className="capitalize">{opp.scope}</TableCell>
                    <TableCell className="text-gray-600">
                      {format(new Date(opp.detected_at), 'MMM d, yyyy')}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 