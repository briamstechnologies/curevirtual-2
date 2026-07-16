const { defineConfig } = require('prisma');
require('dotenv').config();

module.exports = defineConfig({
  schema: 'prisma/schema.prisma',
  connection: {
    url: process.env.DATABASE_URL,
    directUrl: process.env.DIRECT_URL,
  },
  seed: "node prisma/seed.js",
});