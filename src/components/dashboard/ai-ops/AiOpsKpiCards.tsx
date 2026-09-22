import React from "react"
import { motion } from "framer-motion"
import { cascadeWaveContainerVariants, cascadeWaveItemVariants } from "@/lib/motion"
import type { UXRequest } from "@/data/mockData"
import BacklogPendingDonutCard from "./BacklogPendingDonutCard"
import InProgressWorkloadCard from "./InProgressWorkloadCard"
import CompletedSlaCard from "./CompletedSlaCard"
import CycleTimeCard from "./CycleTimeCard"

interface AiOpsKpiCardsProps {
  requests?: UXRequest[]
  selectedProduct?: string
}

export default function AiOpsKpiCards({
  requests = [],
  selectedProduct,
}: AiOpsKpiCardsProps) {
  return (
    <motion.div
      variants={cascadeWaveContainerVariants}
      initial="hidden"
      animate="visible"
      className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4.5 items-stretch"
    >
      <motion.div variants={cascadeWaveItemVariants} layout="position" className="h-full min-w-0">
        <BacklogPendingDonutCard requests={requests} />
      </motion.div>
      <motion.div variants={cascadeWaveItemVariants} layout="position" className="h-full min-w-0">
        <InProgressWorkloadCard requests={requests} selectedProduct={selectedProduct} />
      </motion.div>
      <motion.div variants={cascadeWaveItemVariants} layout="position" className="h-full min-w-0">
        <CompletedSlaCard requests={requests} />
      </motion.div>
      <motion.div variants={cascadeWaveItemVariants} layout="position" className="h-full min-w-0">
        <CycleTimeCard requests={requests} />
      </motion.div>
    </motion.div>
  )
}
