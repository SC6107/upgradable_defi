/**
 * Common type definitions shared across modules.
 */

export interface HealthStatus {
  chainId: number;
  latestBlock: number;
  indexedToBlock: number;
}
