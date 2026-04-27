/**
 * Генератор updates.xml для автообновления Chrome Extension
 *
 * Использование:
 *   EXTENSION_ID=abcdefghijklmnopqrstuvwx123456 BASE_URL=https://your-domain.com node scripts/generate-updates-xml.js
 */

import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Конфигурация из переменных окружения
const EXTENSION_ID = process.env.EXTENSION_ID || 'YOUR_EXTENSION_ID_HERE';
const BASE_URL = process.env.BASE_URL || 'https://your-domain.com';

// Чтение версии из manifest.json
const manifestPath = join(__dirname, '..', 'dist', 'manifest.json');
let version = '1.0.0';

try {
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf-8'));
  version = manifest.version || '1.0.0';
} catch (error) {
  console.warn('⚠️ Could not read manifest.json version, using:', version);
}

// Генерация updates.xml
const updatesXml = `<?xml version='1.0' encoding='UTF-8'?>
<gupdate xmlns='http://www.google.com/update2/response' protocol='2.0'>
  <app appid='${EXTENSION_ID}'>
    <updatecheck codebase='${BASE_URL}/extension.crx' version='${version}' />
  </app>
</gupdate>`;

// Запись в docs/updates.xml
const outputPath = join(__dirname, '..', 'docs', 'updates.xml');
writeFileSync(outputPath, updatesXml);

console.log('✅ updates.xml сгенерирован успешно!');
console.log(`   Extension ID: ${EXTENSION_ID}`);
console.log(`   Base URL: ${BASE_URL}`);
console.log(`   Version: ${version}`);
console.log(`   Output: ${outputPath}`);
