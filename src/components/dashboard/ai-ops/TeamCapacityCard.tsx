import React from "react"
import type { UXRequest } from "@/data/mockData"
import CycleTimeCard from "./CycleTimeCard"

export interface TeamCapacityCardProps {
  requests?: UXRequest[]
}

/**
 * Re-exporting CycleTimeCard as default to maintain 100% backward compatibility
 * with existing imports while delivering the SLA / Cycle Time KPI requirements.
 */
export default function TeamCapacityCard({ requests = [] }: TeamCapacityCardProps) {
  return <CycleTimeCard requests={requests} />
}

export { CycleTimeCard }
