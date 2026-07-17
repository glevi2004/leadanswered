import { TeamRoster } from "@/components/team/TeamRoster";

export const metadata = { title: "Team — Lead Answered" };

/**
 * The human roster of the company canvas — teammates grouped by the department they work with.
 * Auth/org is enforced by the (app) layout; the roster is honest-empty until real members exist.
 */
export default function TeamPage() {
  return <TeamRoster />;
}
