import { useState, useEffect } from "react"
import { getStoredSession, UserSession, syncSessionRoleFromSheet } from "@/services/otpAuthService"
import { fetchMasterDataFromSheet } from "@/services/googleSheetService"
import { TestExam, TestSubmission } from "@/types/testAssessment"
import TestManagementView from "@/components/test-assessment/TestManagementView"
import TestRunnerView from "@/components/test-assessment/TestRunnerView"
import { PageSkeleton } from "@/components/common/ReuiSkeletons"

export default function TestAssessmentPage() {
  const [session, setSession] = useState<UserSession | null>(getStoredSession())
  const [activeRunningTest, setActiveRunningTest] = useState<TestExam | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let isMounted = true
    const handleAuth = () => setSession(getStoredSession())
    window.addEventListener("auth_session_changed", handleAuth)

    const loadData = async () => {
      setLoading(true)
      const startTime = Date.now()
      try {
        await Promise.all([
          syncSessionRoleFromSheet(),
          fetchMasterDataFromSheet(),
        ])
      } catch (e) {
        console.warn("Could not sync data for test assessment page:", e)
      } finally {
        const elapsed = Date.now() - startTime
        if (elapsed < 600) {
          await new Promise((r) => setTimeout(r, 600 - elapsed))
        }
        if (isMounted) {
          setLoading(false)
        }
      }
    }

    loadData()

    return () => {
      isMounted = false
      window.removeEventListener("auth_session_changed", handleAuth)
    }
  }, [])

  const currentRole = session?.role || "Designer"
  const currentName = session?.displayName || "Nhân viên UX MB"
  const currentEmail = session?.teamsEmail || session?.personalEmail || "user@mbbank.com.vn"
  const currentSquad = (session as any)?.squad || "UX Core & Design System"

  if (loading) {
    return (
      <main id="main-content" tabIndex={-1} className="w-full space-y-6 animate-in fade-in-50 duration-200 pb-8 outline-none">
        <PageSkeleton />
      </main>
    )
  }

  return (
    <main id="main-content" tabIndex={-1} className="w-full space-y-6 animate-in fade-in-50 duration-200 pb-8 outline-none">
      {activeRunningTest ? (
        <TestRunnerView
          test={activeRunningTest}
          user={{
            name: currentName,
            email: currentEmail,
            role: currentRole,
            squad: currentSquad,
          }}
          onFinish={(submission) => {
            // Callback when exam finishes
          }}
          onExit={() => setActiveRunningTest(null)}
        />
      ) : (
        <TestManagementView
          userRole={currentRole}
          currentUserName={currentName}
          currentUserEmail={currentEmail}
          currentUserSquad={currentSquad}
          onStartExam={(test) => setActiveRunningTest(test)}
        />
      )}
    </main>
  )
}
