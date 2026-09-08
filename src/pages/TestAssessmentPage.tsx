import { useState, useEffect } from "react"
import { getStoredSession, UserSession } from "@/services/otpAuthService"
import { TestExam, TestSubmission } from "@/types/testAssessment"
import TestManagementView from "@/components/test-assessment/TestManagementView"
import TestRunnerView from "@/components/test-assessment/TestRunnerView"

export default function TestAssessmentPage() {
  const [session, setSession] = useState<UserSession | null>(getStoredSession())
  const [activeRunningTest, setActiveRunningTest] = useState<TestExam | null>(null)

  useEffect(() => {
    const handleAuth = () => setSession(getStoredSession())
    window.addEventListener("auth_session_changed", handleAuth)
    return () => window.removeEventListener("auth_session_changed", handleAuth)
  }, [])

  const currentRole = session?.role || "Designer"
  const currentName = session?.displayName || "Nhân viên UX MB"
  const currentEmail = session?.teamsEmail || session?.personalEmail || "user@mbbank.com.vn"
  const currentSquad = (session as any)?.squad || "UX Core & Design System"

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
