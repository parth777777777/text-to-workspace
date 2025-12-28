let aiAvailable = true;
let resetAt = getNextResetTime();

function getNextResetTime() {
  const d = new Date();
  d.setHours(24, 0, 0, 0);
  return d.getTime();
}

function maybeReset() {
  if (Date.now() > resetAt) {
    aiAvailable = true;
    resetAt = getNextResetTime();
  }
}

export function canUseAI() {
  maybeReset();
  return aiAvailable;
}

export function markAIUnavailable() {
  aiAvailable = false;
}

export function isQuotaError(err) {
  return (
    err?.status === 429 ||
    err?.code === 429 ||
    err?.message?.includes("RESOURCE_EXHAUSTED") ||
    err?.message?.toLowerCase()?.includes("quota")
  );
}
