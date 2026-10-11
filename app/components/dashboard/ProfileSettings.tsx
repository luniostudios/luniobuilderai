"use client";

import { useState, type ChangeEvent, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { ImagePlus, Loader2, Save } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const MAX_IMAGE_BYTES = 2 * 1024 * 1024;
const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];

export default function ProfileSettings({ name, image }: { name: string; image: string }) {
  const router = useRouter();
  const { update } = useSession();
  const [profileName, setProfileName] = useState(name);
  const [profileImage, setProfileImage] = useState(image);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  function selectImage(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setError("");
    setSaved(false);
    if (!ACCEPTED_IMAGE_TYPES.includes(file.type) || file.size > MAX_IMAGE_BYTES) {
      setError("Choose a JPG, PNG, or WebP image under 2 MB.");
      event.target.value = "";
      return;
    }

    setImageFile(file);
    setProfileImage(URL.createObjectURL(file));
  }

  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalizedName = profileName.trim();
    if (!normalizedName || normalizedName.length > 80) {
      setError("Your name must be between 1 and 80 characters.");
      return;
    }

    setSaving(true);
    setError("");
    setSaved(false);
    const formData = new FormData();
    formData.set("name", normalizedName);
    if (imageFile) formData.set("image", imageFile);

    try {
      const response = await fetch("/api/account/profile", { method: "POST", body: formData });
      const result = await response.json() as { error?: string; name?: string; image?: string | null };
      if (!response.ok || !result.name) throw new Error(result.error || "Could not save profile.");
      setProfileName(result.name);
      setProfileImage(result.image ?? "");
      setImageFile(null);
      await update();
      router.refresh();
      setSaved(true);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not save profile.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="mt-10 max-w-2xl" aria-labelledby="profile-settings-title">
      <h2 id="profile-settings-title" className="text-2xl font-semibold">Profile settings</h2>
      <p className="mt-2 text-sm text-muted-foreground">Update the name and photo shown on your account.</p>

      <form onSubmit={saveProfile} className="mt-8 space-y-7">
        <div className="flex flex-wrap items-center gap-5">
          <Avatar size="lg" className="size-20 border border-border bg-muted">
            <AvatarImage src={profileImage || undefined} alt="Profile photo preview" />
            <AvatarFallback className="text-xl">{profileName.trim().charAt(0).toUpperCase() || "?"}</AvatarFallback>
          </Avatar>
          <div className="space-y-2">
            <label htmlFor="profile-image" className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-border px-3 py-2 text-sm font-medium transition-colors hover:bg-muted">
              <ImagePlus size={16} /> Choose photo
            </label>
            <input
              id="profile-image"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={selectImage}
              disabled={saving}
              className="sr-only"
            />
            <p className="text-xs text-muted-foreground">JPG, PNG, or WebP. Maximum 2 MB.</p>
          </div>
        </div>

        <div className="space-y-2">
          <label htmlFor="profile-name" className="text-sm font-medium">Name</label>
          <input
            id="profile-name"
            value={profileName}
            onChange={(event) => { setProfileName(event.target.value); setSaved(false); }}
            maxLength={80}
            autoComplete="name"
            required
            disabled={saving}
            className="h-10 w-full rounded-md border border-input px-3 text-sm outline-none transition focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30"
          />
        </div>

        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        {saved && <p role="status" className="text-sm text-emerald-700">Profile saved.</p>}

        <button type="submit" disabled={saving} className="inline-flex h-10 items-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50">
          {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
          {saving ? "Saving..." : "Save changes"}
        </button>
      </form>
    </section>
  );
}