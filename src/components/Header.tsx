interface HeaderProps {
  currentPage: "create" | "track"
  onNavigate: (page: "create" | "track") => void
  userEmail: string
}

export default function Header({ currentPage, onNavigate, userEmail }: HeaderProps) {
  const initials = userEmail
    .split("@")[0]
    .split(".")
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("")
    .slice(0, 2)

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-8">
          <button
            onClick={() => onNavigate("create")}
            className="flex items-center gap-2.5 group"
          >
            <div className="w-7 h-7 bg-navy rounded-lg flex items-center justify-center flex-shrink-0">
              <svg
                width="14"
                height="14"
                viewBox="0 0 14 14"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <rect x="1" y="1" width="5" height="5" rx="1" fill="white" />
                <rect x="8" y="1" width="5" height="5" rx="1" fill="white" fillOpacity="0.5" />
                <rect x="1" y="8" width="5" height="5" rx="1" fill="white" fillOpacity="0.5" />
                <rect x="8" y="8" width="5" height="5" rx="1" fill="white" />
              </svg>
            </div>
            <span className="font-semibold text-slate-900 text-sm tracking-tight">
              UX Request Portal
            </span>
          </button>

          <nav className="hidden md:flex items-center gap-0.5">
            {(["create", "track"] as const).map((page) => (
              <button
                key={page}
                onClick={() => onNavigate(page)}
                className={`px-3.5 py-1.5 text-sm rounded-md transition-colors duration-150 ${
                  currentPage === page
                    ? "bg-slate-100 text-slate-900 font-medium"
                    : "text-slate-500 hover:text-slate-800 hover:bg-slate-50"
                }`}
              >
                {page === "create" ? "Create Request" : "Track Request"}
              </button>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden sm:flex flex-col items-end">
            <span className="text-xs text-slate-500 leading-none">{userEmail}</span>
          </div>
          <div className="w-8 h-8 rounded-full bg-navy flex items-center justify-center text-white text-xs font-semibold tracking-wide flex-shrink-0">
            {initials}
          </div>
        </div>
      </div>
    </header>
  )
}
