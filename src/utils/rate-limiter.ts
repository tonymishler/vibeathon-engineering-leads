export class RateLimiter {
  private maxRequests: number;
  private timeWindow: number;
  private requests: number[];

  constructor(maxRequests: number, timeWindow: number) {
    this.maxRequests = maxRequests;
    this.timeWindow = timeWindow;
    this.requests = [];
  }

  async waitForSlot(): Promise<void> {
    const now = Date.now();
    
    // Remove expired timestamps
    this.requests = this.requests.filter(timestamp => 
      now - timestamp < this.timeWindow
    );

    if (this.requests.length >= this.maxRequests) {
      // Calculate wait time
      const oldestRequest = this.requests[0];
      const waitTime = this.timeWindow - (now - oldestRequest);
      await new Promise(resolve => setTimeout(resolve, waitTime));
      return this.waitForSlot(); // Recursively check again
    }

    this.requests.push(now);
  }

  async wrap<T>(fn: () => T | Promise<T>): Promise<T> {
    await this.waitForSlot();
    return fn();
  }
} 