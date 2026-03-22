export type AppLocale = "zh" | "en";

export interface VoicePreset {
  id: string;          // MiniMax voice ID
  edgeTtsId: string;   // Microsoft Edge TTS voice ID
  name: string;
  styles: string[]; // 对应的 persona styleLabel 或 traits
  gender: "male" | "female";
  minAge?: number;
  maxAge?: number;
  edgeTtsPitch?: string; // e.g. "+5Hz", "-10Hz" — differentiates shared edgeTtsId voices
  edgeTtsRate?: string;  // e.g. "+5%", "-10%"
}

// MiniMax T2A V2 推荐音色，每条附带对应的 Edge TTS 音色 ID
export const VOICE_PRESETS: VoicePreset[] = [
  // --- 男性音色 ---
  { id: "Cantonese_PlayfulMan",                    edgeTtsId: "zh-CN-YunxiNeural",    name: "活泼男声",   styles: ["cheerful", "balanced", "活泼", "阳光"],  gender: "male", minAge: 18, maxAge: 20, edgeTtsPitch: "+5Hz",  edgeTtsRate: "+5%"  },
  { id: "Chinese (Mandarin)_Stubborn_Friend",      edgeTtsId: "zh-CN-YunjianNeural",  name: "嘴硬竹马",   styles: ["aggressive", "balanced", "嘴硬", "竹马"], gender: "male", minAge: 21, maxAge: 23 },
  { id: "Chinese (Mandarin)_Southern_Young_Man",   edgeTtsId: "zh-CN-YunxiaNeural",   name: "南方小哥",   styles: ["cheerful", "safe", "南方", "随和"],        gender: "male", minAge: 24, maxAge: 27, edgeTtsPitch: "-40Hz"                          },
  { id: "Chinese (Mandarin)_Gentle_Youth",         edgeTtsId: "zh-CN-YunyangNeural",  name: "温润青年",   styles: ["calm", "balanced", "温润", "儒雅"],        gender: "male", minAge: 28, maxAge: 31 },
  { id: "male-qn-jingying",                        edgeTtsId: "zh-CN-YunyangNeural",  name: "精英青年音色", styles: ["logic", "balanced", "精英", "青年"],      gender: "male", minAge: 32, maxAge: 35, edgeTtsPitch: "-2Hz"                          },
  { id: "Chinese (Mandarin)_Sincere_Adult",        edgeTtsId: "zh-TW-YunJheNeural",   name: "真诚青年",   styles: ["balanced", "safe", "真诚", "热情"],        gender: "male", minAge: 36, maxAge: 40 },
  { id: "Chinese (Mandarin)_Radio_Host",           edgeTtsId: "zh-CN-YunyangNeural",  name: "电台男主播", styles: ["calm", "logic", "电台", "播音"],           gender: "male", minAge: 41, maxAge: 44, edgeTtsPitch: "-10Hz", edgeTtsRate: "-5%"  },
  { id: "Chinese (Mandarin)_Humorous_Elder",       edgeTtsId: "zh-CN-YunxiNeural",    name: "搞笑大爷",   styles: ["cheerful", "aggressive", "搞笑", "大爷"],  gender: "male", minAge: 45,             edgeTtsPitch: "-8Hz",  edgeTtsRate: "-10%" },

  // --- 女性音色 ---
  { id: "Chinese (Mandarin)_Cute_Spirit",          edgeTtsId: "zh-CN-XiaoyiNeural",    name: "憨憨萌兽", styles: ["cheerful", "balanced", "憨憨", "萌"],    gender: "female", minAge: 18, maxAge: 21 },
  { id: "Chinese (Mandarin)_Warm_Girl",            edgeTtsId: "zh-CN-XiaoxiaoNeural",  name: "温暖少女", styles: ["cheerful", "safe", "温暖", "少女"],      gender: "female", minAge: 22, maxAge: 25, edgeTtsPitch: "+4Hz"                           },
  { id: "Chinese (Mandarin)_Soft_Girl",            edgeTtsId: "zh-TW-HsiaoYuNeural",   name: "软软女孩", styles: ["balanced", "safe", "软软", "可爱"],      gender: "female", minAge: 26, maxAge: 29 },
  { id: "Chinese (Mandarin)_HK_Flight_Attendant",  edgeTtsId: "zh-TW-HsiaoChenNeural", name: "港普空姐", styles: ["balanced", "safe", "港普", "空姐"],      gender: "female", minAge: 30, maxAge: 32 },
  { id: "Chinese (Mandarin)_Gentle_Senior",        edgeTtsId: "zh-CN-shaanxi-XiaoniNeural",   name: "温柔学姐", styles: ["calm", "safe", "学姐", "温柔"],   gender: "female", minAge: 33, maxAge: 34 },
  { id: "Chinese (Mandarin)_Warm_Bestie",          edgeTtsId: "zh-CN-XiaoxiaoNeural",  name: "温暖闺蜜", styles: ["balanced", "safe", "闺蜜", "温暖"],      gender: "female", minAge: 35, maxAge: 44 },
  { id: "Chinese (Mandarin)_Kind-hearted_Antie",   edgeTtsId: "zh-CN-liaoning-XiaobeiNeural", name: "热心大婶", styles: ["cheerful", "aggressive", "热心", "大婶"], gender: "female", minAge: 45 },
];

// English Voice Presets (MiniMax + Edge TTS)
export const ENGLISH_VOICE_PRESETS: VoicePreset[] = [
  // --- Male Voices ---
  { id: "English_Trustworthy_Man",    edgeTtsId: "en-US-ChristopherNeural",          name: "Trustworthy Man",   styles: ["balanced", "safe", "reliable", "steady"],          gender: "male",   minAge: 28, maxAge: 40 },
  { id: "English_Gentle-voiced_man",  edgeTtsId: "en-US-GuyNeural",                  name: "Gentle-voiced man", styles: ["calm", "balanced", "soft", "gentle"],               gender: "male",   minAge: 25, maxAge: 35 },
  { id: "English_Diligent_Man",       edgeTtsId: "en-US-ChristopherNeural",          name: "Diligent Man",      styles: ["logic", "calm", "serious", "professional"],        gender: "male",   minAge: 35, maxAge: 50, edgeTtsPitch: "-3Hz"                         },
  { id: "English_Aussie_Bloke",       edgeTtsId: "en-AU-WilliamMultilingualNeural",  name: "Aussie Bloke",      styles: ["cheerful", "aggressive", "energetic", "rough"],    gender: "male",   minAge: 30, maxAge: 55 },
  { id: "Santa_Claus",                edgeTtsId: "en-US-ChristopherNeural",          name: "Santa Claus",       styles: ["cheerful", "warm", "elder"],                       gender: "male",   minAge: 50,             edgeTtsPitch: "-12Hz", edgeTtsRate: "-8%"  },
  { id: "Friendly_Person",            edgeTtsId: "en-US-GuyNeural",                  name: "Friendly Person",   styles: ["cheerful", "balanced", "friendly"],                gender: "male",   minAge: 18, maxAge: 30, edgeTtsPitch: "+3Hz",  edgeTtsRate: "+5%"  },

  // --- Female Voices ---
  { id: "English_Graceful_Lady",      edgeTtsId: "en-GB-SoniaNeural",               name: "Graceful Lady",     styles: ["calm", "balanced", "elegant", "mature"],           gender: "female", minAge: 30, maxAge: 50 },
  { id: "Sweet_Girl",                 edgeTtsId: "en-US-AriaNeural",                name: "Sweet Girl",        styles: ["cheerful", "safe", "sweet", "young"],              gender: "female", minAge: 18, maxAge: 25, edgeTtsPitch: "+6Hz",  edgeTtsRate: "+5%"  },
  { id: "English_Whispering_girl",    edgeTtsId: "en-US-JennyNeural",               name: "Whispering girl",   styles: ["calm", "safe", "soft", "quiet"],                   gender: "female", minAge: 20, maxAge: 30 },
  { id: "Charming_Lady",              edgeTtsId: "en-US-AriaNeural",                name: "Charming Lady",     styles: ["balanced", "safe", "charming", "warm"],            gender: "female", minAge: 25, maxAge: 40 },
  { id: "Serene_Woman",               edgeTtsId: "en-GB-SoniaNeural",               name: "Serene Woman",      styles: ["calm", "balanced", "serene", "storytelling"],      gender: "female", minAge: 35, maxAge: 55, edgeTtsPitch: "-4Hz",  edgeTtsRate: "-5%"  },
  { id: "Lively_Girl",                edgeTtsId: "en-US-AriaNeural",                name: "Lively Girl",       styles: ["cheerful", "balanced", "energetic"],               gender: "female", minAge: 18, maxAge: 28, edgeTtsPitch: "+4Hz",  edgeTtsRate: "+10%" },
];

export const DEFAULT_VOICE_ID = {
  male: "male-qn-jingying",
  female: "Chinese (Mandarin)_Warm_Girl",
};

export const DEFAULT_VOICE_ID_EN = {
  male: "English_Trustworthy_Man",
  female: "English_Graceful_Lady",
};

/** Default Edge TTS voice IDs (used when a MiniMax voice ID has no matching entry). */
export const DEFAULT_EDGE_TTS_VOICE_ID = {
  male: "zh-CN-YunyangNeural",
  female: "zh-CN-XiaoxiaoNeural",
};

export const DEFAULT_EDGE_TTS_VOICE_ID_EN = {
  male: "en-US-GuyNeural",
  female: "en-US-JennyNeural",
};

/** Edge TTS narrator voice IDs (for use in the narrator audio generation script). */
export const NARRATOR_EDGE_TTS_VOICE_IDS: Record<string, string> = {
  zh: "zh-CN-XiaoxiaoNeural",
  en: "en-GB-SoniaNeural",
};

/** Look up the Edge TTS voice ID that corresponds to a given MiniMax voice ID. */
export function minimaxToEdgeTtsVoiceId(minimaxId: string, locale: AppLocale = "zh"): string {
  const presets = locale === "en" ? ENGLISH_VOICE_PRESETS : VOICE_PRESETS;
  const found = presets.find((p) => p.id === minimaxId);
  if (found) return found.edgeTtsId;
  // Infer gender from the MiniMax voice ID string so we can pick the right default
  const lower = minimaxId.toLowerCase();
  const isFemale = lower.startsWith("female") || lower.includes("female") || lower.includes("girl") || lower.includes("woman") || lower.includes("lady");
  const defaults = locale === "en" ? DEFAULT_EDGE_TTS_VOICE_ID_EN : DEFAULT_EDGE_TTS_VOICE_ID;
  return isFemale ? defaults.female : defaults.male;
}

/**
 * Look up Edge TTS voice params (voice ID, pitch, rate) for a given MiniMax voice ID.
 * Searches both zh and en presets so this works regardless of locale.
 * Returns the pitch/rate prosody fields when set on the matching preset.
 */
export function getEdgeTtsParams(minimaxId: string, locale: AppLocale = "zh"): {
  voice: string;
  pitch?: string;
  rate?: string;
} {
  const allPresets = [...VOICE_PRESETS, ...ENGLISH_VOICE_PRESETS];
  const found = allPresets.find((p) => p.id === minimaxId);
  if (found) {
    return {
      voice: found.edgeTtsId,
      ...(found.edgeTtsPitch ? { pitch: found.edgeTtsPitch } : {}),
      ...(found.edgeTtsRate  ? { rate:  found.edgeTtsRate  } : {}),
    };
  }
  const lower = minimaxId.toLowerCase();
  const isFemale = lower.startsWith("female") || lower.includes("female") || lower.includes("girl") || lower.includes("woman") || lower.includes("lady");
  const defaults = locale === "en" ? DEFAULT_EDGE_TTS_VOICE_ID_EN : DEFAULT_EDGE_TTS_VOICE_ID;
  return { voice: isFemale ? defaults.female : defaults.male };
}

/**
 * Resolve voice ID based on input, gender, age, and locale.
 * - For Chinese (zh): Uses VOICE_PRESETS and prioritizes input ID if valid.
 * - For English (en): Uses ENGLISH_VOICE_PRESETS, prioritizes input ID if it exists in the presets.
 */
export function resolveVoiceId(
  input: string | undefined,
  gender: "male" | "female" | "nonbinary" | undefined,
  age?: number,
  locale: AppLocale = "zh"
): string {
  const normGender: "male" | "female" = gender === "female" ? "female" : "male";
  
  // Select preset list and defaults based on locale
  const presets = locale === "en" ? ENGLISH_VOICE_PRESETS : VOICE_PRESETS;
  const defaults = locale === "en" ? DEFAULT_VOICE_ID_EN : DEFAULT_VOICE_ID;
  
  // If input ID exists in the locale's presets, use it directly
  const trimmed = (input || "").trim();
  if (trimmed && presets.some((p) => p.id === trimmed)) return trimmed;
  
  // Filter by gender
  const baseCandidates = presets.filter((p) => p.gender === normGender);
  
  // Filter by age if available
  const hasAge = typeof age === "number" && Number.isFinite(age);
  const ageCandidates = hasAge
    ? baseCandidates.filter((p) => {
        const minOk = typeof p.minAge === "number" ? age >= p.minAge : true;
        const maxOk = typeof p.maxAge === "number" ? age <= p.maxAge : true;
        return minOk && maxOk;
      })
    : baseCandidates;

  const picked = (ageCandidates[0] ?? baseCandidates[0])?.id;
  if (picked) return picked;

  return normGender === "female" ? defaults.female : defaults.male;
}
