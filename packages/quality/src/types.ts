/**
 * Quality Rules Types
 */

export type ReputationTier = 'trusted' | 'verified' | 'unverified' | 'risky' | 'blocked';
export type ViolationAction = 'reject' | 'quarantine' | 'flag' | 'allow';
export type CredibilityLevel = 'trusted' | 'verified' | 'unverified' | 'risky' | 'blocked';
export type BiasRating = 'left' | 'center-left' | 'center' | 'center-right' | 'right';

export interface SourceReputation {
  source: string;
  score: number;
  credibility?: CredibilityLevel;
  bias?: BiasRating;
  reason: string;
}

export interface QualityRules {
  version: string;
  last_updated: string;
  reputation: {
    [domain: string]: {
      trusted?: SourceReputation[];
      verified?: SourceReputation[];
      risky?: SourceReputation[];
      blocked?: Array<{ source: string; reason: string }>;
    };
  };
  filters: {
    min_reputation_score: number;
    [domain: string]: any;
  };
  blocklists: {
    spam_keywords: string[];
    sensitive_topics: string[];
    [key: string]: string[];
  };
  allowlists: {
    trusted_domains: string[];
    verified_creators: {
      [domain: string]: string[];
    };
  };
  thresholds: {
    ingest: {
      min_reputation: number;
      min_content_quality: number;
    };
    ranking: {
      min_reputation: number;
      min_content_quality: number;
    };
    featured: {
      min_reputation: number;
      min_content_quality: number;
    };
  };
  actions: {
    [violation: string]: {
      action: ViolationAction;
      notify?: boolean;
      log?: boolean;
      manual_review?: boolean;
      require_disclaimer?: boolean;
    };
  };
}

export interface QualityViolation {
  type: 'reputation' | 'blocklist' | 'filter' | 'threshold';
  severity: 'critical' | 'high' | 'medium' | 'low';
  message: string;
  field?: string;
  value?: any;
  recommendation?: string;
}

export interface QualityCheckResult {
  passed: boolean;
  score: number;
  tier: ReputationTier;
  violations: QualityViolation[];
  action: ViolationAction;
  metadata: {
    source_reputation?: number;
    content_quality?: number;
    flags: string[];
  };
}
