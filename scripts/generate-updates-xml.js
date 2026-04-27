/**
 * Генератор updates.xml для автообновления Chrome Extension.
 *
 * Extension ID вычисляется автоматически из keys/private-key.pem
 * (так же, как Chrome вычисляет ID при установке CRX).
 * Можно переопределить через переменную окружения EXTENSION_ID.
 *
 * Использование:
 *   BASE_URL=https://owner.github.io/repo node scripts/generate-updates-xml.js
 *   EXTENSION_ID=abc...xyz BASE_URL=https://... node scripts/generate-updates-xml.js
 */

import { createHash, createPrivateKey, createPublicKey } from 'crypto';
import { existsSync, readFileSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

/**
 * Вычисляет Chrome Extension ID из PEM-файла приватного ключа.
 * Алгоритм: SHA-256(DER публичного ключа) → первые 16 байт → перевод в алфавит a-p.
 */
function computeExtensionId(keyPath) {
  const keyData = readFileSync(keyPath);
  const publicKey = createPublicKey(createPrivateKey(keyData));
  const der = publicKey.export({ type: 'spki', format: 'der' });
  const hash = createHash('sha256').update(der).digest();

  let id = '';
  for (let i = 0; i < 16; i++) {
    id += String.fromCharCode(97 + (hash[i] >> 4));
    id += String.fromCharCode(97 + (hash[i] & 0x0f));
  }
  return id;
}

// ── Extension ID ──────────────────────────────────────────────────────────────
let extensionId = process.env.EXTENSION_ID || '';

if (!extensionId) {
  const keyPath = join(ROOT, 'keys', 'private-key.pem');
  if (!existsSync(keyPath)) {
    console.error('❌ EXTENSION_ID не задан и keys/private-key.pem не найден.');
    console.error('   Запустите make package для генерации ключа или задайте секрет EXTENSION_ID.');
    process.exit(1);
  }
  extensionId = computeExtensionId(keyPath);
  console.log('🔑 Extension ID вычислен из private-key.pem');
}

// ── Версия ────────────────────────────────────────────────────────────────────
const distManifest = join(ROOT, 'dist', 'manifest.json');
const pubManifest  = join(ROOT, 'public', 'manifest.json');
const manifestPath = existsSync(distManifest) ? distManifest : pubManifest;

let version = '1.0.0';
try {
  version = JSON.parse(readFileSync(manifestPath, 'utf-8')).version || version;
} catch {
  console.warn(`⚠️  Не удалось прочитать версию из ${manifestPath}, используется: ${version}`);
}

// ── BASE_URL ──────────────────────────────────────────────────────────────────
const baseUrl = (process.env.BASE_URL || '').replace(/\/$/, '');
if (!baseUrl) {
  console.error('❌ BASE_URL не задан.');
  console.error('   Пример: BASE_URL=https://owner.github.io/repo node scripts/generate-updates-xml.js');
  process.exit(1);
}

// ── Генерация ─────────────────────────────────────────────────────────────────
const xml = `<?xml version='1.0' encoding='UTF-8'?>
<gupdate xmlns='http://www.google.com/update2/response' protocol='2.0'>
  <app appid='${extensionId}'>
    <updatecheck codebase='${baseUrl}/extension.crx' version='${version}' />
  </app>
</gupdate>
`;

const outputPath = join(ROOT, 'docs', 'updates.xml');
writeFileSync(outputPath, xml);

console.log('✅ updates.xml сгенерирован:');
console.log(`   Extension ID : ${extensionId}`);
console.log(`   Base URL     : ${baseUrl}`);
console.log(`   Version      : ${version}`);
console.log(`   Output       : ${outputPath}`);
