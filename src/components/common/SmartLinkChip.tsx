import React, { useState } from "react"
import { Globe } from "lucide-react"

export interface SmartLinkInfo {
  url: string
  sourceName: string
  displayTitle: string
  iconType:
    | "figma"
    | "google"
    | "gdrive"
    | "gdocs"
    | "gsheets"
    | "gslides"
    | "github"
    | "gitlab"
    | "jira"
    | "miro"
    | "notion"
    | "youtube"
    | "generic"
  faviconUrl?: string
}

/**
 * Phân tích URL thông minh để trích xuất Brand Source và Tiêu đề file/trang
 */
export function parseSmartLink(rawUrl: string, customTitle?: string): SmartLinkInfo {
  const cleanUrl = (rawUrl || "").trim()

  try {
    const parsed = new URL(cleanUrl.startsWith("http") ? cleanUrl : `https://${cleanUrl}`)
    const host = parsed.hostname.toLowerCase()
    const path = parsed.pathname
    const search = parsed.searchParams

    // 1. FIGMA (figma.com/design/..., figma.com/file/..., figma.com/proto/...)
    if (host.includes("figma.com")) {
      const isProto = path.includes("/proto/")
      // Đường dẫn Figma chuẩn: /design/:key/:title hoặc /file/:key/:title hoặc /proto/:key/:title
      const segments = path.split("/").filter(Boolean)
      let extractedTitle = ""

      if (segments.length >= 3 && ["design", "file", "proto"].includes(segments[0])) {
        // segment[2] thường là tên file được slugify (ví dụ: MB-App-V5, Design-System)
        try {
          extractedTitle = decodeURIComponent(segments[2]).replace(/[-_]+/g, " ").trim()
        } catch {
          extractedTitle = segments[2].replace(/[-_]+/g, " ").trim()
        }
      }

      const defaultTitle = isProto ? "Figma Prototype" : "Figma Design"
      return {
        url: cleanUrl,
        sourceName: "Figma",
        displayTitle: customTitle || extractedTitle || defaultTitle,
        iconType: "figma",
      }
    }

    // 2. GOOGLE DOCS / SHEETS / SLIDES / DRIVE
    if (host.includes("docs.google.com")) {
      if (path.includes("/document/")) {
        return {
          url: cleanUrl,
          sourceName: "Google Docs",
          displayTitle: customTitle || "Tài liệu Docs",
          iconType: "gdocs",
        }
      }
      if (path.includes("/spreadsheets/")) {
        return {
          url: cleanUrl,
          sourceName: "Google Sheets",
          displayTitle: customTitle || "Bảng tính Sheets",
          iconType: "gsheets",
        }
      }
      if (path.includes("/presentation/")) {
        return {
          url: cleanUrl,
          sourceName: "Google Slides",
          displayTitle: customTitle || "Trình chiếu Slides",
          iconType: "gslides",
        }
      }
    }

    if (host.includes("drive.google.com")) {
      return {
        url: cleanUrl,
        sourceName: "Google Drive",
        displayTitle: customTitle || "Tệp Google Drive",
        iconType: "gdrive",
      }
    }

    // 3. GOOGLE SEARCH / GENERAL
    if (host.includes("google.com")) {
      const query = search.get("q")
      return {
        url: cleanUrl,
        sourceName: "Google",
        displayTitle: customTitle || (query ? `Tìm kiếm: ${query}` : "Google"),
        iconType: "google",
      }
    }

    // 4. GITHUB
    if (host.includes("github.com")) {
      const parts = path.split("/").filter(Boolean)
      let repoTitle = ""
      if (parts.length >= 2) {
        repoTitle = `${parts[0]}/${parts[1]}`
        if (parts[2] === "pull" && parts[3]) repoTitle += ` #${parts[3]}`
        else if (parts[2] === "issues" && parts[3]) repoTitle += ` #${parts[3]}`
      }
      return {
        url: cleanUrl,
        sourceName: "GitHub",
        displayTitle: customTitle || repoTitle || "GitHub",
        iconType: "github",
      }
    }

    // 5. GITLAB
    if (host.includes("gitlab.com")) {
      return {
        url: cleanUrl,
        sourceName: "GitLab",
        displayTitle: customTitle || "GitLab Project",
        iconType: "gitlab",
      }
    }

    // 6. JIRA / ATLASSIAN
    if (host.includes("atlassian.net") || host.includes("jira")) {
      const issueMatch = path.match(/(?:browse|issues?)\/([A-Z0-9]+-\d+)/i)
      return {
        url: cleanUrl,
        sourceName: "Jira",
        displayTitle: customTitle || (issueMatch ? issueMatch[1].toUpperCase() : "Jira Issue"),
        iconType: "jira",
      }
    }

    // 7. MIRO
    if (host.includes("miro.com")) {
      return {
        url: cleanUrl,
        sourceName: "Miro",
        displayTitle: customTitle || "Miro Board",
        iconType: "miro",
      }
    }

    // 8. NOTION
    if (host.includes("notion.so") || host.includes("notion.site")) {
      return {
        url: cleanUrl,
        sourceName: "Notion",
        displayTitle: customTitle || "Notion Page",
        iconType: "notion",
      }
    }

    // 9. YOUTUBE
    if (host.includes("youtube.com") || host.includes("youtu.be")) {
      return {
        url: cleanUrl,
        sourceName: "YouTube",
        displayTitle: customTitle || "YouTube Video",
        iconType: "youtube",
      }
    }

    // 10. GENERIC WEBSITES: Tự động trích xuất tên miền và Favicon chuẩn
    const cleanHost = host.replace(/^www\./, "")
    // Viết hoa chữ cái đầu của domain name (vd: mbbank.com.vn -> MBBank hoặc Mbbank)
    const domainParts = cleanHost.split(".")
    let brandName = domainParts[0] ? domainParts[0].charAt(0).toUpperCase() + domainParts[0].slice(1) : cleanHost
    if (cleanHost.includes("mbbank")) brandName = "MBBank"

    // Tiêu đề đường dẫn ngắn gọn
    let pathSnippet = path && path !== "/" ? path.replace(/\/$/, "").split("/").pop() || "" : ""
    try {
      pathSnippet = decodeURIComponent(pathSnippet).replace(/[-_]+/g, " ")
    } catch {}

    const genericTitle = customTitle || pathSnippet || cleanHost

    return {
      url: cleanUrl,
      sourceName: brandName,
      displayTitle: genericTitle,
      iconType: "generic",
      faviconUrl: `https://www.google.com/s2/favicons?domain=${cleanHost}&sz=32`,
    }
  } catch {
    return {
      url: cleanUrl,
      sourceName: "Link",
      displayTitle: customTitle || cleanUrl,
      iconType: "generic",
    }
  }
}

interface SmartLinkChipProps {
  url: string
  customTitle?: string
  className?: string
}

/**
 * Component hiển thị liên kết dạng Smart Chip (giống Notion / Slack / Google Docs)
 * - Tự động hiển thị Favicon / Brand Logo chính thức của nguồn (Figma, Google, GitHub...)
 * - Tên nguồn nổi bật và tiêu đề trang/file gọn gàng kèm dấu ba chấm khi dài
 * - Mở liên kết trong tab mới, giữ giao diện thanh lịch
 */
export function SmartLinkChip({ url, customTitle, className = "" }: SmartLinkChipProps) {
  const [imgError, setImgError] = useState(false)
  const info = parseSmartLink(url, customTitle)

  const renderIcon = () => {
    // 1. FIGMA ICON
    if (info.iconType === "figma") {
      return (
        <svg viewBox="0 0 38 57" fill="none" className="w-3.5 h-3.5 shrink-0" aria-label="Figma">
          <path d="M19 28.5C19 23.2533 23.2533 19 28.5 19C33.7467 19 38 23.2533 38 28.5C38 33.7467 33.7467 38 28.5 38C23.2533 38 19 33.7467 19 28.5Z" fill="#1ABCFE"/>
          <path d="M0 47.5C0 42.2533 4.25329 38 9.5 38H19V47.5C19 52.7467 14.7467 57 9.5 57C4.25329 57 0 52.7467 0 47.5Z" fill="#0ACF83"/>
          <path d="M19 0V19H28.5C33.7467 19 38 14.7467 38 9.5C38 4.25329 33.7467 0 28.5 0H19Z" fill="#FF7262"/>
          <path d="M0 9.5C0 14.7467 4.25329 19 9.5 19H19V0H9.5C4.25329 0 0 4.25329 0 9.5Z" fill="#F24E1E"/>
          <path d="M0 28.5C0 33.7467 4.25329 38 9.5 38H19V19H9.5C4.25329 19 0 23.2533 0 28.5Z" fill="#A259FF"/>
        </svg>
      )
    }

    // 2. GOOGLE COLORFUL G
    if (info.iconType === "google") {
      return (
        <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 shrink-0" aria-label="Google">
          <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
          <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
          <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/>
          <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335"/>
        </svg>
      )
    }

    // 3. GOOGLE DRIVE
    if (info.iconType === "gdrive") {
      return (
        <svg viewBox="0 0 87.3 78" className="w-3.5 h-3.5 shrink-0" aria-label="Google Drive">
          <path d="m6.6 66.85 3.85 6.65c.8 1.4 1.95 2.5 3.3 3.3l13.75-23.8h-27.5c0 1.55.4 3.1 1.2 4.5z" fill="#0066da"/>
          <path d="m43.65 25-13.75-23.8c-1.35.8-2.5 1.9-3.3 3.3l-25.4 44c-.8 1.4-1.2 2.95-1.2 4.5h27.5z" fill="#00ac47"/>
          <path d="m73.55 76.8c1.35-.8 2.5-1.9 3.3-3.3l1.6-2.75 7.65-13.25c.8-1.4 1.2-2.95 1.2-4.5h-27.502l5.852 11.5z" fill="#ea4335"/>
          <path d="m43.65 25 13.75-23.8c-1.35-.8-2.9-1.2-4.5-1.2h-18.5c-1.6 0-3.15.45-4.5 1.25z" fill="#00832d"/>
          <path d="m59.8 53h-32.3l-13.75 23.8c1.35.8 2.9 1.2 4.5 1.2h50.8c1.6 0 3.15-.45 4.5-1.25z" fill="#2684fc"/>
          <path d="m73.4 26.5-12.7-22c-.8-1.4-1.95-2.5-3.3-3.3l-13.75 23.8 16.15 28h27.45c0-1.55-.4-3.1-1.2-4.5z" fill="#ffba00"/>
        </svg>
      )
    }

    // 4. GOOGLE SHEETS
    if (info.iconType === "gsheets") {
      return (
        <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 shrink-0" aria-label="Google Sheets">
          <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM9 17H6v-2h3v2zm0-4H6v-2h3v2zm0-4H6V7h3v2zm5 8h-3v-2h3v2zm0-4h-3v-2h3v2zm0-4h-3V7h3v2zm5 8h-3v-2h3v2zm0-4h-3v-2h3v2zm0-4h-3V7h3v2z" fill="#0F9D58"/>
        </svg>
      )
    }

    // 5. GOOGLE DOCS
    if (info.iconType === "gdocs") {
      return (
        <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 shrink-0" aria-label="Google Docs">
          <path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z" fill="#4285F4"/>
        </svg>
      )
    }

    // 6. GITHUB
    if (info.iconType === "github") {
      return (
        <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 shrink-0 fill-slate-800" aria-label="GitHub">
          <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"/>
        </svg>
      )
    }

    // 7. JIRA
    if (info.iconType === "jira") {
      return (
        <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 shrink-0" aria-label="Jira">
          <path d="M11.53 2c0 2.4 1.97 4.35 4.39 4.35h2.15v2.13c0 2.4 1.97 4.35 4.39 4.35V2h-10.93zm-5.76 5.86c0 2.4 1.97 4.35 4.39 4.35h2.15v2.13c0 2.4 1.97 4.35 4.39 4.35V7.86H5.77zM0 13.73c0 2.4 1.97 4.35 4.39 4.35h2.15v2.13c0 2.4 1.97 4.35 4.39 4.35V13.73H0z" fill="#0052CC"/>
        </svg>
      )
    }

    // 8. YOUTUBE
    if (info.iconType === "youtube") {
      return (
        <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 shrink-0 fill-[#FF0000]" aria-label="YouTube">
          <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
        </svg>
      )
    }

    // 9. GENERIC: Dùng Google Favicon API kèm fallback về Lucide Globe
    if (info.faviconUrl && !imgError) {
      return (
        <img
          src={info.faviconUrl}
          alt=""
          loading="lazy"
          className="w-3.5 h-3.5 object-contain shrink-0 rounded-xs"
          onError={() => setImgError(true)}
        />
      )
    }

    return <Globe className="w-3.5 h-3.5 shrink-0 text-slate-400" />
  }

  return (
    <a
      href={info.url}
      target="_blank"
      rel="noopener noreferrer"
      onClick={(e) => e.stopPropagation()}
      title={`${info.sourceName}: ${info.displayTitle}\n${info.url}`}
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 my-0.5 rounded-md bg-slate-100 hover:bg-slate-200/90 text-slate-800 text-xs font-normal border border-slate-200/80 transition-all max-w-full align-middle no-underline hover:no-underline group shadow-2xs select-none cursor-pointer ${className}`}
    >
      {/* Brand Favicon / Logo */}
      <span className="shrink-0 flex items-center justify-center">{renderIcon()}</span>

      {/* Brand / Source Name */}
      <span className="font-semibold text-slate-900 shrink-0 text-[11.5px] leading-tight">
        {info.sourceName}
      </span>

      {/* Title / Slug / Search Query */}
      <span className="text-slate-600 truncate max-w-[200px] sm:max-w-[320px] text-[11.5px] font-normal leading-tight">
        {info.displayTitle}
      </span>
    </a>
  )
}

export default SmartLinkChip
