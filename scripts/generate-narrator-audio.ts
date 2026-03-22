/**
 * 旁白语音生成脚本 (Multi-language Support)
 * 支持 MiniMax 和 Edge TTS 两个 provider。
 *
 * 使用方法:
 *   npx tsx scripts/generate-narrator-audio.ts [locale] [--provider minimax|edge-tts]
 *
 * 示例:
 *   npx tsx scripts/generate-narrator-audio.ts              # 全语言，默认 minimax
 *   npx tsx scripts/generate-narrator-audio.ts zh           # 仅中文，默认 minimax
 *   npx tsx scripts/generate-narrator-audio.ts en           # 仅英文，默认 minimax
 *   npx tsx scripts/generate-narrator-audio.ts --provider edge-tts        # 全语言，edge-tts
 *   npx tsx scripts/generate-narrator-audio.ts zh --provider edge-tts     # 仅中文，edge-tts
 *
 * MiniMax provider 需要在 .env.local 中配置 MINIMAX_API_KEY 和 MINIMAX_GROUP_ID。
 * Edge TTS provider 无需任何 API 密钥（使用微软 Edge 免费 TTS 服务）。
 */

import * as fs from "node:fs";
import * as path from "node:path";
import * as https from "node:https";
import { URL } from "node:url";
import { Communicate } from "edge-tts-universal";

// 手动加载 .env.local 环境变量
function loadEnvFile(filePath: string): void {
  if (!fs.existsSync(filePath)) {
    console.warn(`Warning: ${filePath} not found`);
    return;
  }
  const content = fs.readFileSync(filePath, "utf8");
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIndex = trimmed.indexOf("=");
    if (eqIndex === -1) continue;
    const key = trimmed.slice(0, eqIndex).trim();
    let value = trimmed.slice(eqIndex + 1).trim();
    // 移除引号
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}

loadEnvFile(path.join(process.cwd(), ".env.local"));

// MiniMax voice IDs for each language (narrator)
const NARRATOR_VOICE_IDS: Record<string, string> = {
  zh: "Chinese (Mandarin)_Mature_Woman",
  en: "Serene_Woman",
};

// Edge TTS voice IDs for each language (narrator)
const NARRATOR_EDGE_TTS_VOICE_IDS: Record<string, string> = {
  zh: "zh-CN-XiaoxiaoNeural",
  en: "en-GB-SoniaNeural",
};

// Chinese narrator texts
const NARRATOR_TEXTS_ZH: Record<string, string> = {
  nightFall: "天黑请闭眼",
  guardWake: "守卫请睁眼",
  guardClose: "守卫请闭眼",
  wolfWake: "狼人请睁眼",
  wolfClose: "狼人请闭眼",
  witchWake: "女巫请睁眼",
  witchClose: "女巫请闭眼",
  seerWake: "预言家请睁眼",
  seerClose: "预言家请闭眼",
  dayBreak: "天亮了，请睁眼",
  peacefulNight: "昨晚是平安夜",
  discussionStart: "开始自由发言",
  voteStart: "发言结束，开始投票",
  badgeSpeechStart: "警徽竞选开始",
  badgeElectionStart: "开始警徽评选",
  playerDied1: "1号玩家出局",
  playerDied2: "2号玩家出局",
  playerDied3: "3号玩家出局",
  playerDied4: "4号玩家出局",
  playerDied5: "5号玩家出局",
  playerDied6: "6号玩家出局",
  playerDied7: "7号玩家出局",
  playerDied8: "8号玩家出局",
  playerDied9: "9号玩家出局",
  playerDied10: "10号玩家出局",
  villageWin: "好人获胜",
  wolfWin: "狼人获胜",
};

// English narrator texts
const NARRATOR_TEXTS_EN: Record<string, string> = {
  nightFall: "Night has fallen, please close your eyes",
  guardWake: "Guard, please open your eyes",
  guardClose: "Guard, please close your eyes",
  wolfWake: "Werewolves, please open your eyes",
  wolfClose: "Werewolves, please close your eyes",
  witchWake: "Witch, please open your eyes",
  witchClose: "Witch, please close your eyes",
  seerWake: "Seer, please open your eyes",
  seerClose: "Seer, please close your eyes",
  dayBreak: "Dawn has broken, please open your eyes",
  peacefulNight: "Last night was peaceful",
  discussionStart: "Discussion begins",
  voteStart: "Discussion ends, voting begins",
  badgeSpeechStart: "Sheriff election begins",
  badgeElectionStart: "Sheriff voting begins",
  playerDied1: "Player 1 has been eliminated",
  playerDied2: "Player 2 has been eliminated",
  playerDied3: "Player 3 has been eliminated",
  playerDied4: "Player 4 has been eliminated",
  playerDied5: "Player 5 has been eliminated",
  playerDied6: "Player 6 has been eliminated",
  playerDied7: "Player 7 has been eliminated",
  playerDied8: "Player 8 has been eliminated",
  playerDied9: "Player 9 has been eliminated",
  playerDied10: "Player 10 has been eliminated",
  villageWin: "The village wins",
  wolfWin: "The werewolves win",
};

// Texts by locale
const NARRATOR_TEXTS_BY_LOCALE: Record<string, Record<string, string>> = {
  zh: NARRATOR_TEXTS_ZH,
  en: NARRATOR_TEXTS_EN,
};

const BASE_OUTPUT_DIR = path.join(process.cwd(), "public", "audio", "narrator");

/** Synthesize text using Edge TTS and return a MP3 Buffer. */
async function requestEdgeTTS(text: string, voiceId: string): Promise<Buffer> {
  const communicate = new Communicate(text, { voice: voiceId, connectionTimeout: 15000 });
  const chunks: Buffer[] = [];
  await Promise.race([
    (async () => {
      for await (const chunk of communicate.stream()) {
        if (chunk.type === "audio" && chunk.data) chunks.push(chunk.data);
      }
    })(),
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("EdgeTTS synthesis timeout")), 60000)
    ),
  ]);
  if (chunks.length === 0) throw new Error("EdgeTTS: no audio data received");
  return Buffer.concat(chunks);
}

async function requestMiniMaxTTS(text: string, voiceId: string): Promise<Buffer> {
  const apiKey = process.env.MINIMAX_API_KEY;
  const groupId = process.env.MINIMAX_GROUP_ID;

  if (!apiKey || !groupId) {
    throw new Error("Missing MINIMAX_API_KEY or MINIMAX_GROUP_ID in environment variables");
  }

  const baseUrl = process.env.MINIMAX_API_BASE_URL || "https://api.minimax.chat";
  const url = `${baseUrl}/v1/t2a_v2?GroupId=${encodeURIComponent(groupId)}`;

  const payload = {
    model: process.env.MINIMAX_TTS_MODEL || "speech-01-turbo",
    text: text,
    stream: false,
    voice_setting: {
      voice_id: voiceId,
      speed: 1.0,
      vol: 1.0,
      pitch: 0,
    },
    audio_setting: {
      sample_rate: 32000,
      bitrate: 128000,
      format: "mp3",
      channel: 1,
    },
  };

  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const req = https.request(
      {
        protocol: u.protocol,
        hostname: u.hostname,
        port: u.port ? Number(u.port) : 443,
        path: `${u.pathname}${u.search}`,
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          GroupId: groupId,
          "Accept-Encoding": "identity",
        },
        family: 4,
      },
      (res) => {
        const chunks: Buffer[] = [];
        res.on("data", (c) => chunks.push(Buffer.isBuffer(c) ? c : Buffer.from(c)));
        res.on("end", () => {
          const body = Buffer.concat(chunks);

          if (res.statusCode && (res.statusCode < 200 || res.statusCode >= 300)) {
            reject(new Error(`MiniMax API error: ${res.statusCode} ${body.toString("utf8")}`));
            return;
          }

          const contentType = res.headers["content-type"];
          
          if (typeof contentType === "string" && contentType.includes("application/json")) {
            try {
              const json = JSON.parse(body.toString("utf8"));
              
              if (json.base_resp && json.base_resp.status_code !== 0) {
                reject(new Error(`MiniMax error: ${json.base_resp.status_msg}`));
                return;
              }

              const dataStr: string | undefined =
                (typeof json.data === "string" ? json.data : undefined) ??
                json.data?.audio ??
                json.data?.data ??
                json.audio?.data ??
                json.audio_data;

              if (typeof dataStr === "string" && dataStr.trim()) {
                const t = dataStr.trim();
                const looksLikeHex = /^[0-9a-fA-F]+$/.test(t) && t.length % 2 === 0;
                const buffer = looksLikeHex 
                  ? Buffer.from(t, "hex") 
                  : Buffer.from(t, "base64");
                resolve(buffer);
                return;
              }

              reject(new Error("No audio data in response"));
            } catch (e) {
              reject(new Error(`Failed to parse JSON response: ${e}`));
            }
          } else {
            resolve(body);
          }
        });
      }
    );

    req.on("error", reject);
    req.setTimeout(30000, () => {
      req.destroy(new Error("Request timeout"));
    });

    req.write(JSON.stringify(payload));
    req.end();
  });
}

async function generateNarratorAudioForLocale(locale: string, provider: string) {
  const texts = NARRATOR_TEXTS_BY_LOCALE[locale];
  const voiceId = provider === "edge-tts"
    ? NARRATOR_EDGE_TTS_VOICE_IDS[locale]
    : NARRATOR_VOICE_IDS[locale];

  if (!texts || !voiceId) {
    console.error(`[ERROR] Unknown locale: ${locale}`);
    return { success: 0, fail: 0 };
  }

  const outputDir = path.join(BASE_OUTPUT_DIR, locale);

  // 确保输出目录存在
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
    console.log(`Created output directory: ${outputDir}`);
  }

  const entries = Object.entries(texts);
  console.log(`\n[${locale.toUpperCase()}] Generating ${entries.length} narrator audio files... (provider: ${provider})`);
  console.log(`Voice ID: ${voiceId}\n`);

  let successCount = 0;
  let failCount = 0;

  for (const [key, text] of entries) {
    const outputPath = path.join(outputDir, `${key}.mp3`);

    // 检查文件是否已存在
    if (fs.existsSync(outputPath)) {
      console.log(`[SKIP] ${key}: File already exists`);
      successCount++;
      continue;
    }

    try {
      console.log(`[GEN] ${key}: "${text}"`);
      const audioBuffer = provider === "edge-tts"
        ? await requestEdgeTTS(text, voiceId)
        : await requestMiniMaxTTS(text, voiceId);
      fs.writeFileSync(outputPath, audioBuffer);
      console.log(`[OK] ${key}: Saved (${audioBuffer.length} bytes)`);
      successCount++;

      // 添加延迟避免 API 限流 (minimax) 或过快请求 (edge-tts)
      await new Promise(resolve => setTimeout(resolve, provider === "edge-tts" ? 300 : 500));
    } catch (error) {
      console.error(`[FAIL] ${key}: ${error}`);
      failCount++;
    }
  }

  return { success: successCount, fail: failCount };
}

async function generateAllNarratorAudio(targetLocale?: string, provider = "minimax") {
  const localesToGenerate = targetLocale
    ? [targetLocale]
    : Object.keys(NARRATOR_TEXTS_BY_LOCALE);

  console.log(`\n========================================`);
  console.log(`Narrator Audio Generation`);
  console.log(`Target locales: ${localesToGenerate.join(", ")}`);
  console.log(`Provider: ${provider}`);
  console.log(`========================================`);

  let totalSuccess = 0;
  let totalFail = 0;

  for (const locale of localesToGenerate) {
    const result = await generateNarratorAudioForLocale(locale, provider);
    totalSuccess += result.success;
    totalFail += result.fail;
  }

  console.log(`\n========================================`);
  console.log(`Generation complete!`);
  console.log(`Total Success: ${totalSuccess}, Total Failed: ${totalFail}`);
  console.log(`Output directory: ${BASE_OUTPUT_DIR}`);
  console.log(`========================================\n`);
}

// Parse command line arguments
// Usage: npx tsx scripts/generate-narrator-audio.ts [locale] [--provider minimax|edge-tts]
const args = process.argv.slice(2);
const providerFlag = args.find((a) => a === "--provider");
const provider = providerFlag ? args[args.indexOf("--provider") + 1] ?? "minimax" : "minimax";
const targetLocale = args.filter((a) => !a.startsWith("--") && a !== provider)[0];

if (provider !== "minimax" && provider !== "edge-tts") {
  console.error(`[ERROR] Invalid provider: ${provider}`);
  console.error(`Available providers: minimax, edge-tts`);
  process.exit(1);
}

if (targetLocale && !NARRATOR_TEXTS_BY_LOCALE[targetLocale]) {
  console.error(`[ERROR] Invalid locale: ${targetLocale}`);
  console.error(`Available locales: ${Object.keys(NARRATOR_TEXTS_BY_LOCALE).join(", ")}`);
  process.exit(1);
}

// 运行脚本
generateAllNarratorAudio(targetLocale, provider).catch(console.error);
