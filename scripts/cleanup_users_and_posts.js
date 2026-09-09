const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function cleanup() {
  console.log('=== STARTING CLEANUP ===');

  // 1. Delete all posts that don't have rich content (Body lines < 5 or test posts)
  const allPosts = await prisma.post.findMany({
    include: { category: true, author: true }
  });

  const validTitles = new Set([
    'The Future of Spatial Computing and Modern Visual Design Systems',
    'Mastering Editorial Typography: Hierarchy, Rhythm, and Readability',
    'Architecting High-Performance Next.js Web Applications for Global Scale',
    'The Evolution of AI-Assisted Software Engineering in 2026',
    'The Art of Deep Work: Cultivating Unbroken Focus in a Noisy World',
    'Sustainable Living and Ergonomic Workspaces for Modern Creatives',
    'Open Source Culture: Community Governance, Trust, and Long-Term Impact',
    'The Great Remote vs Hybrid Debate: Insights from Global Product Teams'
  ]);

  let deletedPostsCount = 0;
  for (const post of allPosts) {
    const lines = post.body.split('\n').filter(l => l.trim().length > 0).length;
    // If not one of the 8 rich posts OR lines < 5
    if (!validTitles.has(post.title) || lines < 5) {
      console.log(`Deleting short/test post: [${post.id}] "${post.title}" (lines: ${lines})`);
      // Delete associated bookmarks, likes, comments first (or cascade)
      await prisma.bookmark.deleteMany({ where: { postId: post.id } });
      await prisma.like.deleteMany({ where: { postId: post.id } });
      await prisma.comment.deleteMany({ where: { postId: post.id } });
      await prisma.post.delete({ where: { id: post.id } });
      deletedPostsCount++;
    }
  }
  console.log(`Deleted ${deletedPostsCount} short/test posts.`);

  // 2. Delete test categories (BookmarkTestingCat, AuthorAvatarTestCat, ProfileDev, etc.)
  const validCategories = new Set(['Design', 'Lifestyle', 'Technology', 'Discussion']);
  const allCategories = await prisma.category.findMany();
  for (const cat of allCategories) {
    if (!validCategories.has(cat.name)) {
      const remainingPosts = await prisma.post.count({ where: { categoryId: cat.id } });
      if (remainingPosts === 0) {
        console.log(`Deleting unused test category: "${cat.name}"`);
        await prisma.category.delete({ where: { id: cat.id } });
      }
    }
  }

  // 3. Delete users named A, B, C or Alice, Bob, Charlie, User A, User B, User C, etc.
  const allUsers = await prisma.user.findMany({
    include: { posts: true }
  });

  const abcRegex = /^(a|b|c|user\s*[abc]|alice|bob|charlie|author\s*[abc])/i;
  const abcEmailRegex = /(user_[abc]|alice|bob|charlie|author_[abc])/i;

  let deletedUsersCount = 0;
  for (const user of allUsers) {
    const nameMatch = user.name && abcRegex.test(user.name.trim());
    const emailMatch = abcEmailRegex.test(user.email.trim());
    
    // Check if user is a test user with name A/B/C or email A/B/C
    if (nameMatch || emailMatch) {
      // If user has any posts, delete them first
      if (user.posts.length > 0) {
        for (const post of user.posts) {
          await prisma.bookmark.deleteMany({ where: { postId: post.id } });
          await prisma.like.deleteMany({ where: { postId: post.id } });
          await prisma.comment.deleteMany({ where: { postId: post.id } });
          await prisma.post.delete({ where: { id: post.id } });
        }
      }
      // Delete user's bookmarks, likes, comments
      await prisma.bookmark.deleteMany({ where: { userId: user.id } });
      await prisma.like.deleteMany({ where: { userId: user.id } });
      await prisma.comment.deleteMany({ where: { authorId: user.id } });
      await prisma.user.delete({ where: { id: user.id } });
      console.log(`Deleted user: [${user.id}] Name: "${user.name}" | Email: ${user.email}`);
      deletedUsersCount++;
    }
  }
  console.log(`Deleted ${deletedUsersCount} users with name A/B/C.`);

  // 4. Ensure the 8 rich posts are properly attributed to clean, professional authors
  const admin = await prisma.user.findUnique({ where: { email: 'admin@example.com' } });
  if (admin) {
    for (const title of validTitles) {
      const p = await prisma.post.findFirst({ where: { title } });
      if (p) {
        await prisma.post.update({
          where: { id: p.id },
          data: {
            authorId: admin.id,
            status: 'PUBLISHED'
          }
        });
      }
    }
  }

  // 5. Final summary
  const remainingPosts = await prisma.post.findMany({
    select: { id: true, title: true, body: true, category: { select: { name: true } } }
  });
  console.log('\n=== REMAINING POSTS IN DATABASE ===');
  console.log('Total remaining posts:', remainingPosts.length);
  remainingPosts.forEach(p => {
    const lines = p.body.split('\n').filter(l => l.trim().length > 0).length;
    console.log(`- [${p.category?.name}] ${p.title} (${lines} lines)`);
  });

  const remainingCategories = await prisma.category.findMany();
  console.log('\n=== REMAINING CATEGORIES ===');
  console.log(remainingCategories.map(c => c.name).join(', '));
}

cleanup()
  .then(() => process.exit(0))
  .catch(e => {
    console.error(e);
    process.exit(1);
  });
