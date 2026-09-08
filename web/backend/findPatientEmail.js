const {PrismaClient} = require('@prisma/client');
const p = new PrismaClient();
p.user.findUnique({where: {id: 'c80ea9f1-1ad4-4048-b961-6ef3f9cce29f'}}).then(u => {
    console.log(u.email);
    p.$disconnect();
});
