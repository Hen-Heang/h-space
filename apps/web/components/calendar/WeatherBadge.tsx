"use client"

import { getWeatherCodeMeta, type DailyWeather } from "@/lib/weather"
import { cn } from "@/lib/utils"

interface WeatherBadgeProps {
  weather: DailyWeather
  variant: "month" | "time-grid"
  className?: string
}

export function WeatherBadge({ weather, variant, className }: WeatherBadgeProps) {
  const { emoji, label } = getWeatherCodeMeta(weather.code)
  const tempMax = Math.round(weather.tempMaxC)
  const tempMin = Math.round(weather.tempMinC)

  return (
    <span
      title={`${label}, ${tempMin}–${tempMax}°C · Yeongdeungpo-gu, Seoul`}
      aria-label={`Forecast: ${label}, high ${tempMax}, low ${tempMin} degrees Celsius`}
      className={cn(
        "inline-flex shrink-0 items-center gap-0.5 leading-none text-muted-foreground",
        variant === "month" && "h-6 text-xs",
        variant === "time-grid" && "text-xs",
        className,
      )}
    >
      <span aria-hidden="true">{emoji}</span>
      <span className="hidden tabular-nums sm:inline">{tempMax}°</span>
    </span>
  )
}
