"use server";

import { auth } from "@/lib/auth";
import { setSetting } from "@/lib/services/settings";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function updateSettings(formData: FormData) {
  "use server";

  const session = await auth();
  if (!session?.user?.isAdmin) {
    redirect("/admin");
  }

  const fields = [
    "recruitment_open",
    "maintenance_mode",
    "contact_email",
    "contact_address",
    "instagram_url",
    "linkedin_url",
    "github_url",
  ] as const;

  for (const key of fields) {
    const value = formData.get(key);
    if (value !== null) {
      await setSetting(key, String(value));
    }
  }

  // Revalidate all pages that use these settings
  revalidatePath("/");
  revalidatePath("/join");
  revalidatePath("/about");
  revalidatePath("/crew");
  revalidatePath("/sponsors");
  revalidatePath("/events");
}