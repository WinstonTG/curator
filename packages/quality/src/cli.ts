#!/usr/bin/env node
/**
 * Quality Check CLI
 * Usage: pnpm quality:check <items-directory>
 */

import { readFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';
import { QualityRulesEngine } from './rules.js';
import type { Item } from '@curator/types/src/item';

interface CLIOptions {
  context?: 'ingest' | 'ranking' | 'featured';
  verbose?: boolean;
}

function parseArgs(): { directory: string; options: CLIOptions } {
  const args = process.argv.slice(2);

  if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
    console.log(`
Quality Check CLI - Validate items against quality rules

Usage:
  pnpm quality:check <directory> [options]

Arguments:
  directory         Path to directory containing item JSON files

Options:
  --context <ctx>   Quality context: ingest, ranking, or featured (default: ingest)
  --verbose, -v     Show detailed violation information
  --help, -h        Show this help message

Examples:
  pnpm quality:check samples/items
  pnpm quality:check samples/items --context=featured
  pnpm quality:check samples/items --verbose
`);
    process.exit(0);
  }

  const directory = args.find(arg => !arg.startsWith('--') && !arg.startsWith('-')) || 'samples/items';
  const options: CLIOptions = {
    context: args.find(arg => arg.startsWith('--context='))?.split('=')[1] as any || 'ingest',
    verbose: args.includes('--verbose') || args.includes('-v'),
  };

  return { directory, options };
}

function loadItems(directory: string): { path: string; item: Item }[] {
  const items: { path: string; item: Item }[] = [];

  try {
    const files = readdirSync(directory);

    for (const file of files) {
      if (!file.endsWith('.json')) continue;

      const filePath = join(directory, file);
      const stats = statSync(filePath);

      if (!stats.isFile()) continue;

      try {
        const content = readFileSync(filePath, 'utf-8');
        const item = JSON.parse(content) as Item;
        items.push({ path: filePath, item });
      } catch (error) {
        console.error(`❌ Failed to parse ${file}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }
  } catch (error) {
    console.error(`❌ Failed to read directory ${directory}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    process.exit(1);
  }

  return items;
}

function formatAction(action: string): string {
  const icons = {
    allow: '✅',
    flag: '⚠️',
    quarantine: '🔶',
    reject: '❌',
  };
  return icons[action as keyof typeof icons] || '❓';
}

function formatSeverity(severity: string): string {
  const icons = {
    critical: '🔴',
    high: '🟠',
    medium: '🟡',
    low: '🔵',
  };
  return icons[severity as keyof typeof icons] || '⚪';
}

async function main() {
  const { directory, options } = parseArgs();

  console.log(`\n🔍 Quality Check Report`);
  console.log(`${'='.repeat(60)}\n`);
  console.log(`Directory: ${directory}`);
  console.log(`Context:   ${options.context}\n`);

  const engine = new QualityRulesEngine();
  const items = loadItems(directory);

  if (items.length === 0) {
    console.log('⚠️  No items found to check\n');
    process.exit(0);
  }

  let passed = 0;
  let flagged = 0;
  let quarantined = 0;
  let rejected = 0;

  for (const { path, item } of items) {
    const result = engine.check(item, options.context);

    // Update counters
    switch (result.action) {
      case 'allow': passed++; break;
      case 'flag': flagged++; break;
      case 'quarantine': quarantined++; break;
      case 'reject': rejected++; break;
    }

    // Print item summary
    console.log(`${formatAction(result.action)} ${item.title}`);
    console.log(`   ID: ${item.id}`);
    console.log(`   Source: ${item.source.name} (${item.domain})`);
    console.log(`   Score: ${result.score.toFixed(1)} | Tier: ${result.tier} | Action: ${result.action}`);

    if (result.violations.length > 0) {
      console.log(`   Violations: ${result.violations.length}`);

      if (options.verbose) {
        for (const violation of result.violations) {
          console.log(`     ${formatSeverity(violation.severity)} [${violation.type}/${violation.severity}] ${violation.message}`);
          if (violation.field) {
            console.log(`        Field: ${violation.field}${violation.value !== undefined ? ` = ${violation.value}` : ''}`);
          }
          if (violation.recommendation) {
            console.log(`        💡 ${violation.recommendation}`);
          }
        }
      } else {
        // Just show count by severity
        const critical = result.violations.filter(v => v.severity === 'critical').length;
        const high = result.violations.filter(v => v.severity === 'high').length;
        const medium = result.violations.filter(v => v.severity === 'medium').length;
        const low = result.violations.filter(v => v.severity === 'low').length;

        const parts = [];
        if (critical > 0) parts.push(`${critical} critical`);
        if (high > 0) parts.push(`${high} high`);
        if (medium > 0) parts.push(`${medium} medium`);
        if (low > 0) parts.push(`${low} low`);

        console.log(`     ${parts.join(', ')}`);
      }
    }

    console.log('');
  }

  // Print summary
  console.log(`${'='.repeat(60)}`);
  console.log(`\n📊 Summary (${items.length} items checked)\n`);
  console.log(`  ✅ Allowed:      ${passed} (${((passed / items.length) * 100).toFixed(1)}%)`);
  console.log(`  ⚠️  Flagged:      ${flagged} (${((flagged / items.length) * 100).toFixed(1)}%)`);
  console.log(`  🔶 Quarantined:  ${quarantined} (${((quarantined / items.length) * 100).toFixed(1)}%)`);
  console.log(`  ❌ Rejected:     ${rejected} (${((rejected / items.length) * 100).toFixed(1)}%)`);
  console.log('');

  // Exit with appropriate code
  if (rejected > 0 || quarantined > 0) {
    process.exit(1);
  } else if (flagged > 0) {
    process.exit(0); // Warnings don't fail
  } else {
    process.exit(0);
  }
}

main().catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
