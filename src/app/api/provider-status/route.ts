import type { ProviderName } from "@/types/game";
import { fetchOpenAICompatibleModels } from "@/lib/provider-config";

export interface ProviderStatusResponse {
  providers: Record<ProviderName, boolean>;
  /** Model IDs for the openai-compatible provider (from env var or fetched via API). */
  openaiCompatibleModels: string[];
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

  return Response.json({ providers: status, openaiCompatibleModels } satisfies ProviderStatusResponse);
}
