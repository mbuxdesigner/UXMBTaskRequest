import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Squad } from "../data/mockData"
import { fetchSquads } from "../api/api"
import RequestForm from "../components/form/RequestForm"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"
import { getStoredSession } from "../services/otpAuthService"
import { FormSkeleton } from "@/components/common/ReuiSkeletons"

interface CreateRequestPageProps {
  onBack?: () => void
}

export default function CreateRequestPage({ onBack }: CreateRequestPageProps) {
  const [squads, setSquads] = useState<Squad[]>([])
  const [loading, setLoading] = useState(true)
  const [isSuccess, setIsSuccess] = useState(false)
  const session = getStoredSession()
  const isPo = session?.role === "PO"

  useEffect(() => {
    setLoading(true)
    const startTime = Date.now()
    fetchSquads(true)
      .then(async (data) => {
        const elapsed = Date.now() - startTime
        if (elapsed < 350) {
          await new Promise((r) => setTimeout(r, 350 - elapsed))
        }
        setSquads(data)
      })
      .catch((err) => {
        console.warn("Could not fetch squads for create request:", err)
      })
      .finally(() => {
        setLoading(false)
      })
  }, [])

  return (
    <main
      id="main-content"
      tabIndex={-1}
      className={
        isSuccess
          ? "w-full min-h-[calc(100vh-12rem)] flex flex-col justify-center animate-in fade-in-50 duration-200 outline-none"
          : "w-full space-y-6 animate-in fade-in-50 duration-200 pb-8 outline-none"
      }
    >
      {isPo && !isSuccess && (
        <div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              if (onBack) onBack()
              else window.location.hash = "#track"
            }}
            aria-label="Quay lại Danh sách yêu cầu"
            className="text-slate-600 hover:text-slate-900 font-semibold gap-2 rounded-xl -ml-2.5 cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4 text-[#1057FB]" />
            <span>Quay lại Danh sách yêu cầu</span>
          </Button>
        </div>
      )}
      <AnimatePresence mode="wait">
        {loading ? (
          <motion.div
            key="form-skeleton"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <FormSkeleton />
          </motion.div>
        ) : (
          <motion.div
            key="form-content"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
          >
            <RequestForm squads={squads} onSuccessChange={setIsSuccess} />
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  )
}
