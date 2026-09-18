"use client";

import { evaluatePasswordPolicy } from "@/lib/password-policy";

export default function PasswordRequirements({
  password,
  accentClassName = "text-[#0f2744]",
}: {
  password: string;
  accentClassName?: string;
}) {
  const { checks } = evaluatePasswordPolicy(password);

  return (
    <div className="mt-3 space-y-2">
      <p className="text-sm leading-6 text-[#27405f]">
        Password must be at least 10 characters and include an uppercase letter, a number and a symbol.
      </p>
      <ul className="space-y-1" aria-live="polite">
        {checks.map((check) => (
          <li
            key={check.id}
            className={`flex items-center gap-2 text-sm ${check.met ? accentClassName : "text-[#6f7d8f]"}`}
          >
            <span aria-hidden="true">{check.met ? "✓" : "○"}</span>
            <span>
              <span className="sr-only">{check.met ? "Met: " : "Not yet met: "}</span>
              {check.label}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
