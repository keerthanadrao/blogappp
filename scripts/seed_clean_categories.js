const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function manageData() {
  console.log('--- Step 1: Ensure Standard Categories exist ---');
  const standardCats = ['Technology', 'Design', 'Lifestyle', 'Discussion'];
  const catMap = {};
  for (const name of standardCats) {
    let cat = await prisma.category.findUnique({ where: { name } });
    if (!cat) {
      cat = await prisma.category.create({ data: { name } });
    }
    catMap[name] = cat.id;
  }
  console.log('Standard categories mapped:', Object.keys(catMap));

  console.log('--- Step 2: Remove test categories ---');
  const unwantedCatNames = ['AuthorAvatarTestCat', 'BookmarkTestingCat', 'UnusedCategory', 'ProfileDev'];
  const unwantedCats = await prisma.category.findMany({
    where: { name: { in: unwantedCatNames } }
  });

  const unwantedCatIds = unwantedCats.map(c => c.id);

  if (unwantedCatIds.length > 0) {
    // Reassign posts in unwanted categories to valid categories based on keyword
    const postsInUnwanted = await prisma.post.findMany({
      where: { categoryId: { in: unwantedCatIds } }
    });
    console.log(`Reassigning ${postsInUnwanted.length} posts from test categories to standard categories.`);

    for (const post of postsInUnwanted) {
      let targetCatId = catMap['Technology'];
      if (/design|ui|ux|css|visual/i.test(post.title)) {
        targetCatId = catMap['Design'];
      } else if (/life|mindful|routine|health/i.test(post.title)) {
        targetCatId = catMap['Lifestyle'];
      } else if (/discuss|future|opinion|debate/i.test(post.title)) {
        targetCatId = catMap['Discussion'];
      }
      await prisma.post.update({
        where: { id: post.id },
        data: { categoryId: targetCatId }
      });
    }

    // Delete unwanted categories
    const deleted = await prisma.category.deleteMany({
      where: { id: { in: unwantedCatIds } }
    });
    console.log(`Deleted ${deleted.count} test categories.`);
  }

  console.log('--- Step 3: Enhance existing posts with 3 to 4 line detailed content ---');
  const allPosts = await prisma.post.findMany();
  for (const p of allPosts) {
    const lines = [
      p.body && p.body.length > 80 ? p.body.split('\n')[0] : `Exploring the core concepts, modern tools, and practical design principles of ${p.title}.`,
      'As modern applications grow in complexity, adopting streamlined architectures, clean code conventions, and thoughtful design becomes essential for long-term scalability.',
      'In this article, we break down real-world implementations, performance considerations, and actionable takeaways you can apply directly to your development workflow.',
      'Join the discussion below to share your experiences, perspectives, and questions with the community.'
    ];
    const richBody = lines.join('\n\n');

    await prisma.post.update({
      where: { id: p.id },
      data: { body: richBody }
    });
  }
  console.log(`Updated content detail for ${allPosts.length} posts.`);

  console.log('--- Step 4: Ensure Author Account ---');
  let author = await prisma.user.findFirst({
    where: { email: 'john.smith@example.com' }
  });
  if (!author) {
    author = await prisma.user.findFirst();
  }

  console.log('--- Step 5: Add high-quality curated posts across Technology, Design, Lifestyle, Discussion ---');
  const curatedPosts = [
    // Technology
    {
      title: 'Next.js 16 & Server Actions: The Next Era of Full-Stack Architecture',
      categoryId: catMap['Technology'],
      tags: 'nextjs, react, typescript, webdev',
      cover_image_url: 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&w=1200&q=80',
      body: 'Next.js 16 introduces powerful enhancements to Server Actions, Turbopack, and hybrid caching strategies that fundamentally simplify full-stack web development.\n\nBy moving data mutations and validation logic closer to the database, developers can eliminate boilerplate REST endpoints while keeping strict end-to-end type safety.\n\nIn this article, we dive deep into optimistic updates, error handling patterns, and zero-bundle-size server executions that elevate user experience.\n\nWhether you are building a SaaS product or a high-traffic content platform, these patterns will streamline your engineering velocity.'
    },
    {
      title: 'Building Resilient Event-Driven Microservices with TypeScript',
      categoryId: catMap['Technology'],
      tags: 'typescript, microservices, architecture, nodejs',
      cover_image_url: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=1200&q=80',
      body: 'Event-driven architectures decouple services and provide unmatched horizontal scalability for cloud-native web applications.\n\nUsing TypeScript, we can define strongly-typed event contracts, idempotent message consumers, and reliable dead-letter queue recovery mechanisms.\n\nWe explore practical implementations using Redis streams, transactional outbox patterns, and distributed tracing.\n\nLearn how to prevent cascading failures and guarantee high availability even during peak load spikes.'
    },
    {
      title: 'Optimizing SQLite for High-Concurrency Web Applications',
      categoryId: catMap['Technology'],
      tags: 'sqlite, database, performance, backend',
      cover_image_url: 'https://images.unsplash.com/photo-1544383835-bda2bc66a55d?auto=format&fit=crop&w=1200&q=80',
      body: 'SQLite is often underestimated, but with Write-Ahead Logging (WAL) mode and optimized connection pools, it delivers blistering read performance for modern apps.\n\nBy running queries in-process and eliminating network latency, SQLite can easily handle tens of thousands of requests per second on modest server hardware.\n\nWe review indexing techniques, PRAGMA tuning settings, and memory-mapped I/O configurations that maximize throughput.\n\nDiscover when embedded databases are the ideal architectural choice for your next production deployment.'
    },

    // Design
    {
      title: 'The Rise of Glassmorphism and Spatial UI in Modern Web Design',
      categoryId: catMap['Design'],
      tags: 'design, ui, css, glassmorphism',
      cover_image_url: 'https://images.unsplash.com/photo-1507238691740-187a5b1d37b8?auto=format&fit=crop&w=1200&q=80',
      body: 'Glassmorphic design has evolved from a visual trend into a refined design paradigm that adds depth, visual hierarchy, and elegance to user interfaces.\n\nUsing backdrop filters, subtle multi-layered borders, and dynamic shadows, interfaces feel tactile and responsive to user focus.\n\nWe examine CSS variable tokens, accessibility contrast compliance (WCAG AAA), and performance-safe blur effects.\n\nExplore how to balance aesthetic beauty with functional clarity in modern digital products.'
    },
    {
      title: 'Designing Intuitive Dark Mode Interfaces: Contrast, Colors, and Accessibility',
      categoryId: catMap['Design'],
      tags: 'darkmode, ux, accessibility, styling',
      cover_image_url: 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&w=1200&q=80',
      body: 'A great dark mode is much more than simply inverting white backgrounds to pure black.\n\nEffective dark themes utilize tinted grays, subdued accent tones, and carefully calibrated elevation layers to reduce eye strain and preserve hierarchy.\n\nIn this comprehensive guide, we cover HSL color formulas, typography legibility in low light, and automatic OS preference synchronization.\n\nLearn the essential principles needed to create an enchanting dark theme your users will love.'
    },
    {
      title: 'Micro-Interactions that Delight: Crafting Meaningful Animations in React',
      categoryId: catMap['Design'],
      tags: 'animation, react, frontend, microinteractions',
      cover_image_url: 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?auto=format&fit=crop&w=1200&q=80',
      body: 'Micro-interactions bridge the gap between static interfaces and alive, organic user experiences.\n\nSubtle hover elevation, button ripple transitions, and smooth bookmark toggles reassure users that their actions are acknowledged instantly.\n\nWe break down hardware-accelerated CSS transforms, spring physics, and reduced-motion user preferences.\n\nDiscover how thoughtful animation details can elevate the perceived quality of your entire application.'
    },

    // Lifestyle
    {
      title: 'Developer Productivity: Mindful Coding and Avoiding Burnout',
      categoryId: catMap['Lifestyle'],
      tags: 'productivity, mentalhealth, career, lifestyle',
      cover_image_url: 'https://images.unsplash.com/photo-1498837167922-ddd27525d352?auto=format&fit=crop&w=1200&q=80',
      body: 'In an industry that moves at breakneck speed, maintaining long-term engineering stamina requires intentional work habits and mental recovery.\n\nDeep focus blocks, time-boxing techniques, and setting strict boundaries between work and downtime are proven strategies for creative clarity.\n\nWe share actionable routines to manage cognitive overload, minimize context switching, and sustain passion for craftsmanship.\n\nTake care of your mind so you can write clean code and build meaningful technology for years to come.'
    },
    {
      title: 'Remote Work Ergonomics: Crafting Your Ideal Minimalist Workspace',
      categoryId: catMap['Lifestyle'],
      tags: 'workspace, ergonomics, remote, setup',
      cover_image_url: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=1200&q=80',
      body: 'Your physical working environment has a direct, profound impact on your energy levels, focus, and physical wellbeing.\n\nInvesting in proper monitor alignment, mechanical keyboards with tactile switches, and neutral ambient lighting prevents fatigue during long coding sessions.\n\nWe outline desk organization principles, cable management tips, and ergonomic posture adjustments.\n\nTransform your desk into an inspiring sanctuary tailored for uninterrupted creativity.'
    },

    // Discussion
    {
      title: 'Monolith vs Microservices in 2026: Where Does the Industry Stand?',
      categoryId: catMap['Discussion'],
      tags: 'discussion, architecture, cloud, tech',
      cover_image_url: 'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=1200&q=80',
      body: 'The pendulum between modular monoliths and distributed microservices has swung back toward pragmatic, domain-driven simplicity.\n\nMany engineering teams are discovering that well-structured modular monoliths offer lower operational overhead, faster deployments, and simpler testing.\n\nWe examine real-world case studies, team topologies, and the inflection points where breaking apart a codebase truly makes sense.\n\nWhere does your team stand on this architectural debate? Share your thoughts below!'
    },
    {
      title: 'The Future of AI-Assisted Pair Programming: Co-Pilots vs Autonomous Agents',
      categoryId: catMap['Discussion'],
      tags: 'ai, engineering, discussion, future',
      cover_image_url: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=1200&q=80',
      body: 'Agentic coding assistants are transforming software engineering from manual line-by-line typing into high-level system orchestration.\n\nAs AI models handle automated testing, refactoring, and boilerplate generation, the developer role is shifting toward architecture design and problem formulation.\n\nWe discuss the evolving skillsets required for modern software engineers, ethical considerations, and code quality verification.\n\nHow is AI changing your day-to-day programming workflow? Join the discussion and let us know.'
    }
  ];

  for (const postData of curatedPosts) {
    const created = await prisma.post.create({
      data: {
        title: postData.title,
        body: postData.body,
        tags: postData.tags,
        cover_image_url: postData.cover_image_url,
        status: 'PUBLISHED',
        authorId: author.id,
        categoryId: postData.categoryId
      }
    });
    console.log(`Created curated post: "${created.title}" in category ${postData.categoryId}`);
  }

  // 6. Report final state
  const finalCats = await prisma.category.findMany({
    include: { _count: { select: { posts: true } } }
  });
  console.log('\n=== Final Clean Categories & Post Counts ===');
  finalCats.forEach(c => console.log(`- ${c.name}: ${c._count.posts} published posts`));
}

manageData()
  .then(() => process.exit(0))
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
