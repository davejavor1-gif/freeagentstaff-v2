import { cn } from "@/lib/utils";

interface AvailabilityBadgeProps {
  status: string;
  className?: string;
}

const statusStyles: Record<string, string> = {
  "Available Now": "bg-[#0f2744] text-[#f5e7c8] ring-[#cda64d]/50",
  "Open to new projects": "bg-[#17355f] text-[#f5e7c8] ring-[#f2cc63]/40",
  "Busy this month": "bg-[#5c4020] text-[#f7e0a4] ring-[#f2cc63]/40",
  Booked: "bg-[#4d1f24] text-[#ffd6d6] ring-[#f2cc63]/30",
};

export default function AvailabilityBadge({
  status,
  className,
}: AvailabilityBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center justify-center rounded-full px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.24em] ring-1",
        statusStyles[status] ?? "bg-[#0f2744] text-[#f5e7c8] ring-[#cda64d]/40",
        className,
      )}
    >
      <span className="mr-2 h-2 w-2 rounded-full bg-current" />
      {status}
    </span>
  );
}
