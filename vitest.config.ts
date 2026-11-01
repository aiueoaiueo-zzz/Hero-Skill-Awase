import { defineConfig } from "vitest/config";

// 単体テスト用（Cloudflare プラグインは読み込まない）
export default defineConfig({ test: { include: ["tests/**/*.test.ts"], environment: "node" } });
