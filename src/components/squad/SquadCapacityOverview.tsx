import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Squad } from "../../data/mockData"
import SquadCapacityCard from "./SquadCapacityCard"
import SquadDetailModal from "./SquadDetailModal"
import { SquadCapacitySkeleton } from "@/components/common/ReuiSkeletons"

interface SquadCapacityOverviewProps {
  squads: Squad[]
  loading: boolean
  error: string | null
  interactive?: boolean
}

export default function SquadCapacityOverview({
  squads,
  loading,
  error,
  interactive = true,
}: SquadCapacityOverviewProps) {
  const [selectedSquad, setSelectedSquad] = useState<Squad | null>(null)

  return (
    <section>
      <div className="mb-6">
        <h2 className="text-xl font-bold text-slate-900">Tình trạng UX Squad</h2>
        <p className="text-sm text-slate-500 mt-1.5">
          Xem khối lượng công việc hiện tại của từng UX Squad trước khi gửi yêu cầu.
        </p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      <AnimatePresence mode="wait">
        {loading ? (
          <motion.div
            key="squad-loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <SquadCapacitySkeleton count={4} />
          </motion.div>
        ) : (
          <motion.div
            key="squad-list"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4"
          >
            {squads.map((squad) => (
              <SquadCapacityCard
                key={squad.squad_id}
                squad={squad}
                interactive={interactive}
                onViewDetails={interactive ? setSelectedSquad : undefined}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {interactive && (
        <SquadDetailModal squad={selectedSquad} onClose={() => setSelectedSquad(null)} />
      )}
    </section>
  )
}
