const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('Clearing old data...');
  await prisma.comment.deleteMany();
  await prisma.like.deleteMany();
  await prisma.post.deleteMany();
  await prisma.category.deleteMany();
  await prisma.user.deleteMany();

  console.log('Creating users...');
  const author1 = await prisma.user.create({
    data: {
      email: 'jane.doe@example.com',
      password_hash: await bcrypt.hash('password', 10),
      name: 'Jane Doe',
      role: 'ADMIN',
    },
  });

  const author2 = await prisma.user.create({
    data: {
      email: 'john.smith@example.com',
      password_hash: await bcrypt.hash('password', 10),
      name: 'John Smith',
      role: 'READER',
    },
  });

  console.log('Creating categories...');
  const techCat = await prisma.category.create({ data: { name: 'Technology' } });
  const designCat = await prisma.category.create({ data: { name: 'Design' } });
  const lifeCat = await prisma.category.create({ data: { name: 'Lifestyle' } });

  console.log('Creating posts...');
  await prisma.post.create({
    data: {
      title: 'The Future of Web Development',
      body: 'Web development is evolving rapidly. With tools like Next.js, React, and modern CSS, developers can build incredibly fast and beautiful applications. The rise of server components is changing how we think about rendering...',
      status: 'PUBLISHED',
      authorId: author1.id,
      categoryId: techCat.id,
    },
  });

  await prisma.post.create({
    data: {
      title: 'Mastering UI/UX Design',
      body: 'A great user interface is invisible. It allows users to accomplish their goals without friction. In this post, we explore the principles of glassmorphism, proper typography scaling, and the psychological impact of color palettes.',
      status: 'PUBLISHED',
      authorId: author2.id,
      categoryId: designCat.id,
    },
  });

  await prisma.post.create({
    data: {
      title: 'Balancing Work and Life in Tech',
      body: 'Burnout is a real issue in the tech industry. It\'s important to step away from the screen, take walks, and maintain hobbies outside of coding. Here are my top 5 tips for maintaining a healthy work-life balance while working remotely.',
      status: 'PUBLISHED',
      authorId: author1.id,
      categoryId: lifeCat.id,
    },
  });

  console.log('Seed completed successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
