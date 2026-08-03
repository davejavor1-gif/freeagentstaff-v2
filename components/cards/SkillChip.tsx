import { cn } from "@/lib/utils";

interface SkillChipProps {
  label: string;
  className?: string;
}

export default function SkillChip({ label, className }: SkillChipProps) {
  return (
    <span
      className={cn(
        "rounded-full border border-white/10 bg-white/10 px-3 py-1 text-sm text-slate-200/90",
        className,
      )}
    >
      {label}
    </span>
  );
}
