import { ConfigurationError } from '../utils/errors.js';

interface ConfigKey {
  key: string;
  validator?: (value: string) => boolean;
}

type ValidatorFunction = (value: string) => boolean;

interface Validators {
  isPositiveInteger: ValidatorFunction;
  isBoolean: ValidatorFunction;
  isSlackToken: ValidatorFunction;
  isSlackTeamId: ValidatorFunction;
  isFilePath: ValidatorFunction;
}

interface ConfigSchemas {
  database: ConfigKey[];
  slack: ConfigKey[];
  application: ConfigKey[];
}

export function validateConfig(requiredKeys: ConfigKey[]): void {
  const missingKeys: string[] = [];
  const invalidValues: string[] = [];

  for (const { key, validator } of requiredKeys) {
    const value = process.env[key];
    
    // Check if key exists
    if (value === undefined) {
      missingKeys.push(key);
      continue;
    }

    // If validator provided, check value
    if (validator && !validator(value)) {
      invalidValues.push(key);
    }
  }

  if (missingKeys.length > 0 || invalidValues.length > 0) {
    throw new ConfigurationError('Invalid configuration', {
      missingKeys,
      invalidValues
    });
  }
}

// Validator functions
export const validators: Validators = {
  isPositiveInteger: (value: string): boolean => {
    const num = parseInt(value, 10);
    return !isNaN(num) && num > 0;
  },

  isBoolean: (value: string): boolean => {
    return value === 'true' || value === 'false';
  },

  isSlackToken: (value: string): boolean => {
    return value.startsWith('xoxb-');
  },

  isSlackTeamId: (value: string): boolean => {
    return value.startsWith('T');
  },

  isFilePath: (value: string): boolean => {
    return typeof value === 'string' && value.length > 0;
  }
};

// Configuration schemas
export const configSchemas: ConfigSchemas = {
  database: [
    { key: 'DB_PATH', validator: validators.isFilePath }
  ],

  slack: [
    { key: 'SLACK_BOT_TOKEN', validator: validators.isSlackToken },
    { key: 'SLACK_TEAM_ID', validator: validators.isSlackTeamId }
  ],

  application: [
    { key: 'BATCH_SIZE', validator: validators.isPositiveInteger },
    { key: 'DEBUG', validator: validators.isBoolean },
    { key: 'SLACK_MESSAGE_LIMIT', validator: validators.isPositiveInteger },
    { key: 'GDOCS_LIMIT', validator: validators.isPositiveInteger }
  ]
}; 