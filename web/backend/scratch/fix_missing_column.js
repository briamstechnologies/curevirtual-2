const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('--- Manual Schema Fix ---');
  try {
    // Check if column exists first
    const checkColumn = await prisma.$queryRaw`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'Message' AND column_name = 'conversationId';
    `;

    if (checkColumn.length === 0) {
      console.log('Adding conversationId column to Message table...');
      await prisma.$executeRawUnsafe(`
        ALTER TABLE "public"."Message" ADD COLUMN IF NOT EXISTS "conversationId" TEXT;
      `);
      console.log('Adding index for conversationId...');
      await prisma.$executeRawUnsafe(`
        CREATE INDEX IF NOT EXISTS "Message_conversationId_idx" ON "public"."Message"("conversationId");
      `);
      console.log('✅ Column and index added successfully.');
    } else {
      console.log('ℹ️ Column conversationId already exists.');
    }

  } catch (error) {
    console.error('❌ Error applying schema fix:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
