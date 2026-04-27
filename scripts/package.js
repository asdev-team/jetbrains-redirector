/**
 * Скрипт для сборки и упаковки расширения в ZIP и CRX3 форматы
 *
 * Форматы:
 * - ZIP: Для Chrome Web Store и ручной установки
 * - CRX3: Для Chrome (ручная установка)
 *
 * Использование:
 *   node scripts/package.js                    # сборка + упаковка
 *   node scripts/package.js --build-only       # только сборка
 *   node scripts/package.js --package-only     # только упаковка
 *   node scripts/package.js 2.0.0              # сборка + упаковка с версией
 */

import { execSync } from 'child_process';
import { createWriteStream, existsSync, mkdirSync, readFileSync, writeFileSync, rmSync } from 'fs';
import { resolve, join, dirname } from 'path';
import { fileURLToPath } from 'url';
import archiver from 'archiver';
import crx3 from 'crx3';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = resolve(__dirname, '..');
const DIST_DIR = resolve(ROOT_DIR, 'dist');
const BUILD_DIR = resolve(ROOT_DIR, 'build');
const VERSION_ARG = process.argv[2];
const BUILD_ONLY = process.argv.includes('--build-only');
const PACKAGE_ONLY = process.argv.includes('--package-only');
const KEY_FILE = join(ROOT_DIR, 'keys', 'private-key.pem');

// Логотип для вывода
const LOGO = `
╔═══════════════════════════════════════════════════════════╗
║         JetBrains Redirector Packager v2.0                ║
║         Build & Package in One Command                    ║
╚═══════════════════════════════════════════════════════════╝
`;

function printHeader(text) {
  console.log(`\n${'═'.repeat(60)}`);
  console.log(`  ${text}`);
  console.log(`${'═'.repeat(60)}\n`);
}

function runCommand(command, description) {
  console.log(`⚙️  ${description}...`);
  try {
    execSync(command, { stdio: 'inherit', cwd: ROOT_DIR });
    console.log(`✅ Готово\n`);
  } catch (error) {
    console.error(`❌ Ошибка: ${description}`);
    throw error;
  }
}

function ensureDirs() {
  if (!existsSync(BUILD_DIR)) {
    mkdirSync(BUILD_DIR, { recursive: true });
  }
  const keysDir = join(ROOT_DIR, 'keys');
  if (!existsSync(keysDir)) {
    mkdirSync(keysDir, { recursive: true });
  }
}

function getVersion() {
  if (VERSION_ARG && !VERSION_ARG.startsWith('--')) {
    return VERSION_ARG.replace(/^v/, '');
  }
  
  const manifestPath = join(DIST_DIR, 'manifest.json');
  if (existsSync(manifestPath)) {
    try {
      const manifest = JSON.parse(readFileSync(manifestPath, 'utf-8'));
      return manifest.version || '1.0.0';
    } catch (e) {
      console.warn('⚠️  Could not read manifest version, using: 1.0.0');
    }
  }
  return '1.0.0';
}


function packageZip(baseName) {
  return new Promise((resolve, reject) => {
    const outputFile = join(BUILD_DIR, `${baseName}.zip`);
    const output = createWriteStream(outputFile);

    const archive = archiver('zip', {
      zlib: { level: 9 },
    });

    output.on('close', () => {
      const sizeMB = (archive.pointer() / 1024 / 1024).toFixed(2);
      console.log(`✅ ZIP: ${outputFile} (${sizeMB} MB)`);
      resolve(outputFile);
    });

    archive.on('error', (err) => {
      console.error('❌ Ошибка упаковки ZIP:', err);
      reject(err);
    });

    archive.pipe(output);
    console.log('  📦 Создание ZIP...');
    archive.directory(DIST_DIR, false);
    archive.finalize();
  });
}

async function packageCrx3(baseName) {
  console.log('  📦 Создание CRX3...');

  const crx3File = join(BUILD_DIR, `${baseName}.crx`);

  await crx3([DIST_DIR], {
    keyPath: KEY_FILE,
    crxPath: crx3File,
  });

  console.log(`✅ CRX3: ${crx3File} (${(readFileSync(crx3File).length / 1024 / 1024).toFixed(2)} MB)`);

  return crx3File;
}

async function createChecksums(zipFile, crx3File) {
  const crypto = await import('crypto');
  const { createReadStream } = await import('fs');

  const files = [
    { path: zipFile, name: 'ZIP' },
    { path: crx3File, name: 'CRX3' },
  ];

  console.log('\n🔐 Чексуммы:');

  for (const { path, name } of files) {
    const hash = crypto.createHash('sha256');
    const stream = createReadStream(path);

    await new Promise((resolve) => {
      stream.on('data', (data) => hash.update(data));
      stream.on('end', () => {
        const sha256 = hash.digest('hex');
        const checksumFile = path + '.sha256';
        writeFileSync(checksumFile, `${sha256}  ${path.split('/').pop()}\n`);
        console.log(`   ${name} SHA-256: ${sha256}`);
        resolve(sha256);
      });
    });
  }
}

async function build() {
  printHeader('Шаг 1/2: Сборка расширения');
  
  // Очистка dist перед сборкой
  if (existsSync(DIST_DIR)) {
    console.log('🧹 Очистка dist/...');
    rmSync(DIST_DIR, { recursive: true, force: true });
    console.log('✅ Очищено\n');
  }
  
  runCommand('npm run build', 'Сборка расширения (TypeScript + Vite)');
}

async function pack() {
  printHeader('Шаг 2/2: Упаковка');
  
  ensureDirs();

  if (!existsSync(DIST_DIR)) {
    console.error('❌ Директория dist не найдена!');
    console.error('💡 Выполните: node scripts/package.js --build\n');
    process.exit(1);
  }

  const manifestPath = join(DIST_DIR, 'manifest.json');
  if (!existsSync(manifestPath)) {
    console.error('❌ manifest.json не найден в dist!');
    process.exit(1);
  }

  const version = getVersion();
  const baseName = `jetbrains-redirector-v${version}`;

  console.log(`📦 Версия: ${version}`);
  console.log(`📁 Выход: ${BUILD_DIR}/${baseName}.*\n`);

  // Упаковка ZIP
  const zipFile = await packageZip(baseName);

  // Упаковка CRX3
  const crx3File = await packageCrx3(baseName);

  // Чексуммы
  await createChecksums(zipFile, crx3File);
}

async function main() {
  console.log(LOGO);

  try {
    // Если не указаны флаги, выполняем всё
    if (!BUILD_ONLY && !PACKAGE_ONLY) {
      await build();
      await pack();
      
      printHeader('✨ Готово!');
      console.log('📬 Результат:');
      console.log(`   📦 ${BUILD_DIR}/jetbrains-redirector-v*.zip`);
      console.log(`   🔌 ${BUILD_DIR}/jetbrains-redirector-v*.crx`);
      console.log(`   🔐 ${BUILD_DIR}/jetbrains-redirector-v*.sha256`);
      console.log('\n📥 Установка:');
      console.log('   1. chrome://extensions/');
      console.log('   2. Включите "Режим разработчика"');
      console.log('   3. Перетащите .crx файл\n');
      
    } else if (BUILD_ONLY) {
      await build();
      printHeader('✨ Сборка завершена!');
      console.log(`📁 Выход: ${DIST_DIR}/\n`);
      
    } else if (PACKAGE_ONLY) {
      await pack();
      printHeader('✨ Упаковка завершена!');
      console.log(`📦 Выход: ${BUILD_DIR}/jetbrains-redirector-v*.{zip,crx}\n`);
    }

  } catch (error) {
    console.error('\n❌ Ошибка:', error.message);
    process.exit(1);
  }
}

main();
