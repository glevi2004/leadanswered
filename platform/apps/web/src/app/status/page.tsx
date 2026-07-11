import { redirect } from "next/navigation";

/** The status page folded into the dashboard overview — keep the URL working. */
export default function StatusPage() {
  redirect("/home");
}
