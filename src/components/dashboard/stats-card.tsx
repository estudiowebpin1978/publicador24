import { cn } from "@/lib/utils"
import { Card, CardContent } from "@/components/ui/card"
import { type LucideIcon } from "lucide-react"

interface StatsCardProps {
  title: string
  value: string | number
  change?: number
  icon: LucideIcon
  iconColor?: string
  className?: string
}

export function StatsCard({
  title,
  value,
  change,
  icon: Icon,
  iconColor = "text-violet-600",
  className,
}: StatsCardProps) {
  return (
    <Card className={cn("transition-shadow hover:shadow-md", className)}>
      <CardContent className="flex items-center gap-4">
        <div
          className={cn(
            "flex size-10 items-center justify-center rounded-xl bg-muted",
            iconColor
          )}
        >
          <Icon className="size-5" />
        </div>
        <div className="flex-1">
          <p className="text-sm text-muted-foreground">{title}</p>
          <div className="flex items-baseline gap-2">
            <p className="text-2xl font-bold">{value}</p>
            {change !== undefined && (
              <span
                className={cn(
                  "text-xs font-medium",
                  change >= 0 ? "text-green-600" : "text-red-600"
                )}
              >
                {change >= 0 ? "+" : ""}
                {change}%
              </span>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
