import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import DocsContent from "@/components/docs/DocsContent";
import { InstagramEmbed } from "@/components/posts/InstagramEmbed";
import { Container } from "@/components/ui/Container";
import { getPostBySlug } from "@/lib/services/posts";
import { formatDate, stripMarkdown } from "@/lib/utils";

export const revalidate = 600;

type PostPageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({
  params,
}: PostPageProps): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPostBySlug(slug).catch(() => null);
  if (!post) return { title: "Post" };
  const description = post.excerpt ?? stripMarkdown(post.body).slice(0, 160);
  return {
    title: post.title,
    description,
    alternates: { canonical: `/posts/${slug}` },
    openGraph: {
      title: `${post.title} | Team Vegavath`,
      description,
      type: "article",
    },
  };
}

export default async function PostPage({ params }: PostPageProps) {
  const { slug } = await params;
  const post = await getPostBySlug(slug).catch(() => null);

  if (!post) {
    notFound();
  }

  // Reuses DocsContent rather than copying its component map: it is already a
  // server component that takes a markdown string, so the two stay in sync.
  const articleSchema = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    author: {
      "@type": "Person",
      name: post.author_name,
      ...(post.author_role ? { jobTitle: post.author_role } : {}),
    },
    publisher: {
      "@type": "Organization",
      name: "Team Vegavath",
      url: "https://vegavath.live",
    },
    ...(post.published_at
      ? { datePublished: new Date(post.published_at).toISOString() }
      : {}),
    url: `https://vegavath.live/posts/${post.slug}`,
  };

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
          <div className="mx-auto" style={{ maxWidth: "48rem" }}>
            <Link
              href="/posts"
              className="mono"
              style={{
                display: "inline-block",
                marginBottom: "2.5rem",
                fontSize: "0.75rem",
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                color: "var(--text-muted)",
                textDecoration: "none",
              }}
            >
              ← Posts
            </Link>

            <header
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "0.9rem",
                paddingBottom: "2rem",
                borderBottom: "1px solid var(--border)",
                marginBottom: "2.5rem",
              }}
            >
              <span className="label-tech" style={{ color: "var(--accent)" }}>
                {post.category}
              </span>

              <h1
                className="heading"
                style={{
                  fontSize: "clamp(1.75rem, 4vw, 2.75rem)",
                  fontWeight: 700,
                  lineHeight: 1.2,
                  letterSpacing: "0.01em",
                }}
              >
                {post.title}
              </h1>

              <p
                className="mono"
                style={{
                  fontSize: "0.78rem",
                  letterSpacing: "0.1em",
                  color: "var(--text-secondary)",
                }}
              >
                By {post.author_name}
                {post.author_role ? ` · ${post.author_role}` : ""}
              </p>

              {post.published_at ? (
                <time
                  className="mono"
                  dateTime={new Date(post.published_at).toISOString()}
                  style={{
                    fontSize: "0.72rem",
                    letterSpacing: "0.14em",
                    color: "var(--text-muted)",
                  }}
                >
                  {formatDate(post.published_at)}
                </time>
              ) : null}

              {post.source_url && post.source_label ? (
                <a
                  href={post.source_url}
                  target="_blank"
                  rel="noreferrer"
                  className="mono"
                  style={{
                    fontSize: "0.72rem",
                    letterSpacing: "0.1em",
                    color: "var(--accent)",
                    textDecoration: "none",
                  }}
                >
                  Originally published on {post.source_label} ↗
                </a>
              ) : null}
            </header>

            <DocsContent markdown={post.body} />

            {/* S54: matched on the URL, not source_label. The label is a free
                text admin field (no CHECK constraint), so "instagram",
                "Instagram Post" and a typo would all miss an equality test. */}
            {post.source_url?.includes("instagram.com") ? (
              <InstagramEmbed url={post.source_url} />
            ) : null}
          </div>
        </Container>
      </section>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }}
      />
    </main>
  );
}
