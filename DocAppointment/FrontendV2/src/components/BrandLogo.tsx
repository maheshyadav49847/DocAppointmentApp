import { MyQCareLogo } from "./MyQCareLogo"
import { cn } from "@/lib/utils"

export interface BrandLogoProps {
  theme?: "dark" | "light"
  size?: "sm" | "md" | "lg" | "xl"
  showSubtitle?: boolean
  align?: "start" | "center"
  className?: string
}

export function BrandLogo({
  theme = "light",
  size = "md",
  showSubtitle = true,
  align = "start",
  className,
}: BrandLogoProps) {
  const sizes = {
    sm: {
      box: "w-7 h-7 border-[2.5px] rounded-md",
      icon: 14,
      text: "text-sm",
      subtitle: "text-[7px]",
    },
    md: {
      box: "w-9 h-9 border-[3px] rounded-lg",
      icon: 18,
      text: "text-base",
      subtitle: "text-[8px]",
    },
    lg: {
      box: "w-11 h-11 border-[3px] rounded-xl",
      icon: 22,
      text: "text-xl",
      subtitle: "text-[9px]",
    },
    xl: {
      box: "w-14 h-14 border-4 rounded-2xl",
      icon: 32,
      text: "text-3xl",
      subtitle: "text-[10px]",
    },
  }

  const currentSize = sizes[size]

  const themes = {
    dark: {
      boxBorder: "border-t-white border-l-white border-b-indigo-400 border-r-indigo-400",
      iconColor: "text-white",
      lensColor: "#ffffff",
      textColor: "text-white",
      qColor: "text-indigo-400",
      divider: "bg-indigo-400/40",
      subtitle: "text-indigo-300",
      pulseColor: "#818cf8", // indigo-400
    },
    light: {
      boxBorder: "border-t-indigo-400 border-l-indigo-400 border-b-indigo-700 border-r-indigo-700",
      iconColor: "text-indigo-400",
      lensColor: "#1e293b", // slate-800
      textColor: "text-indigo-900", // Deep navy blue, rich and premium on white
      qColor: "text-indigo-600",
      divider: "bg-indigo-200",
      subtitle: "text-indigo-600",
      pulseColor: "#4338ca", // indigo-700 for dark right-half pulse
    },
  }

  const currentTheme = themes[theme]

  return (
    <div
      className={cn(
        "flex items-center inline-flex gap-2.5",
        align === "center" ? "mx-auto" : "",
        className
      )}
    >
      {/* Left: Icon Box */}
      <div
        className={cn(
          "bg-transparent flex items-center justify-center shrink-0",
          currentSize.box,
          currentTheme.boxBorder
        )}
      >
        <MyQCareLogo 
          size={currentSize.icon} 
          className={currentTheme.iconColor} 
          pulseColor={currentTheme.pulseColor} 
          lensColor={currentTheme.lensColor}
        />
      </div>

      {/* Right: Text Stack */}
      <div className="flex flex-col justify-center pt-0.5">
        <span
          className={cn("tracking-wide scale-y-110 origin-bottom inline-block leading-none", currentSize.text, currentTheme.textColor)}
        >
          <span className="font-black">My</span>
          <span className={cn(currentTheme.qColor, "font-black")}>Q</span>
          <span className="font-black">Care</span>
        </span>
        
        {showSubtitle && (
          <div className="flex flex-col w-full">
            <span
              className={cn(
                "w-full font-bold uppercase tracking-[0.15em] opacity-80",
                align === "center" ? "text-center" : "text-left",
                currentSize.subtitle,
                currentTheme.subtitle
              )}
            >
              Wait Less &bull; Care More
            </span>
          </div>
        )}
      </div>
    </div>
  )
}
