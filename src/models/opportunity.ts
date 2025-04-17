export interface OpportunityConstructorParams {
  id?: string;
  type: 'feature' | 'integration' | 'automation' | 'optimization';
  title: string;
  description: string;
  evidence: Array<{
    message_id: string;
    author: string;
    timestamp: Date;
    content: string;
    relevance_note: string;
  }>;
  key_participants: string[];
  implicit_insights: string;
  potential_solutions: string[];
  confidence_score: number;
  impact_assessment: {
    scope: 'team' | 'department' | 'organization';
    effort_estimate: 'small' | 'medium' | 'large';
    potential_value: 'low' | 'medium' | 'high';
  };
  context_id: string;
  status?: string;
  detected_at?: Date;
  last_updated?: Date;
}

export class Opportunity {
  readonly id: string;
  readonly type: string;
  readonly title: string;
  readonly description: string;
  readonly evidence: Array<{
    message_id: string;
    author: string;
    timestamp: Date;
    content: string;
    relevance_note: string;
  }>;
  readonly key_participants: string[];
  readonly implicit_insights: string;
  readonly potential_solutions: string[];
  readonly confidence_score: number;
  readonly impact_assessment: {
    scope: string;
    effort_estimate: string;
    potential_value: string;
  };
  readonly context_id: string;
  status: string;
  detected_at: Date;
  last_updated: Date;

  constructor(params: OpportunityConstructorParams) {
    this.id = params.id || `opp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    this.type = this.validateType(params.type);
    this.title = params.title;
    this.description = params.description;
    this.evidence = params.evidence.map(e => ({
      ...e,
      timestamp: this.validateTimestamp(e.timestamp)
    }));
    this.key_participants = params.key_participants;
    this.implicit_insights = params.implicit_insights;
    this.potential_solutions = params.potential_solutions;
    this.confidence_score = this.validateConfidenceScore(params.confidence_score);
    this.impact_assessment = this.validateImpactAssessment(params.impact_assessment);
    this.context_id = params.context_id;
    this.status = params.status || 'pending';
    this.detected_at = params.detected_at || new Date();
    this.last_updated = params.last_updated || new Date();
  }

  private validateType(type: string): string {
    const validTypes = ['feature', 'integration', 'automation', 'optimization'];
    if (!validTypes.includes(type)) {
      throw new Error(`Invalid opportunity type: ${type}. Must be one of: ${validTypes.join(', ')}`);
    }
    return type;
  }

  private validateConfidenceScore(score: number): number {
    if (typeof score !== 'number' || score < 0 || score > 1) {
      throw new Error(`Invalid confidence score: ${score}. Must be between 0 and 1`);
    }
    return score;
  }

  private validateImpactAssessment(assessment: OpportunityConstructorParams['impact_assessment']): typeof assessment {
    const validScopes = ['team', 'department', 'organization'];
    const validEfforts = ['small', 'medium', 'large'];
    const validValues = ['low', 'medium', 'high'];

    if (!validScopes.includes(assessment.scope)) {
      throw new Error(`Invalid scope: ${assessment.scope}. Must be one of: ${validScopes.join(', ')}`);
    }
    if (!validEfforts.includes(assessment.effort_estimate)) {
      throw new Error(`Invalid effort estimate: ${assessment.effort_estimate}. Must be one of: ${validEfforts.join(', ')}`);
    }
    if (!validValues.includes(assessment.potential_value)) {
      throw new Error(`Invalid potential value: ${assessment.potential_value}. Must be one of: ${validValues.join(', ')}`);
    }

    return assessment;
  }

  private validateTimestamp(timestamp: Date | string): Date {
    if (timestamp instanceof Date) {
      return timestamp;
    }
    const date = new Date(timestamp);
    if (isNaN(date.getTime())) {
      throw new Error(`Invalid timestamp format: ${timestamp}`);
    }
    return date;
  }

  // Convert to database format
  toDatabase() {
    return {
      opportunity_id: this.id,
      type: this.type,
      title: this.title,
      description: this.description,
      implicit_insights: this.implicit_insights,
      key_participants: JSON.stringify(this.key_participants),
      potential_solutions: JSON.stringify(this.potential_solutions),
      confidence_score: this.confidence_score,
      scope: this.impact_assessment.scope,
      effort_estimate: this.impact_assessment.effort_estimate,
      potential_value: this.impact_assessment.potential_value,
      status: this.status,
      context_id: this.context_id,
      detected_at: this.detected_at.toISOString(),
      last_updated: this.last_updated.toISOString()
    };
  }

  // Create from database record
  static fromDatabase(record: any): Opportunity {
    return new Opportunity({
      id: record.opportunity_id,
      type: record.type,
      title: record.title,
      description: record.description,
      evidence: [], // Evidence needs to be loaded separately
      key_participants: JSON.parse(record.key_participants || '[]'),
      implicit_insights: record.implicit_insights,
      potential_solutions: JSON.parse(record.potential_solutions || '[]'),
      confidence_score: record.confidence_score,
      impact_assessment: {
        scope: record.scope,
        effort_estimate: record.effort_estimate,
        potential_value: record.potential_value
      },
      context_id: record.context_id,
      status: record.status,
      detected_at: new Date(record.detected_at),
      last_updated: new Date(record.last_updated)
    });
  }

  // Create from Gemini API response
  static fromGeminiResponse(response: any, contextId: string): Opportunity {
    return new Opportunity({
      type: response.type,
      title: response.title,
      description: response.description,
      evidence: response.evidence.map((e: any) => ({
        message_id: e.message_id,
        author: e.author,
        timestamp: new Date(e.timestamp),
        content: e.content,
        relevance_note: e.relevance_note
      })),
      key_participants: response.key_participants || [],
      implicit_insights: response.implicit_insights,
      potential_solutions: response.potential_solutions || [],
      confidence_score: response.confidence_score,
      impact_assessment: response.impact_assessment,
      context_id: contextId
    });
  }

  // Helper method to check if opportunity is high confidence
  isHighConfidence(threshold = 0.8): boolean {
    return this.confidence_score >= threshold;
  }

  // Helper method to check if opportunity needs review
  needsReview(): boolean {
    return this.status === 'pending';
  }

  // Helper method to mark as reviewed
  markAsReviewed(newStatus: string, notes?: string): void {
    const validStatuses = ['approved', 'rejected', 'needs_more_info'];
    if (!validStatuses.includes(newStatus)) {
      throw new Error(`Invalid status: ${newStatus}. Must be one of: ${validStatuses.join(', ')}`);
    }
    this.status = newStatus;
    this.last_updated = new Date();
  }
} 