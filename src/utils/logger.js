// Simple logger utility with colored output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m'
};

export const logger = {
  info: (message, ...args) => {
    console.log(`${colors.blue}ℹ${colors.reset} ${message}`, ...args);
  },
  success: (message, ...args) => {
    console.log(`${colors.green}✓${colors.reset} ${message}`, ...args);
  },
  warn: (message, ...args) => {
    console.log(`${colors.yellow}⚠${colors.reset} ${message}`, ...args);
  },
  error: (message, ...args) => {
    console.error(`${colors.red}✗${colors.reset} ${message}`, ...args);
  },
  debug: (message, ...args) => {
    if (process.env.DEBUG) {
      console.log(`${colors.magenta}🔍${colors.reset} ${message}`, ...args);
    }
  }
}; 