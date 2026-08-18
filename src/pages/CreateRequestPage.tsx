import { useState, useEffect } from "react"
import { Squad } from "../data/mockData"
import { fetchSquads } from "../api/api"
import RequestForm from "../components/form/RequestForm"

export default function CreateRequestPage() {
  const [squads, setSquads] = useState<Squad[]>([])

  useEffect(() => {
    fetchSquads().then(setSquads).catch(() => {})
  }, [])

  return (
    <main className="max-w-3xl mx-auto px-6 py-10">
      <RequestForm squads={squads} />
    </main>
  )
}
