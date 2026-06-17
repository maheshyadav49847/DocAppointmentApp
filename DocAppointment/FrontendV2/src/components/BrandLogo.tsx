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
  showSubtitle = false,
  align = "start",
  className,
}: BrandLogoProps) {
  const sizes = {
    sm: {
      box: "w-[22px] h-[22px] border-[2.5px] rounded",
      icon: 12,
      text: "text-lg",
      subtitle: "text-[9px]",
    },
    md: {
      box: "w-6 h-6 border-[3px] rounded-md",
      icon: 14,
      text: "text-xl",
      subtitle: "text-[10px]",
    },
    lg: {
      box: "w-8 h-8 border-[4px] rounded-lg",
      icon: 18,
      text: "text-2xl",
      subtitle: "text-xs",
    },
    xl: {
      box: "w-10 h-10 border-[5px] rounded-xl",
      icon: 22,
      text: "text-4xl",
      subtitle: "text-sm",
    },
  }

  const currentSize = sizes[size]

  // Map themes
  const themes = {
    dark: {
      boxBorder: "border-t-white border-l-white border-b-indigo-400 border-r-indigo-400",
      iconColor: "text-white",
      textColor: "text-white",
      qColor: "text-indigo-400",
      divider: "bg-indigo-400/40",
      subtitle: "text-indigo-300",
      pulseColor: "#818cf8", // indigo-400
    },
    light: {
      boxBorder: "border-t-indigo-600 border-l-indigo-600 border-b-sky-500 border-r-sky-500",
      iconColor: "text-indigo-600",
      textColor: "text-slate-900",
      qColor: "text-indigo-600",
      divider: "bg-indigo-200",
      subtitle: "text-indigo-600",
      pulseColor: "#818cf8", // indigo-400 for a two-tone effect with indigo-600
    },
  }

  const currentTheme = themes[theme]

  return (
    <div
      className={cn(
        "flex flex-col inline-flex",
        align === "center" ? "items-center text-center mx-auto" : "items-start",
        className
      )}
    >
      <div className="flex items-center gap-3">
        <div
          className={cn(
            "bg-transparent flex items-center justify-center shrink-0",
            currentSize.box,
            currentTheme.boxBorder
          )}
        >
          <MyQCareLogo size={currentSize.icon} className={currentTheme.iconColor} pulseColor={currentTheme.pulseColor} />
        </div>
        <span
          className={cn("font-black tracking-tight", currentSize.text, currentTheme.textColor)}
        >
          My<span className={currentTheme.qColor}>Q</span>Care
        </span>
      </div>
      {showSubtitle && (
        <div className="flex flex-col mt-1.5 w-full">
          <div className={cn("w-full h-[2px] mb-1 rounded-full", currentTheme.divider)}></div>
          <span
            className={cn(
              "w-full text-center font-bold uppercase mt-0.5 tracking-[0.15em]",
              currentSize.subtitle,
              currentTheme.subtitle
            )}
            style={{ paddingLeft: "0.15em" }} // offset the last letter's tracking to keep it perfectly centered
          >
            WhatsApp &bull; OPD &bull; Care
          </span>
        </div>
      )}
    </div>
  )
}
