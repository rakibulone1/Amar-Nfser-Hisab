import { redirect } from "next/navigation";

export default function NotificationsPage() {
  // Notifications are managed in the workspace popover, not a separate page.
  redirect("/dashboard");
}
