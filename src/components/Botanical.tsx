/**
 * Hand-drawn botanical line art (original SVG). Used sparingly behind featured covers.
 * Stroke colour follows `currentColor` so each section can tint it.
 */
export function BotanicalSpray({ className = '', flip = false }: { className?: string; flip?: boolean }) {
  return (
    <svg
      className={`botanical ${className}`}
      viewBox="0 0 320 420"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.1"
      strokeLinecap="round"
      aria-hidden
      style={flip ? { transform: 'scaleX(-1)' } : undefined}
    >
      {/* main stem */}
      <path d="M160 410 C 158 330, 150 260, 168 190 S 200 70, 182 12" />
      {/* side stems */}
      <path d="M163 300 C 120 280, 92 250, 70 205" />
      <path d="M166 240 C 210 222, 238 196, 262 150" />
      <path d="M170 175 C 135 160, 118 132, 110 96" />
      <path d="M178 110 C 205 98, 222 78, 230 50" />
      {/* leaves */}
      <path d="M70 205 C 52 196, 40 176, 44 150 C 66 160, 76 182, 70 205 Z" />
      <path d="M100 262 C 76 262, 58 248, 50 226 C 76 226, 92 240, 100 262 Z" />
      <path d="M262 150 C 282 144, 292 124, 290 100 C 268 110, 258 128, 262 150 Z" />
      <path d="M226 205 C 250 210, 270 200, 282 182 C 258 176, 238 186, 226 205 Z" />
      <path d="M110 96 C 96 82, 94 62, 104 42 C 118 58, 120 78, 110 96 Z" />
      <path d="M140 150 C 120 154, 102 146, 92 130 C 112 124, 130 132, 140 150 Z" />
      <path d="M230 50 C 246 40, 250 22, 244 4 C 228 16, 224 34, 230 50 Z" />
      <path d="M196 128 C 214 140, 234 140, 248 128 C 232 114, 212 114, 196 128 Z" />
      {/* leaf veins */}
      <path d="M70 205 C 60 188, 52 172, 44 150" opacity=".5" />
      <path d="M262 150 C 274 134, 284 118, 290 100" opacity=".5" />
      <path d="M110 96 C 104 78, 102 60, 104 42" opacity=".5" />
      {/* blossoms */}
      <g transform="translate(182 14)">
        <circle r="5" />
        <path d="M0 -5 C -8 -18, 8 -18, 0 -5 M5 0 C 18 -8, 18 8, 5 0 M0 5 C 8 18, -8 18, 0 5 M-5 0 C -18 8, -18 -8, -5 0" />
      </g>
      <g transform="translate(70 205) scale(.7)">
        <circle r="4" />
      </g>
      <g transform="translate(168 330)">
        <path d="M0 0 C -14 -6, -22 -20, -18 -34 M0 0 C 14 -6, 22 -20, 18 -34" />
      </g>
      {/* seed dots */}
      <circle cx="122" cy="300" r="1.6" fill="currentColor" />
      <circle cx="214" cy="260" r="1.6" fill="currentColor" />
      <circle cx="244" cy="230" r="1.2" fill="currentColor" />
      <circle cx="96" cy="300" r="1.2" fill="currentColor" />
    </svg>
  );
}

export function Flourish({ className = '' }: { className?: string }) {
  return (
    <svg className={`flourish ${className}`} viewBox="0 0 160 16" fill="none" stroke="currentColor" aria-hidden>
      <path d="M0 8 H62" strokeWidth=".8" />
      <path d="M98 8 H160" strokeWidth=".8" />
      <path d="M80 1 L87 8 L80 15 L73 8 Z" strokeWidth=".9" />
      <circle cx="66" cy="8" r="1.4" fill="currentColor" stroke="none" />
      <circle cx="94" cy="8" r="1.4" fill="currentColor" stroke="none" />
    </svg>
  );
}
