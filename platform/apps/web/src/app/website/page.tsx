import { redirect } from "next/navigation";

/**
 * The website builder went multi-site (03-website). The old single-site route now
 * redirects to the Sites browse surface, where each site opens its own builder at
 * /sites/[siteId]. The public preview route /p/[token] is unchanged.
 */
export default function WebsiteRedirect() {
  redirect("/sites");
}
