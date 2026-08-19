import Image from "next/image";

type FreeAgentProBadgeProps = {
  size?: "compact" | "standard" | "large";
  className?: string;
};

const sizeClasses = {
  compact: "h-24 w-auto",
  standard: "h-16 w-auto",
  large: "h-24 w-auto sm:h-28",
};

export default function FreeAgentProBadge({
  size = "standard",
  className = "",
}: FreeAgentProBadgeProps) {
  return (
    <Image
      src="/images/badge.png"
      alt="FreeAgent Pro"
      width={300}
      height={300}
      className={`${sizeClasses[size]} ${className}`.trim()}
      sizes={size === "large" ? "(max-width: 640px) 96px, 112px" : size === "standard" ? "64px" : "96px"}
    />
  );
}
