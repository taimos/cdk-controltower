#!/usr/bin/env node
import { writeFileSync } from 'fs';
import { join } from 'path';
import { generateSsoConfigFile } from './aws-org';

(async () => {
  const file = await generateSsoConfigFile();
  writeFileSync(join('src', 'aws-sso-config.ts'), file, { encoding: 'utf-8' });
})().catch(console.error);