"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { PieChartComponent } from "@/components/pie-chart";
import { useEffect, useState } from "react";

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

export default function DashboardPage() {
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
        console.log('API Response:', data);
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

  if (loading) {
    return <div className="container mx-auto py-8">Loading...</div>;
  }

  if (error) {
    return <div className="container mx-auto py-8 text-red-500">Error: {error}</div>;
  }

  // Create channel name mapping
  const channelMap = new Map(channels.map(c => [c.channel_id, c.name]));

  // Prepare data for pie chart
  const pieData = channelStats.map(stat => ({
    name: channelMap.get(stat.channel_id) || stat.channel_id,
    value: stat.count
  }));

  console.log('Pie Chart Data:', pieData);

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-8">Opportunities Dashboard</h1>
      
      <div className="grid gap-8">
        {/* Pie Chart Card */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <CardTitle>Opportunities by Channel</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-[400px]">
              {pieData.length > 0 ? (
                <PieChartComponent data={pieData} />
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  No data available
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Opportunities List */}
        <Card>
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
                  <TableRow key={opp.opportunity_id}>
                    <TableCell className="font-medium">{opp.title}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{opp.type}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="w-full bg-gray-200 rounded-full h-2.5">
                        <div
                          className="bg-blue-600 h-2.5 rounded-full"
                          style={{ width: `${opp.confidence_score * 100}%` }}
                        />
                      </div>
                    </TableCell>
                    <TableCell>{opp.scope}</TableCell>
                    <TableCell>{format(new Date(opp.detected_at), 'MMM d, yyyy')}</TableCell>
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