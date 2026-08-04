import { cn } from "@/lib/utils";

interface SkillChipProps {
  label: string;
  className?: string;
}

export default function SkillChip({ label, className }: SkillChipProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border border-[#f2cc63]/70 bg-[#0f2744] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-[#f7ebcf] shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-[#f2cc63] hover:bg-[#17355f] hover:shadow-[0_8px_16px_rgba(7,20,38,0.16)]",
        className,
      )}
    >
      {label}
    </span>
  );
}
