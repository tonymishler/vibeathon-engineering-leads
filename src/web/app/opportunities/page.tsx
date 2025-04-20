"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { OpportunitiesTable } from '@/components/OpportunitiesTable';
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";

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

export default function OpportunitiesPage() {
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [scopeFilter, setScopeFilter] = useState('all');
  const itemsPerPage = 10;
  const router = useRouter();

  // Get unique types and scopes
  const uniqueTypes = useMemo(() => {
    const types = new Set(opportunities.map(opp => opp.type));
    return ['all', ...Array.from(types)].filter(Boolean);
  }, [opportunities]);
  
  const uniqueScopes = useMemo(() => {
    const scopes = new Set(opportunities.map(opp => opp.scope));
    return ['all', ...Array.from(scopes)].filter(Boolean);
  }, [opportunities]);

  // Filter opportunities
  const filteredOpportunities = useMemo(() => {
    let filtered = [...opportunities];

    // Apply search filter
    if (searchTerm.trim()) {
      const searchLower = searchTerm.toLowerCase().trim();
      filtered = filtered.filter(opp => 
        opp.title.toLowerCase().includes(searchLower) ||
        (opp.description || '').toLowerCase().includes(searchLower) ||
        opp.type.toLowerCase().includes(searchLower) ||
        opp.scope.toLowerCase().includes(searchLower)
      );
    }

    // Apply type filter
    if (typeFilter && typeFilter !== 'all') {
      filtered = filtered.filter(opp => opp.type === typeFilter);
    }

    // Apply scope filter
    if (scopeFilter && scopeFilter !== 'all') {
      filtered = filtered.filter(opp => opp.scope === scopeFilter);
    }

    return filtered;
  }, [opportunities, searchTerm, typeFilter, scopeFilter]);

  // Calculate pagination
  const totalPages = Math.ceil(filteredOpportunities.length / itemsPerPage);
  const paginatedOpportunities = filteredOpportunities.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  useEffect(() => {
    async function fetchOpportunities() {
      try {
        const response = await fetch('/api/opportunities');
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        setOpportunities(data.opportunities || []);
      } catch (err) {
        console.error('Error fetching opportunities:', err);
        setError('Failed to load opportunities. Please try again later.');
        setOpportunities([]);
      } finally {
        setLoading(false);
      }
    }

    fetchOpportunities();
  }, []);

  const handleOpportunityClick = (opportunityId: string) => {
    router.push(`/opportunities/${opportunityId}`);
  };

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

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto py-6">
        <h1 className="text-2xl font-semibold mb-6">Opportunities</h1>
        
        <div className="flex gap-4 mb-6">
          <div className="relative">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search opportunities..."
              className="w-96 rounded-md border-0 py-1.5 pl-3 pr-10 text-gray-900 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6 bg-black/5"
            />
          </div>
          
          <div className="flex items-center gap-2">
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="block rounded-md border-0 py-1.5 pl-3 pr-10 text-gray-600 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-indigo-600 sm:text-sm sm:leading-6 bg-black/5"
              aria-label="Filter by type"
              title="Filter opportunities by type"
            >
              <option value="all">All types</option>
              {uniqueTypes
                .filter(t => t !== 'all')
                .sort()
                .map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
            </select>
          </div>
          
          <div className="flex items-center gap-2">
            <select
              value={scopeFilter}
              onChange={(e) => setScopeFilter(e.target.value)}
              className="block rounded-md border-0 py-1.5 pl-3 pr-10 text-gray-600 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-indigo-600 sm:text-sm sm:leading-6 bg-black/5"
              aria-label="Filter by scope"
              title="Filter opportunities by scope"
            >
              <option value="all">All scopes</option>
              {uniqueScopes
                .filter(s => s !== 'all')
                .sort()
                .map(scope => (
                  <option key={scope} value={scope}>{scope}</option>
                ))}
            </select>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Title
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Type
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Scope
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Confidence
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Detected
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {paginatedOpportunities.map((opportunity) => (
                <tr
                  key={opportunity.opportunity_id}
                  onClick={() => handleOpportunityClick(opportunity.opportunity_id)}
                  className="hover:bg-gray-50 cursor-pointer"
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{opportunity.title}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <Badge variant="outline" className="capitalize">
                      {opportunity.type}
                    </Badge>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="capitalize">{opportunity.scope}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="w-32 bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-500 h-2 rounded-full"
                        style={{ width: `${opportunity.confidence_score * 100}%` }}
                      />
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {format(new Date(opportunity.detected_at), 'MMM d, yyyy')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="mt-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage(page => Math.max(1, page - 1))}
              disabled={currentPage === 1}
              className="px-3 py-1 rounded border border-gray-300 disabled:opacity-50"
              aria-label="Previous page"
              title="Go to previous page"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <span className="text-sm text-gray-600">
              Page {currentPage} of {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage(page => Math.min(totalPages, page + 1))}
              disabled={currentPage === totalPages}
              className="px-3 py-1 rounded border border-gray-300 disabled:opacity-50"
              aria-label="Next page"
              title="Go to next page"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
} 