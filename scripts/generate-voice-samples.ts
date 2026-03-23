/**
 * 音色试听样本生成脚本
 * 为 VOICE_PRESETS 和 ENGLISH_VOICE_PRESETS 中的每个音色生成一段示例音频。
 * 生成的文件以音色 ID 为文件名，存放在 public/audio/samples/edge-tts/ 目录下。
 *
 * 使用方法:
 *   npx tsx scripts/generate-voice-samples.ts
 *   npx tsx scripts/generate-voice-samples.ts --force   # 强制覆盖已有文件
 *   npx tsx scripts/generate-voice-samples.ts --id "male-qn-jingying"  # 只生成指定 ID
 */

import * as fs from "node:fs";
import * as path from "node:path";
import { Communicate } from "edge-tts-universal";
import { VOICE_PRESETS, ENGLISH_VOICE_PRESETS } from "../src/lib/voice-constants";

const OUTPUT_DIR = path.join(process.cwd(), "public", "audio", "samples", "edge-tts");

// 示例文本：中文音色用中文句子，英文音色用英文句子
const SAMPLE_TEXT_ZH =
  "大家好，我是这局游戏的玩家，很高兴认识你们，希望我们能一起找出狼人，保卫村庄。";
const SAMPLE_TEXT_EN =
  "Hello everyone, I'm a player in this game. Nice to meet you all. Let's work together to find the werewolves and protect the village.";

const args = process.argv.slice(2);
const forceOverwrite = args.includes("--force");
const idIndex = args.indexOf("--id");
const singleId = idIndex !== -1 ? args[idIndex + 1] : undefined;

async function synthesize(
  text: string,
  voiceId: string,
  pitch?: string,
  rate?: string
): Promise<Buffer> {
  const options: Record<string, unknown> = {
    voice: voiceId,
    connectionTimeout: 15000,
  };
  if (pitch) options.pitch = pitch;
  if (rate) options.rate = rate;

  const communicate = new Communicate(text, options as ConstructorParameters<typeof Communicate>[1]);
  const chunks: Buffer[] = [];

  await Promise.race([
    (async () => {
      for await (const chunk of communicate.stream()) {
        if (chunk.type === "audio" && chunk.data) chunks.push(chunk.data);
      }
    })(),
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("EdgeTTS synthesis timeout (60s)")), 60000)
    ),
  ]);

  if (chunks.length === 0) throw new Error("No audio data received");
  return Buffer.concat(chunks);
}

/** Sanitize voice ID to a safe filename (replace spaces and special chars with underscore) */
function toFilename(id: string): string {
  return id.replace(/[^a-zA-Z0-9\-_\.]/g, "_") + ".mp3";
}

async function main() {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  const allPresets = [...VOICE_PRESETS, ...ENGLISH_VOICE_PRESETS];
  const presets = singleId
    ? allPresets.filter((p) => p.id === singleId)
    : allPresets;

  if (singleId && presets.length === 0) {
    console.error(`No preset found with id: "${singleId}"`);
    process.exit(1);
  }

  console.log(`\nGenerating ${presets.length} voice sample(s) → ${OUTPUT_DIR}\n`);

  let ok = 0;
  let skipped = 0;
  let failed = 0;

  for (const preset of presets) {
    const filename = toFilename(preset.id);
    const outPath = path.join(OUTPUT_DIR, filename);

    if (!forceOverwrite && fs.existsSync(outPath)) {
      console.log(`  [skip] ${preset.name} (${preset.id})`);
      skipped++;
      continue;
    }

    const isEn = ENGLISH_VOICE_PRESETS.some((p) => p.id === preset.id);
    const text = isEn ? SAMPLE_TEXT_EN : SAMPLE_TEXT_ZH;

    process.stdout.write(
      `  [gen]  ${preset.name.padEnd(12)} ${preset.id}` +
      `${preset.edgeTtsPitch ? `  pitch=${preset.edgeTtsPitch}` : ""}` +
      `${preset.edgeTtsRate  ? `  rate=${preset.edgeTtsRate}`   : ""} ...`
    );

    try {
      const buf = await synthesize(text, preset.edgeTtsId, preset.edgeTtsPitch, preset.edgeTtsRate);
      fs.writeFileSync(outPath, buf);
      process.stdout.write(` ✓ (${(buf.length / 1024).toFixed(1)} KB)\n`);
      ok++;
    } catch (err) {
      process.stdout.write(` ✗ ${String(err)}\n`);
      failed++;
    }

    // Brief pause to avoid rate-limiting
    await new Promise((r) => setTimeout(r, 300));
  }

  console.log(`\nDone: ${ok} generated, ${skipped} skipped, ${failed} failed.\n`);
  if (failed > 0) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
