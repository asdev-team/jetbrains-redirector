/**
 * Скрипт для пост-обработки dist после сборки
 */

import { readFileSync, writeFileSync, copyFileSync, mkdirSync, existsSync, unlinkSync } from 'fs';
import { resolve, join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DIST_DIR = resolve(__dirname, '..', 'dist');
const SRC_DIR = resolve(__dirname, '..', 'src');
const PUBLIC_DIR = resolve(__dirname, '..', 'public');

function postBuild() {
  console.log('🔧 Post-build processing...');

  // Копируем manifest.json
  copyFileSync(
    join(PUBLIC_DIR, 'manifest.json'),
    join(DIST_DIR, 'manifest.json')
  );
  console.log('✅ manifest.json copied');

  // Копируем иконки (только PNG)
  const iconsDir = join(DIST_DIR, 'icons');
  if (!existsSync(iconsDir)) {
    mkdirSync(iconsDir, { recursive: true });
  }
  copyFileSync(join(PUBLIC_DIR, 'icons', 'icon16.png'), join(iconsDir, 'icon16.png'));
  copyFileSync(join(PUBLIC_DIR, 'icons', 'icon48.png'), join(iconsDir, 'icon48.png'));
  copyFileSync(join(PUBLIC_DIR, 'icons', 'icon128.png'), join(iconsDir, 'icon128.png'));
  
  // Удаляем SVG если был скопирован автоматически
  const svgFile = join(iconsDir, 'icon.svg');
  if (existsSync(svgFile)) {
    unlinkSync(svgFile);
  }
  
  console.log('✅ Icons copied');

  // Копируем HTML файлы из src в dist popup/ и options/
  const popupDir = join(DIST_DIR, 'popup');
  const optionsDir = join(DIST_DIR, 'options');
  
  if (!existsSync(popupDir)) mkdirSync(popupDir);
  if (!existsSync(optionsDir)) mkdirSync(optionsDir);
  
  // Копируем и исправляем пути для popup/popup.html
  let popupHtml = readFileSync(join(SRC_DIR, 'popup', 'popup.html'), 'utf-8');
  popupHtml = popupHtml.replace('../assets/popup.css', './assets/popup.css')
    .replace('./popup/popup.js', './popup.js');
  writeFileSync(join(popupDir, 'popup.html'), popupHtml);
  
  // Копируем и исправляем пути для options/options.html
  let optionsHtml = readFileSync(join(SRC_DIR, 'options', 'options.html'), 'utf-8');
  optionsHtml = optionsHtml.replace('../assets/options.css', './assets/options.css')
    .replace('./options/options.js', './options.js');
  writeFileSync(join(optionsDir, 'options.html'), optionsHtml);
  console.log('✅ HTML files copied');

  // Копируем HTML файлы в корень dist
  copyFileSync(join(popupDir, 'popup.html'), join(DIST_DIR, 'popup.html'));
  copyFileSync(join(optionsDir, 'options.html'), join(DIST_DIR, 'options.html'));
  console.log('✅ HTML files copied to dist root');

  console.log('✨ Post-build complete!');
}

postBuild();
