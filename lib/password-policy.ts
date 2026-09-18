export const PASSWORD_POLICY_MESSAGE =
  "Password must be at least 10 characters and include an uppercase letter, a number and a symbol.";

export type PasswordRequirementId = "minLength" | "uppercase" | "number" | "symbol";

export type PasswordRequirementCheck = {
  id: PasswordRequirementId;
  label: string;
  met: boolean;
};

export type PasswordPolicyResult = {
  ok: boolean;
  message: string | null;
  checks: PasswordRequirementCheck[];
};

const REQUIREMENT_LABELS: Record<PasswordRequirementId, string> = {
  minLength: "10+ characters",
  uppercase: "Uppercase letter",
  number: "Number",
  symbol: "Symbol",
};

function hasRequiredSymbol(password: string) {
  return /[^A-Za-z0-9\s]/.test(password);
}

export function evaluatePasswordPolicy(password: string): PasswordPolicyResult {
  const value = password ?? "";
  const checks: PasswordRequirementCheck[] = [
    { id: "minLength", label: REQUIREMENT_LABELS.minLength, met: value.length >= 10 },
    { id: "uppercase", label: REQUIREMENT_LABELS.uppercase, met: /[A-Z]/.test(value) },
    { id: "number", label: REQUIREMENT_LABELS.number, met: /[0-9]/.test(value) },
    { id: "symbol", label: REQUIREMENT_LABELS.symbol, met: hasRequiredSymbol(value) },
  ];

  return {
    ok: checks.every((check) => check.met),
    message: checks.every((check) => check.met) ? null : PASSWORD_POLICY_MESSAGE,
    checks,
  };
}

export function getPasswordPolicyError(password: string) {
  return evaluatePasswordPolicy(password).message;
}
