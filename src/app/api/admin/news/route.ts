import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";

// ─── Helpers ────────────────────────────────────────────────────────────────

async function requireAdmin() {
  const session: any = await getServerSession(authOptions);
  if (!session || session.user?.role !== "ADMIN") {
    return null;
  }
  return session;
}

// ─── GET — list all news items ──────────────────────────────────────────────

export async function GET(req: Request) {
  try {
    // Public reads are allowed (for the public news page)
    const { searchParams } = new URL(req.url);
    const publishedOnly = searchParams.get("published") === "true";

    const news = await prisma.news.findMany({
      where: publishedOnly ? { published: true } : undefined,
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ news }, { status: 200 });
  } catch (error: any) {
    console.error("[NEWS] GET error:", error);
    return NextResponse.json(
      { error: "Failed to fetch news" },
      { status: 500 }
    );
  }
}

// ─── POST — create a news item ───────────────────────────────────────────────

export async function POST(req: Request) {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { title, description, published } = body;

    if (!title || typeof title !== "string" || !title.trim()) {
      return NextResponse.json(
        { error: "Title is required" },
        { status: 400 }
      );
    }

    if (description === undefined || description === null) {
      return NextResponse.json(
        { error: "Description is required" },
        { status: 400 }
      );
    }

    const news = await prisma.news.create({
      data: {
        title: title.trim(),
        description: description, // HTML string — sanitised on display
        published: Boolean(published),
      },
    });

    return NextResponse.json({ news }, { status: 201 });
  } catch (error: any) {
    console.error("[NEWS] POST error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to create news item" },
      { status: 500 }
    );
  }
}

// ─── PUT — update a news item ────────────────────────────────────────────────

export async function PUT(req: Request) {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { id, title, description, published } = body;

    if (!id || typeof id !== "string") {
      return NextResponse.json({ error: "ID is required" }, { status: 400 });
    }

    if (!title || typeof title !== "string" || !title.trim()) {
      return NextResponse.json(
        { error: "Title is required" },
        { status: 400 }
      );
    }

    const existing = await prisma.news.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { error: "News item not found" },
        { status: 404 }
      );
    }

    const news = await prisma.news.update({
      where: { id },
      data: {
        title: title.trim(),
        description: description ?? existing.description,
        published: published !== undefined ? Boolean(published) : existing.published,
      },
    });

    return NextResponse.json({ news }, { status: 200 });
  } catch (error: any) {
    console.error("[NEWS] PUT error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to update news item" },
      { status: 500 }
    );
  }
}

// ─── DELETE — remove a news item ─────────────────────────────────────────────

export async function DELETE(req: Request) {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "ID is required" }, { status: 400 });
    }

    const existing = await prisma.news.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { error: "News item not found" },
        { status: 404 }
      );
    }

    await prisma.news.delete({ where: { id } });

    return NextResponse.json(
      { message: "News item deleted" },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("[NEWS] DELETE error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to delete news item" },
      { status: 500 }
    );
  }
}
