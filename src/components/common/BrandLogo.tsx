/**
 * BrandLogo — Reusable brand identity block.
 * Icon mirrors public/favicon.svg (UX* mark).
 * Text: "MB UXTeam" / "DIGITAL BANKING DIVISION"
 */

interface BrandLogoProps {
  /** Icon container size in px */
  size?: "sm" | "md"
  /** Hide the text labels (icon-only mode for very compact spaces) */
  iconOnly?: boolean
  className?: string
}

/** Inline SVG extracted from public/favicon.svg – the UX* mark */
function UXStarIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <rect width="100" height="100" rx="26" fill="white" />
      {/* U */}
      <path
        d="M37.0986 63.0423C38.7152 60.9578 39.5372 57.9955 39.5372 54.1281V54.1006V30.7315L46.4146 38.0824C47.127 38.8504 47.538 39.8652 47.538 40.9075V52.8938C47.538 57.9406 46.1406 61.9452 43.3732 64.8526C40.6058 67.7875 35.7286 69.2686 28.7964 69.2686C21.8642 69.2686 17.0144 67.7875 14.2196 64.8526C11.4248 61.9452 10 57.9406 10 52.8938V30.759H15.9338C17.0905 30.759 18.0282 31.6967 18.0282 32.8534V54.1281C18.0282 57.8583 18.8228 60.7932 20.3846 62.9326C21.9464 65.0995 24.8782 66.1692 28.7964 66.1692C32.7146 66.1692 35.4546 65.1269 37.0986 63.0423Z"
        fill="currentColor"
      />
      {/* X */}
      <path
        d="M48.1394 30.7315H55.3025C56.5874 30.7315 57.7904 31.335 58.5559 32.35L68.0155 44.7219L78.7874 32.1579C79.5802 31.2527 80.7011 30.7315 81.9041 30.7315H85.8684L72.1263 46.7972C71.3553 47.6986 71.3195 49.0163 72.0404 49.9583L86.3605 68.6702H79.3068C78.0219 68.6702 76.8462 68.0667 76.0534 67.0791L48.1394 30.7315ZM64.7894 55.393L54.619 67.2711C53.8535 68.1764 52.7052 68.6976 51.5022 68.6976H47.538L60.6869 53.3138C61.2274 52.6814 62.1976 52.659 62.7667 53.2658L64.762 55.393H64.7894Z"
        fill="currentColor"
      />
      {/* Star sparkle */}
      <path
        d="M86.3607 58.421C86.3607 56.9995 86.0866 55.6635 85.5383 54.4132C85.0076 53.1629 84.2795 52.0753 83.3547 51.1504C82.4299 50.2255 81.3421 49.4976 80.0918 48.9666C78.8415 48.4185 77.5057 48.1445 76.084 48.1445C77.5057 48.1445 78.8415 47.879 80.0918 47.348C81.3421 46.8 82.4299 46.0635 83.3547 45.1386C84.2795 44.2137 85.0076 43.1261 85.5383 41.8758C86.0866 40.6255 86.3607 39.2895 86.3607 37.8679C86.3607 39.2895 86.626 40.6255 87.1571 41.8758C87.705 43.1261 88.4415 44.2137 89.3663 45.1386C90.2915 46.0635 91.3789 46.8 92.6292 47.348C93.8795 47.879 95.2157 48.1445 96.6371 48.1445C95.2157 48.1445 93.8795 48.4185 92.6292 48.9666C91.3789 49.4976 90.2915 50.2255 89.3663 51.1504C88.4415 52.0753 87.705 53.1629 87.1571 54.4132C86.626 55.6635 86.3607 56.9995 86.3607 58.421Z"
        fill="url(#ux-star-gradient)"
      />
      <defs>
        <radialGradient
          id="ux-star-gradient"
          cx="0"
          cy="0"
          r="1"
          gradientUnits="userSpaceOnUse"
          gradientTransform="translate(90.1466 48.1445) rotate(117.135) scale(12.1553)"
        >
          <stop stopColor="#ED5F33" />
          <stop offset="1" stopColor="#CA364A" />
        </radialGradient>
      </defs>
    </svg>
  )
}

const SIZES = {
  sm: "w-8 h-8",
  md: "w-10 h-10",
} as const

export default function BrandLogo({ size = "md", iconOnly = false, className = "" }: BrandLogoProps) {
  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      {/* Icon container - clean without border */}
      <div className={`${SIZES[size]} flex items-center justify-center flex-shrink-0`}>
        <UXStarIcon className="w-full h-full text-slate-900" />
      </div>

      {!iconOnly && (
        <div className="min-w-0">
          <p className="text-sm font-bold text-slate-900 leading-tight tracking-tight">
            MB UXTeam
          </p>
          <p className="text-[10px] font-semibold text-slate-400 leading-tight mt-0.5 uppercase tracking-wider">
            Digital Banking Division
          </p>
        </div>
      )}
    </div>
  )
}
