import type { ProviderName } from "@/types/game";
import { fetchOpenAICompatibleModels } from "@/lib/provider-config";

export interface ProviderStatusResponse {
  providers: Record<ProviderName, boolean>;
  /** Model IDs for the openai-compatible provider (from env var or fetched via API). */
  openaiCompatibleModels: string[];
  /**
   * Default model selection preset from server env vars.
   * Applied on the client only when the user has not yet saved their own preferences.
   * Controlled via DEFAULT_PLAYER_MODELS / DEFAULT_SYSTEM_ONLY_MODELS /
   * DEFAULT_GENERATOR_MODEL / DEFAULT_SUMMARY_MODEL / DEFAULT_REVIEW_MODEL.
   */
  defaultPlayerModels: string[];
  defaultSystemOnlyModels: string[];
  defaultGeneratorModel: string;
  defaultSummaryModel: string;
  defaultReviewModel: string;
}

/**
 * GET /api/provider-status
 *
 * Returns which AI providers have API keys configured on the server.
 * This does NOT expose the keys themselves — only boolean availability flags.
 * Also returns the list of model IDs for the openai-compatible provider,
 * resolved from OPENAI_COMPATIBLE_MODELS env var or fetched from the provider's
 * /models endpoint when the env var is not set.
 *
 * Used by the Model Settings UI to determine which models can be selected.
 */
function parseModelList(env: string | undefined): string[] {
  return (env ?? "").split(",").map((m) => m.trim()).filter(Boolean);
}

export async function GET() {
  const openaiCompatibleModels = await fetchOpenAICompatibleModels();

  const status: Record<ProviderName, boolean> = {
    zenmux: Boolean(process.env.ZENMUX_API_KEY),
    dashscope: Boolean(process.env.DASHSCOPE_API_KEY),
    openai: Boolean(process.env.OPENAI_API_KEY),
    google: Boolean(process.env.GOOGLE_API_KEY),
    anthropic: Boolean(process.env.ANTHROPIC_API_KEY),
    "openai-compatible":
      Boolean(process.env.OPENAI_COMPATIBLE_API_KEY) &&
      Boolean(process.env.OPENAI_COMPATIBLE_BASE_URL) &&
      openaiCompatibleModels.length > 0,
  };

  return Response.json({
    providers: status,
    openaiCompatibleModels,
    defaultPlayerModels: parseModelList(process.env.DEFAULT_PLAYER_MODELS),
    defaultSystemOnlyModels: parseModelList(process.env.DEFAULT_SYSTEM_ONLY_MODELS),
    defaultGeneratorModel: (process.env.DEFAULT_GENERATOR_MODEL ?? "").trim(),
    defaultSummaryModel: (process.env.DEFAULT_SUMMARY_MODEL ?? "").trim(),
    defaultReviewModel: (process.env.DEFAULT_REVIEW_MODEL ?? "").trim(),
  } satisfies ProviderStatusResponse);
}
