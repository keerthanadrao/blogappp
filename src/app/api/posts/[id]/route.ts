import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/route'; 

const prisma = new PrismaClient();

// GET /api/posts/[id] - Fetch a specific post (used for editing to prefill form)
export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id: postId } = await context.params;
    
    const post = await prisma.post.findUnique({
      where: { id: postId },
      include: {
        category: { select: { id: true, name: true } },
      }
    });

    if (!post) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    }

    // You might want to restrict this to only the author or admins, but for simply reading a post, it's generally fine.
    // Since this is specifically for editing in this issue, we can check auth.
    const session = await getServerSession(authOptions);
    const userId = session?.user ? (session.user as any).id : null;
    const role = session?.user ? (session.user as any).role : null;

    if (post.authorId !== userId && role !== 'ADMIN') {
        // If it's a draft, don't let others see it even if they try to fetch by ID
        if (post.status === 'DRAFT') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        }
    }

    return NextResponse.json({ post });
  } catch (error) {
    console.error('Fetch Post Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// PUT /api/posts/[id] - Update a post
export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const role = (session.user as any).role;
    const { id: postId } = await context.params;

    const existingPost = await prisma.post.findUnique({
      where: { id: postId },
    });

    if (!existingPost) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    }

    // Only author or admin can update
    if (existingPost.authorId !== userId && role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { title, body, categoryId, status, cover_image_url, tags } = await request.json();

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

    const updatedPost = await prisma.post.update({
      where: { id: postId },
      data: {
        title: title || undefined,
        body: body || undefined,
        categoryId: categoryId || undefined,
        status: postStatus,
        cover_image_url: cover_image_url !== undefined ? cover_image_url : undefined,
        tags: tags !== undefined ? tags : undefined,
      },
    });

    return NextResponse.json({ success: true, post: updatedPost });
  } catch (error) {
    console.error('Update Post Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// DELETE /api/posts/[id] - Delete a post
export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const role = (session.user as any).role;
    const { id: postId } = await context.params;

    const existingPost = await prisma.post.findUnique({
      where: { id: postId },
    });

    if (!existingPost) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    }

    // Only author or admin can delete
    if (existingPost.authorId !== userId && role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await prisma.post.delete({
      where: { id: postId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete Post Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
