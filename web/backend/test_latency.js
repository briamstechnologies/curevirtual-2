const { PrismaClient } = require('@prisma/client');
const { PerformanceObserver, performance } = require('perf_hooks');

async function measureLatency() {
  console.log('⚡ Measuring Database Latencies...\n');

  // Test pooler connection
  const prismaPooler = new PrismaClient({
    datasources: {
      db: {
        url: process.env.DATABASE_URL
      }
    }
  });

  // Test direct connection
  const prismaDirect = new PrismaClient({
    datasources: {
      db: {
        url: process.env.DIRECT_URL
      }
    }
  });

  // 1. Measure Pooler Connection latency
  console.log('📊 [Pooler (PgBouncer - Port 6543)] Testing...');
  try {
    // Warm up
    await prismaPooler.$connect();
    await prismaPooler.user.count();

    const start = performance.now();
    for (let i = 0; i < 5; i++) {
      const qStart = performance.now();
      await prismaPooler.user.findFirst({ select: { id: true } });
      const qEnd = performance.now();
      console.log(`   - Query ${i+1}: ${(qEnd - qStart).toFixed(2)} ms`);
    }
    const end = performance.now();
    console.log(`✅ [Pooler] Average query time: ${((end - start) / 5).toFixed(2)} ms\n`);
  } catch (err) {
    console.error(`❌ [Pooler] Failed: ${err.message}\n`);
  } finally {
    await prismaPooler.$disconnect();
  }

  // 2. Measure Direct Connection latency
  console.log('📊 [Direct (Port 5432)] Testing...');
  try {
    // Warm up
    await prismaDirect.$connect();
    await prismaDirect.user.count();

    const start = performance.now();
    for (let i = 0; i < 5; i++) {
      const qStart = performance.now();
      await prismaDirect.user.findFirst({ select: { id: true } });
      const qEnd = performance.now();
      console.log(`   - Query ${i+1}: ${(qEnd - qStart).toFixed(2)} ms`);
    }
    const end = performance.now();
    console.log(`✅ [Direct] Average query time: ${((end - start) / 5).toFixed(2)} ms\n`);
  } catch (err) {
    console.error(`❌ [Direct] Failed: ${err.message}\n`);
  } finally {
    await prismaDirect.$disconnect();
  }
}

measureLatency();
