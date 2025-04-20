"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { PieChartComponent } from "@/components/pie-chart";
import { useEffect, useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Flyout } from "@/components/ui/flyout";
import dynamic from 'next/dynamic';
import { OpportunitiesTable } from "@/components/OpportunitiesTable";
import { HomeIcon as HomeIconOutline, ChevronRightIcon as ChevronRightIconOutline } from '@heroicons/react/24/outline';
import type { ReactElement, ComponentProps } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";

const HomeIcon = HomeIconOutline as React.FC<React.SVGProps<SVGSVGElement>>;
const ChevronRightIcon = ChevronRightIconOutline as React.FC<React.SVGProps<SVGSVGElement>>;

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
  opportunity_ids: string[];
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

interface ChartState {
  type: 'channel' | 'type' | 'scope' | 'effort' | 'value';
  filter?: {
    channel?: string;
    type?: string;
    scope?: string;
    effort?: string;
    value?: string;
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
  const [previewData, setPreviewData] = useState<{
    opportunity: Opportunity;
    channel?: { channel_id: string; name: string };
  } | null>(null);
  const [chartState, setChartState] = useState<ChartState>({ type: 'channel' });
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [scopeFilter, setScopeFilter] = useState<string>('all');
  const [sortConfig, setSortConfig] = useState<{
    key: keyof Opportunity;
    direction: 'asc' | 'desc';
  } | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [searchTerm, setSearchTerm] = useState('');

  const uniqueTypes = useMemo(() => {
    const types = new Set(opportunities.map(opp => opp.type));
    return ['all', ...Array.from(types)].filter(Boolean);
  }, [opportunities]);
  
  const uniqueScopes = useMemo(() => {
    const scopes = new Set(opportunities.map(opp => opp.scope));
    return ['all', ...Array.from(scopes)].filter(Boolean);
  }, [opportunities]);

  const sortData = useCallback((data: Opportunity[]) => {
    if (!sortConfig) return data;

    return [...data].sort((a, b) => {
      if (a[sortConfig.key] < b[sortConfig.key]) {
        return sortConfig.direction === 'asc' ? -1 : 1;
      }
      if (a[sortConfig.key] > b[sortConfig.key]) {
        return sortConfig.direction === 'asc' ? 1 : -1;
      }
      return 0;
    });
  }, [sortConfig]);

  const requestSort = (key: keyof Opportunity) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const filteredAndSortedOpportunities = useMemo(() => {
    console.log('Filtering opportunities:', {
      total: opportunities.length,
      searchTerm,
      typeFilter,
      scopeFilter
    });

    let filtered = [...opportunities];

    // Apply search filter
    if (searchTerm.trim()) {
      const searchLower = searchTerm.toLowerCase().trim();
      filtered = filtered.filter(opp => {
        const matches = 
          opp.title.toLowerCase().includes(searchLower) ||
          (opp.description || '').toLowerCase().includes(searchLower) ||
          opp.type.toLowerCase().includes(searchLower) ||
          opp.scope.toLowerCase().includes(searchLower);
        return matches;
      });
      console.log('After search filter:', filtered.length);
    }

    // Apply type filter
    if (typeFilter && typeFilter !== 'all') {
      filtered = filtered.filter(opp => opp.type === typeFilter);
      console.log('After type filter:', filtered.length);
    }

    // Apply scope filter
    if (scopeFilter && scopeFilter !== 'all') {
      filtered = filtered.filter(opp => opp.scope === scopeFilter);
      console.log('After scope filter:', filtered.length);
    }

    // Apply chart filters
    if (chartState.filter) {
      if (chartState.filter.channel) {
        filtered = filtered.filter(opp => {
          const channelStat = channelStats.find(stat => 
            stat.channel_id === chartState.filter?.channel && 
            stat.opportunity_ids.includes(opp.opportunity_id)
          );
          return channelStat !== undefined;
        });
      }
      if (chartState.filter.type) {
        filtered = filtered.filter(opp => opp.type === chartState.filter?.type);
      }
      if (chartState.filter.scope) {
        filtered = filtered.filter(opp => opp.scope === chartState.filter?.scope);
      }
    }

    const sorted = sortData(filtered);
    console.log('Final filtered and sorted count:', sorted.length);
    return sorted;
  }, [opportunities, searchTerm, typeFilter, scopeFilter, chartState.filter, channelStats, sortData]);

  // Calculate pagination
  const paginatedOpportunities = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredAndSortedOpportunities.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredAndSortedOpportunities, currentPage]);

  const totalPages = Math.ceil(filteredAndSortedOpportunities.length / itemsPerPage);

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
      if (!response.ok) throw new Error('Failed to fetch opportunity details');
      const data = await response.json();
      setPreviewData(data);
      setPreviewOpen(true);
    } catch (error) {
      console.error('Error fetching opportunity details:', error);
    }
  };

  // Prepare data for pie chart based on current state
  const getPieData = () => {
    let filteredOpps = opportunities;
    const filter = chartState.filter;

    // Apply filters
    if (filter) {
      if (filter.channel) {
        filteredOpps = filteredOpps.filter(opp => {
          const channelStat = channelStats.find(stat => 
            stat.channel_id === filter.channel && 
            stat.opportunity_ids.includes(opp.opportunity_id)
          );
          return channelStat !== undefined;
        });
      }
      if (filter.type) {
        filteredOpps = filteredOpps.filter(opp => opp.type === filter.type);
      }
      if (filter.scope) {
        filteredOpps = filteredOpps.filter(opp => opp.scope === filter.scope);
      }
    }

    // Group by current chart type
    const groupedData = new Map<string, number>();
    
    switch (chartState.type) {
      case 'channel':
        channelStats.forEach(stat => {
          const name = channelMap.get(stat.channel_id) || stat.channel_id;
          groupedData.set(name, stat.count);
        });
        break;
      
      case 'type':
        filteredOpps.forEach(opp => {
          const count = groupedData.get(opp.type) || 0;
          groupedData.set(opp.type, count + 1);
        });
        break;
      
      case 'scope':
        filteredOpps.forEach(opp => {
          const count = groupedData.get(opp.scope) || 0;
          groupedData.set(opp.scope, count + 1);
        });
        break;

      case 'effort':
        filteredOpps.forEach(opp => {
          const count = groupedData.get(opp.effort_estimate) || 0;
          groupedData.set(opp.effort_estimate, count + 1);
        });
        break;

      case 'value':
        filteredOpps.forEach(opp => {
          const count = groupedData.get(opp.potential_value) || 0;
          groupedData.set(opp.potential_value, count + 1);
        });
        break;
    }

    return Array.from(groupedData.entries()).map(([name, value]) => ({
      name,
      value,
      id: name.toLowerCase()
    }));
  };

  const handleChartClick = (data: { name: string; value: number; id?: string }) => {
    if (chartState.type === 'channel') {
      // When clicking a channel, drill down to type distribution
      setChartState({
        type: 'type',
        filter: { 
          ...chartState.filter,
          channel: channels.find(c => c.name === data.name)?.channel_id 
        }
      });
    } else if (chartState.type === 'type') {
      // When clicking a type, drill down to scope distribution
      setChartState({
        type: 'scope',
        filter: { 
          ...chartState.filter,
          type: data.name 
        }
      });
    } else if (chartState.type === 'scope') {
      // When clicking a scope, drill down to effort distribution
      setChartState({
        type: 'effort',
        filter: {
          ...chartState.filter,
          scope: data.name
        }
      });
    } else if (chartState.type === 'effort') {
      // When clicking an effort level, drill down to value distribution
      setChartState({
        type: 'value',
        filter: {
          ...chartState.filter,
          effort: data.name
        }
      });
    }
  };

  const handleBreadcrumbClick = (level: 'root' | 'channel' | 'type' | 'scope' | 'effort') => {
    switch (level) {
      case 'root':
        setChartState({ type: 'channel' });
        break;
      case 'channel':
        setChartState({
          type: 'type',
          filter: { channel: chartState.filter?.channel }
        });
        break;
      case 'type':
        setChartState({
          type: 'scope',
          filter: {
            channel: chartState.filter?.channel,
            type: chartState.filter?.type
          }
        });
        break;
      case 'scope':
        setChartState({
          type: 'effort',
          filter: {
            channel: chartState.filter?.channel,
            type: chartState.filter?.type,
            scope: chartState.filter?.scope
          }
        });
        break;
      case 'effort':
        setChartState({
          type: 'value',
          filter: {
            channel: chartState.filter?.channel,
            type: chartState.filter?.type,
            scope: chartState.filter?.scope,
            effort: chartState.filter?.effort
          }
        });
        break;
    }
  };

  const getChartTitle = () => {
    switch (chartState.type) {
      case 'channel':
        return 'Distribution by Channel';
      case 'type':
        return `Distribution by Type${chartState.filter?.channel ? ` in ${channelMap.get(chartState.filter.channel)}` : ''}`;
      case 'scope':
        return `Distribution by Scope${chartState.filter?.type ? ` for ${chartState.filter.type}` : ''}`;
      case 'effort':
        return `Distribution by Effort${chartState.filter?.scope ? ` for ${chartState.filter.scope} Scope` : ''}`;
      case 'value':
        return `Distribution by Value${chartState.filter?.effort ? ` for ${chartState.filter.effort} Effort` : ''}`;
    }
  };

  // Create channel name mapping
  const channelMap = channels?.length ? new Map(channels.map(c => [c.channel_id, c.name])) : new Map();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <div className="text-red-600 text-xl mb-4">{error}</div>
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

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
    <div className="min-h-screen bg-gray-50">

      
      <div className="container mx-auto p-6 bg-gray-50 min-h-screen">
        
        <div className="space-y-6">
          {/* Pie Chart Card */}
          <Card className="bg-white">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Opportunities Analysis</CardTitle>
                
                {/* Breadcrumb Navigation */}
                <nav className="flex items-center space-x-2 text-sm">
                  <button
                    onClick={() => handleBreadcrumbClick('root')}
                    className={`flex items-center ${chartState.type === 'channel' ? 'text-gray-600' : 'text-blue-600 hover:text-blue-800'}`}
                  >
                    <HomeIcon className="h-5 w-5 flex-shrink-0" aria-hidden="true" />
                    Channels
                  </button>
                  
                  {chartState.filter?.channel && (
                    <>
                      <ChevronRightIcon className="h-5 w-5 flex-shrink-0 text-gray-400" aria-hidden="true" />
                      <button
                        onClick={() => handleBreadcrumbClick('channel')}
                        className={`${chartState.type === 'type' ? 'text-gray-600' : 'text-blue-600 hover:text-blue-800'}`}
                      >
                        {channelMap.get(chartState.filter.channel)}
                      </button>
                    </>
                  )}
                  
                  {chartState.filter?.type && (
                    <>
                      <ChevronRightIcon className="h-5 w-5 flex-shrink-0 text-gray-400" aria-hidden="true" />
                      <button
                        onClick={() => handleBreadcrumbClick('type')}
                        className={`${chartState.type === 'scope' ? 'text-gray-600' : 'text-blue-600 hover:text-blue-800'}`}
                      >
                        {chartState.filter.type}
                      </button>
                    </>
                  )}

                  {chartState.filter?.scope && (
                    <>
                      <ChevronRightIcon className="h-5 w-5 flex-shrink-0 text-gray-400" aria-hidden="true" />
                      <button
                        onClick={() => handleBreadcrumbClick('scope')}
                        className={`${chartState.type === 'effort' ? 'text-gray-600' : 'text-blue-600 hover:text-blue-800'}`}
                      >
                        {chartState.filter.scope}
                      </button>
                    </>
                  )}

                  {chartState.filter?.effort && (
                    <>
                      <ChevronRightIcon className="h-5 w-5 flex-shrink-0 text-gray-400" aria-hidden="true" />
                      <button
                        onClick={() => handleBreadcrumbClick('effort')}
                        className={`${chartState.type === 'value' ? 'text-gray-600' : 'text-blue-600 hover:text-blue-800'}`}
                      >
                        {chartState.filter.effort}
                      </button>
                    </>
                  )}
                </nav>
              </div>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                {getPieData().length > 0 ? (
                  <PieChartComponent 
                    data={getPieData()} 
                    onSliceClick={handleChartClick}
                    title={getChartTitle()}
                  />
                ) : (
                  <div className="flex items-center justify-center h-full text-gray-500">
                    No data available
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Recent Opportunities Card */}
          <Card className="bg-white">
            <CardHeader>
              <CardTitle>Recent Opportunities</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-4 mb-4">
                <Input
                  placeholder="Search opportunities..."
                  value={searchTerm}
                  onChange={(e) => {
                    console.log('Search term changed:', e.target.value);
                    setSearchTerm(e.target.value);
                  }}
                  className="max-w-sm"
                />
                <Select
                  value={typeFilter}
                  onValueChange={(value) => {
                    console.log('Type filter changed:', value);
                    setTypeFilter(value);
                  }}
                >
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="All types" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All types</SelectItem>
                    {uniqueTypes
                      .filter(t => t !== 'all')
                      .sort()
                      .map(type => (
                        <SelectItem key={type} value={type}>
                          {type}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
                <Select
                  value={scopeFilter}
                  onValueChange={(value) => {
                    console.log('Scope filter changed:', value);
                    setScopeFilter(value);
                  }}
                >
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="All scopes" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All scopes</SelectItem>
                    {uniqueScopes
                      .filter(s => s !== 'all')
                      .sort()
                      .map(scope => (
                        <SelectItem key={scope} value={scope}>
                          {scope}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead 
                      onClick={() => requestSort('title')}
                      className="cursor-pointer hover:bg-gray-50"
                    >
                      Title
                      {sortConfig?.key === 'title' && (
                        <span className="ml-2">
                          {sortConfig.direction === 'asc' ? '↑' : '↓'}
                        </span>
                      )}
                    </TableHead>
                    <TableHead 
                      onClick={() => requestSort('type')}
                      className="cursor-pointer hover:bg-gray-50"
                    >
                      Type
                      {sortConfig?.key === 'type' && (
                        <span className="ml-2">
                          {sortConfig.direction === 'asc' ? '↑' : '↓'}
                        </span>
                      )}
                    </TableHead>
                    <TableHead 
                      onClick={() => requestSort('confidence_score')}
                      className="cursor-pointer hover:bg-gray-50"
                    >
                      Confidence
                      {sortConfig?.key === 'confidence_score' && (
                        <span className="ml-2">
                          {sortConfig.direction === 'asc' ? '↑' : '↓'}
                        </span>
                      )}
                    </TableHead>
                    <TableHead 
                      onClick={() => requestSort('scope')}
                      className="cursor-pointer hover:bg-gray-50"
                    >
                      Scope
                      {sortConfig?.key === 'scope' && (
                        <span className="ml-2">
                          {sortConfig.direction === 'asc' ? '↑' : '↓'}
                        </span>
                      )}
                    </TableHead>
                    <TableHead 
                      onClick={() => requestSort('detected_at')}
                      className="cursor-pointer hover:bg-gray-50"
                    >
                      Detected
                      {sortConfig?.key === 'detected_at' && (
                        <span className="ml-2">
                          {sortConfig.direction === 'asc' ? '↑' : '↓'}
                        </span>
                      )}
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedOpportunities.map((opportunity) => (
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

              {/* Pagination Controls */}
              <div className="mt-4 flex items-center justify-between border-t border-gray-200 bg-white px-4 py-3 sm:px-6">
                <div className="flex flex-1 justify-between sm:hidden">
                  <button
                    onClick={() => setCurrentPage(page => Math.max(1, page - 1))}
                    disabled={currentPage === 1}
                    className="relative inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => setCurrentPage(page => Math.min(totalPages, page + 1))}
                    disabled={currentPage === totalPages}
                    className="relative ml-3 inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                  >
                    Next
                  </button>
                </div>
                <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm text-gray-700">
                      Showing <span className="font-medium">{Math.min((currentPage - 1) * itemsPerPage + 1, filteredAndSortedOpportunities.length)}</span> to{' '}
                      <span className="font-medium">{Math.min(currentPage * itemsPerPage, filteredAndSortedOpportunities.length)}</span> of{' '}
                      <span className="font-medium">{filteredAndSortedOpportunities.length}</span> results
                    </p>
                  </div>
                  <div>
                    <nav className="isolate inline-flex -space-x-px rounded-md shadow-sm" aria-label="Pagination">
                      <button
                        onClick={() => setCurrentPage(page => Math.max(1, page - 1))}
                        disabled={currentPage === 1}
                        className="relative inline-flex items-center rounded-l-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50"
                      >
                        <span className="sr-only">Previous</span>
                        <ChevronRightIcon className="h-5 w-5 rotate-180" aria-hidden="true" />
                      </button>
                      {/* Page Numbers */}
                      {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                        let pageNumber;
                        if (totalPages <= 5) {
                          pageNumber = i + 1;
                        } else if (currentPage <= 3) {
                          pageNumber = i + 1;
                        } else if (currentPage >= totalPages - 2) {
                          pageNumber = totalPages - 4 + i;
                        } else {
                          pageNumber = currentPage - 2 + i;
                        }
                        
                        return (
                          <button
                            key={pageNumber}
                            onClick={() => setCurrentPage(pageNumber)}
                            className={`relative inline-flex items-center px-4 py-2 text-sm font-semibold ${
                              currentPage === pageNumber
                                ? 'z-10 bg-indigo-600 text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600'
                                : 'text-gray-900 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:outline-offset-0'
                            }`}
                          >
                            {pageNumber}
                          </button>
                        );
                      })}
                      <button
                        onClick={() => setCurrentPage(page => Math.min(totalPages, page + 1))}
                        disabled={currentPage === totalPages}
                        className="relative inline-flex items-center rounded-r-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50"
                      >
                        <span className="sr-only">Next</span>
                        <ChevronRightIcon className="h-5 w-5" aria-hidden="true" />
                      </button>
                    </nav>
                  </div>
                </div>
              </div>
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
              <div className="flex items-center gap-4">
                <Badge variant="secondary" className="bg-gray-100 text-gray-800">
                  {previewData.opportunity.type}
                </Badge>
                <Badge variant="secondary" className="bg-gray-100 text-gray-800">
                  {previewData.opportunity.scope}
                </Badge>
                <Badge variant="secondary" className="bg-green-100 text-green-800">
                  Confidence: {(previewData.opportunity.confidence_score * 100).toFixed(0)}%
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
    </div>
  );
} 