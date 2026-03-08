/**
 * Provider configuration for AI backends.
 *
 * Supported providers:
 *  - zenmux             → ZenMux aggregator
 *  - dashscope          → Alibaba Cloud DashScope / Bailian
 *  - openai             → OpenAI direct (OPENAI_API_KEY, optional OPENAI_BASE_URL)
 *  - google             → Google Gemini OpenAI-compat (GOOGLE_API_KEY, optional GOOGLE_BASE_URL)
 *  - anthropic          → Anthropic direct OpenAI-compat (ANTHROPIC_API_KEY, optional ANTHROPIC_BASE_URL)
 *  - openai-compatible  → Any third-party OpenAI-compatible service
 *                         (OPENAI_COMPATIBLE_BASE_URL + OPENAI_COMPATIBLE_API_KEY)
 *
 * Environment variables (all server-side only):
 *  OPENAI_API_KEY
 *  OPENAI_BASE_URL               (default: https://api.openai.com/v1)
 *  GOOGLE_API_KEY
 *  GOOGLE_BASE_URL               (default: https://generativelanguage.googleapis.com/v1beta/openai)
 *  ANTHROPIC_API_KEY
 *  ANTHROPIC_BASE_URL            (default: https://api.anthropic.com/v1)
 *  OPENAI_COMPATIBLE_BASE_URL
 *  OPENAI_COMPATIBLE_API_KEY
 */

import type { ProviderName } from "@/types/game";

export interface ProviderConfig {
  /** Full endpoint URL (e.g. https://api.openai.com/v1/chat/completions) */
  endpoint: string;
  /** Resolved API key (empty string if not configured) */
  apiKey: string;
  /**
   * Extra HTTP headers to include beyond Authorization + Content-Type.
   * E.g. Anthropic requires `anthropic-version`.
   */
  extraHeaders?: Record<string, string>;
  /**
   * Whether this provider's key was found (useful for early validation).
   * true  → apiKey is non-empty
   * false → apiKey is empty string
   */
  configured: boolean;
}

// ---------------------------------------------------------------------------
// Defaults
// ---------------------------------------------------------------------------

const OPENAI_DEFAULT_BASE = "https://api.openai.com/v1";
const GOOGLE_DEFAULT_BASE = "https://generativelanguage.googleapis.com/v1beta/openai";
const ANTHROPIC_DEFAULT_BASE = "https://api.anthropic.com/v1";

// Current stable Anthropic API version
const ANTHROPIC_API_VERSION = "2023-06-01";

// ---------------------------------------------------------------------------
// Main resolver (server-side only — reads process.env)
// ---------------------------------------------------------------------------

/**
 * Resolve the runtime config for a given provider.
 *
 * For `zenmux` and `dashscope`, this returns only the endpoint (key resolution
 * is handled separately by the existing header / env-var fallback logic in
 * route.ts to preserve backward compatibility).
 *
 * For `openai`, `google`, `anthropic`, and `openai-compatible`, the API key
 * is read from `process.env` and is server-side only.
 */
export function resolveProviderConfig(provider: ProviderName): ProviderConfig {
  switch (provider) {
    case "zenmux":
      return {
        endpoint: "https://zenmux.ai/api/v1/chat/completions",
        apiKey: process.env.ZENMUX_API_KEY ?? "",
        configured: Boolean(process.env.ZENMUX_API_KEY),
      };

    case "dashscope":
      return {
        endpoint: "https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions",
        apiKey: process.env.DASHSCOPE_API_KEY ?? "",
        configured: Boolean(process.env.DASHSCOPE_API_KEY),
      };

    case "openai": {
      const base = (process.env.OPENAI_BASE_URL ?? OPENAI_DEFAULT_BASE).replace(/\/$/, "");
      const apiKey = process.env.OPENAI_API_KEY ?? "";
      return {
        endpoint: `${base}/chat/completions`,
        apiKey,
        configured: Boolean(apiKey),
      };
    }

    case "google": {
      const base = (process.env.GOOGLE_BASE_URL ?? GOOGLE_DEFAULT_BASE).replace(/\/$/, "");
      const apiKey = process.env.GOOGLE_API_KEY ?? "";
      return {
        endpoint: `${base}/chat/completions`,
        apiKey,
        configured: Boolean(apiKey),
      };
    }

    case "anthropic": {
      const base = (process.env.ANTHROPIC_BASE_URL ?? ANTHROPIC_DEFAULT_BASE).replace(/\/$/, "");
      const apiKey = process.env.ANTHROPIC_API_KEY ?? "";
      return {
        endpoint: `${base}/chat/completions`,
        apiKey,
        extraHeaders: {
          "anthropic-version": ANTHROPIC_API_VERSION,
        },
        configured: Boolean(apiKey),
      };
    }

    case "openai-compatible": {
      const base = (process.env.OPENAI_COMPATIBLE_BASE_URL ?? "").replace(/\/$/, "");
      const apiKey = process.env.OPENAI_COMPATIBLE_API_KEY ?? "";
      return {
        endpoint: base ? `${base}/chat/completions` : "",
        apiKey,
        configured: Boolean(base && apiKey),
      };
    }
  }
}

/**
 * Resolve the list of model IDs for the `openai-compatible` provider.
 *
 * Priority:
 *  1. `OPENAI_COMPATIBLE_MODELS` env var (comma-separated) — if set, use as-is.
 *  2. Fetch from `${OPENAI_COMPATIBLE_BASE_URL}/models` when both BASE_URL and
 *     API_KEY are configured. The endpoint must return an OpenAI-style response:
 *     `{ data: [{ id: "model-id" }, …] }`.
 *  3. Returns an empty array if neither source is available.
 *
 * Server-side only.
 */
export async function fetchOpenAICompatibleModels(): Promise<string[]> {
  // 1. Env var takes priority.
  const fromEnv = (process.env.OPENAI_COMPATIBLE_MODELS ?? "")
    .split(",")
    .map((m) => m.trim())
    .filter(Boolean);
  if (fromEnv.length > 0) return fromEnv;

  // 2. Fetch from the provider's /models endpoint.
  const base = (process.env.OPENAI_COMPATIBLE_BASE_URL ?? "").replace(/\/$/, "");
  const apiKey = process.env.OPENAI_COMPATIBLE_API_KEY ?? "";
  if (!base || !apiKey) return [];

  try {
    const res = await fetch(`${base}/models`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      // Avoid hanging the request for too long during page load / status checks.
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) return [];
    const json = (await res.json()) as { data?: Array<{ id: string }> };
    return (json.data ?? []).map((m) => m.id).filter(Boolean);
  } catch {
    // Network error, timeout, or malformed JSON — fall back to empty list.
    return [];
  }
}

/**
 * Whether a given provider is one of the three direct-connect providers or
 * an openai-compatible endpoint (i.e. NOT zenmux / dashscope).
 * Used to skip ZenMux-specific request shaping (reasoning fields, etc.).
 */
export function isOpenAICompatibleProvider(provider: ProviderName): boolean {
  return (
    provider === "openai" ||
    provider === "google" ||
    provider === "anthropic" ||
    provider === "openai-compatible"
  );
}
