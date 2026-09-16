import React from "react"
import type { UXRequest } from "@/data/mockData"
import BacklogPendingDonutCard from "./BacklogPendingDonutCard"
import InProgressWorkloadCard from "./InProgressWorkloadCard"
import CompletedSlaCard from "./CompletedSlaCard"

interface AiOpsKpiCardsProps {
  requests?: UXRequest[]
}

export default function AiOpsKpiCards({ requests = [] }: AiOpsKpiCardsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4.5 items-stretch">
      <div className="h-full min-w-0">
        <BacklogPendingDonutCard requests={requests} />
      </div>
      <div className="h-full min-w-0">
        <InProgressWorkloadCard requests={requests} />
      </div>
      <div className="h-full min-w-0">
        <CompletedSlaCard requests={requests} />
      </div>
    </div>
  )
}
