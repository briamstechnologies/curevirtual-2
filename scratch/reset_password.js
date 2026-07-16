const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const bcrypt = require('bcryptjs');

async function main() {
  const email = 'ahmedali.64048@gmail.com';
  const hashedPassword = await bcrypt.hash('123456', 10);
  
  const updatedUser = await prisma.user.update({
    where: { email },
    data: { password: hashedPassword }
  });
  
  console.log(`Password reset for ${email} successfully!`, updatedUser.email);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
