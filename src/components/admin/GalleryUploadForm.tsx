"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function GalleryUploadForm() {
  const router = useRouter();

  const [eventLabel, setEventLabel] = useState("");
  const [eventId, setEventId] = useState("");
  const [files, setFiles] = useState<FileList | null>(null);
  const [captions, setCaptions] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");

  const [videoUrl, setVideoUrl] = useState("");
  const [videoCaption, setVideoCaption] = useState("");
  const [videoEventLabel, setVideoEventLabel] = useState("");

  const inputClassName =
    "bg-[#121212] border border-[#2a2a2a] text-[#EBEBEB] rounded-lg px-4 py-2 w-full focus:outline-none focus:border-[#EF5D08]";

  const resetImageForm = () => {
    setEventLabel("");
    setEventId("");
    setFiles(null);
    setCaptions([]);
    setProgress(0);
  };

  const handleFilesChange = (selectedFiles: FileList | null) => {
    setFiles(selectedFiles);
    if (!selectedFiles) {
      setCaptions([]);
      return;
    }

    setCaptions((previous) =>
      Array.from({ length: selectedFiles.length }, (_, index) => previous[index] ?? ""),
    );
  };

  const updateCaptionAtIndex = (index: number, value: string) => {
    setCaptions((previous) => {
      const next = [...previous];
      next[index] = value;
      return next;
    });
  };

  const handleImageUpload = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");

    if (!files || files.length === 0 || !eventLabel.trim()) {
      setError("Please provide an event label and select at least one image.");
      return;
    }

    setUploading(true);
    setProgress(0);

    try {
      const trimmedEventLabel = eventLabel.trim();
      const eventSlug = trimmedEventLabel
        .toLowerCase()
        .replace(/\s+/g, "-")
        .replace(/[^a-z0-9-]/g, "");

      for (let index = 0; index < files.length; index += 1) {
        const file = files[index];
        if (!file) {
          continue;
        }

        const filename = file.name.toLowerCase().replace(/\s+/g, "-");
        const uploadPath = `gallery/${eventSlug}/${filename}`;

        const uploadFormData = new FormData();
        uploadFormData.append("file", file);
        uploadFormData.append("path", uploadPath);

        const uploadResponse = await fetch("/api/admin/upload", {
          method: "POST",
          body: uploadFormData,
        });

        if (!uploadResponse.ok) {
          const uploadError = (await uploadResponse.json().catch(() => null)) as
            | { error?: string }
            | null;
          throw new Error(uploadError?.error ?? "Image upload failed.");
        }

        const uploadResult = (await uploadResponse.json()) as { url?: string };
        const r2Url = uploadResult.url;

        if (!r2Url) {
          throw new Error("Upload succeeded but no URL was returned.");
        }

        const createResponse = await fetch("/api/admin/gallery", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            event_id: eventId.trim() || null,
            event_label: trimmedEventLabel,
            type: "image",
            url: r2Url,
            thumbnail_url: r2Url,
            caption: captions[index] || "",
            display_order: index,
          }),
        });

        if (!createResponse.ok) {
          const createError = (await createResponse.json().catch(() => null)) as
            | { error?: string }
            | null;
          throw new Error(createError?.error ?? "Failed to create gallery item.");
        }

        setProgress(Math.round(((index + 1) / files.length) * 100));
      }

      resetImageForm();
      router.refresh();
    } catch (caughtError) {
      const message =
        caughtError instanceof Error ? caughtError.message : "Failed to upload images.";
      setError(message);
    } finally {
      setUploading(false);
    }
  };

  const handleVideoSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");

    if (!videoEventLabel.trim() || !videoUrl.trim()) {
      setError("Please provide an event label and a YouTube embed URL.");
      return;
    }

    try {
      const response = await fetch("/api/admin/gallery", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          event_id: null,
          event_label: videoEventLabel.trim(),
          type: "video",
          url: videoUrl.trim(),
          thumbnail_url: null,
          caption: videoCaption.trim(),
          display_order: 0,
        }),
      });

      if (!response.ok) {
        const responseError = (await response.json().catch(() => null)) as
          | { error?: string }
          | null;
        throw new Error(responseError?.error ?? "Failed to add video.");
      }

      setVideoEventLabel("");
      setVideoUrl("");
      setVideoCaption("");
      router.refresh();
    } catch (caughtError) {
      const message = caughtError instanceof Error ? caughtError.message : "Failed to add video.";
      setError(message);
    }
  };

  return (
    <section style={{ borderRadius: "0.75rem", border: "1px solid #2a2a2a", background: "#18181b", padding: "1.5rem", color: "#EBEBEB", boxSizing: "border-box" }}>
      <div className="space-y-8">
        <form onSubmit={handleImageUpload} className="space-y-4">
          <h2 className="text-xl font-semibold text-[#EBEBEB]">Upload Images</h2>

          <div className="space-y-2">
            <label htmlFor="eventLabel" className="text-sm text-[#B8B8B8]">
              Event Label (e.g. &quot;Ignition 1.0&quot;)
            </label>
            <input
              id="eventLabel"
              type="text"
              value={eventLabel}
              onChange={(event) => setEventLabel(event.target.value)}
              className={inputClassName}
              placeholder="Ignition 1.0"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="eventId" className="text-sm text-[#B8B8B8]">
              Event ID (optional)
            </label>
            <input
              id="eventId"
              type="text"
              value={eventId}
              onChange={(event) => setEventId(event.target.value)}
              className={inputClassName}
              placeholder="Paste event ID"
            />
            <p className="text-xs text-[#8B8B8B]">Paste event ID from events table for filtering</p>
          </div>

          <div className="space-y-2">
            <label htmlFor="galleryFiles" className="text-sm text-[#B8B8B8]">
              Images
            </label>
            <input
              id="galleryFiles"
              type="file"
              multiple
              accept="image/*"
              className={inputClassName}
              onChange={(event) => handleFilesChange(event.target.files)}
            />
          </div>

          {files && files.length > 0 && (
            <div className="space-y-3">
              {Array.from(files).map((file, index) => (
                <div key={`${file.name}-${index}`} className="space-y-1">
                  <p className="text-xs text-[#9E9E9E]">{file.name}</p>
                  <input
                    type="text"
                    value={captions[index] ?? ""}
                    onChange={(event) => updateCaptionAtIndex(index, event.target.value)}
                    className={inputClassName}
                    placeholder="Caption (optional)"
                  />
                </div>
              ))}
            </div>
          )}

          {uploading && (
            <div className="space-y-2">
              <progress
                value={progress}
                max={100}
                className="h-2 w-full overflow-hidden rounded-full [&::-webkit-progress-bar]:bg-[#2a2a2a] [&::-webkit-progress-value]:bg-[#EF5D08] [&::-moz-progress-bar]:bg-[#EF5D08]"
              />
              <p className="text-sm text-[#B8B8B8]">{progress}%</p>
            </div>
          )}

          <button
            type="submit"
            disabled={uploading}
            className="rounded-lg bg-[#EF5D08] px-4 py-2 text-sm font-semibold text-white transition-opacity disabled:cursor-not-allowed disabled:opacity-60"
          >
            {uploading ? "Uploading..." : "Upload"}
          </button>
        </form>

        <form onSubmit={handleVideoSubmit} className="space-y-4 border-t border-[#2a2a2a] pt-6">
          <h2 className="text-xl font-semibold text-[#EBEBEB]">Add YouTube Video</h2>

          <div className="space-y-2">
            <label htmlFor="videoEventLabel" className="text-sm text-[#B8B8B8]">
              Event Label
            </label>
            <input
              id="videoEventLabel"
              type="text"
              value={videoEventLabel}
              onChange={(event) => setVideoEventLabel(event.target.value)}
              className={inputClassName}
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="videoUrl" className="text-sm text-[#B8B8B8]">
              YouTube embed URL (format: https://www.youtube.com/embed/VIDEO_ID)
            </label>
            <input
              id="videoUrl"
              type="url"
              value={videoUrl}
              onChange={(event) => setVideoUrl(event.target.value)}
              className={inputClassName}
              placeholder="https://www.youtube.com/embed/VIDEO_ID"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="videoCaption" className="text-sm text-[#B8B8B8]">
              Caption
            </label>
            <input
              id="videoCaption"
              type="text"
              value={videoCaption}
              onChange={(event) => setVideoCaption(event.target.value)}
              className={inputClassName}
            />
          </div>

          <button
            type="submit"
            className="rounded-lg bg-[#EF5D08] px-4 py-2 text-sm font-semibold text-white"
          >
            Add Video
          </button>
        </form>

        {error && <p className="text-sm text-red-400">{error}</p>}
      </div>
    </section>
  );
}