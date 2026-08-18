import { useState } from "react"
import Sidebar, { Page } from "./components/Sidebar"
import TongQuanPage from "./pages/TongQuanPage"
import CreateRequestPage from "./pages/CreateRequestPage"
import TrackRequestPage from "./pages/TrackRequestPage"
import QuanLyPage from "./pages/QuanLyPage"

export default function App() {
  const [page, setPage] = useState<Page>("overview")

  const content = {
    overview: <TongQuanPage />,
    create: <CreateRequestPage />,
    track: <TrackRequestPage />,
    manage: <QuanLyPage />,
  }[page]

  return (
    <div className="min-h-screen bg-[#F4F6FB]">
      <Sidebar currentPage={page} onNavigate={setPage} />
      {/* Desktop: offset for sidebar; Mobile: offset for top bar */}
      <div className="md:ml-60 pt-14 md:pt-0 min-h-screen">
        {content}
      </div>
    </div>
  )
}
