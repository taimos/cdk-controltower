#!/usr/bin/env node
import { writeFileSync } from 'fs';
import { join } from 'path';
import { generateAccountFile } from './aws-org';

(async () => {
  const file = await generateAccountFile();
  writeFileSync(join('src', 'aws-accounts.ts'), file, { encoding: 'utf-8' });
})().catch(console.error);