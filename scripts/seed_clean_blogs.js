const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('--- Cleaning Categories & Posts ---');

  // 1. Delete posts in dummy/test categories
  await prisma.post.deleteMany({
    where: {
      category: {
        name: { in: ['BookmarkTestingCat', 'AuthorAvatarTestCat', 'UnusedCategory'] }
      }
    }
  });

  // 2. Delete the dummy categories
  await prisma.category.deleteMany({
    where: {
      name: { in: ['BookmarkTestingCat', 'AuthorAvatarTestCat', 'UnusedCategory'] }
    }
  });

  // 3. Ensure the 4 primary categories exist
  const categoriesList = ['Design', 'Lifestyle', 'Technology', 'Discussion'];
  const catMap = {};
  for (const catName of categoriesList) {
    const cat = await prisma.category.upsert({
      where: { name: catName },
      update: {},
      create: { name: catName }
    });
    catMap[catName] = cat.id;
  }

  // 4. Delete posts without cover images or with short bodies (< 150 chars or 1 line dummy test posts)
  const allPosts = await prisma.post.findMany();
  for (const post of allPosts) {
    if (!post.cover_image_url || post.body.trim().length < 150 || post.title.startsWith('Bookmark Test Post') || post.title.startsWith('User ') || post.title.startsWith('Public Deployed Post')) {
      await prisma.post.delete({ where: { id: post.id } });
      console.log(`Deleted short/dummy post: "${post.title}"`);
    }
  }

  // 5. Get or create a primary editorial author
  let author = await prisma.user.findFirst({
    where: { role: { in: ['ADMIN', 'AUTHOR', 'READER'] } }
  });

  if (!author) {
    author = await prisma.user.create({
      data: {
        name: 'Elena Rostova',
        email: 'elena.rostova@example.com',
        password_hash: '$2a$10$e8wY8bQ9q1n4e1234567890123456789012345678901234567890',
        role: 'AUTHOR',
        image: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=250&q=80',
        bio: 'Senior Design Architect & Tech Essayist writing on modern user experiences and spatial systems.'
      }
    });
  }

  // 6. Curated Rich Blog Posts for Each Category (5+ lines of substantive, engaging content)
  const curatedBlogs = [
    {
      title: 'The Future of Spatial Computing and Modern Visual Design Systems',
      category: 'Design',
      tags: 'design, ui, spatial, creativity',
      cover_image_url: 'https://images.unsplash.com/photo-1507238691740-187a5b1d37b8?auto=format&fit=crop&w=1200&q=80',
      body: `Spatial computing is rapidly transforming how we conceptualize user interfaces beyond the boundary of traditional rectangular viewports. As spatial canvases expand, designers must rethink spatial depth, lighting, and tactile micro-feedback to maintain natural affordances.

Modern design systems are moving from flat token structures to dynamic, context-aware layers that react in real time to lighting conditions and viewer distance. By treating elevation not merely as a shadow offset but as a physical depth plane, applications achieve an unprecedented sense of presence.

Crafting spatial interfaces requires disciplined hierarchy and minimal cognitive friction. When visual weight is balanced with generous negative space, interfaces feel lightweight, intuitive, and effortlessly delightful to navigate. Designers who master spatial ergonomics today will define the next generation of computing.`
    },
    {
      title: 'Mastering Editorial Typography: Hierarchy, Rhythm, and Readability',
      category: 'Design',
      tags: 'typography, branding, editorial, design',
      cover_image_url: 'https://images.unsplash.com/photo-1542744094-3a31f272c490?auto=format&fit=crop&w=1200&q=80',
      body: `Great typography is the quiet foundation of exceptional digital experiences. In editorial design, type does more than communicate words—it establishes tone, paces the reader through complex ideas, and imparts emotional resonance.

Establishing vertical rhythm requires a meticulous relationship between font size, line height, and baseline grids. When paragraph tracking and measure (line length) are tuned to 65–75 characters per line, reader fatigue drops dramatically, allowing long-form narratives to flourish.

Pairing modern geometric sans-serif headings with timeless serif body fonts creates a sophisticated visual dialogue. By treating typography as architecture rather than mere styling, creators deliver content that readers truly cherish revisiting.`
    },
    {
      title: 'Architecting High-Performance Next.js Web Applications for Global Scale',
      category: 'Technology',
      tags: 'technology, nextjs, react, architecture',
      cover_image_url: 'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=1200&q=80',
      body: `Building scalable web applications demands a holistic approach combining server-side rendering, streaming data architectures, and intelligent edge caching. Next.js 16 with React 19 Server Components introduces fundamental shifts in how data fetching and layout composition are orchestrated.

By shifting data intensive operations to the server, client bundle sizes are radically minimized while time-to-interactive metrics drop to sub-100ms ranges. Edge middleware enables personalized routing and geodistributed authentication without adding latency overhead to the critical rendering path.

Modern engineering teams must prioritize core web vitals and zero-layout-shift design patterns from day one. Investing in resilient database pooling, structured error boundaries, and optimistic client mutations ensures applications remain blazing fast under heavy concurrent traffic.`
    },
    {
      title: 'The Evolution of AI-Assisted Software Engineering in 2026',
      category: 'Technology',
      tags: 'ai, engineering, coding, future',
      cover_image_url: 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&w=1200&q=80',
      body: `Artificial intelligence has evolved from simple code completion assistants into autonomous pair programmers capable of architectural analysis, test synthesis, and multi-step refactoring.

Rather than replacing human software engineers, these tools elevate developers into systems architects and product strategists. Routine boilerplate, type definitions, and edge-case regression tests can now be scaffolded in seconds, allowing engineers to focus on deep domain modeling and user empathy.

The key to thriving in this new landscape is cultivating rigorous code review instincts and architectural clarity. As autonomous coding workflows mature, the value of precise requirements, clean modular boundaries, and comprehensive end-to-end verification has never been higher.`
    },
    {
      title: 'The Art of Deep Work: Cultivating Unbroken Focus in a Noisy World',
      category: 'Lifestyle',
      tags: 'lifestyle, focus, productivity, mindfulness',
      cover_image_url: 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?auto=format&fit=crop&w=1200&q=80',
      body: `In an era defined by continuous pings and rapid context switching, the capacity for sustained, deep cognitive focus has become a rare superpower. Deep work is the discipline of concentrating without distraction on cognitively demanding tasks.

Protecting your morning hours for uninterrupted creative flow yields compounding dividends. By setting clear boundaries around asynchronous communication, batching emails, and embracing monastic focus blocks, knowledge workers can achieve breakthroughs that fragmented schedules prevent.

True productivity is not about maximizing the volume of shallow tasks completed; it is about the depth and quality of insight generated. Developing a daily mindfulness ritual and unplugging intentionally revitalizes the mind and fosters lifelong creative vitality.`
    },
    {
      title: 'Sustainable Living and Ergonomic Workspaces for Modern Creatives',
      category: 'Lifestyle',
      tags: 'wellness, ergonomics, lifestyle, environment',
      cover_image_url: 'https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=1200&q=80',
      body: `Designing an inspiring workspace is an essential investment in physical health, mental clarity, and sustained daily energy. As remote work becomes standard, our physical environments directly shape our emotional well-being.

Incorporating natural daylight, active air purification, and biophilic greenery into your studio lowers stress cortisol levels and enhances creative problem-solving. Ergonomic standing desks paired with dynamic seating prevent postural fatigue and encourage natural movement throughout the workday.

Sustainable living starts with intentional micro-habits—choosing timeless, repairable furniture, reducing single-use materials, and creating peaceful spaces that celebrate simplicity. A mindful physical environment is the greatest catalyst for enduring creative focus.`
    },
    {
      title: 'Open Source Culture: Community Governance, Trust, and Long-Term Impact',
      category: 'Discussion',
      tags: 'discussion, opensource, community, culture',
      cover_image_url: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=1200&q=80',
      body: `Open source software powers the modern global economy, yet the human dynamics of open source communities remain one of the most fascinating social experiments in collaboration.

At the heart of every enduring open source project is a culture of transparency, mutual respect, and clear governance. When maintainers foster welcoming contribution guidelines and prioritize constructive dialogue, projects flourish with global contributions across cultures and timezones.

However, maintainer sustainability and burnout remain critical challenges that require collective industry backing. By exploring novel funding models, transparent stewardship, and community mentorship, we can build a resilient digital infrastructure that benefits humanity for decades to come.`
    },
    {
      title: 'The Great Remote vs Hybrid Debate: Insights from Global Product Teams',
      category: 'Discussion',
      tags: 'discussion, futureofwork, hybrid, collaboration',
      cover_image_url: 'https://images.unsplash.com/photo-1528605248644-14dd04022da1?auto=format&fit=crop&w=1200&q=80',
      body: `The debate over physical offices versus distributed remote work has matured from emergency experimentation into intentional organizational architecture. Top engineering organizations are realizing that location is secondary to operational clarity.

High-performing distributed teams succeed because they prioritize documentation, asynchronous alignment, and outcome-oriented evaluation over physical presence. When decisions are recorded transparently and meetings are reserved for high-bandwidth brainstorming, team autonomy skyrockets.

Hybrid models, when executed poorly, risk creating two-tiered communication cultures. The future belongs to organizations that embrace deliberate communication, invest in periodic in-person retreats, and measure success by real impact rather than seat time.`
    }
  ];

  for (const blog of curatedBlogs) {
    const createdPost = await prisma.post.create({
      data: {
        title: blog.title,
        body: blog.body,
        cover_image_url: blog.cover_image_url,
        tags: blog.tags,
        status: 'PUBLISHED',
        authorId: author.id,
        categoryId: catMap[blog.category],
      }
    });
    console.log(`Created rich blog [${blog.category}]: "${createdPost.title}"`);
  }

  console.log('--- Successfully seeded rich blogs across all categories! ---');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
