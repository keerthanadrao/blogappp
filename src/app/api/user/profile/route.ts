import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/route';

const prisma = new PrismaClient();

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = (session.user as any).id;
    if (!userId) {
      return NextResponse.json({ error: 'User ID not found in session' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        image: true,
        bio: true,
        createdAt: true,
        posts: {
          where: { status: 'PUBLISHED' },
          orderBy: { createdAt: 'desc' },
          include: {
            category: { select: { id: true, name: true } },
            _count: { select: { likes: true, comments: true } }
          }
        },
        comments: {
          orderBy: { createdAt: 'desc' },
          include: {
            post: { select: { id: true, title: true } }
          }
        }
      }
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const totalLikesReceived = user.posts.reduce((sum, p) => sum + p._count.likes, 0);

    return NextResponse.json({
      user: {
        ...user,
        stats: {
          postsCount: user.posts.length,
          commentsCount: user.comments.length,
          likesCount: totalLikesReceived
        }
      }
    });
  } catch (error: any) {
    console.error('Error fetching user profile:', error);
    return NextResponse.json({ error: 'Failed to fetch user profile' }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const body = await req.json();
    const { name, image, bio } = body;

    // Optional URL validation for profile image
    if (image && typeof image === 'string' && image.trim()) {
      try {
        new URL(image);
      } catch (e) {
        return NextResponse.json({ error: 'Please enter a valid image URL' }, { status: 400 });
      }
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        ...(name !== undefined && { name: name?.trim() || null }),
        ...(image !== undefined && { image: image?.trim() || null }),
        ...(bio !== undefined && { bio: bio?.trim() || null })
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        image: true,
        bio: true,
        createdAt: true
      }
    });

    return NextResponse.json({ message: 'Profile updated successfully', user: updatedUser });
  } catch (error: any) {
    console.error('Error updating user profile:', error);
    return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 });
  }
}
