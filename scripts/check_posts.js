const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const allPosts = await prisma.post.findMany({
    select: { id: true, title: true, cover_image_url: true }
  });
  console.log('Total posts before cleanup:', allPosts.length);
  
  const toDelete = allPosts.filter(p => !p.cover_image_url || p.cover_image_url.trim() === '');
  console.log(`Found ${toDelete.length} posts without images to delete.`);
  
  for (const post of toDelete) {
    console.log(`Deleting post without image: "${post.title}" (ID: ${post.id})`);
    await prisma.post.delete({ where: { id: post.id } });
  }

  const remaining = await prisma.post.findMany({
    select: { id: true, title: true, cover_image_url: true, status: true }
  });
  console.log('Total posts after cleanup:', remaining.length);
  console.log('Remaining posts with valid images:');
  console.log(JSON.stringify(remaining, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());


