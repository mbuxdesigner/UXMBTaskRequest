import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Check, CircleDot, AlertCircle } from "lucide-react"
import { cn } from "@/lib/utils"

export type StepStatus = "complete" | "current" | "upcoming" | "error"

export interface StepDef {
  id: string
  title: string
  description?: string
  status: StepStatus
}

export interface StepItem {
  id: string | number
  title: string
  description?: string
  icon?: React.ReactNode
  status?: StepStatus
}

interface StepperContextValue {
  activeStep: number
  orientation?: "horizontal" | "vertical"
  variant?: "default" | "pills" | "circles" | "simple"
  onStepClick?: (stepIndex: number) => void
  totalSteps: number
}

const StepperContext = React.createContext<StepperContextValue | null>(null)

export function useStepper() {
  const context = React.useContext(StepperContext)
  if (!context) {
    throw new Error("useStepper must be used within a Stepper component")
  }
  return context
}

export interface StepperProps extends React.HTMLAttributes<HTMLDivElement> {
  activeStep: number
  orientation?: "horizontal" | "vertical"
  variant?: "default" | "pills" | "circles" | "simple"
  onStepClick?: (stepIndex: number) => void
  children: React.ReactNode
}

export function Stepper({
  activeStep,
  orientation = "horizontal",
  variant = "default",
  onStepClick,
  className,
  children,
  ...props
}: StepperProps) {
  const stepsCount = React.Children.count(children)

  return (
    <StepperContext.Provider
      value={{
        activeStep,
        orientation,
        variant,
        onStepClick,
        totalSteps: stepsCount,
      }}
    >
      <div
        className={cn(
          "w-full select-none",
          orientation === "horizontal"
            ? "flex items-center justify-between"
            : "flex flex-col space-y-4",
          className
        )}
        {...props}
      >
        {children}
      </div>
    </StepperContext.Provider>
  )
}

export interface StepProps extends React.HTMLAttributes<HTMLDivElement> {
  step: number
  title: string
  description?: string
  icon?: React.ReactNode
  state?: StepStatus
  disabled?: boolean
}

export function Step({
  step,
  title,
  description,
  icon,
  state,
  disabled,
  className,
  onClick,
  ...props
}: StepProps) {
  const { activeStep, orientation, variant, onStepClick, totalSteps } = useStepper()

  // Calculate status if not explicitly passed
  const currentStatus: StepStatus =
    state ||
    (step < activeStep ? "complete" : step === activeStep ? "current" : "upcoming")

  const isClickable = Boolean(onStepClick) && !disabled

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isClickable && onStepClick) {
      onStepClick(step)
    }
    onClick?.(e)
  }

  const isLast = step === totalSteps - 1

  return (
    <div
      className={cn(
        "relative flex items-center",
        orientation === "horizontal" ? "flex-1 last:flex-none" : "w-full",
        isClickable && "cursor-pointer group",
        className
      )}
      onClick={handleClick}
      {...props}
    >
      <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
        {/* ReUI Checkout-style Circle Indicator */}
        <div
          className={cn(
            "relative flex items-center justify-center rounded-full transition-all duration-200 font-mono font-medium text-xs select-none shrink-0",
            "size-6 sm:size-6.5",
            currentStatus === "complete" &&
              "bg-neutral-900 border border-neutral-900 text-white shadow-2xs",
            currentStatus === "current" &&
              "bg-white border border-neutral-300 text-neutral-900 font-bold shadow-2xs ring-2 ring-neutral-900/10",
            currentStatus === "upcoming" &&
              "bg-neutral-100/90 border border-neutral-200/60 text-neutral-400 group-hover:border-neutral-300 group-hover:text-neutral-600",
            currentStatus === "error" &&
              "bg-rose-500 border border-rose-500 text-white shadow-2xs"
          )}
        >
          {/* Live Sonar Pulse Animation for Current Step - Sits strictly behind (-z-10) with no layout shift */}
          {currentStatus === "current" && (
            <>
              {/* Radar Sonar Wave strictly behind the UI */}
              <span className="absolute -inset-1.5 rounded-full bg-neutral-900/10 -z-10 animate-pulse pointer-events-none" />
              {/* Rotating Dashed Outer Ring (Single outer dashed ring, none inside) */}
              <span className="absolute -inset-1 rounded-full border border-dashed border-neutral-400/90 animate-[spin_8s_linear_infinite] pointer-events-none z-0" />
            </>
          )}

          {currentStatus === "complete" ? (
            <Check className="size-3.5 stroke-[2.5]" />
          ) : currentStatus === "error" ? (
            <AlertCircle className="size-3.5" />
          ) : icon ? (
            icon
          ) : (
            <span className="tabular-nums relative z-10">{step + 1}</span>
          )}
        </div>

        {/* Step Title (Only content, no %) */}
        <div className="flex flex-col text-left">
          <span
            className={cn(
              "text-xs sm:text-[13px] tracking-tight transition-colors whitespace-nowrap flex items-center gap-1.5",
              currentStatus === "current" && "text-neutral-900 font-bold",
              currentStatus === "complete" && "text-neutral-900 font-semibold",
              currentStatus === "upcoming" && "text-neutral-500 font-medium group-hover:text-neutral-800",
              currentStatus === "error" && "text-rose-600 font-bold"
            )}
          >
            <span>{title}</span>
            {currentStatus === "current" && (
              <span className="inline-flex items-center shrink-0" title="Khâu đang diễn ra">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              </span>
            )}
          </span>
          {description && (
            <span
              className={cn(
                "text-[11px] leading-tight transition-colors hidden sm:block",
                currentStatus === "current" ? "text-neutral-600" : "text-neutral-400"
              )}
            >
              {description}
            </span>
          )}
        </div>
      </div>

      {/* Step Separator Line for horizontal matching ReUI Checkout */}
      {orientation === "horizontal" && !isLast && (
        <div className="flex-1 min-w-3 sm:min-w-6 mx-2 sm:mx-3">
          <div
            className={cn(
              "h-[1.5px] w-full transition-all duration-300",
              step < activeStep ? "bg-neutral-900" : "bg-neutral-200"
            )}
          />
        </div>
      )}
    </div>
  )
}
