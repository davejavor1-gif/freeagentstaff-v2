"use client";

import Link from "next/link";
import { useState } from "react";
import { motion } from "framer-motion";
import FreeAgentFront from "@/components/cards/FreeAgentFront";
import FreeAgentBack from "@/components/cards/FreeAgentBack";
import type { FreeAgentProfile } from "@/types/freeagent";
import { cn } from "@/lib/utils";

interface FreeAgentCardProps {
  profile: FreeAgentProfile;
  className?: string;
  href?: string;
}

export default function FreeAgentCard({ profile, className, href }: FreeAgentCardProps) {
  const [flipped, setFlipped] = useState(false);

  const CardContent = (
    <motion.div
      onClick={() => setFlipped((prev) => !prev)}
      whileHover={{ y: -4, scale: 1.01 }}
      transition={{ type: "spring", stiffness: 220, damping: 22 }}
      className="group relative w-full max-w-[400px] cursor-pointer text-left focus:outline-none focus:ring-2 focus:ring-amber-300/70 focus:ring-offset-2 focus:ring-offset-slate-950 sm:max-w-[420px]"
      aria-label={`View ${profile.name} profile`}
    >
      <motion.div
        animate={{ rotateY: flipped ? 180 : 0 }}
        transition={{ duration: 0.55, ease: "easeInOut" }}
        style={{ transformStyle: "preserve-3d" }}
        className="relative h-[500px] w-full sm:h-[500px]"
      >
        <div className="absolute inset-0 h-full w-full overflow-hidden" style={{ backfaceVisibility: "hidden" }}>
          <FreeAgentFront profile={profile} />
        </div>
        <div className="absolute inset-0 h-full w-full rotate-y-180 overflow-hidden" style={{ backfaceVisibility: "hidden" }}>
          <FreeAgentBack profile={profile} />
        </div>
      </motion.div>
    </motion.div>
  );

  return (
    <div className={cn("flex w-full justify-center", className)}>
      {href ? (
        <Link href={href} className="w-full">
          {CardContent}
        </Link>
      ) : (
        CardContent
      )}
    </div>
  );
}
