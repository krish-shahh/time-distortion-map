// src/components/InfoTooltip.tsx
import { InfoIcon } from 'lucide-react'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { Button } from "@/components/ui/button"

export function InfoTooltip({ content }: { content: string }) {
  return (
    <TooltipProvider delayDuration={0}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-6 w-6 p-0 hover:bg-transparent"
          >
            <InfoIcon className="h-4 w-4 text-muted-foreground hover:text-foreground transition-colors" />
            <span className="sr-only">More information</span>
          </Button>
        </TooltipTrigger>
        <TooltipContent 
          side="right" 
          className="max-w-[250px] text-sm bg-white p-3 shadow-lg rounded-lg border"
        >
          <p>{content}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}