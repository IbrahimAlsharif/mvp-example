/**
 * LifelineLogo — animated hourglass brand mark.
 *
 * Replaces the bare ⏳ emoji on the landing hero with a real SVG so the logo is
 * crisp at any size, follows the blue→orange brand gradient, and can animate.
 * The sand stream and falling grains animate via CSS (see globals.css), all
 * gated behind `prefers-reduced-motion: no-preference`.
 */
export default function LifelineLogo({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 64 64"
      fill="none"
      role="img"
      aria-label="Lifeline"
      className={className}
    >
      <defs>
        <linearGradient id="ll-frame" x1="0" y1="0" x2="64" y2="64" gradientUnits="userSpaceOnUse">
          <stop stopColor="#DBE8FE" />
          <stop offset="1" stopColor="#FFEDD5" />
        </linearGradient>
        <linearGradient id="ll-sand" x1="32" y1="14" x2="32" y2="50" gradientUnits="userSpaceOnUse">
          <stop stopColor="#FB923C" />
          <stop offset="1" stopColor="#F97316" />
        </linearGradient>
      </defs>

      {/* Hourglass frame (caps + glass outline) */}
      <g stroke="url(#ll-frame)" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M18 14h28" />
        <path d="M18 50h28" />
        {/* glass bulbs meeting at the neck */}
        <path d="M21 14c0 9 11 13 11 18s-11 9-11 18" />
        <path d="M43 14c0 9-11 13-11 18s11 9 11 18" />
      </g>

      {/* Top sand pile (drains) */}
      <path
        className="ll-sand-top"
        d="M24 18h16c0 6-5.5 9.5-8 12-2.5-2.5-8-6-8-12z"
        fill="url(#ll-sand)"
      />
      {/* Bottom sand pile (fills) */}
      <path
        className="ll-sand-bottom"
        d="M24 46h16c0-5-5.5-8-8-10-2.5 2-8 5-8 10z"
        fill="url(#ll-sand)"
      />
      {/* Falling stream + grains */}
      <rect className="ll-stream" x="31" y="30" width="2" height="10" rx="1" fill="url(#ll-sand)" />
      <circle className="ll-grain" cx="32" cy="34" r="1.1" fill="#F97316" />
      <circle className="ll-grain ll-grain-2" cx="32" cy="38" r="1.1" fill="#F97316" />
    </svg>
  );
}
