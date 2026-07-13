/** The Facebook "f" roundel (lucide dropped brand icons) — chips + app-bar use. */
export function FacebookMark({ className = "size-3" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <circle cx="12" cy="12" r="12" fill="#1877F2" />
      <path
        fill="#fff"
        d="M16.4 12h-2.9v8.5h-3.4V12H8.4V9.2h1.7V7.6c0-2 1.2-3.6 3.6-3.6l2.5.1v2.7h-1.6c-.9 0-1.1.4-1.1 1.1v1.3h2.9L16.4 12z"
      />
    </svg>
  );
}
