import type { Metadata } from "next";
import Link from "next/link";

import { Container } from "@/components/ui/Container";
import { getPublishedPosts, type Post } from "@/lib/services/posts";
import { formatDate, stripMarkdown } from "@/lib/utils";
import { isPostCategory, POST_CATEGORIES } from "@/types/post";

export const metadata: Metadata = {
  title: "Posts",
  description:
    "Technical articles and series from Team Vegavath -- including Keeping up with Kedar on motorsport and engineering.",
  // Category views (/posts?category=coding) all canonicalise to /posts -- they
  // are filtered subsets of one list, not independently rankable pages.
  alternates: { canonical: "/posts" },
  openGraph: {
    title: "Posts | Team Vegavath",
    description:
      "Technical writing from Team Vegavath members on motorsport, robotics, and engineering.",
  },
};

export const revalidate = 300;

const TABS = ["all", ...POST_CATEGORIES] as const;

export default async function PostsPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>;
}) {
  const { category: rawCategory } = await searchParams;
  // Filter is a URL param rather than client state so each category is its own
  // cacheable, linkable page - the list is server-rendered with ISR.
  const active =
    rawCategory && isPostCategory(rawCategory) ? rawCategory : undefined;

  let posts: Post[] = [];
  try {
    posts = await getPublishedPosts(active, 30);
  } catch {
    posts = [];
  }

  return (
    <main
      style={{
        background: "var(--bg-base)",
        color: "var(--text-primary)",
        minHeight: "100vh",
      }}
    >
      <section style={{ width: "100%", padding: "9rem 0 6rem" }}>
        <Container>
          <header style={{ marginBottom: "3rem" }}>
            <p
              className="label-tech"
              style={{ color: "var(--accent)", marginBottom: "0.75rem" }}
            >
              Writing from the crew
            </p>
            <h1
              className="heading"
              style={{
                fontSize: "clamp(2rem, 5vw, 3.25rem)",
                fontWeight: 700,
                letterSpacing: "0.01em",
                textTransform: "uppercase",
              }}
            >
              Posts
            </h1>
          </header>

          <nav
            aria-label="Filter posts by category"
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: "0.25rem",
              marginBottom: "2.5rem",
              borderBottom: "1px solid var(--border)",
            }}
          >
            {TABS.map((tab) => {
              const isActive = tab === "all" ? !active : active === tab;
              return (
                <Link
                  key={tab}
                  href={tab === "all" ? "/posts" : `/posts?category=${tab}`}
                  className="heading"
                  aria-current={isActive ? "page" : undefined}
                  style={{
                    borderBottom: isActive
                      ? "2px solid var(--accent)"
                      : "2px solid transparent",
                    marginBottom: "-1px",
                    borderRadius: 0,
                    padding: "0.65rem 1.1rem",
                    fontSize: "0.8rem",
                    fontWeight: 600,
                    letterSpacing: "0.12em",
                    textTransform: "uppercase",
                    color: isActive ? "var(--text-primary)" : "var(--text-muted)",
                    textDecoration: "none",
                    whiteSpace: "nowrap",
                  }}
                >
                  {tab}
                </Link>
              );
            })}
          </nav>

          {posts.length === 0 ? (
            <p style={{ color: "var(--text-secondary)" }}>
              {active
                ? "Nothing in this category yet."
                : "No posts published yet. Check back soon."}
            </p>
          ) : (
            <div className="posts-card-grid" style={{ width: "100%" }}>
              {posts.map((post) => (
                <PostCard key={post.id} post={post} />
              ))}
            </div>
          )}
        </Container>
      </section>
    </main>
  );
}

function PostCard({ post }: { post: Post }) {
  // Excerpt is optional, so fall back to the opening of the body with markdown
  // syntax stripped out.
  const summary =
    post.excerpt ?? `${stripMarkdown(post.body).slice(0, 160).trim()}...`;

  return (
    <Link href={`/posts/${post.slug}`} className="post-card">
      <span className="label-tech" style={{ color: "var(--accent)" }}>
        {post.category}
      </span>

      <h2 className="heading post-card-title">{post.title}</h2>

      <p className="post-card-excerpt">{summary}</p>

      <div className="post-card-meta">
        <span className="mono">
          {post.author_name}
          {post.author_role ? ` · ${post.author_role}` : ""}
        </span>
        {post.published_at ? (
          <time
            className="mono"
            dateTime={new Date(post.published_at).toISOString()}
          >
            {formatDate(post.published_at)}
          </time>
        ) : null}
      </div>

      <span className="heading post-card-view">READ →</span>
    </Link>
  );
}
