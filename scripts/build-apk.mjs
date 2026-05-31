#!/usr/bin/env node
/**
 * Build APK script — runs web build → cap sync → gradle assembleRelease
 * On any failure, consults DeepSeek for diagnosis automatically.
 */

import { execSync, spawnSync } from 'child_process';
import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import OpenAI from 'openai';

const __dir = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dir, '..');

// Load .env manually (no dotenv dependency needed)
function loadEnv() {
  const envPath = join(ROOT, '.env');
  if (!existsSync(envPath)) return {};
  const env = {};
  for (const line of readFileSync(envPath, 'utf8').split('\n')) {
    const clean = line.trim();
    if (!clean || clean.startsWith('#')) continue;
    const idx = clean.indexOf('=');
    if (idx === -1) continue;
    const key = clean.slice(0, idx).trim();
    const val = clean.slice(idx + 1).trim().replace(/^["']|["']$/g, '');
    env[key] = val;
  }
  return env;
}

const env = loadEnv();
const DEEPSEEK_KEY = env.VITE_DEEPSEEK_API_KEY || process.env.VITE_DEEPSEEK_API_KEY;

async function askDeepSeek(errorOutput, step) {
  if (!DEEPSEEK_KEY) {
    console.log('\n⚠️  VITE_DEEPSEEK_API_KEY no configurada — saltando diagnóstico AI\n');
    return;
  }

  const client = new OpenAI({
    apiKey: DEEPSEEK_KEY,
    baseURL: 'https://api.deepseek.com',
  });

  console.log('\n🤖 Consultando DeepSeek para diagnosticar el error...\n');

  const prompt = `Soy desarrollador de una app Android con Capacitor + React + Vite.
El build falló en el paso: "${step}"

ERROR:
\`\`\`
${errorOutput.slice(-3000)}
\`\`\`

Dame:
1. Causa raíz del error (una línea)
2. Solución exacta (comandos o cambios de código)
3. Si hay algo adicional que deba verificar

Responde en español, de forma concisa.`;

  try {
    const res = await client.chat.completions.create({
      model: 'deepseek-chat',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 800,
    });
    console.log('─'.repeat(60));
    console.log('💡 Diagnóstico DeepSeek:');
    console.log('─'.repeat(60));
    console.log(res.choices[0].message.content);
    console.log('─'.repeat(60) + '\n');
  } catch (e) {
    console.log('⚠️  DeepSeek no disponible:', e.message);
  }
}

function run(label, cmd, options = {}) {
  console.log(`\n▶  ${label}`);
  console.log(`   ${cmd}\n`);

  const result = spawnSync(cmd, {
    shell: true,
    cwd: options.cwd || ROOT,
    stdio: ['inherit', 'pipe', 'pipe'],
    env: { ...process.env, JAVA_HOME: process.env.JAVA_HOME || '' },
  });

  const stdout = result.stdout?.toString() || '';
  const stderr = result.stderr?.toString() || '';
  const combined = (stdout + '\n' + stderr).trim();

  if (result.status !== 0) {
    console.error(`\n❌ Falló: ${label}`);
    if (combined) console.error(combined);
    return { ok: false, output: combined };
  }

  if (stdout) process.stdout.write(stdout);
  console.log(`✅ OK: ${label}`);
  return { ok: true, output: combined };
}

async function main() {
  console.log('');
  console.log('╔══════════════════════════════════════╗');
  console.log('║     Build APK — Ventas Repartidor    ║');
  console.log('╚══════════════════════════════════════╝\n');

  // Step 1: Web build
  const web = run('Web build (Vite)', 'npm run build');
  if (!web.ok) {
    await askDeepSeek(web.output, 'npm run build (Vite)');
    process.exit(1);
  }

  // Step 2: Capacitor sync
  const sync = run('Capacitor sync Android', 'npx cap sync android');
  if (!sync.ok) {
    await askDeepSeek(sync.output, 'npx cap sync android');
    process.exit(1);
  }

  // Step 3: Gradle APK release
  const androidDir = join(ROOT, 'android');
  const gradleExe = process.platform === 'win32'
    ? join(androidDir, 'gradlew.bat')
    : join(androidDir, 'gradlew');
  const gradleCmd = `"${gradleExe}" assembleRelease`;

  const apk = run('Gradle assembleRelease', gradleCmd, {
    cwd: androidDir,
  });

  if (!apk.ok) {
    await askDeepSeek(apk.output, 'gradlew assembleRelease');
    process.exit(1);
  }

  // Find the generated APK
  const apkPath = join(ROOT, 'android/app/build/outputs/apk/release/ventas-repartidor.apk');
  if (existsSync(apkPath)) {
    const size = (readFileSync(apkPath).length / 1024 / 1024).toFixed(1);
    console.log('\n🎉 APK generado exitosamente');
    console.log(`   📦 ${apkPath}`);
    console.log(`   📏 Tamaño: ${size} MB\n`);
  } else {
    console.log('\n✅ Build completado — busca el APK en android/app/build/outputs/apk/\n');
  }
}

main().catch(async (err) => {
  console.error('\n❌ Error inesperado:', err.message);
  await askDeepSeek(err.stack || err.message, 'script build-apk.mjs');
  process.exit(1);
});
