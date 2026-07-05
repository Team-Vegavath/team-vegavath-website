"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface MemberFormProps {
  mode: "create" | "edit";
  initialData?: {
    id?: string;
    name?: string;
    role?: string;
    tier?: string;
    domain?: string;
    quote?: string;
    linkedin_url?: string;
    display_order?: number;
    is_active?: boolean;
  };
}

export default function MemberForm({ mode, initialData }: MemberFormProps) {
  const router = useRouter();

  const [name, setName] = useState(initialData?.name ?? "");
  const [role, setRole] = useState(initialData?.role ?? "");
  const [tier, setTier] = useState(initialData?.tier ?? "core");
  const [domain, setDomain] = useState(initialData?.domain ?? "Automotive");
  const [quote, setQuote] = useState(initialData?.quote ?? "");
  const [linkedin_url, setLinkedinUrl] = useState(initialData?.linkedin_url ?? "");
  const [display_order, setDisplayOrder] = useState(initialData?.display_order ?? 0);
  const [is_active, setIsActive] = useState(initialData?.is_active ?? true);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
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
    setSaving(true);

    try {
      let photo_url = "";
      const safeName = name.toLowerCase().replace(/\s+/g, "-");

      if (photoFile) {
        photo_url = await uploadFile(photoFile, `team/${tier}/${safeName}.jpg`);
      }

      const payload = {
        id: initialData?.id,
        name,
        role,
        tier,
        domain,
        quote,
        linkedin_url,
        display_order,
        is_active,
        photo_url,
      };

      const method = mode === "edit" && initialData?.id ? "PATCH" : "POST";

      const res = await fetch("/api/admin/team", {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        const message =
          data && typeof data.error === "string" ? data.error : "Failed to save member";
        throw new Error(message);
      }

      router.push("/admin/team");
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
        <label htmlFor="role" className="mb-2 block text-sm font-medium text-[#EBEBEB]">
          Role
        </label>
        <input
          id="role"
          type="text"
          required
          value={role}
          onChange={(event) => setRole(event.target.value)}
          placeholder="e.g. Club Head, Design Lead, Member"
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
          <option value="core">core</option>
          <option value="crew">crew</option>
          <option value="legacy">legacy</option>
        </select>
      </div>

      <div>
        <label htmlFor="domain" className="mb-2 block text-sm font-medium text-[#EBEBEB]">
          Domain
        </label>
        <select
          id="domain"
          value={domain}
          onChange={(event) => setDomain(event.target.value)}
          className={inputClassName}
        >
          <option value="Automotive">Automotive</option>
          <option value="Robotics">Robotics</option>
          <option value="Design">Design</option>
          <option value="Media">Media</option>
          <option value="Marketing">Marketing</option>
          <option value="Programming">Programming</option>
          <option value="Operations">Operations</option>
        </select>
      </div>

      <div>
        <label htmlFor="quote" className="mb-2 block text-sm font-medium text-[#EBEBEB]">
          Quote
        </label>
        <textarea
          id="quote"
          rows={4}
          value={quote}
          onChange={(event) => setQuote(event.target.value)}
          placeholder="Their personal quote — optional"
          className={inputClassName}
        />
      </div>

      <div>
        <label htmlFor="linkedin_url" className="mb-2 block text-sm font-medium text-[#EBEBEB]">
          LinkedIn URL
        </label>
        <input
          id="linkedin_url"
          type="url"
          value={linkedin_url}
          onChange={(event) => setLinkedinUrl(event.target.value)}
          placeholder="https://linkedin.com/in/username — optional"
          className={inputClassName}
        />
      </div>

      <div>
        <label htmlFor="display_order" className="mb-2 block text-sm font-medium text-[#EBEBEB]">
          Display Order
        </label>
        <input
          id="display_order"
          type="number"
          value={display_order}
          onChange={(event) => setDisplayOrder(Number(event.target.value))}
          className={inputClassName}
        />
        <p className="mt-2 text-xs text-zinc-400">Lower number = appears first within tier</p>
      </div>

      <div>
        <label htmlFor="photo" className="mb-2 block text-sm font-medium text-[#EBEBEB]">
          Photo
        </label>
        <input
          id="photo"
          type="file"
          accept="image/*"
          onChange={(event) => setPhotoFile(event.target.files?.[0] ?? null)}
          className={inputClassName}
        />
        <p className="mt-2 text-xs text-zinc-400">Optional — can be added later</p>
      </div>

      <div className="flex items-center justify-between rounded-lg bg-[#121212] p-4">
        <span className="text-sm font-medium text-[#EBEBEB]">Active</span>
        <div
          onClick={() => setIsActive((prev) => !prev)}
          className={`relative inline-flex h-6 w-11 items-center transition-colors ${
            is_active ? "bg-[#EF5D08]" : "bg-[#3a3a3a]"
          }`}
        >
          <span
            className={`inline-block h-4 w-4 transform bg-white transition-transform ${
              is_active ? "translate-x-6" : "translate-x-1"
            }`}
          />
        </div>
      </div>

      {error ? <p className="text-sm text-red-500">{error}</p> : null}

      <button
        type="submit"
        disabled={saving}
        className="w-full rounded-lg bg-[#EF5D08] px-6 py-3 font-semibold text-white transition-colors hover:bg-[#d84f00] disabled:cursor-not-allowed disabled:opacity-50"
      >
        {saving ? "Saving..." : mode === "create" ? "Add Member" : "Update Member"}
      </button>
    </form>
  );
}
