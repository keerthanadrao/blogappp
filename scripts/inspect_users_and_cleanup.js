const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function inspect() {
  const users = await prisma.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      _count: { select: { posts: true, comments: true, likes: true, bookmarks: true } }
    }
  });
  console.log('TOTAL USERS:', users.length);
  users.forEach(u => {
    console.log(`[USER] ID: ${u.id} | Name: "${u.name}" | Email: ${u.email} | Posts: ${u._count.posts}`);
  });

  const posts = await prisma.post.findMany({
    select: {
      id: true,
      title: true,
      body: true,
      cover_image_url: true,
      author: { select: { name: true, email: true } },
      category: { select: { name: true } }
    }
  });
  console.log('\nTOTAL POSTS:', posts.length);
  posts.forEach(p => {
    const lines = p.body.split('\n').filter(l => l.trim().length > 0).length;
    console.log(`[POST] ID: ${p.id} | Title: "${p.title}" | Author: "${p.author?.name || p.author?.email}" | Category: ${p.category?.name} | Body lines: ${lines} | Has cover: ${Boolean(p.cover_image_url)}`);
  });
}

inspect()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
