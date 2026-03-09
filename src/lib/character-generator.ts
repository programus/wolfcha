import { generateJSON, generateCompletionStream, stripMarkdownCodeFences } from "./llm";
import { LLMJSONParser } from "ai-json-fixer";
import {
  ALL_MODELS,
  GENERATOR_MODEL,
  PLAYER_MODELS,
  filterPlayerModels,
  type GameScenario,
  type ModelRef,
  type Persona,
} from "@/types/game";
import { getGeneratorModel, getPlayerModelSelection, hasDashscopeKey, hasZenmuxKey, isCustomKeyEnabled } from "@/lib/api-keys";
import { aiLogger } from "./ai-logger";
import { AI_TEMPERATURE, GAME_TEMPERATURE } from "./ai-config";
import { getRandomScenario } from "./scenarios";
import { resolveVoiceId, VOICE_PRESETS, type AppLocale } from "./voice-constants";
import { getI18n } from "@/i18n/translator";

export interface GeneratedCharacter {
  displayName: string;
  persona: Persona;
  avatarSeed?: string;
}

export interface GeneratedCharacters {
  characters: GeneratedCharacter[];
}

export type Gender = "male" | "female" | "nonbinary";

const MODEL_DISPLAY_NAME_MAP: Array<{ match: RegExp; label: string }> = [
  { match: /gemini/i, label: "Gemini" },
  { match: /deepseek/i, label: "DeepSeek" },
  { match: /claude/i, label: "Claude" },
  { match: /qwen/i, label: "Qwen" },
  { match: /doubao/i, label: "Doubao" },
  { match: /bytedance|seed/i, label: "ByteDance" },
  { match: /openai|gpt/i, label: "OpenAI" },
  { match: /kimi|moonshot/i, label: "Kimi" },
];

function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export const sampleModelRefs = (count: number): ModelRef[] => {
  // Default pool when custom key is not enabled
  const defaultPool =
    PLAYER_MODELS.length > 0
      ? PLAYER_MODELS
      : [{ provider: "zenmux" as const, model: GENERATOR_MODEL }];

  const pool = (() => {
    if (!isCustomKeyEnabled()) {
      // Server-direct provider models (openai/google/anthropic/openai-compatible) use
      // server env var keys and are always available regardless of client-side custom key.
      const serverDirectPool = filterPlayerModels(
        ALL_MODELS.filter(
          (ref) =>
            ref.provider === "openai" ||
            ref.provider === "google" ||
            ref.provider === "anthropic" ||
            ref.provider === "openai-compatible"
        )
      );
      // Respect the project-level player model selection made in the Model Settings panel.
      // Match against both built-in pool and server-direct models.
      const selection = getPlayerModelSelection();
      if (selection.length > 0) {
        const fullCandidatePool = [...defaultPool, ...serverDirectPool];
        const matched = fullCandidatePool.filter((ref) => selection.includes(ref.model));
        // Models not found in any known pool are assumed to be dynamic openai-compatible models
        // (configured via OPENAI_COMPATIBLE_MODELS env var and selected in Model Settings UI).
        const knownModels = new Set(fullCandidatePool.map((ref) => ref.model));
        const dynamicRefs: ModelRef[] = selection
          .filter((m) => !knownModels.has(m))
          .map((m) => ({ provider: "openai-compatible" as const, model: m }));
        const allMatched = [...matched, ...dynamicRefs];
        if (allMatched.length > 0) return allMatched;
      }
      return defaultPool;
    }

    // When custom key is enabled, use ALL_MODELS as the full available pool
    const fullPool = ALL_MODELS.length > 0 ? ALL_MODELS : defaultPool;

    const allowedProviders = new Set<ModelRef["provider"]>();
    if (hasZenmuxKey()) allowedProviders.add("zenmux");
    if (hasDashscopeKey()) allowedProviders.add("dashscope");
    if (allowedProviders.size === 0) return defaultPool;

    // Filter by allowed providers, then exclude non-player models
    const allowedPool = filterPlayerModels(
      fullPool.filter((ref) => allowedProviders.has(ref.provider))
    );
    if (allowedPool.length === 0) return defaultPool;

    // Filter by user's selected models - STRICTLY respect user selection
    // Use getPlayerModelSelection() — same storage key as ModelSettingsModal
    const selectedModels = getPlayerModelSelection();
    if (selectedModels.length === 0) return allowedPool;
    
    // Only use models the user explicitly selected
    const selectedPool = allowedPool.filter((ref) => selectedModels.includes(ref.model));
    
    // If user selected models but none are in allowedPool, try to find them in fullPool
    // This handles cases where user selected models from a different provider
    if (selectedPool.length === 0) {
      const fullSelectedPool = filterPlayerModels(
        fullPool.filter((ref) => selectedModels.includes(ref.model) && allowedProviders.has(ref.provider))
      );
      if (fullSelectedPool.length > 0) return fullSelectedPool;
      
      // Last resort: only return models that user actually selected, even if empty
      // This prevents using models the user didn't choose
      console.warn("[sampleModelRefs] User selected models not found in allowed pool:", selectedModels);
    }
    
    // Return only user-selected models, never fall back to all models
    return selectedPool.length > 0 ? selectedPool : allowedPool.slice(0, 1);
  })();

  if (!Number.isFinite(count) || count <= 0) return [];

  if (count <= pool.length) {
    return shuffleArray(pool).slice(0, count);
  }

  const out = shuffleArray(pool);
  while (out.length < count) {
    out.push(pool[Math.floor(Math.random() * pool.length)]);
  }
  return out;
};

const getModelDisplayName = (modelRef: ModelRef): string => {
  const raw = modelRef.model ?? "";
  const mapped = MODEL_DISPLAY_NAME_MAP.find((entry) => entry.match.test(raw))?.label;
  if (mapped) return mapped;
  const fallback = raw.split("/").pop() ?? raw;
  return fallback.split("-")[0] || fallback || "AI";
};

type NicknameItem = { model: string; nicknames: string[] };

const nicknameCache = new Map<string, string[]>();

const buildNicknamePrompt = (requirements: Array<{ model: string; count: number }>) => {
  const { t } = getI18n();
  const list = requirements.map((r) => `- ${r.model} x${r.count}`).join("\n");
  return t("characterGenerator.nicknamePrompt", { list });
};

const normalizeNicknameResponse = (raw: unknown): Map<string, string[]> => {
  const result = new Map<string, string[]>();
  if (!raw || typeof raw !== "object" || !("items" in raw) || !Array.isArray((raw as any).items)) {
    return result;
  }

  const items = (raw as { items: NicknameItem[] }).items;
  items.forEach((item) => {
    if (!item || typeof item.model !== "string" || !Array.isArray(item.nicknames)) return;
    const model = item.model.trim().toLowerCase();
    if (!model) return;
    const nicknames = item.nicknames
      .map((n) => String(n ?? "").trim())
      .filter(Boolean);
    if (nicknames.length === 0) return;
    result.set(model, nicknames);
  });

  return result;
};

const resolveNicknameMap = async (requirements: Array<{ model: string; count: number }>): Promise<Map<string, string[]>> => {
  const missing = requirements.filter((req) => (nicknameCache.get(req.model)?.length ?? 0) < req.count);
  if (missing.length === 0) {
    return new Map(requirements.map((req) => [req.model, nicknameCache.get(req.model) as string[]]));
  }

  let lastError: unknown;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const prompt = buildNicknamePrompt(missing);
      const raw = await generateJSON<unknown>({
        model: getGeneratorModel(),
        messages: [{ role: "user", content: prompt }],
        temperature: AI_TEMPERATURE.BALANCED,
      });
      const normalized = normalizeNicknameResponse(raw);
      missing.forEach((req) => {
        const nicknames = normalized.get(req.model.toLowerCase());
        if (!nicknames || nicknames.length < req.count) {
          throw new Error(`Missing nicknames for ${req.model}`);
        }
        const unique = Array.from(new Set(nicknames));
        if (unique.length < req.count) {
          throw new Error(`Duplicate nicknames for ${req.model}`);
        }
        nicknameCache.set(req.model, unique.slice(0, req.count));
      });

      const allNicknames = Array.from(nicknameCache.values()).flat();
      const uniqueAll = new Set(allNicknames);
      if (uniqueAll.size !== allNicknames.length) {
        throw new Error("Duplicate nicknames across models");
      }
      lastError = undefined;
      break;
    } catch (error) {
      lastError = error;
    }
  }

  if (lastError) {
    console.warn("[wolfcha] Nickname generation failed after retry.", lastError);
    throw lastError;
  }

  return new Map(requirements.map((req) => [req.model, nicknameCache.get(req.model) as string[]]));
};

const createGenshinPersona = (voiceId?: string): Persona => {
  return {
    styleLabel: "neutral",
    voiceRules: ["concise"],
    mbti: "NA",
    gender: "nonbinary",
    age: 0,
    voiceId,
  };
};

export const buildGenshinModelRefs = (count: number): ModelRef[] => {
  return sampleModelRefs(count);
};

export const generateGenshinModeCharacters = async (
  count: number,
  modelRefs: ModelRef[]
): Promise<GeneratedCharacter[]> => {
  const modelUsageCounts = new Map<string, number>();
  const modelVoiceMap = new Map<string, string>();
  const resolvedRefs = modelRefs.length >= count ? modelRefs : buildGenshinModelRefs(count);

  return resolvedRefs.slice(0, count).map((modelRef) => {
    const modelLabel = getModelDisplayName(modelRef);
    const usageCount = modelUsageCounts.get(modelLabel) ?? 0;
    modelUsageCounts.set(modelLabel, usageCount + 1);
    const preferredName = usageCount === 0 ? modelLabel : `${modelLabel} ${usageCount + 1}`;

    let voiceId = modelVoiceMap.get(modelLabel);
    if (!voiceId) {
      const preset = VOICE_PRESETS[Math.floor(Math.random() * VOICE_PRESETS.length)];
      voiceId = preset?.id;
      if (voiceId) {
        modelVoiceMap.set(modelLabel, voiceId);
      }
    }

    return {
      displayName: preferredName,
      persona: createGenshinPersona(voiceId),
    };
  });
};

const isValidMbti = (v: any): v is string => typeof v === "string" && /^[A-Z]{4}$/.test(v.trim());

export interface BaseProfile {
  displayName: string;
  gender: Gender;
  age: number;
  mbti: string;
  basicInfo: string;
}

const isValidGender = (g: any): g is Gender => g === "male" || g === "female" || g === "nonbinary";

// --- Programmatic sanitizers (no AI needed) ---

const VALID_MBTI_TYPES = [
  "INTJ","INTP","ENTJ","ENTP","INFJ","INFP","ENFJ","ENFP",
  "ISTJ","ISFJ","ESTJ","ESFJ","ISTP","ISFP","ESTP","ESFP",
];

const randomMbti = () => VALID_MBTI_TYPES[Math.floor(Math.random() * VALID_MBTI_TYPES.length)];

const sanitizeMbti = (v: any): string => {
  if (typeof v !== "string") return randomMbti();
  const upper = v.trim().toUpperCase().replace(/[^A-Z]/g, "").slice(0, 4);
  if (isValidMbti(upper)) return upper;
  return randomMbti();
};

const sanitizeAge = (v: any): number => {
  const n = typeof v === "number" ? v : Number(v);
  if (!Number.isFinite(n)) return 20 + Math.floor(Math.random() * 25);
  return Math.max(16, Math.min(70, Math.round(n)));
};

const sanitizeGender = (v: any): Gender => {
  if (isValidGender(v)) return v;
  if (typeof v === "string") {
    const lower = v.toLowerCase().trim();
    if (lower === "male" || lower === "m" || lower === "man") return "male";
    if (lower === "female" || lower === "f" || lower === "woman") return "female";
    if (lower.includes("non") || lower === "nb") return "nonbinary";
  }
  return (["male", "female"] as Gender[])[Math.floor(Math.random() * 2)];
};

/**
 * Fix a persona so it matches the profile's source-of-truth fields.
 * Returns null only if the persona object is entirely missing.
 */
const sanitizePersonaToMatchProfile = (persona: any, profile: BaseProfile): Persona | null => {
  if (!persona || typeof persona !== "object") return null;
  const voiceRules =
    Array.isArray(persona.voiceRules) &&
    persona.voiceRules.filter((x: any) => typeof x === "string" && x.trim()).length > 0
      ? persona.voiceRules
      : ["concise"];
  return {
    ...persona,
    voiceRules,
    gender: profile.gender,
    age: profile.age,
    mbti: profile.mbti,
  };
};

const buildCombinedCharactersPrompt = (count: number, scenario: GameScenario) => {
  const { t } = getI18n();
  return t("characterGenerator.combinedCharactersPrompt", {
    count,
    title: scenario.title,
    description: scenario.description,
    rolesHint: scenario.rolesHint,
  });
};

/**
 * Extract top-level character objects from a partial JSON stream.
 * Relies on `{ "characters": [ {...}, {...} ] }` structure from the LLM.
 * Objects at brace-depth 2 (inside the characters array) are extracted as candidates.
 */
const extractCompleteCharacterObjects = (content: string): string[] => {
  const results: string[] = [];
  let depth = 0;
  let objectStart = -1;
  let inString = false;
  let escape = false;

  for (let i = 0; i < content.length; i++) {
    const ch = content[i];

    if (escape) { escape = false; continue; }
    if (inString) {
      if (ch === "\\") escape = true;
      else if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') { inString = true; continue; }

    if (ch === "{") {
      depth++;
      if (depth === 2) objectStart = i;
    } else if (ch === "}") {
      if (depth === 2 && objectStart !== -1) {
        results.push(content.slice(objectStart, i + 1));
        objectStart = -1;
      }
      depth--;
    }
  }

  return results;
};

/**
 * Build a GeneratedCharacter from a raw combined object that has top-level
 * gender/age/mbti/basicInfo fields alongside persona.voiceRules.
 */
const buildCharacterFromCombined = (
  parsed: unknown,
  locale: AppLocale
): GeneratedCharacter | null => {
  if (!parsed || typeof parsed !== "object") return null;
  const p = parsed as Record<string, unknown>;

  const displayName = typeof p.displayName === "string" ? p.displayName.trim() : "";
  if (!displayName) return null;

  const basicInfo = typeof p.basicInfo === "string" ? p.basicInfo.trim() : "";
  if (!basicInfo) return null;

  if (!p.persona || typeof p.persona !== "object") return null;

  const baseProfile: BaseProfile = {
    displayName,
    gender: sanitizeGender(p.gender),
    age: sanitizeAge(p.age),
    mbti: sanitizeMbti(p.mbti),
    basicInfo,
  };

  const sanitizedPersona = sanitizePersonaToMatchProfile(p.persona, baseProfile);
  if (!sanitizedPersona) return null;

  const voiceId = resolveVoiceId(
    sanitizedPersona.voiceId,
    sanitizedPersona.gender,
    sanitizedPersona.age,
    locale
  );

  return {
    displayName,
    persona: {
      ...sanitizedPersona,
      basicInfo,
      voiceId,
      relationships: undefined,
    },
  };
};

const normalizeGeneratedCharacters = (
  result: unknown
): { characters: GeneratedCharacter[]; raw: unknown } => {
  if (result && typeof result === "object" && "displayName" in result && "persona" in result) {
    return { characters: [result as GeneratedCharacter], raw: result };
  }

  if (result && typeof result === "object" && "characters" in result && Array.isArray((result as any).characters)) {
    return { characters: (result as GeneratedCharacters).characters, raw: result };
  }

  if (Array.isArray(result)) {
    if (result.length > 0 && typeof result[0] === "object" && result[0] && "displayName" in (result[0] as any)) {
      return { characters: result as GeneratedCharacter[], raw: result };
    }
    return { characters: [], raw: result };
  }

  return { characters: [], raw: result };
};

const buildRepairCombinedCharactersPrompt = (count: number, scenario: GameScenario, raw: unknown) => {
  const { t } = getI18n();
  const rawStr = (() => {
    try {
      return JSON.stringify(raw);
    } catch {
      return String(raw);
    }
  })();

  return t("characterGenerator.repairCombinedCharactersPrompt", {
    count,
    title: scenario.title,
    description: scenario.description,
    raw: rawStr,
  });
};

export async function generateCharacters(
  count: number,
  scenario?: GameScenario,
  options?: {
    onBaseProfiles?: (profiles: BaseProfile[]) => void;
    onCharacter?: (index: number, character: GeneratedCharacter) => void;
  }
): Promise<GeneratedCharacter[]> {
  const usedScenario = scenario ?? getRandomScenario();
  const runOnce = async () => {
    const startTime = Date.now();
    const { locale } = getI18n();
    const prompt = buildCombinedCharactersPrompt(count, usedScenario);

    const finalizedCharacters: (GeneratedCharacter | undefined)[] = new Array(count).fill(undefined);
    const emittedNames = new Set<string>();
    let nextIndex = 0;
    let accumulatedContent = "";
    let processedCandidateCount = 0;

    const stream = generateCompletionStream({
      model: getGeneratorModel(),
      messages: [{ role: "user", content: prompt }],
      temperature: GAME_TEMPERATURE.CHARACTER_GENERATION,
      max_tokens: 6000,
    });

    for await (const chunk of stream) {
      accumulatedContent += chunk;
      const cleaned = stripMarkdownCodeFences(accumulatedContent);
      const candidates = extractCompleteCharacterObjects(cleaned);

      for (let ci = processedCandidateCount; ci < candidates.length; ci++) {
        try {
          const parsed = JSON.parse(candidates[ci]);
          if (!parsed.displayName || emittedNames.has(parsed.displayName)) continue;

          const character = buildCharacterFromCombined(parsed, locale as AppLocale);
          if (!character) continue;

          emittedNames.add(character.displayName);
          const index = nextIndex++;
          finalizedCharacters[index] = character;
          options?.onCharacter?.(index, character);
          console.log(`[character-gen] streamed character ${index}: ${character.displayName}`);
        } catch {
          // partial parse — skip
        }
      }
      processedCandidateCount = candidates.length;
    }

    // Fallback: try full parse if stream didn't yield all characters
    if (finalizedCharacters.filter(Boolean).length < count) {
      const cleaned = stripMarkdownCodeFences(accumulatedContent);
      let fullResult: unknown;
      try {
        fullResult = JSON.parse(cleaned);
      } catch {
        const parser = new LLMJSONParser();
        fullResult = parser.parse(cleaned);
      }

      const normalized = normalizeGeneratedCharacters(fullResult);
      for (const c of normalized.characters) {
        if (nextIndex >= count) break;
        if (!c.displayName || emittedNames.has(c.displayName)) continue;
        const character = buildCharacterFromCombined(c, locale as AppLocale);
        if (!character) continue;
        emittedNames.add(character.displayName);
        const index = nextIndex++;
        finalizedCharacters[index] = character;
        options?.onCharacter?.(index, character);
      }

      // Repair call if still incomplete
      if (finalizedCharacters.filter(Boolean).length < count) {
        const repairPrompt = buildRepairCombinedCharactersPrompt(count, usedScenario, normalized.raw);
        const repaired = await generateJSON<unknown>({
          model: getGeneratorModel(),
          messages: [{ role: "user", content: repairPrompt }],
          temperature: GAME_TEMPERATURE.CHARACTER_REPAIR,
          max_tokens: 6000,
        });

        const normalizedRepaired = normalizeGeneratedCharacters(repaired);
        for (const c of normalizedRepaired.characters) {
          if (nextIndex >= count) break;
          if (!c.displayName || emittedNames.has(c.displayName)) continue;
          const character = buildCharacterFromCombined(c, locale as AppLocale);
          if (!character) continue;
          emittedNames.add(character.displayName);
          const index = nextIndex++;
          finalizedCharacters[index] = character;
          options?.onCharacter?.(index, character);
        }
      }
    }

    const result = finalizedCharacters.filter(Boolean) as GeneratedCharacter[];
    if (result.length < count) {
      throw new Error(`Character generation returned only ${result.length}/${count} characters after repair`);
    }

    // Call onBaseProfiles for backward compatibility, derived from finalized characters
    options?.onBaseProfiles?.(
      result.map((c) => ({
        displayName: c.displayName,
        gender: c.persona.gender as Gender,
        age: c.persona.age,
        mbti: c.persona.mbti,
        basicInfo: c.persona.basicInfo ?? "",
      }))
    );

    await aiLogger.log({
      type: "character_generation",
      request: {
        model: getGeneratorModel(),
        messages: [{ role: "user", content: prompt }],
      },
      response: {
        content: JSON.stringify(result.map((c) => c.displayName)),
        duration: Date.now() - startTime,
      },
    });

    return finalizedCharacters as GeneratedCharacter[];
  };

  let lastError: unknown;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      console.log(`[character-gen] Attempt ${attempt + 1}/2, customKeyEnabled: ${isCustomKeyEnabled()}, hasZenmux: ${hasZenmuxKey()}, hasDashscope: ${hasDashscopeKey()}`);
      return await runOnce();
    } catch (error) {
      lastError = error;
      console.error(`[character-gen] Attempt ${attempt + 1} failed:`, error);

      const errorMsg = String(error);
      const isQuotaError = errorMsg.includes("[QUOTA_EXHAUSTED]") ||
                          errorMsg.includes("402") ||
                          errorMsg.includes("insufficient") ||
                          errorMsg.includes("余额");

      if (isCustomKeyEnabled() && isQuotaError) {
        console.error("[character-gen] Custom key quota exhausted, aborting retry");
        throw error;
      }

      if (attempt === 0) {
        continue;
      }
      console.error("Character generation failed:", error);
      await aiLogger.log({
        type: "character_generation",
        request: {
          model: GENERATOR_MODEL,
          messages: [{ role: "user", content: "(single-pass generation)" }],
        },
        response: { content: "[]", duration: 0 },
        error: String(error),
      });
    }
  }

  throw lastError;
}

