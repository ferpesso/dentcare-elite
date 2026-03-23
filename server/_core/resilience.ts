
/**
 * 🛡️ RESILIENCE MODULE - ELITE EDITION
 * Circuit Breaker robusto com estados CLOSED, OPEN e HALF-OPEN
 */
export class CircuitBreaker {
  private state: 'CLOSED' | 'OPEN' | 'HALF-OPEN' = 'CLOSED';
  private failures = 0;
  private lastFailure = 0;
  private threshold = 3;
  private timeout = 30000; // 30 segundos
  private successThreshold = 2; // Sucessos necessários em HALF-OPEN para fechar o circuito
  private successes = 0;

  async execute<T>(action: () => Promise<T>, fallback: T): Promise<T> {
    if (this.state === 'OPEN') {
      if (Date.now() - this.lastFailure > this.timeout) {
        console.log('[CircuitBreaker] Transitioning to HALF-OPEN');
        this.state = 'HALF-OPEN';
        this.successes = 0;
      } else {
        return fallback;
      }
    }

    try {
      const result = await action();
      
      if (this.state === 'HALF-OPEN') {
        this.successes++;
        if (this.successes >= this.successThreshold) {
          console.log('[CircuitBreaker] Circuit CLOSED - Recovery successful');
          this.state = 'CLOSED';
          this.failures = 0;
        }
      } else {
        this.failures = 0;
      }
      
      return result;
    } catch (e) {
      this.failures++;
      this.lastFailure = Date.now();
      
      if (this.state === 'HALF-OPEN' || this.failures >= this.threshold) {
        console.warn(`[CircuitBreaker] Circuit OPEN - Failures: ${this.failures}`);
        this.state = 'OPEN';
      }
      
      return fallback;
    }
  }
}

export const aiCircuit = new CircuitBreaker();
export const dbCircuit = new CircuitBreaker();
