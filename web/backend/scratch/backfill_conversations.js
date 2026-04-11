const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function backfill() {
  console.log('--- Starting ConversationId Backfill ---');
  try {
    const messages = await prisma.message.findMany({
      where: { conversationId: null }
    });

    console.log(`Found ${messages.length} messages to update.`);

    for (const msg of messages) {
      if (msg.senderId && msg.receiverId) {
        const conversationId = [msg.senderId, msg.receiverId].sort().join(':');
        await prisma.message.update({
          where: { id: msg.id },
          data: { conversationId }
        });
      }
    }

    console.log('✅ Backfill complete.');
  } catch (err) {
    console.error('❌ Backfill failed:', err);
  } finally {
    await prisma.$disconnect();
    process.exit(0);
  }
}

backfill();
