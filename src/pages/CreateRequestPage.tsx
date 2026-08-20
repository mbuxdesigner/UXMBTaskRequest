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
  const isPo = session?.role === "PO"

  useEffect(() => {
    fetchSquads().then(setSquads).catch(() => {})
  }, [])

  return (
    <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-4">
      {isPo && (
        <div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              if (onBack) onBack()
              else window.location.hash = "#track"
            }}
            className="text-slate-600 hover:text-slate-900 font-semibold gap-2 rounded-xl -ml-2.5 cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4 text-[#1057FB]" />
            <span>Quay lại Danh sách yêu cầu</span>
          </Button>
        </div>
      )}
      <RequestForm squads={squads} />
    </main>
  )
}
