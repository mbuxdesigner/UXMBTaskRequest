import { useState } from "react"
import { Squad } from "../../data/mockData"
import SquadCapacityCard from "./SquadCapacityCard"
import SquadDetailModal from "./SquadDetailModal"

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

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white border border-slate-200 rounded-xl p-5 h-52 animate-pulse">
              <div className="h-4 bg-slate-100 rounded w-3/4 mb-2" />
              <div className="h-3 bg-slate-100 rounded w-1/2 mb-6" />
              <div className="h-2 bg-slate-100 rounded w-full mb-4" />
              <div className="h-8 bg-slate-100 rounded w-full" />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {squads.map((squad) => (
            <SquadCapacityCard
              key={squad.squad_id}
              squad={squad}
              interactive={interactive}
              onViewDetails={interactive ? setSelectedSquad : undefined}
            />
          ))}
        </div>
      )}

      {interactive && (
        <SquadDetailModal squad={selectedSquad} onClose={() => setSelectedSquad(null)} />
      )}
    </section>
  )
}
