#!/usr/bin/env node

/**
 * Market Integrator CLI (ابزار خودکار اتصال به بازارهای ایرانی)
 * 
 * Automates integrating CafeBazaar, Myket, or Dual-Store Billing & Services
 * into Android, Capacitor, React Native, Flutter, and Backend projects.
 * 
 * Usage:
 *   node scripts/integrate-store.js --store=<cafebazaar|myket|dual> --platform=<android|capacitor|react-native|flutter|nodejs|python> --target-dir=<path>
 */

const fs = require('fs');
const path = require('path');

function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    store: 'dual', // 'cafebazaar', 'myket', 'dual'
    platform: null,
    targetDir: process.cwd(),
    packageName: null,
    help: false
  };

  for (const arg of args) {
    if (arg === '--help' || arg === '-h') {
      options.help = true;
    } else if (arg.startsWith('--store=')) {
      options.store = arg.split('=')[1].toLowerCase();
    } else if (arg.startsWith('--platform=')) {
      options.platform = arg.split('=')[1].toLowerCase();
    } else if (arg.startsWith('--target-dir=')) {
      options.targetDir = path.resolve(arg.split('=')[1]);
    } else if (arg.startsWith('--package-name=')) {
      options.packageName = arg.split('=')[1];
    }
  }
  return options;
}

function printHelp() {
  console.log(`
================================================================================
Market Integrator CLI (کافه‌بازار و مایکت)
================================================================================

Usage:
  node integrate-store.js [options]

Options:
  --store=<cafebazaar|myket|dual>
      Target app store. Defaults to 'dual' (supports both markets).
  --platform=<android|capacitor|flutter|react-native|nodejs|python>
      Target platform. If omitted, auto-detected from current project files.
  --target-dir=<path>
      Target project directory (default: current working directory).
  --package-name=<id>
      Application package ID (e.g. ir.fitsme.app).
  --help, -h
      Show this help message.

Examples:
  # Integrate both CafeBazaar and Myket into an Android project
  node integrate-store.js --store=dual --platform=android --target-dir=./frontend/android

  # Integrate Myket into a Node.js backend
  node integrate-store.js --store=myket --platform=nodejs --target-dir=./backend

  # Auto-detect platform and integrate dual store billing
  node integrate-store.js --store=dual
================================================================================
  `);
}

function detectPlatform(dir) {
  if (fs.existsSync(path.join(dir, 'android', 'app', 'src', 'main', 'AndroidManifest.xml')) ||
      fs.existsSync(path.join(dir, 'app', 'src', 'main', 'AndroidManifest.xml'))) {
    if (fs.existsSync(path.join(dir, 'capacitor.config.ts')) || fs.existsSync(path.join(dir, 'capacitor.config.json'))) {
      return 'capacitor';
    }
    return 'android';
  }
  if (fs.existsSync(path.join(dir, 'pubspec.yaml'))) {
    return 'flutter';
  }
  if (fs.existsSync(path.join(dir, 'package.json'))) {
    const pkg = JSON.parse(fs.readFileSync(path.join(dir, 'package.json'), 'utf-8'));
    if (pkg.dependencies?.['react-native']) return 'react-native';
    if (pkg.dependencies?.['express'] || pkg.dependencies?.['koa'] || pkg.name?.includes('backend')) return 'nodejs';
    return 'nodejs';
  }
  if (fs.existsSync(path.join(dir, 'requirements.txt')) || fs.existsSync(path.join(dir, 'pyproject.toml'))) {
    return 'python';
  }
  return 'android';
}

function integrateAndroid(targetDir, store, packageName) {
  console.log(`\n🚀 Integrating ${store.toUpperCase()} into Android project at: ${targetDir}`);

  let manifestPath = path.join(targetDir, 'app', 'src', 'main', 'AndroidManifest.xml');
  if (!fs.existsSync(manifestPath)) {
    manifestPath = path.join(targetDir, 'android', 'app', 'src', 'main', 'AndroidManifest.xml');
  }

  let proguardPath = path.join(targetDir, 'app', 'proguard-rules.pro');
  if (!fs.existsSync(proguardPath)) {
    proguardPath = path.join(targetDir, 'android', 'app', 'proguard-rules.pro');
  }

  // 1. Permissions & Queries
  const permissions = [];
  const queries = [];

  if (store === 'cafebazaar' || store === 'dual') {
    permissions.push('<uses-permission android:name="com.farsitel.bazaar.permission.PAY_THROUGH_BAZAAR" />');
    queries.push(`
        <package android:name="com.farsitel.bazaar" />
        <intent>
            <action android:name="ir.cafebazaar.pardakht.InAppBillingService.BIND" />
        </intent>`);
  }

  if (store === 'myket' || store === 'dual') {
    permissions.push('<uses-permission android:name="com.android.vending.BILLING" />');
    queries.push(`
        <package android:name="ir.mservices.market" />
        <intent>
            <action android:name="ir.mservices.market.InAppBillingService.BIND" />
        </intent>`);
  }

  if (fs.existsSync(manifestPath)) {
    let manifest = fs.readFileSync(manifestPath, 'utf-8');
    let modified = false;

    for (const perm of permissions) {
      if (!manifest.includes(perm)) {
        manifest = manifest.replace('<application', `${perm}\n    <application`);
        modified = true;
      }
    }

    if (!manifest.includes('<queries>')) {
      const queriesBlock = `\n    <queries>${queries.join('\n')}\n    </queries>\n`;
      manifest = manifest.replace('</manifest>', `${queriesBlock}</manifest>`);
      modified = true;
    }

    if (modified) {
      fs.writeFileSync(manifestPath, manifest, 'utf-8');
      console.log(`  ✅ Updated AndroidManifest.xml with permissions and <queries>`);
    } else {
      console.log(`  ℹ️ AndroidManifest.xml already contains required permissions and queries.`);
    }
  } else {
    console.log(`  ⚠️ AndroidManifest.xml not found automatically. Add the following to your manifest:`);
    console.log(permissions.join('\n'));
    console.log(`    <queries>${queries.join('\n')}    </queries>`);
  }

  // 2. Proguard Rules
  const proguardRules = `
# ============================================================================
# Market Integrator Proguard Rules (${store.toUpperCase()})
# ============================================================================
-keep class com.android.vending.billing.** { *; }
${store === 'cafebazaar' || store === 'dual' ? '-keep class com.github.cafebazaar.poolakey.** { *; }' : ''}
${store === 'myket' || store === 'dual' ? '-keep class ir.mservices.market.** { *; }' : ''}
`;

  if (fs.existsSync(proguardPath)) {
    let proguard = fs.readFileSync(proguardPath, 'utf-8');
    if (!proguard.includes('Market Integrator Proguard Rules')) {
      proguard += '\n' + proguardRules;
      fs.writeFileSync(proguardPath, proguard, 'utf-8');
      console.log(`  ✅ Updated proguard-rules.pro`);
    }
  }

  // 3. Print Gradle Dependencies
  console.log(`\n📦 Required Gradle Dependencies:`);
  if (store === 'cafebazaar' || store === 'dual') {
    console.log(`  // CafeBazaar Poolakey SDK`);
    console.log(`  implementation 'com.github.cafebazaar.Poolakey:poolakey:2.2.0'`);
  }
  if (store === 'myket' || store === 'dual') {
    console.log(`  // Myket IAB Helper (Place AIDL files in src/main/aidl/ or copy IabHelper.java)`);
  }
}

function integrateNodeBackend(targetDir, store) {
  console.log(`\n🚀 Integrating ${store.toUpperCase()} backend service into Node.js project at: ${targetDir}`);
  fs.mkdirSync(targetDir, { recursive: true });

  const examplesDir = path.join(__dirname, '..', 'examples', 'backend-nodejs');
  const serviceSrc = path.join(examplesDir, 'market-service.js');
  const routesSrc = path.join(examplesDir, 'unified-server-routes.js');

  const destService = path.join(targetDir, 'market-service.js');
  const destRoutes = path.join(targetDir, 'market-routes.js');

  if (fs.existsSync(serviceSrc)) {
    fs.copyFileSync(serviceSrc, destService);
    console.log(`  ✅ Scaffolding service: ${destService}`);
  }
  if (fs.existsSync(routesSrc)) {
    fs.copyFileSync(routesSrc, destRoutes);
    console.log(`  ✅ Scaffolding routes: ${destRoutes}`);
  }

  // Update .env.example
  const envExamplePath = path.join(targetDir, '.env.example');
  let envConfig = `
# Market Integrator Configuration
`;
  if (store === 'cafebazaar' || store === 'dual') {
    envConfig += `CAFEBAZAAR_PISHKHAN_API_SECRET=your_cafebazaar_pishkhan_secret_here\nCAFEBAZAAR_PACKAGE_NAME=ir.yourcompany.app\n`;
  }
  if (store === 'myket' || store === 'dual') {
    envConfig += `MYKET_ACCESS_TOKEN=your_myket_access_token_here\nMYKET_PACKAGE_NAME=ir.yourcompany.app\n`;
  }
  envConfig += `PAYLOAD_SECRET=your_internal_hmac_secret_key\n`;

  if (fs.existsSync(envExamplePath)) {
    let existingEnv = fs.readFileSync(envExamplePath, 'utf-8');
    if (!existingEnv.includes('CAFEBAZAAR') && !existingEnv.includes('MYKET')) {
      existingEnv += '\n' + envConfig;
      fs.writeFileSync(envExamplePath, existingEnv, 'utf-8');
      console.log(`  ✅ Appended variables to .env.example`);
    }
  } else {
    fs.writeFileSync(envExamplePath, envConfig.trim(), 'utf-8');
    console.log(`  ✅ Created .env.example with required store credentials`);
  }
}

function integratePythonBackend(targetDir, store) {
  console.log(`\n🚀 Integrating ${store.toUpperCase()} backend service into Python project at: ${targetDir}`);
  fs.mkdirSync(targetDir, { recursive: true });

  const examplesDir = path.join(__dirname, '..', 'examples', 'backend-python');
  const serviceSrc = path.join(examplesDir, 'market_service.py');
  const destService = path.join(targetDir, 'market_service.py');

  if (fs.existsSync(serviceSrc)) {
    fs.copyFileSync(serviceSrc, destService);
    console.log(`  ✅ Scaffolding service: ${destService}`);
  }
}

function run() {
  const options = parseArgs();
  if (options.help) {
    printHelp();
    return;
  }

  let platform = options.platform;
  if (!platform) {
    platform = detectPlatform(options.targetDir);
    console.log(`🔍 Auto-detected platform: ${platform}`);
  }

  switch (platform) {
    case 'android':
    case 'capacitor':
      integrateAndroid(options.targetDir, options.store, options.packageName);
      break;
    case 'nodejs':
      integrateNodeBackend(options.targetDir, options.store);
      break;
    case 'python':
      integratePythonBackend(options.targetDir, options.store);
      break;
    default:
      console.log(`⚠️ Platform '${platform}' is not yet fully automated. See references for manual integration.`);
      break;
  }

  console.log(`\n✨ Integration steps completed successfully!`);
  console.log(`👉 Next step: Configure your API keys in Developer Panels and start testing.`);
}

run();
