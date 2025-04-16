export class Opportunity {
  constructor({
    id = null,
    sourceType,
    sourceId,
    description,
    confidenceScore,
    status = 'new',
    identifiedAt = new Date(),
    reviewedAt = null,
    notes = ''
  }) {
    this.id = id;
    this.sourceType = this.validateSourceType(sourceType);
    this.sourceId = sourceId;
    this.description = description;
    this.confidenceScore = this.validateConfidenceScore(confidenceScore);
    this.status = this.validateStatus(status);
    this.identifiedAt = this.validateTimestamp(identifiedAt);
    this.reviewedAt = reviewedAt ? this.validateTimestamp(reviewedAt) : null;
    this.notes = notes;
  }

  validateSourceType(sourceType) {
    const validTypes = ['slack', 'gdocs'];
    if (!validTypes.includes(sourceType)) {
      throw new Error(`Invalid source type: ${sourceType}. Must be one of: ${validTypes.join(', ')}`);
    }
    return sourceType;
  }

  validateConfidenceScore(score) {
    const numScore = parseFloat(score);
    if (isNaN(numScore) || numScore < 0 || numScore > 1) {
      throw new Error(`Invalid confidence score: ${score}. Must be between 0 and 1`);
    }
    return numScore;
  }

  validateStatus(status) {
    const validStatuses = ['new', 'reviewed', 'approved', 'rejected'];
    if (!validStatuses.includes(status)) {
      throw new Error(`Invalid status: ${status}. Must be one of: ${validStatuses.join(', ')}`);
    }
    return status;
  }

  validateTimestamp(timestamp) {
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
      id: this.id,
      sourceType: this.sourceType,
      sourceId: this.sourceId,
      description: this.description,
      confidenceScore: this.confidenceScore,
      status: this.status,
      identifiedAt: this.identifiedAt.toISOString(),
      reviewedAt: this.reviewedAt?.toISOString() || null,
      notes: this.notes
    };
  }

  // Create from database record
  static fromDatabase(record) {
    return new Opportunity({
      id: record.opportunity_id,
      sourceType: record.source_type,
      sourceId: record.source_id,
      description: record.opportunity_description,
      confidenceScore: record.confidence_score,
      status: record.status,
      identifiedAt: record.identified_at,
      reviewedAt: record.reviewed_at,
      notes: record.notes
    });
  }

  // Create from Gemini API response
  static fromGeminiResponse(response, source) {
    return new Opportunity({
      sourceType: source.type,
      sourceId: source.id,
      description: response.description,
      confidenceScore: response.confidence || 0.5,
      status: 'new'
    });
  }

  // Helper method to check if opportunity is high confidence
  isHighConfidence(threshold = 0.8) {
    return this.confidenceScore >= threshold;
  }

  // Helper method to check if opportunity needs review
  needsReview() {
    return this.status === 'new';
  }

  // Helper method to mark as reviewed
  markAsReviewed(status, notes = '') {
    this.status = this.validateStatus(status);
    this.reviewedAt = new Date();
    this.notes = notes;
  }
} 