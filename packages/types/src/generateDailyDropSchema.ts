/**
 * Generate JSON Schema from Zod validators
 * Output: schemas/daily_drop.schema.json
 */

import { zodToJsonSchema } from 'zod-to-json-schema';
import { DailyDropPackageSchemaRefined } from './daily_drop';
import fs from 'fs';
import path from 'path';

const jsonSchema = zodToJsonSchema(DailyDropPackageSchemaRefined, {
  name: 'DailyDropPackage',
  $refStrategy: 'none',
});

const outputPath = path.join(process.cwd(), 'schemas', 'daily_drop.schema.json');

// Ensure schemas directory exists
fs.mkdirSync(path.dirname(outputPath), { recursive: true });

// Write JSON Schema
fs.writeFileSync(outputPath, JSON.stringify(jsonSchema, null, 2));

console.log(`✅ Generated JSON Schema: ${outputPath}`);
console.log(`📦 Schema size: ${(fs.statSync(outputPath).size / 1024).toFixed(2)} KB`);
