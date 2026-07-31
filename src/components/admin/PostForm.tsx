"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import FileUploadField from "@/components/admin/FileUploadField";
import { StatefulButton } from "@/components/admin/StatefulButton";
import ToggleSwitch from "@/components/admin/ToggleSwitch";
import { slugify } from "@/lib/utils";
// From src/types/post.ts, NOT from services/posts.ts: a value import out of a
// service would pull lib/db.ts and the Neon driver into the client bundle.
import {
  DEFAULT_POST_CATEGORY,
  POST_CATEGORIES,
  POST_CATEGORY_LABELS,
} from "@/types/post";

interface PostFormProps {
  mode: "create" | "edit";
  initialData?: {
    id?: string;
    slug?: string;
    title?: string;
    author_name?: string;
    author_role?: string | null;
    category?: string;
    body?: string;
    excerpt?: string | null;
    source_url?: string | null;
    source_label?: string | null;
    thumbnail_url?: string | null;
    published?: boolean;
    published_at?: Date | string | null;
  };
}

export default function PostForm({ mode, initialData }: PostFormProps) {
  const router = useRouter();

  const [title, setTitle] = useState(initialData?.title ?? "");
  const [slug, setSlug] = useState(initialData?.slug ?? "");
  // On create the slug tracks the title until the admin edits it by hand.
  // On edit it never auto-changes: the published URL must stay stable.
  const [slugTouched, setSlugTouched] = useState(mode === "edit");
  const [authorName, setAuthorName] = useState(initialData?.author_name ?? "");
  const [authorRole, setAuthorRole] = useState(initialData?.author_role ?? "");
  const [category, setCategory] = useState(
    initialData?.category ?? DEFAULT_POST_CATEGORY
  );
  const [excerpt, setExcerpt] = useState(initialData?.excerpt ?? "");
  const [body, setBody] = useState(initialData?.body ?? "");
  const [sourceUrl, setSourceUrl] = useState(initialData?.source_url ?? "");
  const [sourceLabel, setSourceLabel] = useState(initialData?.source_label ?? "");
  const [published, setPublished] = useState(initialData?.published ?? false);
  // Date-only string, which is what <input type="date"> wants. Read and written
  // in UTC on both sides: a local-timezone format here would show a post
  // stamped 00:00Z as the previous day for any admin west of UTC, and saving
  // that back would walk the date one day earlier on every edit.
  const [publishedAt, setPublishedAt] = useState(
    initialData?.published_at
      ? new Date(initialData.published_at).toISOString().slice(0, 10)
      : ""
  );
  const [thumbFiles, setThumbFiles] = useState<File[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Same helper as EventForm: the upload route takes the full R2 key as `path`
  // and does not derive one.
  async function uploadFile(file: File, path: string): Promise<string> {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("path", path);
    const res = await fetch("/api/admin/upload", { method: "POST", body: formData });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Upload failed");
    return data.url;
  }

  function handleTitleChange(value: string) {
    setTitle(value);
    if (!slugTouched) setSlug(slugify(value));
  }

  const previewSlug = slugify(slug || title) || "post-slug";

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSaving(true);

    try {
      const finalSlug = slug || slugify(title);

      // R2 serves immutable cache headers, so a replacement needs a new key.
      // Omitted entirely when no new file was picked: the PATCH route treats a
      // missing key as "leave alone", so edit mode keeps the stored thumbnail.
      const thumbField: { thumbnail_url?: string } = {};
      if (thumbFiles[0]) {
        thumbField.thumbnail_url = await uploadFile(
          thumbFiles[0],
          `posts/${finalSlug}/thumb-${Date.now()}.jpg`
        );
      }

      const fields = {
        slug: finalSlug,
        title,
        author_name: authorName,
        author_role: authorRole.trim() || null,
        category,
        body,
        excerpt: excerpt.trim() || null,
        source_url: sourceUrl.trim() || null,
        source_label: sourceLabel.trim() || null,
        published,
        // Blank means "no opinion": createPost/updatePost fall back to stamping
        // now() when the post is published, which is the old behaviour.
        published_at: publishedAt ? new Date(publishedAt).toISOString() : null,
        ...thumbField,
      };

      const isEdit = mode === "edit" && Boolean(initialData?.id);
      const res = await fetch(
        isEdit ? `/api/admin/posts/${initialData?.id}` : "/api/admin/posts",
        {
          method: isEdit ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(fields),
        }
      );

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || "Failed to save post");
      }

      router.push("/admin/posts");
      router.refresh();
    } catch (submitError) {
      const message =
        submitError instanceof Error ? submitError.message : "Something went wrong";
      setError(message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="admin-form"
      style={{ display: "flex", flexDirection: "column", gap: "1.4rem" }}
    >
      <span className="admin-section-label">Basic Info</span>

      <div>
        <label htmlFor="title" className="admin-label">
          Title
        </label>
        <input
          id="title"
          type="text"
          required
          value={title}
          onChange={(event) => handleTitleChange(event.target.value)}
          className="admin-input"
        />
      </div>

      <div>
        <label htmlFor="slug" className="admin-label">
          Slug
        </label>
        <input
          id="slug"
          type="text"
          value={slug}
          onChange={(event) => {
            setSlugTouched(true);
            setSlug(event.target.value);
          }}
          className="admin-input"
        />
        <p className="admin-hint" style={{ fontFamily: "var(--font-mono)" }}>
          vegavath.live/posts/{previewSlug}
        </p>
      </div>

      <div>
        <label htmlFor="author_name" className="admin-label">
          Author Name
        </label>
        <input
          id="author_name"
          type="text"
          required
          value={authorName}
          onChange={(event) => setAuthorName(event.target.value)}
          className="admin-input"
        />
      </div>

      <div>
        <label htmlFor="author_role" className="admin-label">
          Author Role
        </label>
        <input
          id="author_role"
          type="text"
          value={authorRole}
          onChange={(event) => setAuthorRole(event.target.value)}
          placeholder="e.g. Coding Head · optional"
          className="admin-input"
        />
      </div>

      <div>
        <label htmlFor="category" className="admin-label">
          Category
        </label>
        <select
          id="category"
          value={category}
          onChange={(event) => setCategory(event.target.value)}
          className="admin-input"
        >
          {POST_CATEGORIES.map((value) => (
            <option key={value} value={value}>
              {POST_CATEGORY_LABELS[value]}
            </option>
          ))}
        </select>
      </div>

      <span className="admin-section-label">Content</span>

      <div>
        <label htmlFor="excerpt" className="admin-label">
          Excerpt
        </label>
        <textarea
          id="excerpt"
          value={excerpt}
          onChange={(event) => setExcerpt(event.target.value.slice(0, 200))}
          rows={3}
          maxLength={200}
          placeholder="One or two lines · optional"
          className="admin-input"
        />
        <p className="admin-hint">
          Shown in post list · {excerpt.length}/200
        </p>
      </div>

      <div>
        <span className="admin-label">Thumbnail (4:5 recommended)</span>
        <FileUploadField
          id="thumbnail"
          accept="image/*"
          files={thumbFiles}
          onFilesChange={setThumbFiles}
          currentUrl={initialData?.thumbnail_url}
          hint="Shown on the /posts card · optional"
          uploading={saving}
        />
      </div>

      <div>
        <label htmlFor="body" className="admin-label">
          Content (Markdown)
        </label>
        <textarea
          id="body"
          required
          value={body}
          onChange={(event) => setBody(event.target.value)}
          className="admin-input"
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: "0.8rem",
            lineHeight: 1.7,
            minHeight: "400px",
            resize: "vertical",
          }}
        />
        <p className="admin-hint">
          Headings, bold, lists, links and code fences render on the public page
        </p>
      </div>

      <span className="admin-section-label">Attribution</span>

      <div>
        <label htmlFor="source_url" className="admin-label">
          Source URL
        </label>
        <input
          id="source_url"
          type="url"
          value={sourceUrl}
          onChange={(event) => setSourceUrl(event.target.value)}
          placeholder="https://linkedin.com/... · optional"
          className="admin-input"
        />
      </div>

      <div>
        <label htmlFor="source_label" className="admin-label">
          Source Label
        </label>
        <input
          id="source_label"
          type="text"
          value={sourceLabel}
          onChange={(event) => setSourceLabel(event.target.value)}
          placeholder="LinkedIn · optional"
          className="admin-input"
        />
      </div>

      <span className="admin-section-label">Status &amp; Visibility</span>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "1rem",
        }}
      >
        <span className="admin-label" style={{ marginBottom: 0 }}>
          Published
        </span>
        <ToggleSwitch
          value={published}
          onChange={setPublished}
          ariaLabel="Post published"
        />
      </div>

      <div>
        <label htmlFor="published_at" className="admin-label">
          Published Date
        </label>
        <input
          id="published_at"
          type="date"
          value={publishedAt}
          onChange={(event) => setPublishedAt(event.target.value)}
          className="admin-input"
        />
        <p className="admin-hint">
          Backdate an older post · leave blank to stamp today on publish
        </p>
      </div>

      {error ? <p className="admin-error">{error}</p> : null}

      {/* No success state: handleSubmit navigates to /admin/posts on success. */}
      <StatefulButton
        state={saving ? "loading" : error ? "error" : "idle"}
        style={{ width: "100%" }}
      >
        SAVE POST
      </StatefulButton>
    </form>
  );
}
