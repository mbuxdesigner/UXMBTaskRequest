import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { staggerContainerVariants, staggerItemVariants, durations } from "@/lib/motion"
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
  const [squads, setSquads] = useState<Squad[]>(() => {
    try {
      const cached = localStorage.getItem("mbbank_admin_squads")
      if (cached) {
        const parsed = JSON.parse(cached)
        if (Array.isArray(parsed) && parsed.length > 0) return parsed
      }
    } catch {}
    return []
  })
  const [loading, setLoading] = useState<boolean>(() => {
    try {
      const cached = localStorage.getItem("mbbank_admin_squads")
      if (cached) {
        const parsed = JSON.parse(cached)
        if (Array.isArray(parsed) && parsed.length > 0) return false
      }
    } catch {}
    return true
  })
  const [isSuccess, setIsSuccess] = useState(false)
  const session = getStoredSession()
  const isPo = session?.role === "PO"

  useEffect(() => {
    if (squads.length === 0) setLoading(true)
    const startTime = Date.now()
    fetchSquads(squads.length === 0)
      .then(async (data) => {
        if (loading) {
          const elapsed = Date.now() - startTime
          if (elapsed < 350) {
            await new Promise((r) => setTimeout(r, 350 - elapsed))
          }
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
          ? "w-full min-h-[calc(100vh-12rem)] flex flex-col justify-center outline-none"
          : "w-full space-y-6 pb-8 outline-none"
      }
    >
      {isPo && !isSuccess && (
        <motion.div variants={staggerItemVariants}>
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
        </motion.div>
      )}
      <AnimatePresence mode="wait">
        {loading ? (
          <motion.div
            key="form-skeleton"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: durations.skeletonExit } }}
            transition={{ duration: 0.2 }}
          >
            <FormSkeleton />
          </motion.div>
        ) : (
          <motion.div
            key="form-content"
            variants={staggerContainerVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
          >
            <RequestForm squads={squads} onSuccessChange={setIsSuccess} />
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  )
}
