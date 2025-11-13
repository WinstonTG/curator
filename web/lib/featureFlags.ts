/**
 * Feature Flags Utility
 *
 * Simple environment-based feature flags for MVP.
 * Future: Integrate with LaunchDarkly or similar service.
 */

export interface FeatureFlags {
  FEATURE_PRIVACY: boolean;
  FEATURE_EMBEDDINGS: boolean;
  FEATURE_VECTOR_SEARCH: boolean;
  FEATURE_CONTEXT_ENGINE: boolean;
  FEATURE_NOVELTY_BOOST: boolean;
}

/**
 * Get feature flag values from environment variables
 * Defaults to false for safety
 */
function getFeatureFlags(): FeatureFlags {
  return {
    FEATURE_PRIVACY: process.env.NEXT_PUBLIC_FEATURE_PRIVACY === 'true',
    FEATURE_EMBEDDINGS: process.env.NEXT_PUBLIC_FEATURE_EMBEDDINGS === 'true',
    FEATURE_VECTOR_SEARCH: process.env.NEXT_PUBLIC_FEATURE_VECTOR_SEARCH === 'true',
    FEATURE_CONTEXT_ENGINE: process.env.NEXT_PUBLIC_FEATURE_CONTEXT_ENGINE === 'true',
    FEATURE_NOVELTY_BOOST: process.env.NEXT_PUBLIC_FEATURE_NOVELTY_BOOST === 'true',
  };
}

/**
 * Server-side feature flags (can access all env vars)
 */
export function getServerFeatureFlags(): FeatureFlags {
  return {
    FEATURE_PRIVACY: process.env.FEATURE_PRIVACY === 'true',
    FEATURE_EMBEDDINGS: process.env.FEATURE_EMBEDDINGS === 'true',
    FEATURE_VECTOR_SEARCH: process.env.FEATURE_VECTOR_SEARCH === 'true',
    FEATURE_CONTEXT_ENGINE: process.env.FEATURE_CONTEXT_ENGINE === 'true',
    FEATURE_NOVELTY_BOOST: process.env.FEATURE_NOVELTY_BOOST === 'true',
  };
}

/**
 * Client-side feature flags (only NEXT_PUBLIC_* vars)
 */
export const featureFlags = getFeatureFlags();

/**
 * Check if a specific feature is enabled
 */
export function isFeatureEnabled(feature: keyof FeatureFlags): boolean {
  return featureFlags[feature] === true;
}

/**
 * HOC to conditionally render components based on feature flags
 */
export function withFeatureFlag<P extends object>(
  Component: React.ComponentType<P>,
  feature: keyof FeatureFlags,
  fallback?: React.ReactNode
) {
  return function FeatureFlaggedComponent(props: P) {
    if (isFeatureEnabled(feature)) {
      return <Component {...props} />;
    }
    return <>{fallback || null}</>;
  };
}

/**
 * Hook to check feature flags in React components
 */
export function useFeatureFlag(feature: keyof FeatureFlags): boolean {
  return isFeatureEnabled(feature);
}

/**
 * Get all enabled features (for debugging)
 */
export function getEnabledFeatures(): string[] {
  return Object.entries(featureFlags)
    .filter(([_, enabled]) => enabled)
    .map(([feature]) => feature);
}
