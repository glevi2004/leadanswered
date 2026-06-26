/**
 * Stable client-rendered landing target for auth email links (invite / recovery).
 * AuthHashHandler in the root layout reads the URL hash tokens, sets the session,
 * and routes by link type. This page just gives the link somewhere to land.
 */
export default function AuthLandPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-2 p-6 text-center">
      <h1 className="text-lg font-semibold">Finishing sign-in…</h1>
      <p className="text-sm text-muted-foreground">One moment.</p>
    </main>
  );
}
