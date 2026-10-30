"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient, getSessionUser } from "@/lib/supabase/server";

/** Mark every unread notification as read, then refresh the page it was pressed on. */
export async function markAllRead(formData: FormData) {
  const supabase = await createClient();
  const user = await getSessionUser(supabase);
  if (!user) return;
  await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("user_id", user.id)
    .is("read_at", null);
  revalidatePath(String(formData.get("path") || "/"), "layout");
}

/** Open a notification: mark it read and go where it points. */
export async function openNotification(formData: FormData) {
  const id = String(formData.get("id"));
  const link = String(formData.get("link") || "");
  const supabase = await createClient();
  const user = await getSessionUser(supabase);
  if (!user) redirect("/login");
  await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("id", id)
    .eq("user_id", user.id)
    .is("read_at", null);
  // Only follow links inside the app
  redirect(link.startsWith("/") && !link.startsWith("//") ? link : "/");
}

/** Dismiss one notification from the Important section without opening it. */
export async function dismissNotification(formData: FormData) {
  const id = String(formData.get("id"));
  const supabase = await createClient();
  const user = await getSessionUser(supabase);
  if (!user) return;
  await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("id", id)
    .eq("user_id", user.id);
  revalidatePath(String(formData.get("path") || "/"), "layout");
}
