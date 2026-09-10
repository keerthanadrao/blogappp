const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const posts = await prisma.post.findMany({
    select: { id: true, title: true, status: true, createdAt: true }
  });
  console.log(posts);
}

main().finally(() => prisma.$disconnect());
