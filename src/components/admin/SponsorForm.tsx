"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface SponsorFormProps {
  mode: "create" | "edit";
  initialData?: {
    id?: string;
    name?: string;
    tier?: string;
    website_url?: string;
    description?: string;
    display_order?: number;
    is_active?: boolean;
  };
}

export default function SponsorForm({ mode, initialData }: SponsorFormProps) {
  const router = useRouter();

  const [name, setName] = useState(initialData?.name ?? "");
  const [tier, setTier] = useState(initialData?.tier ?? "community");
  const [website_url, setWebsiteUrl] = useState(initialData?.website_url ?? "");
  const [description, setDescription] = useState(initialData?.description ?? "");
  const [display_order, setDisplayOrder] = useState(initialData?.display_order ?? 0);
  const [is_active, setIsActive] = useState(initialData?.is_active ?? true);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const inputClassName =
    "bg-[#121212] border border-[#2a2a2a] text-[#EBEBEB] rounded-lg px-4 py-2 w-full focus:outline-none focus:border-[#EF5D08]";

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
    setSaving(true);

    try {
      const safeName = name
        .toLowerCase()
        .replace(/\s+/g, "-")
        .replace(/[^a-z0-9-]/g, "");

      let logo_url: string | undefined;

      if (logoFile) {
        logo_url = await uploadFile(logoFile, `sponsors/${safeName}.png`);
      }

      const sponsorFields = {
        name,
        tier,
        website_url,
        description,
        display_order,
        is_active,
        logo_url,
      };

      const isEdit = mode === "edit" && Boolean(initialData?.id);
      const payload = isEdit ? { id: initialData?.id, ...sponsorFields } : sponsorFields;

      const res = await fetch("/api/admin/sponsors", {
        method: isEdit ? "PATCH" : "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        throw new Error("Failed to save sponsor");
      }

      router.push("/admin/sponsors");
    } catch (submitError) {
      const message = submitError instanceof Error ? submitError.message : "Something went wrong";
      setError(message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-4 border border-[#2a2a2a] bg-[#1a1a1a] p-5 text-[#EBEBEB]"
    >
      <div>
        <label htmlFor="name" className="mb-2 block text-sm font-medium text-[#EBEBEB]">
          Name
        </label>
        <input
          id="name"
          type="text"
          required
          value={name}
          onChange={(event) => setName(event.target.value)}
          className={inputClassName}
        />
      </div>

      <div>
        <label htmlFor="tier" className="mb-2 block text-sm font-medium text-[#EBEBEB]">
          Tier
        </label>
        <select
          id="tier"
          value={tier}
          onChange={(event) => setTier(event.target.value)}
          className={inputClassName}
        >
          <option value="premium">Premium</option>
          <option value="community">Community</option>
        </select>
      </div>

      <div>
        <label htmlFor="website_url" className="mb-2 block text-sm font-medium text-[#EBEBEB]">
          Website URL
        </label>
        <input
          id="website_url"
          type="url"
          value={website_url}
          onChange={(event) => setWebsiteUrl(event.target.value)}
          placeholder="https://sponsor-website.com — optional"
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
          rows={4}
          placeholder="Brief description shown in sponsor carousel — optional"
          className={inputClassName}
        />
      </div>

      <div>
        <label
          htmlFor="display_order"
          className="mb-2 block text-sm font-medium text-[#EBEBEB]"
        >
          Display Order
        </label>
        <input
          id="display_order"
          type="number"
          value={display_order}
          onChange={(event) => setDisplayOrder(Number(event.target.value) || 0)}
          className={inputClassName}
        />
        <p className="mt-2 text-xs text-zinc-400">Lower number = appears first</p>
      </div>

      <div>
        <label htmlFor="logo" className="mb-2 block text-sm font-medium text-[#EBEBEB]">
          Logo
        </label>
        <input
          id="logo"
          type="file"
          accept="image/*,image/svg+xml"
          onChange={(event) => setLogoFile(event.target.files?.[0] ?? null)}
          className={inputClassName}
        />
        <p className="mt-2 text-xs text-zinc-400">PNG or SVG recommended</p>
      </div>

      <div className="flex items-center justify-between rounded-lg bg-[#121212] p-4">
        <span className="text-sm font-medium text-[#EBEBEB]">Active</span>
        <button
          type="button"
          onClick={() => setIsActive((prev) => !prev)}
          className={`relative inline-flex h-6 w-11 items-center transition-colors ${
            is_active ? "bg-[#EF5D08]" : "bg-[#3a3a3a]"
          }`}
          aria-label="Toggle sponsor active"
        >
          <span
            className={`inline-block h-4 w-4 transform bg-white transition-transform ${
              is_active ? "translate-x-6" : "translate-x-1"
            }`}
          />
        </button>
      </div>

      {error ? <p className="text-sm text-red-500">{error}</p> : null}

      <button
        type="submit"
        disabled={saving}
        className="w-full rounded-lg bg-[#EF5D08] px-6 py-3 font-semibold text-white transition-colors hover:bg-[#d84f00] disabled:cursor-not-allowed disabled:opacity-50"
      >
        {saving ? "Saving..." : mode === "create" ? "Add Sponsor" : "Update Sponsor"}
      </button>
    </form>
  );
}