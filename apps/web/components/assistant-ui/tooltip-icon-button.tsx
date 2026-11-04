"use client"

import { type ComponentPropsWithRef, forwardRef } from "react"
import { Slot } from "radix-ui"

import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export type TooltipIconButtonProps = ComponentPropsWithRef<typeof Button> & {
  tooltip: string
  side?: "top" | "bottom" | "left" | "right"
}

export const TooltipIconButton = forwardRef<HTMLButtonElement, TooltipIconButtonProps>(
  ({ children, tooltip, side = "bottom", className, ...rest }, ref) => {
    return (
      <TooltipProvider delayDuration={0}>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              {...rest}
              // 24px to look at, 44px to tap: the after: layer grows the hit area
              // without changing the action bar's layout.
              className={cn(
                "aui-button-icon relative size-6 p-1 after:absolute after:-inset-2.5 after:content-[''] active:scale-90",
                className,
              )}
              ref={ref}
            >
              <Slot.Slottable>{children}</Slot.Slottable>
              <span className="aui-sr-only sr-only">{tooltip}</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent side={side}>{tooltip}</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )
  },
)

TooltipIconButton.displayName = "TooltipIconButton"
