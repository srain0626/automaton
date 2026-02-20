import fs from "fs";

export interface EnvironmentInfo {
  type: string;
  sandboxId: string;
}

export function detectEnvironment(): EnvironmentInfo {
  // 1. Check env var
  if (process.env.CONWAY_SANDBOX_ID) {
    return { type: "conway-sandbox", sandboxId: process.env.CONWAY_SANDBOX_ID };
  }

  // 2. Check sandbox config file
  try {
    if (fs.existsSync("/etc/conway/sandbox.json")) {
      const data = JSON.parse(fs.readFileSync("/etc/conway/sandbox.json", "utf-8"));
      if (data.id) {
        return { type: "conway-sandbox", sandboxId: data.id };
      }
    }
  } catch {}

  // 3. Check Docker
  if (fs.existsSync("/.dockerenv")) {
    return { type: "docker", sandboxId: "" };
  }

  // 4. Check Termux (Android terminal emulator)
  if (
    process.env.TERMUX_VERSION ||
    (process.env.PREFIX && process.env.PREFIX.includes("com.termux"))
  ) {
    return { type: "termux", sandboxId: "" };
  }

  // 5. Fall back to platform
  return { type: process.platform, sandboxId: "" };
}
