import { ALL_MODELS, AVAILABLE_MODELS, GENERATOR_MODEL, SUMMARY_MODEL, REVIEW_MODEL, type ProviderName } from "@/types/game";

const ZENMUX_API_KEY_STORAGE = "wolfcha_zenmux_api_key";
const DASHSCOPE_API_KEY_STORAGE = "wolfcha_dashscope_api_key";
const MINIMAX_API_KEY_STORAGE = "wolfcha_minimax_api_key";
const MINIMAX_GROUP_ID_STORAGE = "wolfcha_minimax_group_id";
const CUSTOM_KEY_ENABLED_STORAGE = "wolfcha_custom_key_enabled";
const SELECTED_MODELS_STORAGE = "wolfcha_selected_models";
const GENERATOR_MODEL_STORAGE = "wolfcha_generator_model";
const SUMMARY_MODEL_STORAGE = "wolfcha_summary_model";
const REVIEW_MODEL_STORAGE = "wolfcha_review_model";
const VALIDATED_ZENMUX_KEY_STORAGE = "wolfcha_validated_zenmux_key";
const VALIDATED_DASHSCOPE_KEY_STORAGE = "wolfcha_validated_dashscope_key";
/** Project-level player model selection (no user API key required). */
const PLAYER_MODEL_SELECTION_STORAGE = "wolfcha_player_model_selection";
const SYSTEM_ONLY_MODELS_STORAGE = "wolfcha_system_only_models";

function canUseStorage(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function readStorage(key: string): string {
  if (!canUseStorage()) return "";
  const value = window.localStorage.getItem(key);
  return typeof value === "string" ? value.trim() : "";
}

function writeStorage(key: string, value: string) {
  if (!canUseStorage()) return;
  const trimmed = value.trim();
  if (!trimmed) {
    window.localStorage.removeItem(key);
    return;
  }
  window.localStorage.setItem(key, trimmed);
}

export function getZenmuxApiKey(): string {
  return readStorage(ZENMUX_API_KEY_STORAGE);
}

export function setZenmuxApiKey(key: string) {
  writeStorage(ZENMUX_API_KEY_STORAGE, key);
}

export function getMinimaxApiKey(): string {
  return readStorage(MINIMAX_API_KEY_STORAGE);
}

export function getDashscopeApiKey(): string {
  return readStorage(DASHSCOPE_API_KEY_STORAGE);
}

export function setMinimaxApiKey(key: string) {
  writeStorage(MINIMAX_API_KEY_STORAGE, key);
}

export function setDashscopeApiKey(key: string) {
  writeStorage(DASHSCOPE_API_KEY_STORAGE, key);
}

export function getMinimaxGroupId(): string {
  return readStorage(MINIMAX_GROUP_ID_STORAGE);
}

export function setMinimaxGroupId(id: string) {
  writeStorage(MINIMAX_GROUP_ID_STORAGE, id);
}

export function hasZenmuxKey(): boolean {
  return Boolean(getZenmuxApiKey());
}

export function getValidatedZenmuxKey(): string {
  return readStorage(VALIDATED_ZENMUX_KEY_STORAGE);
}

export function setValidatedZenmuxKey(key: string) {
  writeStorage(VALIDATED_ZENMUX_KEY_STORAGE, key);
}

export function getValidatedDashscopeKey(): string {
  return readStorage(VALIDATED_DASHSCOPE_KEY_STORAGE);
}

export function setValidatedDashscopeKey(key: string) {
  writeStorage(VALIDATED_DASHSCOPE_KEY_STORAGE, key);
}

export function hasDashscopeKey(): boolean {
  return Boolean(getDashscopeApiKey());
}

export function hasMinimaxKey(): boolean {
  return Boolean(getMinimaxApiKey()) && Boolean(getMinimaxGroupId());
}

// When custom key is disabled, use a model from AVAILABLE_MODELS so the server
// can use its built-in API keys (no user x-zenmux-api-key header).
function resolveDefaultModelWhenCustomDisabled(fallbackDefault: string): string {
  const builtin =
    AVAILABLE_MODELS.find((r) => r.provider === "zenmux") ?? AVAILABLE_MODELS[0];
  return builtin?.model ?? fallbackDefault;
}

// When custom key is enabled, keep model within providers that have keys.
// Note: openai/google/anthropic/openai-compatible are server-side only and are
// always considered available when custom key mode is on.
function resolveModelWhenCustomEnabled(preferred: string, fallbackPreferred: string): string {
  const allowedProviders = new Set<ProviderName>();
  if (hasZenmuxKey()) allowedProviders.add("zenmux");
  if (hasDashscopeKey()) allowedProviders.add("dashscope");
  // Server-side providers are always available (key managed via env vars, not user input)
  allowedProviders.add("openai");
  allowedProviders.add("google");
  allowedProviders.add("anthropic");
  allowedProviders.add("openai-compatible");

  if (allowedProviders.size === 0) return preferred;

  const allowedPool = ALL_MODELS.filter((ref) => allowedProviders.has(ref.provider));
  if (allowedPool.length === 0) return preferred;

  const allowedSet = new Set(allowedPool.map((ref) => ref.model));
  if (preferred && allowedSet.has(preferred)) return preferred;
  if (fallbackPreferred && allowedSet.has(fallbackPreferred)) return fallbackPreferred;
  return allowedPool[0].model;
}

function resolveModelForCurrentKeyState(
  storedValue: string,
  fallbackValue: string,
  storageKey: string
): string {
  // When custom key is disabled, always use system default - ignore user's stored selection
  if (!isCustomKeyEnabled()) {
    return resolveDefaultModelWhenCustomDisabled(fallbackValue);
  }

  // When custom key is enabled, use user's stored selection (or fallback if not set)
  const base = storedValue || fallbackValue;
  const resolved = resolveModelWhenCustomEnabled(base, fallbackValue);
  if (resolved !== base) {
    writeStorage(storageKey, resolved);
  }
  return resolved;
}

export function isCustomKeyEnabled(): boolean {
  if (!canUseStorage()) return false;
  const flagEnabled = window.localStorage.getItem(CUSTOM_KEY_ENABLED_STORAGE) === "true";
  if (!flagEnabled) return false;
  // 额外安全检查：即使标志位为 true，如果没有任何有效的 LLM API key，也返回 false
  // 这可以防止用户开启了开关但没有正确配置 key 的情况
  const hasAnyLLMKey = hasZenmuxKey() || hasDashscopeKey();
  return hasAnyLLMKey;
}

export function setCustomKeyEnabled(value: boolean) {
  if (!canUseStorage()) return;
  window.localStorage.setItem(CUSTOM_KEY_ENABLED_STORAGE, value ? "true" : "false");
}

export function getSelectedModels(): string[] {
  if (!canUseStorage()) return [];
  const raw = window.localStorage.getItem(SELECTED_MODELS_STORAGE);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.map((item) => String(item ?? "").trim()).filter(Boolean);
  } catch {
    return [];
  }
}

export function setSelectedModels(models: string[]) {
  if (!canUseStorage()) return;
  const normalized = models.map((m) => String(m ?? "").trim()).filter(Boolean);
  if (normalized.length === 0) {
    window.localStorage.removeItem(SELECTED_MODELS_STORAGE);
    return;
  }
  window.localStorage.setItem(SELECTED_MODELS_STORAGE, JSON.stringify(normalized));
}

// Deprecated Zenmux model ID that no longer exists; migrate to valid one
const DEPRECATED_GENERATOR_MODEL = "google/gemini-2.5-flash-lite-preview-09-2025";

/** Returns true if the model belongs to a server-direct provider (openai/google/anthropic/openai-compatible).
 *  These providers use server env var keys and are always available regardless of client-side custom key state.
 */
function isServerDirectModel(model: string): boolean {
  const ref = ALL_MODELS.find((r) => r.model === model);
  return (
    ref != null &&
    (ref.provider === "openai" ||
      ref.provider === "google" ||
      ref.provider === "anthropic" ||
      ref.provider === "openai-compatible")
  );
}

/**
 * When custom key is disabled but only server-direct providers are available
 * (e.g. only OPENAI_API_KEY is set), derive a usable model from the player selection
 * so that utility calls (generation/summary/review) also route to a working provider.
 */
function findServerDirectFallback(): string | null {
  const playerSelection = getPlayerModelSelection();
  for (const m of playerSelection) {
    if (isServerDirectModel(m)) return m;
    // Dynamic models (not in any built-in list) are openai-compatible and use server env keys
    if (!ALL_MODELS.some((r) => r.model === m)) return m;
  }
  return null;
}

export function getGeneratorModel(): string {
  if (!isCustomKeyEnabled()) {
    // Honor an explicitly stored server-direct model (supports server-only deployments).
    const stored = readStorage(GENERATOR_MODEL_STORAGE);
    if (stored && stored !== DEPRECATED_GENERATOR_MODEL) {
      if (isServerDirectModel(stored)) return stored;
      // Dynamic model (not in any built-in list) → openai-compatible, server-managed key
      if (!ALL_MODELS.some((r) => r.model === stored)) return stored;
    }
    // Fall back to a server-direct model from the player selection when built-in providers
    // (DashScope/Zenmux) are not configured on the server.
    return findServerDirectFallback() ?? GENERATOR_MODEL;
  }
  const stored = readStorage(GENERATOR_MODEL_STORAGE);
  if (stored === DEPRECATED_GENERATOR_MODEL) {
    writeStorage(GENERATOR_MODEL_STORAGE, GENERATOR_MODEL);
    return GENERATOR_MODEL;
  }
  return resolveModelForCurrentKeyState(stored, GENERATOR_MODEL, GENERATOR_MODEL_STORAGE);
}

export function setGeneratorModel(model: string) {
  writeStorage(GENERATOR_MODEL_STORAGE, model);
}

export function getSummaryModel(): string {
  if (!isCustomKeyEnabled()) {
    // Honor an explicitly stored server-direct model.
    const stored = readStorage(SUMMARY_MODEL_STORAGE);
    if (stored && stored !== DEPRECATED_GENERATOR_MODEL) {
      if (isServerDirectModel(stored)) return stored;
      if (!ALL_MODELS.some((r) => r.model === stored)) return stored;
    }
    return findServerDirectFallback() ?? SUMMARY_MODEL;
  }
  const stored = readStorage(SUMMARY_MODEL_STORAGE);
  if (stored === DEPRECATED_GENERATOR_MODEL) {
    writeStorage(SUMMARY_MODEL_STORAGE, SUMMARY_MODEL);
    return SUMMARY_MODEL;
  }
  return resolveModelForCurrentKeyState(stored, SUMMARY_MODEL, SUMMARY_MODEL_STORAGE);
}

export function setSummaryModel(model: string) {
  writeStorage(SUMMARY_MODEL_STORAGE, model);
}

export function getReviewModel(): string {
  if (!isCustomKeyEnabled()) {
    // Honor an explicitly stored server-direct model.
    const stored = readStorage(REVIEW_MODEL_STORAGE);
    if (stored) {
      if (isServerDirectModel(stored)) return stored;
      if (!ALL_MODELS.some((r) => r.model === stored)) return stored;
    }
    return findServerDirectFallback() ?? REVIEW_MODEL;
  }
  const stored = readStorage(REVIEW_MODEL_STORAGE);
  return resolveModelForCurrentKeyState(stored, REVIEW_MODEL, REVIEW_MODEL_STORAGE);
}

export function setReviewModel(model: string) {
  writeStorage(REVIEW_MODEL_STORAGE, model);
}

/** Returns the raw stored generator model preference (empty string = auto/not set). */
export function getGeneratorModelPreference(): string {
  return readStorage(GENERATOR_MODEL_STORAGE);
}

/** Returns the raw stored summary model preference (empty string = auto/not set). */
export function getSummaryModelPreference(): string {
  return readStorage(SUMMARY_MODEL_STORAGE);
}

/** Returns the raw stored review model preference (empty string = auto/not set). */
export function getReviewModelPreference(): string {
  return readStorage(REVIEW_MODEL_STORAGE);
}

/**
 * Project-level player model selection (used when custom key is NOT enabled).
 * Stores model strings selected by the user in the Model Settings panel.
 * An empty array means "use all available models from enabled providers".
 */
export function getPlayerModelSelection(): string[] {
  if (!canUseStorage()) return [];
  const raw = window.localStorage.getItem(PLAYER_MODEL_SELECTION_STORAGE);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.map((item) => String(item ?? "").trim()).filter(Boolean);
  } catch {
    return [];
  }
}

export function setPlayerModelSelection(models: string[]) {
  if (!canUseStorage()) return;
  const normalized = models.map((m) => String(m ?? "").trim()).filter(Boolean);
  // Always write — even for an empty array — so getModelSettingsConfigured() can
  // distinguish "user explicitly saved with no models selected" from "never saved".
  window.localStorage.setItem(PLAYER_MODEL_SELECTION_STORAGE, JSON.stringify(normalized));
}

/**
 * Returns true if the user has ever explicitly saved their model settings.
 * Used to decide whether server-supplied defaults should be applied.
 */
export function isModelSettingsConfigured(): boolean {
  if (!canUseStorage()) return false;
  return window.localStorage.getItem(PLAYER_MODEL_SELECTION_STORAGE) !== null;
}

/**
 * Write server-supplied default model settings to localStorage.
 * Marks the user as "configured" so defaults are not re-applied on next load.
 */
export function applyModelDefaults(defaults: {
  playerModels: string[];
  systemOnlyModels: string[];
  generatorModel: string;
  summaryModel: string;
  reviewModel: string;
}) {
  if (!canUseStorage()) return;
  const playerNorm = defaults.playerModels.map((m) => m.trim()).filter(Boolean);
  const sysOnlyNorm = defaults.systemOnlyModels.map((m) => m.trim()).filter(Boolean);
  // setPlayerModelSelection writes the key even for [], marking as configured
  window.localStorage.setItem(PLAYER_MODEL_SELECTION_STORAGE, JSON.stringify(playerNorm));
  if (sysOnlyNorm.length > 0) {
    window.localStorage.setItem(SYSTEM_ONLY_MODELS_STORAGE, JSON.stringify(sysOnlyNorm));
  } else {
    window.localStorage.removeItem(SYSTEM_ONLY_MODELS_STORAGE);
  }
  writeStorage(GENERATOR_MODEL_STORAGE, defaults.generatorModel);
  writeStorage(SUMMARY_MODEL_STORAGE, defaults.summaryModel);
  writeStorage(REVIEW_MODEL_STORAGE, defaults.reviewModel);
}

/**
 * Clear all model settings from localStorage so that server defaults will be
 * re-applied on next load / next time ModelSettingsModal opens.
 */
export function resetModelSettings() {
  if (!canUseStorage()) return;
  window.localStorage.removeItem(PLAYER_MODEL_SELECTION_STORAGE);
  window.localStorage.removeItem(SYSTEM_ONLY_MODELS_STORAGE);
  window.localStorage.removeItem(GENERATOR_MODEL_STORAGE);
  window.localStorage.removeItem(SUMMARY_MODEL_STORAGE);
  window.localStorage.removeItem(REVIEW_MODEL_STORAGE);
}

export function getSystemOnlyModels(): string[] {
  if (!canUseStorage()) return [];
  const raw = window.localStorage.getItem(SYSTEM_ONLY_MODELS_STORAGE);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.map((item) => String(item ?? "").trim()).filter(Boolean);
  } catch {
    return [];
  }
}

export function setSystemOnlyModels(models: string[]) {
  if (!canUseStorage()) return;
  const normalized = models.map((m) => String(m ?? "").trim()).filter(Boolean);
  if (normalized.length === 0) {
    window.localStorage.removeItem(SYSTEM_ONLY_MODELS_STORAGE);
    return;
  }
  window.localStorage.setItem(SYSTEM_ONLY_MODELS_STORAGE, JSON.stringify(normalized));
}

export function clearApiKeys() {
  if (!canUseStorage()) return;
  window.localStorage.removeItem(ZENMUX_API_KEY_STORAGE);
  window.localStorage.removeItem(DASHSCOPE_API_KEY_STORAGE);
  window.localStorage.removeItem(MINIMAX_API_KEY_STORAGE);
  window.localStorage.removeItem(MINIMAX_GROUP_ID_STORAGE);
  window.localStorage.removeItem(CUSTOM_KEY_ENABLED_STORAGE);
  window.localStorage.removeItem(SELECTED_MODELS_STORAGE);
  window.localStorage.removeItem(GENERATOR_MODEL_STORAGE);
  window.localStorage.removeItem(SUMMARY_MODEL_STORAGE);
  window.localStorage.removeItem(REVIEW_MODEL_STORAGE);
  window.localStorage.removeItem(VALIDATED_ZENMUX_KEY_STORAGE);
  window.localStorage.removeItem(VALIDATED_DASHSCOPE_KEY_STORAGE);
  window.localStorage.removeItem(PLAYER_MODEL_SELECTION_STORAGE);
  window.localStorage.removeItem(SYSTEM_ONLY_MODELS_STORAGE);
}

export interface KeyValidationResult {
  valid: boolean;
  error?: string;
  errorCode?: string;
}

export async function validateApiKeyBalance(): Promise<KeyValidationResult> {
  if (!isCustomKeyEnabled()) {
    return { valid: true };
  }

  const zenmuxKey = getZenmuxApiKey();
  const dashscopeKey = getDashscopeApiKey();

  if (!zenmuxKey && !dashscopeKey) {
    return { valid: false, error: "未配置任何 API Key", errorCode: "no_key" };
  }

  try {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (zenmuxKey) {
      headers["X-Zenmux-Api-Key"] = zenmuxKey;
    }
    if (dashscopeKey) {
      headers["X-Dashscope-Api-Key"] = dashscopeKey;
    }

    const response = await fetch("/api/validate-key", {
      method: "POST",
      headers,
    });

    const data = await response.json();

    if (data.valid) {
      return { valid: true };
    }

    return {
      valid: false,
      error: data.error || "API Key 验证失败",
      errorCode: data.errorCode || "unknown",
    };
  } catch (error) {
    return {
      valid: false,
      error: `验证请求失败: ${String(error)}`,
      errorCode: "network_error",
    };
  }
}
