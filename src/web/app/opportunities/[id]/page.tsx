import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getOpportunityById, getOpportunityEvidence } from "@/lib/db";
import { format } from "date-fns";
import { notFound } from "next/navigation";

interface Props {
  params: {
    id: string;
  };
}

export default async function OpportunityPage({ params }: Props) {
  const opportunity = await getOpportunityById(params.id);
  if (!opportunity) {
    notFound();
  }

  const evidence = await getOpportunityEvidence(params.id);

  return (
    <div className="container mx-auto py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">{opportunity.title}</h1>
        <div className="flex gap-2">
          <Badge variant="outline">{opportunity.type}</Badge>
          <Badge variant="outline">{opportunity.scope}</Badge>
          <Badge variant="outline">
            Confidence: {(opportunity.confidence_score * 100).toFixed(0)}%
          </Badge>
        </div>
      </div>

      <div className="grid gap-8">
        {/* Opportunity Details */}
        <Card>
          <CardHeader>
            <CardTitle>Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="font-semibold mb-2">Description</h3>
              <p className="text-gray-700">{opportunity.description}</p>
            </div>
            <div>
              <h3 className="font-semibold mb-2">Implicit Insights</h3>
              <p className="text-gray-700">{opportunity.implicit_insights}</p>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <h3 className="font-semibold mb-2">Effort Estimate</h3>
                <p className="text-gray-700">{opportunity.effort_estimate}</p>
              </div>
              <div>
                <h3 className="font-semibold mb-2">Potential Value</h3>
                <p className="text-gray-700">{opportunity.potential_value}</p>
              </div>
              <div>
                <h3 className="font-semibold mb-2">Status</h3>
                <p className="text-gray-700">{opportunity.status}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <h3 className="font-semibold mb-2">Detected</h3>
                <p className="text-gray-700">
                  {format(new Date(opportunity.detected_at), 'MMM d, yyyy')}
                </p>
              </div>
              <div>
                <h3 className="font-semibold mb-2">Last Updated</h3>
                <p className="text-gray-700">
                  {format(new Date(opportunity.last_updated), 'MMM d, yyyy')}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Evidence */}
        <Card>
          <CardHeader>
            <CardTitle>Evidence</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {evidence.map((ev) => (
                <div key={ev.evidence_id} className="border rounded-lg p-4">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <p className="font-medium">{ev.author}</p>
                      <p className="text-sm text-gray-500">
                        {format(new Date(ev.timestamp), 'MMM d, yyyy')}
                      </p>
                    </div>
                  </div>
                  <p className="text-gray-700 mb-2">{ev.content}</p>
                  {ev.relevance_note && (
                    <div className="bg-blue-50 p-2 rounded">
                      <p className="text-sm text-blue-700">{ev.relevance_note}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 