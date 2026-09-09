const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function inspectDb() {
  const categories = await prisma.category.findMany();
  console.log('CATEGORIES:', JSON.stringify(categories, null, 2));

  const posts = await prisma.post.findMany({
    select: {
      id: true,
      title: true,
      body: true,
      cover_image_url: true,
      status: true,
      category: { select: { id: true, name: true } },
      author: { select: { id: true, email: true, name: true } },
    }
  });
  console.log('TOTAL POSTS:', posts.length);
  posts.forEach(p => {
    console.log(`[${p.id}] "${p.title}" | Cat: ${p.category?.name} | Image: ${Boolean(p.cover_image_url)} | Length: ${p.body.length} | Lines: ${p.body.split('\n').length}`);
  });
}

inspectDb()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
