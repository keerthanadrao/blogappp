import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/route';

const prisma = new PrismaClient();

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const session: any = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: commentId } = await context.params;
    const userId = session.user.id;

    const existingComment = await prisma.comment.findUnique({
      where: { id: commentId },
    });

    if (!existingComment) {
      return NextResponse.json({ error: 'Comment not found' }, { status: 404 });
    }

    // Only the author can edit their comment
    if (existingComment.authorId !== userId) {
      return NextResponse.json({ error: 'Forbidden: You can only edit your own comments' }, { status: 403 });
    }

    const body = await request.json();
    const { content } = body;

    if (!content || typeof content !== 'string' || content.trim() === '') {
      return NextResponse.json({ error: 'Comment content cannot be empty' }, { status: 400 });
    }

    const updatedComment = await prisma.comment.update({
      where: { id: commentId },
      data: {
        content: content.trim(),
      },
      include: {
        author: {
          select: { id: true, name: true, email: true, role: true },
        },
      },
    });

    return NextResponse.json({ comment: updatedComment });
  } catch (error) {
    console.error('UPDATE COMMENT ERROR:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const session: any = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: commentId } = await context.params;
    const userId = session.user.id;
    const userRole = session.user.role;

    const existingComment = await prisma.comment.findUnique({
      where: { id: commentId },
    });

    if (!existingComment) {
      return NextResponse.json({ error: 'Comment not found' }, { status: 404 });
    }

    // Author or ADMIN can delete
    const isAuthor = existingComment.authorId === userId;
    const isAdmin = userRole === 'ADMIN';

    if (!isAuthor && !isAdmin) {
      return NextResponse.json({ error: 'Forbidden: You do not have permission to delete this comment' }, { status: 403 });
    }

    await prisma.comment.delete({
      where: { id: commentId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE COMMENT ERROR:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
