import type { ButtonHTMLAttributes, HTMLAttributes, ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { ArrowLeft } from "lucide-react";
import { cn } from "../ui/utils";

type BallparkShellProps = {
  onBack: () => void;
  icon?: LucideIcon;
  iconColor?: string;
  title: string;
  rightSlot?: ReactNode;
  children: ReactNode;
  maxWidthClassName?: string;
};

export function BallparkShell({
  onBack,
  icon: Icon,
  iconColor,
  title,
  rightSlot,
  children,
  maxWidthClassName = "max-w-6xl",
}: BallparkShellProps) {
  return (
    <div className="ballpark-page">
      <div className={cn(maxWidthClassName, "mx-auto")}>
        <div className="ballpark-shell-header">
          <button
            type="button"
            onClick={onBack}
            className="ballpark-back-button"
          >
            <ArrowLeft className="w-6 h-6 text-[var(--ballpark-chalk)]" />
          </button>
          <div className="ballpark-title-plate">
            {Icon ? (
              <Icon
                className="w-6 h-6"
                style={iconColor ? { color: iconColor } : undefined}
              />
            ) : null}
            <h1 className="ballpark-title">{title}</h1>
          </div>
          {rightSlot}
        </div>
        {children}
      </div>
    </div>
  );
}

type PressButtonVariant = "default" | "affirm" | "destruct" | "gold";
type PressButtonSize = "sm" | "md" | "lg";
type PressButtonShadow = 2 | 4;

type PressButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: PressButtonVariant;
  size?: PressButtonSize;
  shadow?: PressButtonShadow;
};

export function PressButton({
  variant = "default",
  size = "md",
  shadow = 2,
  className,
  type = "button",
  ...props
}: PressButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        "ballpark-press-button",
        `ballpark-press-${variant}`,
        `ballpark-press-${size}`,
        shadow === 4 && "ballpark-press-shadow-4",
        className,
      )}
      {...props}
    />
  );
}

type PanelWithHeaderStripProps = HTMLAttributes<HTMLDivElement> & {
  title: ReactNode;
  rightSlot?: ReactNode;
  children: ReactNode;
};

export function PanelWithHeaderStrip({
  title,
  rightSlot,
  children,
  className,
  ...props
}: PanelWithHeaderStripProps) {
  return (
    <section className={cn("ballpark-panel", className)} {...props}>
      <div className="ballpark-panel-strip">
        <div className="font-bold tracking-wider text-[var(--ballpark-chalk)]">
          {title}
        </div>
        {rightSlot}
      </div>
      {children}
    </section>
  );
}

type ChunkyModalProps = HTMLAttributes<HTMLDivElement> & {
  title: ReactNode;
  children: ReactNode;
};

export function ChunkyModal({
  title,
  children,
  className,
  ...props
}: ChunkyModalProps) {
  return (
    <div className={cn("ballpark-modal", className)} {...props}>
      <div className="ballpark-modal-title">{title}</div>
      <div className="mt-4">{children}</div>
    </div>
  );
}

type LeftAccentFeedCardTone = "neutral" | "crisis" | "dated" | "good";

type LeftAccentFeedCardProps = HTMLAttributes<HTMLDivElement> & {
  tone?: LeftAccentFeedCardTone;
  icon?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  rightSlot?: ReactNode;
};

const feedToneColor: Record<LeftAccentFeedCardTone, string> = {
  neutral: "var(--ballpark-sage)",
  crisis: "var(--ballpark-status-red-bright)",
  dated: "var(--ballpark-scoreboard-yellow)",
  good: "var(--ballpark-ground)",
};

export function LeftAccentFeedCard({
  tone = "neutral",
  icon,
  title,
  description,
  rightSlot,
  className,
  style,
  ...props
}: LeftAccentFeedCardProps) {
  return (
    <div
      className={cn("ballpark-feed-card", className)}
      style={{ borderLeftColor: feedToneColor[tone], ...style }}
      {...props}
    >
      {icon ? <div className="mt-0.5 text-xl leading-none">{icon}</div> : null}
      <div className="min-w-0 flex-1">
        <div className="text-xl font-bold leading-tight text-[var(--ballpark-chalk)]">
          {title}
        </div>
        {description ? (
          <div className="mt-1 text-xs leading-relaxed text-[var(--ballpark-chalk)]/70">
            {description}
          </div>
        ) : null}
      </div>
      {rightSlot}
    </div>
  );
}
