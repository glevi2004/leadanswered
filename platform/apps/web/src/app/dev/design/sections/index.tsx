import SecFoundation from "./SecFoundation";
import SecData from "./SecData";
import SecCards from "./SecCards";
import SecChat from "./SecChat";
import SecShell from "./SecShell";
import SecCanvas from "./SecCanvas";
import SecTeam from "./SecTeam";
import SecPublic from "./SecPublic";

/**
 * AppGallery — the redesigned twins of every real app component, grouped by the
 * DESIGN-COMPONENTS-PLAN tranches. Each Sec* file owns one tranche.
 */
export function AppGallery() {
  return (
    <div className="flex flex-col gap-8 border-t border-border/60 pt-4">
      <SecFoundation />
      <SecData />
      <SecCards />
      <SecChat />
      <SecShell />
      <SecCanvas />
      <SecTeam />
      <SecPublic />
    </div>
  );
}
