import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { getOpportunities } from "@/lib/db";
import { format } from "date-fns";
import Link from "next/link";

export default async function OpportunitiesPage() {
  const opportunities = await getOpportunities();

  return (
    <div className="container mx-auto py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">All Opportunities</h1>
        <p className="text-gray-600">View and manage all detected opportunities</p>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Confidence</TableHead>
                <TableHead>Scope</TableHead>
                <TableHead>Effort</TableHead>
                <TableHead>Value</TableHead>
                <TableHead>Detected</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {opportunities.map((opp) => (
                <TableRow key={opp.opportunity_id}>
                  <TableCell className="font-medium">
                    <Link
                      href={`/opportunities/${opp.opportunity_id}`}
                      className="text-blue-600 hover:underline"
                    >
                      {opp.title}
                    </Link>
                  </TableCell>
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
                  <TableCell>{opp.effort_estimate}</TableCell>
                  <TableCell>{opp.potential_value}</TableCell>
                  <TableCell>
                    {format(new Date(opp.detected_at), 'MMM d, yyyy')}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        opp.status === 'new'
                          ? 'default'
                          : opp.status === 'in_progress'
                          ? 'secondary'
                          : 'outline'
                      }
                    >
                      {opp.status}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
} 