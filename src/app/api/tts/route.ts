import { NextRequest, NextResponse } from "next/server";
import type { IncomingHttpHeaders } from "node:http";
import * as https from "node:https";
import { URL } from "node:url";
import * as zlib from "node:zlib";
import { Communicate } from "edge-tts-universal";
import { DEFAULT_VOICE_ID, getEdgeTtsParams } from "@/lib/voice-constants";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Parse the TTS_PROVIDERS env var into an ordered list of provider names. */
function getTtsProviders(): string[] {
  const raw = process.env.TTS_PROVIDERS || "minimax";
  return raw
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

export async function POST(req: NextRequest) {
  try {
    const parsed = await req.json().catch(() => ({} as any));
    const text = typeof parsed?.text === "string" ? parsed.text : String(parsed?.text ?? "");
    const voiceId = typeof parsed?.voiceId === "string" ? parsed.voiceId : String(parsed?.voiceId ?? "");

    const normText = text.trim();
    const normVoiceId = voiceId.trim();

    if (!normText || !normVoiceId) {
      return NextResponse.json({ error: "Missing text or voiceId" }, { status: 400 });
    }

    // ------------------------------------------------------------------ helpers

    const requestBuffer = async (inputUrl: string, init: {
      method: "GET" | "POST";
      headers?: Record<string, string>;
      body?: string;
      timeoutMs: number;
    }): Promise<{ statusCode: number; headers: IncomingHttpHeaders; body: Buffer }> => {
      const u = new URL(inputUrl);
      if (u.protocol !== "https:") {
        throw new Error(`Unsupported protocol: ${u.protocol}`);
      }

      return await new Promise((resolve, reject) => {
        const req2 = https.request(
          {
            protocol: u.protocol,
            hostname: u.hostname,
            port: u.port ? Number(u.port) : 443,
            path: `${u.pathname}${u.search}`,
            method: init.method,
            headers: init.headers,
            family: 4,
          },
          (res) => {
            const chunks: Buffer[] = [];
            res.on("data", (c) => chunks.push(Buffer.isBuffer(c) ? c : Buffer.from(c)));
            res.on("end", () => {
              const raw = Buffer.concat(chunks);

              const enc = res.headers["content-encoding"];
              const encStr = Array.isArray(enc) ? enc.join(",") : enc;

              let body = raw;
              try {
                if (typeof encStr === "string" && encStr) {
                  const e = encStr.toLowerCase();
                  if (e.includes("br")) body = zlib.brotliDecompressSync(raw);
                  else if (e.includes("gzip")) body = zlib.gunzipSync(raw);
                  else if (e.includes("deflate")) body = zlib.inflateSync(raw);
                }
              } catch (decompressErr) {
                console.error("Response decompress failed:", decompressErr);
                body = raw;
              }

              resolve({ statusCode: res.statusCode || 0, headers: res.headers, body });
            });
          }
        );

        req2.on("error", reject);
        req2.setTimeout(init.timeoutMs, () => {
          req2.destroy(new Error("RequestTimeout"));
        });

        if (init.body) req2.write(init.body);
        req2.end();
      });
    };

    const bufferToArrayBuffer = (b: Buffer): ArrayBuffer => {
      const ab = new ArrayBuffer(b.byteLength);
      new Uint8Array(ab).set(b);
      return ab;
    };

    const sniffAudioMime = (b: Buffer): { mime: string | null; reason?: string } => {
      if (!b || b.length < 4) return { mime: null, reason: "empty_or_too_short" };
      if (b.length >= 12 && b.slice(0, 4).toString("ascii") === "RIFF" && b.slice(8, 12).toString("ascii") === "WAVE") {
        return { mime: "audio/wav" };
      }
      if (b.slice(0, 4).toString("ascii") === "OggS") return { mime: "audio/ogg" };
      if (b.slice(0, 3).toString("ascii") === "ID3") return { mime: "audio/mpeg" };
      if (b[0] === 0xff && (b[1] & 0xe0) === 0xe0) return { mime: "audio/mpeg" };
      const head = b.slice(0, 64).toString("utf8").trim();
      if (head.startsWith("{") || head.startsWith("[") || head.toLowerCase().includes("error")) {
        return { mime: null, reason: "looks_like_text_or_json" };
      }
      return { mime: null, reason: "unknown_format" };
    };

    const respondAudio = (b: Buffer, extraHeaders?: Record<string, string>) => {
      const sniff = sniffAudioMime(b);
      if (!sniff.mime) {
        const preview = b.slice(0, 400).toString("utf8");
        return NextResponse.json(
          { error: "TTS audio is not in a supported format.", reason: sniff.reason, byteLength: b.length, preview },
          { status: 502 }
        );
      }
      return new NextResponse(bufferToArrayBuffer(b), {
        headers: {
          "Content-Type": sniff.mime,
          "Content-Length": b.length.toString(),
          ...(extraHeaders ?? {}),
        },
      });
    };

    // ------------------------------------------------------------------ edge-tts provider

    const tryEdgeTts = async (): Promise<NextResponse> => {
      const { voice: edgeTtsVoiceId, pitch, rate } = getEdgeTtsParams(normVoiceId);

      const MAX_ATTEMPTS = 3;
      const ATTEMPT_TIMEOUT_MS = 8000;  // 每次合成超时
      const CONNECTION_TIMEOUT_MS = 6000;
      const RETRY_DELAY_MS = 300;

      let lastError: Error = new Error("EdgeTTS: no attempts made");

      for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
        // 每次重试必须 new 一个新实例，stream() 只能调用一次
        const communicate = new Communicate(normText, {
          voice: edgeTtsVoiceId,
          connectionTimeout: CONNECTION_TIMEOUT_MS,
          ...(pitch ? { pitch } : {}),
          ...(rate  ? { rate  } : {}),
        });

        const chunks: Buffer[] = [];
        let timeoutHandle: ReturnType<typeof setTimeout> | null = null;

        try {
          await Promise.race([
            (async () => {
              for await (const chunk of communicate.stream()) {
                if (chunk.type === "audio" && chunk.data) {
                  chunks.push(chunk.data);
                }
              }
            })(),
            new Promise<never>((_, reject) => {
              timeoutHandle = setTimeout(
                () => reject(new Error(`EdgeTTS synthesis timeout (${ATTEMPT_TIMEOUT_MS / 1000}s)`)),
                ATTEMPT_TIMEOUT_MS
              );
            }),
          ]);

          if (chunks.length === 0) {
            throw new Error("EdgeTTS: no audio data received");
          }

          const audioBuffer = Buffer.concat(chunks);
          return respondAudio(audioBuffer, {
            "X-TTS-Provider": "edge-tts",
            "X-Edge-Voice-Id": edgeTtsVoiceId,
            ...(attempt > 1 ? { "X-Edge-Retry-Attempt": String(attempt) } : {}),
          });
        } catch (e) {
          lastError = e instanceof Error ? e : new Error(String(e));
          console.warn(`EdgeTTS attempt ${attempt}/${MAX_ATTEMPTS} failed: ${lastError.message}`);
          if (attempt < MAX_ATTEMPTS) {
            await new Promise((r) => setTimeout(r, RETRY_DELAY_MS));
          }
        } finally {
          if (timeoutHandle !== null) clearTimeout(timeoutHandle);
        }
      }

      throw lastError;
    };

    // ------------------------------------------------------------------ minimax provider

    const pickFallbackVoiceId = (badVoiceId: string) => {
      const v = badVoiceId.toLowerCase();
      if (v.startsWith("female") || v.includes("female")) return DEFAULT_VOICE_ID.female;
      return DEFAULT_VOICE_ID.male;
    };

    const tryMiniMax = async (): Promise<NextResponse> => {
      const headerApiKey = req.headers.get("x-minimax-api-key")?.trim();
      const headerGroupId = req.headers.get("x-minimax-group-id")?.trim();
      const apiKey = headerApiKey || process.env.MINIMAX_API_KEY;
      const groupId = headerGroupId || process.env.MINIMAX_GROUP_ID;

      if (!apiKey || !groupId) {
        throw new Error("MiniMax credentials not configured (MINIMAX_API_KEY / MINIMAX_GROUP_ID)");
      }

      // 参考文档：https://platform.minimaxi.com/document/T2A%20V2
      const baseUrlFromEnv = process.env.MINIMAX_API_BASE_URL;
      const primaryBaseUrl = baseUrlFromEnv || "https://api.minimax.chat";
      const candidateBaseUrls = [primaryBaseUrl];
      if (!baseUrlFromEnv) {
        candidateBaseUrls.push(
          primaryBaseUrl.includes("minimaxi.com")
            ? "https://api.minimax.chat"
            : "https://api.minimaxi.com"
        );
      }

      const payload = {
        model: process.env.MINIMAX_TTS_MODEL || "speech-01-turbo",
        text: normText,
        stream: false,
        voice_setting: { voice_id: normVoiceId, speed: 1.0, vol: 1.0, pitch: 0 },
        audio_setting: { sample_rate: 32000, bitrate: 128000, format: "mp3", channel: 1 },
      };

      const requestMiniMaxRaw = async (voiceIdForRequest: string) => {
        payload.voice_setting.voice_id = voiceIdForRequest;
        let response: { statusCode: number; headers: IncomingHttpHeaders; body: Buffer } | null = null;
        let lastErr: unknown = null;
        for (const baseUrl of candidateBaseUrls) {
          const url = `${baseUrl}/v1/t2a_v2?GroupId=${encodeURIComponent(groupId)}`;
          try {
            response = await requestBuffer(url, {
              method: "POST",
              headers: {
                Authorization: `Bearer ${apiKey}`,
                "Content-Type": "application/json",
                GroupId: groupId,
                "Accept-Encoding": "identity",
              },
              body: JSON.stringify(payload),
              timeoutMs: 30000,
            });
            break;
          } catch (e) {
            lastErr = e;
            continue;
          }
        }
        if (!response) {
          throw new Error(
            `MiniMax fetch failed (connect timeout / network). Attempted: ${candidateBaseUrls.join(", ")}. ` +
            `Set MINIMAX_API_BASE_URL to the correct domain. Last error: ${lastErr}`
          );
        }
        return response;
      };

      let usedVoiceId = normVoiceId;

      for (let attempt = 0; attempt < 2; attempt++) {
        const response = await requestMiniMaxRaw(usedVoiceId);

        if (response.statusCode < 200 || response.statusCode >= 300) {
          const errorText = response.body.toString("utf8");
          console.error("MiniMax API Error:", response.statusCode, errorText);
          throw new Error(`MiniMax API error ${response.statusCode}: ${errorText.slice(0, 400)}`);
        }

        const contentType = response.headers["content-type"];

        if (typeof contentType === "string" && contentType.includes("application/json")) {
          let json: any;
          try {
            json = JSON.parse(response.body.toString("utf8"));
          } catch (e) {
            const preview = response.body.slice(0, 600).toString("utf8");
            throw new Error(`MiniMax JSON parse failed: ${e}. Preview: ${preview}`);
          }

          if (json.base_resp && json.base_resp.status_code !== 0) {
            const code = Number(json.base_resp.status_code);
            const msg = String(json.base_resp.status_msg || "");
            if (code === 2054 && attempt === 0) {
              const fallback = pickFallbackVoiceId(usedVoiceId);
              if (fallback !== usedVoiceId) { usedVoiceId = fallback; continue; }
            }
            throw new Error(`MiniMax base_resp error ${code}: ${msg}`);
          }

          const dataStr: unknown =
            (typeof json.data === "string" ? json.data : undefined) ??
            json.data?.audio ?? json.data?.data ?? json.audio?.data ?? json.audio_data;

          const audioUrl: unknown = json.audio?.url ?? json.data?.url ?? json.url;

          if (typeof audioUrl === "string" && audioUrl.startsWith("http")) {
            const audioResp = await requestBuffer(audioUrl, { method: "GET", headers: { "Accept-Encoding": "identity" }, timeoutMs: 30000 });
            if (audioResp.statusCode < 200 || audioResp.statusCode >= 300) {
              throw new Error(`MiniMax audio URL fetch failed: ${audioResp.statusCode}`);
            }
            return respondAudio(audioResp.body, {
              "X-TTS-Provider": "minimax",
              "X-Minimax-Voice-Id-Requested": normVoiceId,
              "X-Minimax-Voice-Id-Used": usedVoiceId,
            });
          }

          if (typeof dataStr === "string" && dataStr.trim()) {
            const t = dataStr.trim();
            const maybeB64 = t.startsWith("data:") ? t.split(",").slice(1).join(",") : t;
            const looksLikeBase64 = /[+/=]/.test(maybeB64);
            const looksLikeHex = !looksLikeBase64 && /^[0-9a-fA-F]+$/.test(t) && t.length % 2 === 0;
            let buffer: Buffer;
            let altBuffer: Buffer | null = null;
            if (looksLikeHex) {
              buffer = Buffer.from(t, "hex");
              try { altBuffer = Buffer.from(maybeB64, "base64"); } catch { altBuffer = null; }
            } else {
              buffer = Buffer.from(maybeB64, "base64");
              if (/^[0-9a-fA-F]+$/.test(t) && t.length % 2 === 0) {
                try { altBuffer = Buffer.from(t, "hex"); } catch { altBuffer = null; }
              }
            }
            const primarySniff = sniffAudioMime(buffer);
            if (!primarySniff.mime && altBuffer && sniffAudioMime(altBuffer).mime) buffer = altBuffer;
            return respondAudio(buffer, {
              "X-TTS-Provider": "minimax",
              "X-Minimax-Voice-Id-Requested": normVoiceId,
              "X-Minimax-Voice-Id-Used": usedVoiceId,
            });
          }
        }

        return respondAudio(response.body, {
          "X-TTS-Provider": "minimax",
          "X-Minimax-Voice-Id-Requested": normVoiceId,
          "X-Minimax-Voice-Id-Used": usedVoiceId,
        });
      }

      throw new Error(`MiniMax voiceId retry exhausted. voiceId: ${usedVoiceId}`);
    };

    // ------------------------------------------------------------------ provider loop

    const providers = getTtsProviders();
    const errors: string[] = [];

    for (const provider of providers) {
      try {
        if (provider === "edge-tts") {
          return await tryEdgeTts();
        } else if (provider === "minimax") {
          return await tryMiniMax();
        } else {
          console.warn(`TTS: unknown provider '${provider}', skipping`);
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        console.error(`TTS provider '${provider}' failed:`, msg);
        errors.push(`[${provider}] ${msg}`);
        // continue to next provider
      }
    }

    return NextResponse.json(
      { error: "All TTS providers failed", providers, errors },
      { status: 502 }
    );

  } catch (error) {
    console.error("TTS API Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

