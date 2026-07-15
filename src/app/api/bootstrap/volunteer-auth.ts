import { cookies } from "next/headers";
import { getVolunteerByToken, type BootstrapVolunteer } from "@/lib/services/bootstrap";

export const VOLUNTEER_COOKIE = "vg_vol_session";

export async function getVolunteerFromCookie(): Promise<BootstrapVolunteer | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(VOLUNTEER_COOKIE)?.value;
  if (!token) return null;
  return getVolunteerByToken(token);
}
