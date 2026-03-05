import { NextRequest, NextResponse } from "next/server";
import { ALL_MODELS, AVAILABLE_MODELS, type ProviderName } from "@/types/game";
import { resolveProviderConfig, isOpenAICompatibleProvider } from "@/lib/provider-config";

// API 调用超时时间（毫秒）
const API_TIMEOUT_MS = 60000;

function getProviderForModel(model: string): ProviderName | null {
  const modelRef =
    ALL_MODELS.find((ref) => ref.model === model) ??
    AVAILABLE_MODELS.find((ref) => ref.model === model);
  return modelRef?.provider ?? null;
}

/** Resolve ModelRef for a model id; used to apply per-model temperature/reasoning overrides. */
function getModelRef(model: string): (typeof AVAILABLE_MODELS)[number] | (typeof ALL_MODELS)[number] | undefined {
  return ALL_MODELS.find((ref) => ref.model === model) ?? AVAILABLE_MODELS.find((ref) => ref.model === model);
}

function normalizeDashscopeModelName(model: string): string {
  return model.replace(/^qwen\//i, "");
}

// Models that support explicit cache_control parameter
// Per ZenMux docs: only Anthropic Claude and Qwen series support explicit caching
function supportsExplicitCaching(model: string): boolean {
  if (!model) return false;
  const lower = model.toLowerCase();
  return lower.startsWith("anthropic/") || lower.startsWith("qwen/");
}

// Models that support multipart message format (content as array)
function supportsMultipartContent(model: string, provider?: ProviderName): boolean {
  // Direct-connect providers all accept OpenAI-format multipart content
  if (provider && isOpenAICompatibleProvider(provider)) return true;
  if (!model) return false;
  const lower = model.toLowerCase();
  // Known models that support multipart content (via zenmux/dashscope routing)
  if (lower.startsWith("openai/")) return true;
  if (lower.startsWith("google/")) return true;
  if (lower.startsWith("anthropic/")) return true;
  if (lower.startsWith("deepseek/")) return true;
  if (lower.startsWith("qwen/")) return true;
  if (lower.startsWith("moonshotai/")) return true;
  // z-ai/glm, volcengine/doubao may NOT support multipart - flatten to string
  return false;
}

// Models that support response_format parameter
function supportsResponseFormat(model: string, provider?: ProviderName): boolean {
  // Direct-connect providers all support response_format
  if (provider && isOpenAICompatibleProvider(provider)) return true;
  if (!model) return false;
  const lower = model.toLowerCase();
  // Known supported models (via zenmux routing)
  if (lower.startsWith("openai/")) return true;
  if (lower.startsWith("google/")) return true;
  if (lower.startsWith("anthropic/")) return true;
  if (lower.startsWith("deepseek/")) return true;
  if (lower.startsWith("qwen/")) return true;
  if (lower.startsWith("moonshotai/")) return true;
  // Models that may NOT support response_format - be conservative
  // z-ai/glm, volcengine/doubao, etc. - skip response_format to avoid errors
  return false;
}

// Flatten multipart content to plain string for models that don't support it
function flattenMultipartContent(messages: unknown[]): unknown[] {
  if (!Array.isArray(messages)) return messages;

  return messages.map((msg) => {
    if (!msg || typeof msg !== "object") return msg;
    const m = msg as Record<string, unknown>;

    // If content is an array, flatten to string
    if (Array.isArray(m.content)) {
      const textParts = m.content
        .filter((part): part is { type: string; text: string } =>
          part && typeof part === "object" && (part as { type?: string }).type === "text"
        )
        .map((part) => part.text || "")
        .filter(Boolean);
      
      return { ...m, content: textParts.join("\n\n") };
    }

    return m;
  });
}

function hasJsonHintInMessages(messages: unknown[]): boolean {
  if (!Array.isArray(messages)) return false;

  const contains = (value: unknown): boolean => {
    if (typeof value === "string") return /json/i.test(value);
    if (Array.isArray(value)) return value.some(contains);
    if (!value || typeof value !== "object") return false;
    const obj = value as Record<string, unknown>;
    if ("text" in obj && typeof obj.text === "string") return /json/i.test(obj.text);
    if ("content" in obj) return contains(obj.content);
    return false;
  };

  return messages.some((m) => contains(m));
}

function withDashscopeJsonHint(messages: unknown[]): unknown[] {
  if (!Array.isArray(messages)) return messages;
  if (hasJsonHintInMessages(messages)) return messages;
  return [{ role: "system", content: "Respond in json." }, ...messages];
}

// Strip cache_control from message content parts for models that don't support it
function stripCacheControl(messages: unknown[]): unknown[] {
  if (!Array.isArray(messages)) return messages;

  return messages.map((msg) => {
    if (!msg || typeof msg !== "object") return msg;
    const m = msg as Record<string, unknown>;

    // If content is an array (multipart), strip cache_control from each part
    if (Array.isArray(m.content)) {
      const strippedContent = m.content.map((part) => {
        if (part && typeof part === "object" && "cache_control" in part) {
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          const { cache_control, ...rest } = part as Record<string, unknown>;
          return rest;
        }
        return part;
      });
      return { ...m, content: strippedContent };
    }

    return m;
  });
}

// ZenMux reasoning: only enabled, effort, max_tokens (see docs.zenmux.ai/guide/advanced/reasoning.html)
type ReasoningPayload = {
  enabled: boolean;
  effort?: "minimal" | "low" | "medium" | "high";
  max_tokens?: number;
};

type ReasoningEffort = NonNullable<ReasoningPayload["effort"]>;
const ALLOWED_REASONING_EFFORT = new Set<ReasoningEffort>(["minimal", "low", "medium", "high"]);

function isReasoningEffort(value: unknown): value is ReasoningEffort {
  return typeof value === "string" && ALLOWED_REASONING_EFFORT.has(value as ReasoningEffort);
}

/** Build ZenMux request reasoning object (no unsupported fields like exclude). */
function toZenMuxReasoning(
  r: { enabled?: boolean; effort?: string; max_tokens?: number } | undefined
): { enabled: boolean; effort?: string; max_tokens?: number } {
  if (r?.enabled === true) {
    return {
      enabled: true,
      ...(r.effort != null && { effort: r.effort }),
      ...(typeof r.max_tokens === "number" && Number.isFinite(r.max_tokens) && { max_tokens: r.max_tokens }),
    };
  }
  return { enabled: false };
}

type ChatRequestPayload = {
  model: string;
  messages: unknown[];
  temperature?: number;
  max_tokens?: number;
  stream?: boolean;
  reasoning?: ReasoningPayload;
  reasoning_effort?: "minimal" | "low" | "medium" | "high";
  response_format?: unknown;
  provider?: ProviderName;
};

/**
 * Generic helper for any OpenAI-compatible endpoint
 * (openai, google, anthropic, openai-compatible).
 * Returns the raw fetch Response so the caller can handle stream vs JSON.
 */
async function fetchOpenAICompatible(
  endpoint: string,
  apiKey: string,
  extraHeaders: Record<string, string> | undefined,
  body: Record<string, unknown>,
  signal: AbortSignal
): Promise<Response> {
  return fetch(endpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      ...extraHeaders,
    },
    body: JSON.stringify(body),
    signal,
  });
}

async function runBatchItem(
  payload: ChatRequestPayload,
  headerApiKey: string | null,
  headerDashscopeKey: string | null
): Promise<{ ok: true; data: unknown } | { ok: false; status: number; error: string; details?: unknown }> {
  const {
    model,
    messages,
    temperature,
    max_tokens,
    stream,
    reasoning,
    reasoning_effort,
    response_format,
    provider,
  } = payload;

  if (stream) {
    return { ok: false, status: 400, error: "Batch request does not support stream=true" };
  }

  const modelProvider: ProviderName | null = provider ?? getProviderForModel(model);
  if (!modelProvider) {
    return { ok: false, status: 400, error: `Unknown model: ${String(model ?? "").trim() || "unknown"}` };
  }

  const isDefaultModel = AVAILABLE_MODELS.some((ref) => ref.model === model);
  const hasAnyCustomKeyHeader = Boolean((headerApiKey ?? "").trim() || (headerDashscopeKey ?? "").trim());

  // For legacy providers (zenmux/dashscope), enforce user key requirements
  if (!isDefaultModel) {
    if (modelProvider === "zenmux" && !headerApiKey) {
      return { ok: false, status: 401, error: "此模型需要您提供 Zenmux API Key" };
    }
    if (modelProvider === "dashscope" && !headerDashscopeKey) {
      return { ok: false, status: 401, error: "此模型需要您提供百炼 API Key" };
    }
  }

  const modelRefOverride = getModelRef(model);
  const normalizedTemperature =
    modelRefOverride?.temperature !== undefined
      ? modelRefOverride.temperature
      : (typeof temperature === "number" && Number.isFinite(temperature) ? temperature : 0.7);
  // ZenMux and Moonshot/Kimi require temperature in [0, 1]; other providers allow up to 2
  const cappedTemperature = (() => {
    const lower = typeof model === "string" ? model.toLowerCase() : "";
    const needZeroOne =
      modelProvider === "zenmux" ||
      lower.startsWith("moonshotai/") ||
      lower.includes("kimi");
    if (needZeroOne) return Math.min(Math.max(0, normalizedTemperature), 1);
    return Math.max(0, normalizedTemperature);
  })();
  const effectiveReasoning = modelRefOverride?.reasoning !== undefined ? modelRefOverride.reasoning : reasoning;

  let processedMessages: unknown[] = messages;
  if (!supportsMultipartContent(model, modelProvider)) {
    processedMessages = flattenMultipartContent(processedMessages);
  } else if (modelProvider === "dashscope" || isOpenAICompatibleProvider(modelProvider)) {
    // Dashscope and direct-connect providers use OpenAI-compat but don't understand cache_control
    processedMessages = stripCacheControl(processedMessages);
  } else if (!supportsExplicitCaching(model)) {
    processedMessages = stripCacheControl(processedMessages);
  }

  // ── DashScope ────────────────────────────────────────────────────────────────
  if (modelProvider === "dashscope") {
    if (hasAnyCustomKeyHeader && !headerDashscopeKey) {
      return { ok: false, status: 401, error: "已启用自定义 Key，但未提供百炼 API Key（已拒绝回退到系统 Key）" };
    }
    const dashscopeApiKey = headerDashscopeKey || process.env.DASHSCOPE_API_KEY;
    if (!dashscopeApiKey) {
      return { ok: false, status: 500, error: "DASHSCOPE_API_KEY not configured on server" };
    }
    const cfg = resolveProviderConfig("dashscope");
    const normalizedModel = normalizeDashscopeModelName(model);
    const normalizedResponseFormat = response_format as { type?: unknown } | undefined;
    const dashscopeMessages =
      normalizedResponseFormat?.type === "json_object"
        ? withDashscopeJsonHint(processedMessages)
        : processedMessages;
    const requestBody: Record<string, unknown> = {
      model: normalizedModel,
      messages: dashscopeMessages,
      temperature: cappedTemperature,
    };
    if (typeof max_tokens === "number" && Number.isFinite(max_tokens)) {
      requestBody.max_tokens = Math.max(16, Math.floor(max_tokens));
    }
    if (response_format) requestBody.response_format = response_format;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT_MS);
    let response: Response;
    try {
      response = await fetchOpenAICompatible(cfg.endpoint, dashscopeApiKey, undefined, requestBody, controller.signal);
    } finally {
      clearTimeout(timeoutId);
    }
    if (!response.ok) {
      const errorText = await response.text();
      let parsed: unknown;
      try { parsed = JSON.parse(errorText); } catch { /* ignore */ }
      return { ok: false, status: response.status, error: `DashScope API error: ${response.status}`, details: parsed ?? errorText };
    }
    return { ok: true, data: await response.json() };
  }

  // ── OpenAI / Google / Anthropic / openai-compatible ──────────────────────────
  if (isOpenAICompatibleProvider(modelProvider)) {
    const cfg = resolveProviderConfig(modelProvider);
    if (!cfg.configured) {
      return { ok: false, status: 500, error: `${modelProvider.toUpperCase()}_API_KEY not configured on server` };
    }
    if (!cfg.endpoint) {
      return { ok: false, status: 500, error: `Endpoint URL not configured for provider: ${modelProvider}` };
    }
    const requestBody: Record<string, unknown> = {
      model,
      messages: processedMessages,
      temperature: cappedTemperature,
    };
    if (typeof max_tokens === "number" && Number.isFinite(max_tokens)) {
      requestBody.max_tokens = Math.max(16, Math.floor(max_tokens));
    }
    if (response_format && supportsResponseFormat(model, modelProvider)) {
      requestBody.response_format = response_format;
    }
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT_MS);
    let response: Response;
    try {
      response = await fetchOpenAICompatible(cfg.endpoint, cfg.apiKey, cfg.extraHeaders, requestBody, controller.signal);
    } finally {
      clearTimeout(timeoutId);
    }
    if (!response.ok) {
      const errorText = await response.text();
      let parsed: unknown;
      try { parsed = JSON.parse(errorText); } catch { /* ignore */ }
      return { ok: false, status: response.status, error: `${modelProvider} API error: ${response.status}`, details: parsed ?? errorText };
    }
    return { ok: true, data: await response.json() };
  }

  // ── ZenMux (default) ─────────────────────────────────────────────────────────
  if (hasAnyCustomKeyHeader && !headerApiKey) {
    return { ok: false, status: 401, error: "已启用自定义 Key，但未提供 Zenmux API Key（已拒绝回退到系统 Key）" };
  }
  const apiKey = headerApiKey || process.env.ZENMUX_API_KEY;
  if (!apiKey) {
    return { ok: false, status: 500, error: "ZENMUX_API_KEY not configured on server" };
  }
  const zenmuxCfg = resolveProviderConfig("zenmux");
  const requestBody: Record<string, unknown> = {
    model,
    messages: processedMessages,
    temperature: cappedTemperature,
  };
  if (typeof max_tokens === "number" && Number.isFinite(max_tokens)) {
    requestBody.max_tokens = Math.max(16, Math.floor(max_tokens));
  }
  const reasoningEffort = isReasoningEffort(reasoning_effort) ? reasoning_effort : undefined;
  const reasoningToUse = effectiveReasoning ?? reasoning;
  if (reasoningToUse !== undefined) {
    requestBody.reasoning = toZenMuxReasoning(reasoningToUse);
  } else if (reasoningEffort) {
    requestBody.reasoning_effort = reasoningEffort;
  } else {
    requestBody.reasoning = { enabled: false };
  }
  if (response_format && supportsResponseFormat(model)) {
    requestBody.response_format = response_format;
  }
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT_MS);
  let response: Response;
  try {
    response = await fetchOpenAICompatible(zenmuxCfg.endpoint, apiKey, undefined, requestBody, controller.signal);
  } finally {
    clearTimeout(timeoutId);
  }
  if (!response.ok) {
    const errorText = await response.text();
    return { ok: false, status: response.status, error: `ZenMux API error: ${response.status} - ${errorText}` };
  }
  return { ok: true, data: await response.json() };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    if (Array.isArray(body?.requests)) {
      const headerApiKey = request.headers.get("x-zenmux-api-key")?.trim() || null;
      const headerDashscopeKey = request.headers.get("x-dashscope-api-key")?.trim() || null;
      const requests = body.requests as ChatRequestPayload[];
      const results = await Promise.all(
        requests.map((req) => runBatchItem(req, headerApiKey, headerDashscopeKey))
      );
      return NextResponse.json({ results });
    }
    const {
      model,
      messages,
      temperature,
      max_tokens,
      stream,
      reasoning,
      reasoning_effort,
      response_format,
      provider,
    } = body;
    const modelProvider: ProviderName | null = provider ?? getProviderForModel(model);
    if (!modelProvider) {
      return NextResponse.json(
        { error: `Unknown model: ${String(model ?? "").trim() || "unknown"}` },
        { status: 400 }
      );
    }
    const headerApiKey = request.headers.get("x-zenmux-api-key")?.trim();
    const headerDashscopeKey = request.headers.get("x-dashscope-api-key")?.trim();
    const hasAnyCustomKeyHeader = Boolean((headerApiKey ?? "").trim() || (headerDashscopeKey ?? "").trim());
    const isDefaultModel = AVAILABLE_MODELS.some((ref) => ref.model === model);

    const modelRefOverride = getModelRef(model);
    const normalizedTemperature =
      modelRefOverride?.temperature !== undefined
        ? modelRefOverride.temperature
        : (typeof temperature === "number" && Number.isFinite(temperature) ? temperature : 0.7);
    // ZenMux and Moonshot/Kimi require temperature in [0, 1]; other providers allow up to 2
    const cappedTemperature = (() => {
      const lower = typeof model === "string" ? model.toLowerCase() : "";
      const needZeroOne =
        modelProvider === "zenmux" ||
        lower.startsWith("moonshotai/") ||
        lower.includes("kimi");
      if (needZeroOne) return Math.min(Math.max(0, normalizedTemperature), 1);
      return Math.max(0, normalizedTemperature);
    })();
    const effectiveReasoning = modelRefOverride?.reasoning !== undefined ? modelRefOverride.reasoning : reasoning;

    let processedMessages = messages;
    if (!supportsMultipartContent(model, modelProvider)) {
      processedMessages = flattenMultipartContent(processedMessages);
    } else if (modelProvider === "dashscope" || isOpenAICompatibleProvider(modelProvider)) {
      // Dashscope and direct-connect providers use OpenAI-compat but don't understand cache_control
      processedMessages = stripCacheControl(processedMessages);
    } else if (!supportsExplicitCaching(model)) {
      processedMessages = stripCacheControl(processedMessages);
    }

    // For legacy providers (zenmux/dashscope), enforce user key requirements on non-default models
    if (!isDefaultModel) {
      if (modelProvider === "zenmux" && !headerApiKey) {
        return NextResponse.json({ error: "此模型需要您提供 Zenmux API Key" }, { status: 401 });
      }
      if (modelProvider === "dashscope" && !headerDashscopeKey) {
        return NextResponse.json({ error: "此模型需要您提供百炼 API Key" }, { status: 401 });
      }
    }

    // ── DashScope ──────────────────────────────────────────────────────────────
    if (modelProvider === "dashscope") {
      if (hasAnyCustomKeyHeader && !headerDashscopeKey) {
        return NextResponse.json(
          { error: "已启用自定义 Key，但未提供百炼 API Key（已拒绝回退到系统 Key）" },
          { status: 401 }
        );
      }
      const dashscopeApiKey = headerDashscopeKey || process.env.DASHSCOPE_API_KEY;
      if (!dashscopeApiKey) {
        return NextResponse.json({ error: "DASHSCOPE_API_KEY not configured on server" }, { status: 500 });
      }
      const cfg = resolveProviderConfig("dashscope");
      const normalizedModel = normalizeDashscopeModelName(model);
      const normalizedResponseFormat = response_format as { type?: unknown } | undefined;
      const dashscopeMessages =
        normalizedResponseFormat?.type === "json_object"
          ? withDashscopeJsonHint(processedMessages)
          : processedMessages;
      const requestBody: Record<string, unknown> = {
        model: normalizedModel,
        messages: dashscopeMessages,
        temperature: cappedTemperature,
      };
      if (typeof max_tokens === "number" && Number.isFinite(max_tokens)) {
        requestBody.max_tokens = Math.max(16, Math.floor(max_tokens));
      }
      if (stream) requestBody.stream = true;
      if (response_format) requestBody.response_format = response_format;

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT_MS);
      let response: Response;
      try {
        response = await fetchOpenAICompatible(cfg.endpoint, dashscopeApiKey, undefined, requestBody, controller.signal);
      } finally {
        clearTimeout(timeoutId);
      }
      if (!response.ok) {
        const errorText = await response.text();
        let parsed: unknown;
        try { parsed = JSON.parse(errorText); } catch { /* ignore */ }
        return NextResponse.json(
          { error: `DashScope API error: ${response.status}`, details: parsed ?? errorText },
          { status: response.status }
        );
      }
      if (stream) {
        const headers = new Headers();
        headers.set("Content-Type", "text/event-stream");
        headers.set("Cache-Control", "no-cache");
        headers.set("Connection", "keep-alive");
        return new Response(response.body, { headers });
      }
      return NextResponse.json(await response.json());
    }

    // ── OpenAI / Google / Anthropic / openai-compatible ────────────────────────
    if (isOpenAICompatibleProvider(modelProvider)) {
      const cfg = resolveProviderConfig(modelProvider);
      if (!cfg.configured) {
        return NextResponse.json(
          { error: `${modelProvider.toUpperCase().replace(/-/g, "_")}_API_KEY not configured on server` },
          { status: 500 }
        );
      }
      if (!cfg.endpoint) {
        return NextResponse.json(
          { error: `Endpoint URL not configured for provider: ${modelProvider}` },
          { status: 500 }
        );
      }
      const requestBody: Record<string, unknown> = {
        model,
        messages: processedMessages,
        temperature: cappedTemperature,
      };
      if (typeof max_tokens === "number" && Number.isFinite(max_tokens)) {
        requestBody.max_tokens = Math.max(16, Math.floor(max_tokens));
      }
      if (stream) requestBody.stream = true;
      if (response_format && supportsResponseFormat(model, modelProvider)) {
        requestBody.response_format = response_format;
      }
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT_MS);
      let response: Response;
      try {
        response = await fetchOpenAICompatible(cfg.endpoint, cfg.apiKey, cfg.extraHeaders, requestBody, controller.signal);
      } finally {
        clearTimeout(timeoutId);
      }
      if (!response.ok) {
        const errorText = await response.text();
        let parsed: unknown;
        try { parsed = JSON.parse(errorText); } catch { /* ignore */ }
        return NextResponse.json(
          { error: `${modelProvider} API error: ${response.status}`, details: parsed ?? errorText },
          { status: response.status }
        );
      }
      if (stream) {
        const headers = new Headers();
        headers.set("Content-Type", "text/event-stream");
        headers.set("Cache-Control", "no-cache");
        headers.set("Connection", "keep-alive");
        return new Response(response.body, { headers });
      }
      return NextResponse.json(await response.json());
    }

    // ── ZenMux (default) ───────────────────────────────────────────────────────
    if (hasAnyCustomKeyHeader && !headerApiKey) {
      return NextResponse.json(
        { error: "已启用自定义 Key，但未提供 Zenmux API Key（已拒绝回退到系统 Key）" },
        { status: 401 }
      );
    }
    const apiKey = headerApiKey || process.env.ZENMUX_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "ZENMUX_API_KEY not configured on server" }, { status: 500 });
    }
    const zenmuxCfg = resolveProviderConfig("zenmux");
    const requestBody: Record<string, unknown> = {
      model,
      messages: processedMessages,
      temperature: cappedTemperature,
    };
    if (typeof max_tokens === "number" && Number.isFinite(max_tokens)) {
      requestBody.max_tokens = Math.max(16, Math.floor(max_tokens));
    }
    if (stream) requestBody.stream = true;
    const reasoningEffort = isReasoningEffort(reasoning_effort) ? reasoning_effort : undefined;
    const reasoningToUse = effectiveReasoning ?? reasoning;
    if (reasoningToUse !== undefined) {
      requestBody.reasoning = toZenMuxReasoning(reasoningToUse);
    } else if (reasoningEffort) {
      requestBody.reasoning_effort = reasoningEffort;
    } else {
      requestBody.reasoning = { enabled: false };
    }
    if (response_format && supportsResponseFormat(model)) {
      requestBody.response_format = response_format;
    }
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT_MS);
    let response: Response;
    try {
      response = await fetchOpenAICompatible(zenmuxCfg.endpoint, apiKey, undefined, requestBody, controller.signal);
    } finally {
      clearTimeout(timeoutId);
    }
    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json(
        { error: `ZenMux API error: ${response.status} - ${errorText}` },
        { status: response.status }
      );
    }
    if (stream) {
      const headers = new Headers();
      headers.set("Content-Type", "text/event-stream");
      headers.set("Cache-Control", "no-cache");
      headers.set("Connection", "keep-alive");
      return new Response(response.body, { headers });
    }
    return NextResponse.json(await response.json());
  } catch (error) {
    console.error("[api/chat] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
