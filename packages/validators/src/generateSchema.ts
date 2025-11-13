#!/usr/bin/env node
/**
 * Generate JSON Schema from Zod validators
 * Run: node dist/generateSchema.js
 */

import * as fs from 'fs';
import * as path from 'path';
import { toJSONSchema } from './item';

const schemaDir = path.join(__dirname, '../../../schemas');
const schemaPath = path.join(schemaDir, 'item.schema.json');

// Ensure schemas directory exists
if (!fs.existsSync(schemaDir)) {
  fs.mkdirSync(schemaDir, { recursive: true });
}

// Generate and write JSON Schema
const jsonSchema = toJSONSchema();
fs.writeFileSync(schemaPath, JSON.stringify(jsonSchema, null, 2), 'utf-8');

console.log(`✅ JSON Schema generated: ${schemaPath}`);
