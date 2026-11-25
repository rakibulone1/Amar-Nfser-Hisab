import { redirect } from "next/navigation";

export default function NafsMirrorPage() {
  redirect("/dashboard?section=mirror");
}
