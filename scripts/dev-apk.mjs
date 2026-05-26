#!/usr/bin/env node
/**
 * Dev APK con Live Reload
 * - Inyecta server.url al capacitor.config.json apuntando al dev server de Vite
 * - Compila APK de debug (rápido, sin firma)
 * - Lo instala en el dispositivo conectado por USB (adb)
 * - Restaura el config original
 *
 * Uso: node scripts/dev-apk.mjs [IP]
 *   IP por defecto: 192.168.1.3  (la de esta máquina en la red local)
 *   Puerto por defecto: 5174
 */

import { execSync, spawnSync } from 'child_process';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import os from 'os';

const __dir = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dir, '..');
const CAP_CONFIG = join(ROOT, 'capacitor.config.json');

// ── Detectar IP local automáticamente ─────────────────────────────────────
function getLocalIP() {
  const ifaces = os.networkInterfaces();
  for (const name of Object.keys(ifaces)) {
    for (const iface of ifaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) return iface.address;
    }
  }
  return '192.168.1.3';
}

const ip   = process.argv[2] || getLocalIP();
const port = process.argv[3] || '5174';
const serverUrl = `http://${ip}:${port}`;

// ── Helpers ────────────────────────────────────────────────────────────────
function run(label, cmd, options = {}) {
  console.log(`\n▶  ${label}`);
  console.log(`   ${cmd}\n`);
  const result = spawnSync(cmd, {
    shell: true,
    cwd: options.cwd || ROOT,
    stdio: 'inherit',
    env: { ...process.env },
  });
  if (result.status !== 0) {
    console.error(`\n❌ Falló: ${label}`);
    process.exit(1);
  }
  console.log(`✅ OK: ${label}`);
}

// ── Main ───────────────────────────────────────────────────────────────────
console.log('');
console.log('╔══════════════════════════════════════════╗');
console.log('║   Dev APK  —  Live Reload  🔥            ║');
console.log('╚══════════════════════════════════════════╝');
console.log(`\n   Dev server: ${serverUrl}\n`);

// 1. Leer config original
const originalConfig = readFileSync(CAP_CONFIG, 'utf8');
const config = JSON.parse(originalConfig);

// 2. Inyectar server.url
config.server = {
  ...config.server,
  url: serverUrl,
  cleartext: true,
};
writeFileSync(CAP_CONFIG, JSON.stringify(config, null, 2));
console.log(`✅ capacitor.config.json → server.url = ${serverUrl}`);

try {
  // 3. Capacitor sync
  run('Capacitor sync Android', 'npx cap sync android');

  // 4. Compilar APK debug
  const androidDir = join(ROOT, 'android');
  const gradleExe  = join(androidDir, 'gradlew.bat');
  run('Gradle assembleDebug', `"${gradleExe}" assembleDebug`, { cwd: androidDir });

  // 5. Instalar en dispositivo
  const apkPath = join(ROOT, 'android/app/build/outputs/apk/debug/app-debug.apk');
  if (!existsSync(apkPath)) {
    console.error('❌ APK debug no encontrado en:', apkPath);
    process.exit(1);
  }

  run('Instalar APK en dispositivo (adb)', `adb install -r "${apkPath}"`);

  console.log('\n🎉 APK instalado con Live Reload activo');
  console.log(`   Cualquier cambio en el código recarga el APK automáticamente`);
  console.log(`   Dev server corriendo en: ${serverUrl}`);
  console.log('\n   ⚠️  El APK usa el server local — ambos dispositivos deben estar');
  console.log('      en el mismo WiFi mientras desarrollas.\n');

} finally {
  // 6. Siempre restaurar config original
  writeFileSync(CAP_CONFIG, originalConfig);
  console.log('✅ capacitor.config.json restaurado\n');
}
