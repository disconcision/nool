import { createHazelIntegration, HazelIntegrationConfig } from "./hazel-integration-base";
import { createBasicResize } from "./resize-strategies";

/**
 * Nool-specific Hazel integration
 * Uses basic resize strategy for the expression editor
 */

export function useHazelIntegration(config: Omit<HazelIntegrationConfig, 'resizeStrategy'>) {
  return createHazelIntegration({
    ...config,
    resizeStrategy: createBasicResize(),
  });
}