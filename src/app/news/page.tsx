import { prisma } from "@/lib/prisma";
import { sanitizeHtml } from "@/lib/sanitize";
import Link from "next/link";

export const metadata = {
  title: "News — Astra Blog",
  description: "Latest news and announcements from Astra Blog.",
};

export const dynamic = "force-dynamic";

export default async function NewsPage() {
  let newsItems: any[] = [];
  let fetchError = false;

  try {
    newsItems = await prisma.news.findMany({
      where: { published: true },
      orderBy: { createdAt: "desc" },
    });
  } catch (err) {
    console.error("[NEWS PAGE] Failed to fetch news:", err);
    fetchError = true;
  }

  return (
    <div
      className="main-container"
      style={{ maxWidth: "860px", margin: "0 auto" }}
    >
      {/* Header */}
      <div style={{ marginBottom: "var(--space-5)" }}>
        <h1
          style={{
            fontSize: "clamp(1.8rem, 4vw, 2.6rem)",
            fontWeight: 800,
            marginBottom: "8px",
          }}
        >
          📰 News &amp; Announcements
        </h1>
        <p style={{ color: "var(--text-secondary)", fontSize: "0.97rem" }}>
          Stay up to date with the latest updates from Astra Blog.
        </p>
      </div>

      {fetchError && (
        <div
          style={{
            padding: "var(--space-3)",
            background: "rgba(239, 68, 68, 0.12)",
            border: "1px solid var(--danger)",
            borderRadius: "var(--radius-md)",
            color: "#fca5a5",
            marginBottom: "var(--space-4)",
          }}
        >
          Unable to load news at the moment. Please try again later.
        </div>
      )}

      {!fetchError && newsItems.length === 0 && (
        <div
          className="card"
          style={{
            textAlign: "center",
            padding: "var(--space-6)",
            color: "var(--text-secondary)",
          }}
        >
          <p style={{ fontSize: "2rem", marginBottom: "12px" }}>📭</p>
          <p>No news items published yet. Check back soon!</p>
        </div>
      )}

      {/* News list */}
      <div
        style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}
      >
        {newsItems.map((item) => {
          // Sanitise HTML before rendering
          const safeDescription = sanitizeHtml(item.description || "");

          return (
            <article
              key={item.id}
              className="card"
              style={{ padding: "var(--space-4)" }}
              data-testid={`news-article-${item.id}`}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  gap: "var(--space-2)",
                  marginBottom: "var(--space-3)",
                  flexWrap: "wrap",
                }}
              >
                <h2
                  style={{
                    fontSize: "clamp(1.1rem, 2.5vw, 1.35rem)",
                    fontWeight: 700,
                    margin: 0,
                    lineHeight: 1.3,
                  }}
                >
                  {item.title}
                </h2>
                <span
                  style={{
                    fontSize: "0.8rem",
                    color: "var(--text-muted)",
                    whiteSpace: "nowrap",
                    flexShrink: 0,
                  }}
                >
                  {new Date(item.createdAt).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                  })}
                </span>
              </div>

              {/* Sanitised rich-text description */}
              {safeDescription && (
                <div
                  className="news-prose"
                  dangerouslySetInnerHTML={{ __html: safeDescription }}
                  data-testid={`news-description-${item.id}`}
                />
              )}
            </article>
          );
        })}
      </div>

      {/* Back link */}
      <div style={{ marginTop: "var(--space-5)" }}>
        <Link href="/" className="btn btn-secondary">
          ← Back to Blog
        </Link>
      </div>
    </div>
  );
}
