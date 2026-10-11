import { NextResponse } from "next/server";
import { getAuthenticatedUserId } from "@/lib/api-auth";
import { getSupabaseAdmin } from "@/lib/db";

const MAX_IMAGE_BYTES = 2 * 1024 * 1024;
const IMAGE_EXTENSIONS: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export async function POST(request: Request) {
  const userId = await getAuthenticatedUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const formData = await request.formData().catch(() => null);
  if (!formData) return NextResponse.json({ error: "Invalid profile form." }, { status: 400 });

  const rawName = formData.get("name");
  if (typeof rawName !== "string" || !rawName.trim() || rawName.trim().length > 80) {
    return NextResponse.json({ error: "Your name must be between 1 and 80 characters." }, { status: 400 });
  }

  const imageValue = formData.get("image");
  let imagePath: string | null = null;
  let imageUrl: string | null = null;
  const supabase = getSupabaseAdmin();

  if (imageValue instanceof File && imageValue.size > 0) {
    const extension = IMAGE_EXTENSIONS[imageValue.type];
    if (!extension || imageValue.size > MAX_IMAGE_BYTES) {
      return NextResponse.json({ error: "Choose a JPG, PNG, or WebP image under 2 MB." }, { status: 400 });
    }

    imagePath = `${userId}/${crypto.randomUUID()}.${extension}`;
    const { error: uploadError } = await supabase.storage
      .from("profile-images")
      .upload(imagePath, imageValue, { contentType: imageValue.type, cacheControl: "3600" });

    if (uploadError) {
      return NextResponse.json({ error: "Could not upload profile photo." }, { status: 500 });
    }
    imageUrl = supabase.storage.from("profile-images").getPublicUrl(imagePath).data.publicUrl;
  }

  const updatedUser = await supabase
    .schema("next_auth")
    .from("users")
    .update({ name: rawName.trim(), ...(imageUrl ? { image: imageUrl } : {}) })
    .eq("id", userId)
    .select("name, image")
    .maybeSingle();

  if (updatedUser.error || !updatedUser.data) {
    if (imagePath) await supabase.storage.from("profile-images").remove([imagePath]);
    return NextResponse.json({ error: "Could not save profile." }, { status: 500 });
  }

  return NextResponse.json({ name: updatedUser.data.name, image: updatedUser.data.image });
}