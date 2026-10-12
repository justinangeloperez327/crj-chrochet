const origin = process.env.SMOKE_URL || "http://127.0.0.1:3000";
const targets = ["/", "/shop", "/collections", "/login", "/register", "/verify-email", "/forgot-password"];
let failures = 0;
for (const path of targets) {
  try {
    const response = await fetch(new URL(path, origin), { redirect: "manual", signal: AbortSignal.timeout(15000) });
    const ok = response.status >= 200 && response.status < 400;
    console.log(ok ? "PASS" : "FAIL", response.status, path);
    if (!ok) failures++;
  } catch (error) {
    failures++;
    console.error("FAIL", path, error instanceof Error ? error.message : "unknown");
  }
}
const health = await fetch(new URL("/api/health", origin), { signal: AbortSignal.timeout(15000) }).catch(() => null);
console.log(health?.ok ? "READY" : "NOT READY", "health", health?.status ?? "unavailable");
if (process.env.SMOKE_REQUIRE_READY === "1" && !health?.ok) failures++;
if (failures) process.exitCode = 1;
