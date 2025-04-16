interface Colors {
  reset: string;
  bright: string;
  red: string;
  green: string;
  yellow: string;
  blue: string;
  magenta: string;
}

const colors: Colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m'
};

interface Logger {
  info(message: string, ...args: any[]): void;
  success(message: string, ...args: any[]): void;
  warn(message: string, ...args: any[]): void;
  error(message: string, ...args: any[]): void;
  debug(message: string, ...args: any[]): void;
}

export const logger: Logger = {
  info: (message: string, ...args: any[]): void => {
    console.log(`${colors.blue}ℹ${colors.reset} ${message}`, ...args);
  },
  success: (message: string, ...args: any[]): void => {
    console.log(`${colors.green}✓${colors.reset} ${message}`, ...args);
  },
  warn: (message: string, ...args: any[]): void => {
    console.log(`${colors.yellow}⚠${colors.reset} ${message}`, ...args);
  },
  error: (message: string, ...args: any[]): void => {
    console.error(`${colors.red}✗${colors.reset} ${message}`, ...args);
  },
  debug: (message: string, ...args: any[]): void => {
    if (process.env.DEBUG) {
      console.log(`${colors.magenta}🔍${colors.reset} ${message}`, ...args);
    }
  }
}; 