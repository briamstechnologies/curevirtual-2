const fs = require('fs');

const CRITICAL_MODULES = [
  'express',
  '@prisma/client',
  'stripe',
  '@supabase/supabase-js',
  'dotenv',
  'axios',
  'jsonwebtoken',
  'bcryptjs',
  'cors'
];

function verify() {
  console.log('🔍 Verifying Backend Dependencies...\n');

  if (!fs.existsSync('./node_modules')) {
    console.error('❌ FATAL: node_modules directory not found in web/backend. Please run "npm install".');
    process.exit(1);
  } else {
    console.log('✅ node_modules directory exists.\n');
  }

  let failures = 0;
  for (const moduleName of CRITICAL_MODULES) {
    try {
      require(moduleName);
      console.log(`✅ ${moduleName}: Installed and loadable.`);
    } catch (err) {
      console.error(`❌ ${moduleName}: NOT LOADABLE - ${err.message}`);
      failures++;
    }
  }

  console.log(`\nVerification Complete: ${CRITICAL_MODULES.length - failures}/${CRITICAL_MODULES.length} critical modules are ready.`);
  if (failures > 0) {
    process.exit(1);
  }
}

verify();
