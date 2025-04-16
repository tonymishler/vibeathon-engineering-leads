interface ErrorDetails {
  [key: string]: any;
}

export class BaseError extends Error {
  code: string;
  details: ErrorDetails;

  constructor(message: string, code: string, details: ErrorDetails = {}) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.details = details;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class DatabaseError extends BaseError {
  constructor(message: string, details: ErrorDetails = {}) {
    super(message, 'DB_ERROR', details);
  }
}

export class SlackError extends BaseError {
  constructor(message: string, details: ErrorDetails = {}) {
    super(message, 'SLACK_ERROR', details);
  }
}

export class GeminiError extends BaseError {
  constructor(message: string, details: ErrorDetails = {}) {
    super(message, 'GEMINI_ERROR', details);
  }
}

export class ValidationError extends BaseError {
  constructor(message: string, details: ErrorDetails = {}) {
    super(message, 'VALIDATION_ERROR', details);
  }
}

export class ConfigurationError extends BaseError {
  constructor(message: string, details: ErrorDetails = {}) {
    super(message, 'CONFIG_ERROR', details);
  }
} 