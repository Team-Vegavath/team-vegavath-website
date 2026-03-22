"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface EventFormProps {
  mode: "create" | "edit";
  initialData?: {
    id?: string;
    title?: string;
    slug?: string;
    category?: string;
    status?: string;
    description?: string;
    event_date?: string;
    registration_open?: boolean;
    registration_form_url?: string;
  };
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-");
}

export default function EventForm({ mode, initialData }: EventFormProps) {
  const router = useRouter();

  const [title, setTitle] = useState(initialData?.title ?? "");
  const [slug, setSlug] = useState(initialData?.slug ?? "");
  const [category, setCategory] = useState(initialData?.category ?? "workshops");
  const [status, setStatus] = useState(initialData?.status ?? "upcoming");
  const [description, setDescription] = useState(initialData?.description ?? "");
  const [event_date, setEventDate] = useState(initialData?.event_date ?? "");
  const [registration_form_url, setRegistrationFormUrl] = useState(
    initialData?.registration_form_url ?? "",
  );
  const [registration_open, setRegistrationOpen] = useState(
    initialData?.registration_open ?? false,
  );

  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function uploadFile(file: File, path: string): Promise<string> {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("path", path);
    const res = await fetch("/api/admin/upload", { method: "POST", body: formData });
    const data = await res.json();
    return data.url;
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (
      registration_form_url &&
      !registration_form_url.startsWith("http://") &&
      !registration_form_url.startsWith("https://")
    ) {
      setError("Registration URL must start with https://");
      return;
    }

    setSaving(true);

    try {
      let logo_url = "";
      let cover_image_url = "";

      if (logoFile) {
        logo_url = await uploadFile(logoFile, `events/${slug}/logo.png`);
      }

      if (coverFile) {
        cover_image_url = await uploadFile(coverFile, `events/${slug}/cover.jpg`);
      }

      const eventFields = {
        title,
        slug,
        category,
        status,
        description,
        event_date,
        registration_open,
        registration_form_url,
        logo_url,
        cover_image_url,
      };

      const isEdit = mode === "edit" && Boolean(initialData?.id);
      const payload = isEdit ? { id: initialData?.id, ...eventFields } : eventFields;

      const res = await fetch("/api/admin/events", {
        method: isEdit ? "PATCH" : "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        throw new Error("Failed to save event");
      }

      router.push("/admin/events");
    } catch (submitError) {
      const message = submitError instanceof Error ? submitError.message : "Something went wrong";
      setError(message);
    } finally {
      setSaving(false);
    }
  }

  const inputClassName =
    "bg-[#121212] border border-[#2a2a2a] text-[#EBEBEB] rounded-lg px-4 py-2 w-full focus:outline-none focus:border-[#EF5D08]";

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-4 rounded-xl border border-[#2a2a2a] bg-[#1a1a1a] p-5 text-[#EBEBEB]"
    >
      <div>
        <label htmlFor="title" className="mb-2 block text-sm font-medium text-[#EBEBEB]">
          Title
        </label>
        <input
          id="title"
          type="text"
          required
          value={title}
          onChange={(event) => {
            const nextTitle = event.target.value;
            setTitle(nextTitle);
            if (mode === "create") {
              setSlug(slugify(nextTitle));
            }
          }}
          className={inputClassName}
        />
      </div>

      <div>
        <label htmlFor="slug" className="mb-2 block text-sm font-medium text-[#EBEBEB]">
          Slug
        </label>
        <input
          id="slug"
          type="text"
          value={slug}
          onChange={(event) => setSlug(slugify(event.target.value))}
          className={inputClassName}
        />
      </div>

      <div>
        <label htmlFor="category" className="mb-2 block text-sm font-medium text-[#EBEBEB]">
          Category
        </label>
        <select
          id="category"
          value={category}
          onChange={(event) => setCategory(event.target.value)}
          className={inputClassName}
        >
          <option value="workshops">workshops</option>
          <option value="hackathons">hackathons</option>
          <option value="competitions">competitions</option>
          <option value="talks">talks</option>
          <option value="other">other</option>
        </select>
      </div>

      <div>
        <label htmlFor="status" className="mb-2 block text-sm font-medium text-[#EBEBEB]">
          Status
        </label>
        <select
          id="status"
          value={status}
          onChange={(event) => setStatus(event.target.value)}
          className={inputClassName}
        >
          <option value="upcoming">upcoming</option>
          <option value="past">past</option>
          <option value="archived">archived</option>
        </select>
      </div>

      <div>
        <label htmlFor="event_date" className="mb-2 block text-sm font-medium text-[#EBEBEB]">
          Event Date
        </label>
        <input
          id="event_date"
          type="date"
          value={event_date}
          onChange={(event) => setEventDate(event.target.value)}
          className={inputClassName}
        />
      </div>

      <div>
        <label htmlFor="description" className="mb-2 block text-sm font-medium text-[#EBEBEB]">
          Description
        </label>
        <textarea
          id="description"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          placeholder="Supports markdown"
          rows={6}
          className={inputClassName}
        />
      </div>

      <div>
        <label
          htmlFor="registration_form_url"
          className="mb-2 block text-sm font-medium text-[#EBEBEB]"
        >
          Registration Form URL
        </label>
        <input
          id="registration_form_url"
          type="url"
          value={registration_form_url}
          onChange={(event) => setRegistrationFormUrl(event.target.value)}
          className={inputClassName}
        />
        <p className="mt-2 text-xs text-zinc-400">Google Form URL — paste your Google Form link here. Leave blank if not applicable.</p>
      </div>

      <div className="flex items-center justify-between rounded-lg bg-[#121212] p-4">
        <span className="text-sm font-medium text-[#EBEBEB]">Registration Open</span>
        <button
          type="button"
          onClick={() => setRegistrationOpen((prev) => !prev)}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
            registration_open ? "bg-[#EF5D08]" : "bg-[#3a3a3a]"
          }`}
          aria-label="Toggle registration open"
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
              registration_open ? "translate-x-6" : "translate-x-1"
            }`}
          />
        </button>
      </div>

      <div>
        <label htmlFor="logo" className="mb-2 block text-sm font-medium text-[#EBEBEB]">
          Logo
        </label>
        <input
          id="logo"
          type="file"
          accept="image/*"
          onChange={(event) => setLogoFile(event.target.files?.[0] ?? null)}
          className={inputClassName}
        />
        <p className="mt-2 text-xs text-zinc-400">Optional — can be added later</p>
      </div>

      <div>
        <label htmlFor="cover" className="mb-2 block text-sm font-medium text-[#EBEBEB]">
          Cover Image
        </label>
        <input
          id="cover"
          type="file"
          accept="image/*"
          onChange={(event) => setCoverFile(event.target.files?.[0] ?? null)}
          className={inputClassName}
        />
        <p className="mt-2 text-xs text-zinc-400">Optional — can be added later</p>
      </div>

      {error ? <p className="text-sm text-red-500">{error}</p> : null}

      <button
        type="submit"
        disabled={saving}
        className="w-full rounded-lg bg-[#EF5D08] px-6 py-3 font-semibold text-white transition-colors hover:bg-[#d84f00] disabled:cursor-not-allowed disabled:opacity-50"
      >
        {saving ? "Saving..." : mode === "create" ? "Create Event" : "Update Event"}
      </button>
    </form>
  );
}
