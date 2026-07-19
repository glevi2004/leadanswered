import { redirect } from "next/navigation";

/** The status page folded into the canvas — keep the URL working. */
export default function StatusPage() {
  redirect("/canvas");
}
