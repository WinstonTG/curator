/**
 * Quality Rules Engine
 * Filters and scores content based on source reputation and content quality
 */

import { readFileSync } from 'fs';
import { parse as parseYaml } from 'yaml';
import type { Item } from '@curator/types/src/item';
import type {
  QualityRules,
  QualityCheckResult,
  QualityViolation,
  ReputationTier,
  ViolationAction,
  SourceReputation,
} from './types';

export class QualityRulesEngine {
  private rules: QualityRules;

  constructor(rulesPath?: string) {
    const path = rulesPath || this.getDefaultRulesPath();
    const yamlContent = readFileSync(path, 'utf-8');
    this.rules = parseYaml(yamlContent);
  }

  /**
   * Check item quality against all rules
   */
  check(item: Item, context: 'ingest' | 'ranking' | 'featured' = 'ingest'): QualityCheckResult {
    const violations: QualityViolation[] = [];

    // 1. Check source reputation
    const reputationScore = this.checkSourceReputation(item, violations);

    // 2. Check blocklists
    this.checkBlocklists(item, violations);

    // 3. Check domain-specific filters
    this.checkDomainFilters(item, violations);

    // 4. Check thresholds for context
    const thresholdPassed = this.checkThresholds(item, context, reputationScore, violations);

    // Determine tier and action
    const tier = this.getReputationTier(reputationScore);
    const action = this.determineAction(violations, tier, thresholdPassed);

    // Calculate overall score
    const contentQuality = this.assessContentQuality(item);
    const overallScore = (reputationScore * 0.6) + (contentQuality * 0.4);

    return {
      passed: action === 'allow',
      score: overallScore,
      tier,
      violations,
      action,
      metadata: {
        source_reputation: reputationScore,
        content_quality: contentQuality,
        flags: this.getFlags(violations),
      },
    };
  }

  /**
   * Check source reputation
   */
  private checkSourceReputation(item: Item, violations: QualityViolation[]): number {
    const domain = item.domain;
    const sourceName = item.source.name;

    // Check if source is in allowlist
    if (this.isInAllowlist(item)) {
      return 100;
    }

    // Look up source in reputation database
    const domainRules = this.rules.reputation[domain];
    if (!domainRules) {
      violations.push({
        type: 'reputation',
        severity: 'low',
        message: `No reputation rules defined for domain: ${domain}`,
      });
      return item.source.reputation_score || 50; // Default to unverified
    }

    // Check if blocked
    if (domainRules.blocked) {
      const blocked = domainRules.blocked.find(b =>
        b.source.toLowerCase() === sourceName.toLowerCase()
      );
      if (blocked) {
        violations.push({
          type: 'reputation',
          severity: 'critical',
          message: `Source is blocked: ${blocked.reason}`,
          field: 'source.name',
          value: sourceName,
        });
        return 0;
      }
    }

    // Find source in reputation tiers
    const tiers = ['trusted', 'verified', 'risky'] as const;
    for (const tier of tiers) {
      const sources = domainRules[tier] as SourceReputation[] | undefined;
      if (sources) {
        const found = sources.find(s =>
          s.source.toLowerCase() === sourceName.toLowerCase()
        );
        if (found) {
          return found.score;
        }
      }
    }

    // Use item's provided reputation score or default
    const score = item.source.reputation_score || 50;

    if (score < this.rules.filters.min_reputation_score) {
      violations.push({
        type: 'reputation',
        severity: 'high',
        message: `Source reputation ${score} below minimum ${this.rules.filters.min_reputation_score}`,
        field: 'source.reputation_score',
        value: score,
        recommendation: 'Use sources with higher reputation scores',
      });
    }

    return score;
  }

  /**
   * Check if item is in allowlist
   */
  private isInAllowlist(item: Item): boolean {
    const sourceName = item.source.name;
    const sourceUrl = item.source.url;

    // Check trusted domains
    if (sourceUrl && this.rules.allowlists.trusted_domains) {
      for (const domain of this.rules.allowlists.trusted_domains) {
        if (sourceUrl.includes(domain)) {
          return true;
        }
      }
    }

    // Check verified creators
    const creators = this.rules.allowlists.verified_creators[item.domain];
    if (creators && creators.includes(sourceName)) {
      return true;
    }

    return false;
  }

  /**
   * Check blocklists
   */
  private checkBlocklists(item: Item, violations: QualityViolation[]): void {
    const textToCheck = [
      item.title,
      item.description || '',
      item.topics.join(' '),
    ].join(' ').toLowerCase();

    // Check spam keywords
    for (const keyword of this.rules.blocklists.spam_keywords) {
      if (textToCheck.includes(keyword.toLowerCase())) {
        violations.push({
          type: 'blocklist',
          severity: 'high',
          message: `Contains spam keyword: "${keyword}"`,
          field: 'content',
          value: keyword,
          recommendation: 'Remove spam keywords from content',
        });
      }
    }

    // Check sensitive topics
    for (const topic of this.rules.blocklists.sensitive_topics) {
      if (textToCheck.includes(topic.toLowerCase())) {
        violations.push({
          type: 'blocklist',
          severity: 'medium',
          message: `Contains sensitive topic: "${topic}"`,
          field: 'content',
          value: topic,
          recommendation: 'May require manual review or disclaimer',
        });
      }
    }

    // Check domain-specific blocklists
    const domainBlocklist = this.rules.blocklists[item.domain];
    if (domainBlocklist) {
      for (const keyword of domainBlocklist) {
        if (textToCheck.includes(keyword.toLowerCase())) {
          violations.push({
            type: 'blocklist',
            severity: 'high',
            message: `Contains blocked keyword for ${item.domain}: "${keyword}"`,
            field: 'content',
            value: keyword,
          });
        }
      }
    }
  }

  /**
   * Check domain-specific filters
   */
  private checkDomainFilters(item: Item, violations: QualityViolation[]): void {
    const domainFilters = this.rules.filters[item.domain];
    if (!domainFilters) return;

    switch (item.domain) {
      case 'news':
        this.checkNewsFilters(item, domainFilters, violations);
        break;
      case 'recipes':
        this.checkRecipeFilters(item, domainFilters, violations);
        break;
      case 'learning':
        this.checkLearningFilters(item, domainFilters, violations);
        break;
      case 'events':
        this.checkEventFilters(item, domainFilters, violations);
        break;
    }
  }

  private checkNewsFilters(item: Item, filters: any, violations: QualityViolation[]): void {
    const meta = item.meta as any;

    // Check health topics credibility
    if (filters.health_topics_min_credibility) {
      const isHealthTopic = item.topics.some(t =>
        ['health', 'medical', 'medicine', 'disease'].includes(t.toLowerCase())
      );
      if (isHealthTopic && (!meta.credibility_tier || meta.credibility_tier === 'unverified')) {
        violations.push({
          type: 'filter',
          severity: 'high',
          message: 'Health/medical content requires verified source',
          field: 'meta.credibility_tier',
          recommendation: 'Use verified sources for health information',
        });
      }
    }
  }

  private checkRecipeFilters(item: Item, filters: any, violations: QualityViolation[]): void {
    const meta = item.meta as any;

    // Check nutrition requirement for diet recipes
    if (filters.require_nutrition_for_diet_recipes) {
      const isDietRecipe = meta.dietary && meta.dietary.length > 0;
      if (isDietRecipe && !meta.nutrition) {
        violations.push({
          type: 'filter',
          severity: 'medium',
          message: 'Diet-specific recipes should include nutrition information',
          field: 'meta.nutrition',
          recommendation: 'Add nutrition facts for dietary recipes',
        });
      }
    }
  }

  private checkLearningFilters(item: Item, filters: any, violations: QualityViolation[]): void {
    const meta = item.meta as any;

    // Check instructor rating
    if (filters.min_instructor_rating && meta.rating) {
      if (meta.rating < filters.min_instructor_rating) {
        violations.push({
          type: 'filter',
          severity: 'medium',
          message: `Instructor rating ${meta.rating} below minimum ${filters.min_instructor_rating}`,
          field: 'meta.rating',
          value: meta.rating,
        });
      }
    }
  }

  private checkEventFilters(item: Item, filters: any, violations: QualityViolation[]): void {
    const meta = item.meta as any;

    // Check verified organizer for large events
    if (filters.require_verified_organizer_for_large && meta.capacity) {
      if (meta.capacity >= filters.large_event_capacity_threshold) {
        // Would need to check if organizer is verified
        // For now, just flag it
        violations.push({
          type: 'filter',
          severity: 'low',
          message: 'Large events should have verified organizers',
          field: 'meta.organizer',
          recommendation: 'Verify event organizer for capacity > 500',
        });
      }
    }
  }

  /**
   * Check context-specific thresholds
   */
  private checkThresholds(
    item: Item,
    context: 'ingest' | 'ranking' | 'featured',
    reputationScore: number,
    violations: QualityViolation[]
  ): boolean {
    const threshold = this.rules.thresholds[context];
    let passed = true;

    if (reputationScore < threshold.min_reputation) {
      violations.push({
        type: 'threshold',
        severity: context === 'ingest' ? 'high' : 'medium',
        message: `Reputation ${reputationScore} below ${context} threshold ${threshold.min_reputation}`,
        field: 'reputation',
        value: reputationScore,
      });
      passed = false;
    }

    return passed;
  }

  /**
   * Assess content quality (heuristic)
   */
  private assessContentQuality(item: Item): number {
    let score = 50; // Base score

    // Has description
    if (item.description && item.description.length > 50) {
      score += 10;
    }

    // Has topics
    if (item.topics.length >= 3) {
      score += 10;
    }

    // Has metadata
    if (item.meta && Object.keys(item.meta).length > 3) {
      score += 10;
    }

    // Not sponsored
    if (!item.sponsored) {
      score += 10;
    }

    // Has image
    const meta = item.meta as any;
    if (meta.image_url) {
      score += 10;
    }

    return Math.min(100, score);
  }

  /**
   * Get reputation tier from score
   */
  private getReputationTier(score: number): ReputationTier {
    if (score >= 90) return 'trusted';
    if (score >= 70) return 'verified';
    if (score >= 50) return 'unverified';
    if (score >= 30) return 'risky';
    return 'blocked';
  }

  /**
   * Determine action based on violations and tier
   */
  private determineAction(
    violations: QualityViolation[],
    tier: ReputationTier,
    thresholdPassed: boolean
  ): ViolationAction {
    // Check for critical violations
    const hasCritical = violations.some(v => v.severity === 'critical');
    if (hasCritical) return 'reject';

    // Check tier
    if (tier === 'blocked') return 'reject';
    if (tier === 'risky' && !thresholdPassed) return 'quarantine';

    // Check high severity violations
    const highCount = violations.filter(v => v.severity === 'high').length;
    if (highCount >= 2) return 'quarantine';
    if (highCount === 1) return 'flag';

    // Allow if no major issues
    return 'allow';
  }

  /**
   * Get flags from violations
   */
  private getFlags(violations: QualityViolation[]): string[] {
    return violations.map(v => v.type);
  }

  /**
   * Get default rules path
   */
  private getDefaultRulesPath(): string {
    return new URL('../../../config/quality_rules.yaml', import.meta.url).pathname;
  }

  /**
   * Get rules object
   */
  getRules(): QualityRules {
    return this.rules;
  }
}

// Export singleton instance
let engineInstance: QualityRulesEngine | null = null;

export function getQualityEngine(): QualityRulesEngine {
  if (!engineInstance) {
    engineInstance = new QualityRulesEngine();
  }
  return engineInstance;
}

export * from './types';
