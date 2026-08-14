"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import FileUploadField from "@/components/admin/FileUploadField";
import { StatefulButton } from "@/components/admin/StatefulButton";
import ToggleSwitch from "@/components/admin/ToggleSwitch";

/* Structure copied from SponsorForm: same upload helper, same admin-* classes,
   same StatefulButton, same onSuccess-or-navigate contract.

   One thing SponsorForm does NOT have, and this needs: a way to CLEAR an image.
   SponsorForm only ever sends logo_url when a new file was picked, which pairs
   with updateSponsor's COALESCE ("absent means leave alone") and makes removal
   impossible. Here the service is read-then-write, so absent still means leave
   alone but an explicit null clears -- the REMOVE buttons below are what send
   that null, and they are the reason the divergence is worth anything. */

interface AnnouncementFormProps {
  mode: "create" | "edit";
  onSuccess?: () => void;
  initialData?: {
    id?: string;
    title?: string;
    body?: string;
    image_url_desktop?: string | null;
    image_url_mobile?: string | null;
    cta_label?: string;
    cta_href?: string;
    is_active?: boolean;
    display_order?: number;
  };
}

export default function AnnouncementForm({
  mode,
  onSuccess,
  initialData,
}: AnnouncementFormProps) {
  const router = useRouter();

  const [title, setTitle] = useState(initialData?.title ?? "");
  const [body, setBody] = useState(initialData?.body ?? "");
  const [ctaLabel, setCtaLabel] = useState(initialData?.cta_label ?? "");
  const [ctaHref, setCtaHref] = useState(initialData?.cta_href ?? "");
  const [displayOrder, setDisplayOrder] = useState(initialData?.display_order ?? 0);
  // Defaults to false on create, matching the column default: a half-written
  // announcement should not go live the moment it is saved.
  const [isActive, setIsActive] = useState(initialData?.is_active ?? false);

  const [desktopFiles, setDesktopFiles] = useState<File[]>([]);
  const [mobileFiles, setMobileFiles] = useState<File[]>([]);
  const [removeDesktop, setRemoveDesktop] = useState(false);
  const [removeMobile, setRemoveMobile] = useState(false);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const isEdit = mode === "edit" && Boolean(initialData?.id);

  async function uploadFile(file: File, path: string): Promise<string> {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("path", path);
    const res = await fetch("/api/admin/upload", { method: "POST", body: formData });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || "Upload failed");
    }
    return data.url;
  }

  /** New file wins; else an explicit removal clears; else leave the column
   *  alone (undefined), which on create falls through to null. */
  function resolveImage(
    uploaded: string | undefined,
    removed: boolean
  ): string | null | undefined {
    if (uploaded) return uploaded;
    if (removed) return null;
    return undefined;
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSaving(true);

    try {
      const safeTitle =
        title
          .toLowerCase()
          .replace(/\s+/g, "-")
          .replace(/[^a-z0-9-]/g, "") || "announcement";

      // Timestamped keys: R2 serves immutable cache headers, never reuse a key.
      let desktopUrl: string | undefined;
      let mobileUrl: string | undefined;
      if (desktopFiles[0]) {
        desktopUrl = await uploadFile(
          desktopFiles[0],
          `announcements/${safeTitle}-desktop-${Date.now()}.png`
        );
      }
      if (mobileFiles[0]) {
        mobileUrl = await uploadFile(
          mobileFiles[0],
          `announcements/${safeTitle}-mobile-${Date.now()}.png`
        );
      }

      const fields = {
        title: title.trim(),
        // Empty string means cleared, not "unchanged" -- these inputs always
        // carry a value, so null is the honest thing to send.
        body: body.trim() || null,
        cta_label: ctaLabel.trim() || null,
        cta_href: ctaHref.trim() || null,
        is_active: isActive,
        display_order: displayOrder,
        image_url_desktop: resolveImage(desktopUrl, removeDesktop),
        image_url_mobile: resolveImage(mobileUrl, removeMobile),
      };

      const payload = isEdit ? { id: initialData?.id, ...fields } : fields;

      const res = await fetch("/api/admin/announcements", {
        method: isEdit ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || "Failed to save announcement");
      }

      if (onSuccess) {
        onSuccess();
      } else {
        router.push("/admin/announcements");
      }
    } catch (submitError) {
      const message =
        submitError instanceof Error ? submitError.message : "Something went wrong";
      setError(message);
    } finally {
      setSaving(false);
    }
  }

  // Soft nicety, not a hard block (per the brief): a half-filled CTA pair does
  // not render on the homepage, so say so rather than refusing to save.
  const halfCta = Boolean(ctaLabel.trim()) !== Boolean(ctaHref.trim());

  return (
    <form
      onSubmit={handleSubmit}
      className="admin-form"
      style={{ display: "flex", flexDirection: "column", gap: "1.4rem" }}
    >
      <span className="admin-section-label">Content</span>

      <div>
        <label htmlFor="ann-title" className="admin-label">
          Title
        </label>
        <input
          id="ann-title"
          type="text"
          required
          maxLength={120}
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          className="admin-input"
        />
      </div>

      <div>
        <label htmlFor="ann-body" className="admin-label">
          Body
        </label>
        <textarea
          id="ann-body"
          value={body}
          onChange={(event) => setBody(event.target.value)}
          rows={4}
          maxLength={600}
          placeholder="Supporting line shown under the title · optional"
          className="admin-input"
        />
      </div>

      <span className="admin-section-label">Media</span>

      <div>
        <span className="admin-label">Desktop image</span>
        <FileUploadField
          id="ann-image-desktop"
          accept="image/*"
          files={desktopFiles}
          onFilesChange={(files) => {
            setDesktopFiles(files);
            if (files.length) setRemoveDesktop(false);
          }}
          currentUrl={removeDesktop ? null : initialData?.image_url_desktop}
          hint="Wide crop, around 2400x800 · optional"
          uploading={saving}
        />
        {initialData?.image_url_desktop && !removeDesktop && !desktopFiles.length ? (
          <button
            type="button"
            className="admin-row-action"
            onClick={() => setRemoveDesktop(true)}
            style={{ background: "transparent", border: "none", padding: "0.5rem 0 0", cursor: "pointer", font: "inherit" }}
          >
            REMOVE IMAGE
          </button>
        ) : null}
        {removeDesktop ? (
          <p className="admin-hint">Will be cleared on save.</p>
        ) : null}
      </div>

      <div>
        <span className="admin-label">Mobile image</span>
        <FileUploadField
          id="ann-image-mobile"
          accept="image/*"
          files={mobileFiles}
          onFilesChange={(files) => {
            setMobileFiles(files);
            if (files.length) setRemoveMobile(false);
          }}
          currentUrl={removeMobile ? null : initialData?.image_url_mobile}
          hint="Tall crop, around 800x1000 · optional, a separate composition"
          uploading={saving}
        />
        {initialData?.image_url_mobile && !removeMobile && !mobileFiles.length ? (
          <button
            type="button"
            className="admin-row-action"
            onClick={() => setRemoveMobile(true)}
            style={{ background: "transparent", border: "none", padding: "0.5rem 0 0", cursor: "pointer", font: "inherit" }}
          >
            REMOVE IMAGE
          </button>
        ) : null}
        {removeMobile ? (
          <p className="admin-hint">Will be cleared on save.</p>
        ) : null}
      </div>

      <span className="admin-section-label">Call to action</span>

      <div>
        <label htmlFor="ann-cta-label" className="admin-label">
          CTA label
        </label>
        <input
          id="ann-cta-label"
          type="text"
          maxLength={40}
          value={ctaLabel}
          onChange={(event) => setCtaLabel(event.target.value)}
          placeholder="REGISTER NOW · optional"
          className="admin-input"
        />
      </div>

      <div>
        <label htmlFor="ann-cta-href" className="admin-label">
          CTA link
        </label>
        <input
          id="ann-cta-href"
          type="text"
          value={ctaHref}
          onChange={(event) => setCtaHref(event.target.value)}
          placeholder="/events/bootstrap-2026 or https://... · optional"
          className="admin-input"
        />
        {halfCta ? (
          <p className="admin-hint">
            Both fields are needed for the button to appear. With one filled, the
            homepage renders no CTA.
          </p>
        ) : null}
      </div>

      <span className="admin-section-label">Status &amp; Visibility</span>

      <div>
        <label htmlFor="ann-display-order" className="admin-label">
          Display Order
        </label>
        <input
          id="ann-display-order"
          type="number"
          value={displayOrder}
          onChange={(event) => setDisplayOrder(Number(event.target.value) || 0)}
          className="admin-input"
        />
        <p className="admin-hint">
          Lower number = appears first. The homepage shows one announcement, the
          lowest-ordered active row.
        </p>
      </div>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "1rem" }}>
        <span className="admin-label" style={{ marginBottom: 0 }}>
          Active
        </span>
        <ToggleSwitch value={isActive} onChange={setIsActive} ariaLabel="Announcement active" />
      </div>

      {error ? <p className="admin-error">{error}</p> : null}

      <StatefulButton
        state={saving ? "loading" : error ? "error" : "idle"}
        style={{ width: "100%" }}
      >
        SAVE ANNOUNCEMENT
      </StatefulButton>
    </form>
  );
}
