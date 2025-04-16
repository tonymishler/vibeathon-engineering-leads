export class RateLimiter {
  constructor(maxRequests, timeWindowMs) {
    this.maxRequests = maxRequests;
    this.timeWindowMs = timeWindowMs;
    this.requests = [];
  }

  async waitForSlot() {
    const now = Date.now();
    
    // Remove expired timestamps
    this.requests = this.requests.filter(
      timestamp => now - timestamp < this.timeWindowMs
    );

    if (this.requests.length >= this.maxRequests) {
      // Calculate wait time
      const oldestRequest = this.requests[0];
      const waitTime = this.timeWindowMs - (now - oldestRequest);
      
      // Wait for a slot to open up
      await new Promise(resolve => setTimeout(resolve, waitTime));
      
      // Recursively check again (in case other requests came in while waiting)
      return this.waitForSlot();
    }

    // Add current request
    this.requests.push(now);
  }

  async wrap(fn) {
    await this.waitForSlot();
    return fn();
  }
}

// Preconfigured rate limiters for different services
export const rateLimiters = {
  slack: new RateLimiter(50, 60000),  // 50 requests per minute
  gemini: new RateLimiter(10, 1000),  // 10 requests per second
  database: new RateLimiter(100, 1000) // 100 requests per second
}; 