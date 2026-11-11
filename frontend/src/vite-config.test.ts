import { afterEach, expect, it, vi } from "vitest";
import type { ProxyOptions, UserConfig } from "vite";

async function alvoDoProxyApi(): Promise<unknown> {
  vi.resetModules();
  const config = (await import("../vite.config")).default as UserConfig;
  return (config.server?.proxy?.["/api"] as ProxyOptions).target;
}

afterEach(() => {
  vi.unstubAllEnvs();
});

it("encaminha /api ao Gateway em 127.0.0.1:8080 por padrão", async () => {
  vi.stubEnv("NEXFLEET_GATEWAY_URL", undefined);
  expect(await alvoDoProxyApi()).toBe("http://127.0.0.1:8080");
});

it("encaminha /api ao Gateway informado em NEXFLEET_GATEWAY_URL", async () => {
  vi.stubEnv("NEXFLEET_GATEWAY_URL", "http://127.0.0.1:18080");
  expect(await alvoDoProxyApi()).toBe("http://127.0.0.1:18080");
});
