import { useState, useEffect } from "react"
import { Squad } from "../data/mockData"
import { fetchSquads } from "../api/api"
import RequestForm from "../components/form/RequestForm"
import { Button } from "@/components/ui/button"
import { ArrowLeft, User } from "lucide-react"
import { getStoredSession } from "../services/otpAuthService"

interface CreateRequestPageProps {
  onBack?: () => void
}

export default function CreateRequestPage({ onBack }: CreateRequestPageProps) {
  const [squads, setSquads] = useState<Squad[]>([])
  const session = getStoredSession()

  useEffect(() => {
    fetchSquads().then(setSquads).catch(() => {})
  }, [])

  return (
    <div className="min-h-screen bg-[#FCFCFD] pb-16">
      {/* Top Header Bar for Create Screen (No Sidebar Nav) */}
      <header className="bg-white border-b border-slate-200/80 sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              if (onBack) {
                onBack()
              } else {
                window.location.hash = "#track"
              }
            }}
            className="text-slate-600 hover:text-slate-900 font-semibold gap-2 rounded-xl"
          >
            <ArrowLeft className="w-4 h-4 text-[#1E5AF6]" />
            <span>Quay lại Danh sách yêu cầu</span>
          </Button>

          {session && (
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-700 bg-slate-100/80 px-3 py-1.5 rounded-xl border border-slate-200/60">
              <span className="text-slate-400 font-medium">Phiên đăng nhập:</span>
              <span className="text-slate-900 font-bold">{session.displayName}</span>
              <span className="px-1.5 py-0.5 rounded bg-[#1B3A6B] text-white text-[10px] font-bold">
                {session.role}
              </span>
            </div>
          )}
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        <RequestForm squads={squads} />
      </main>
    </div>
  )
}
