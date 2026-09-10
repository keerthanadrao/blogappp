import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]/route'; // verify this is the correct relative path! (src/app/api/posts -> src/app/api/auth/[...nextauth])

// POST /api/posts - Create a new post
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = (session.user as any).id;
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { title, body, categoryId, status, cover_image_url, tags } = await req.json();

    if (!title || !body || !categoryId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    if (cover_image_url && typeof cover_image_url === 'string' && cover_image_url.trim()) {
      try {
        const parsed = new URL(cover_image_url.trim());
        if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
          return NextResponse.json({ error: 'Invalid Image URL format. Must start with http:// or https://' }, { status: 400 });
        }
      } catch {
        return NextResponse.json({ error: 'Invalid Image URL format.' }, { status: 400 });
      }
    }

    const postStatus = status === 'PUBLISHED' ? 'PUBLISHED' : 'DRAFT';

    const newPost = await prisma.post.create({
      data: {
        title,
        body,
        categoryId,
        status: postStatus,
        authorId: userId,
        cover_image_url: cover_image_url || null,
        tags: tags || null,
      },
    });

    return NextResponse.json({ success: true, post: newPost }, { status: 201 });
  } catch (error) {
    console.error('Create Post Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
