/**
 * DiceBear Notionists Avatar Configuration
 * 
 * 头像配置规则：
 * - 发型共 63 个变量 (variant01 - variant63)
 * - 嘴型共 30 个变量 (variant01 - variant30)
 * - 身体共 25 个变量 (variant01 - variant25)
 * - 眉毛共 13 个变量 (variant01 - variant13)
 */

import type { ModelRef } from "@/types/game";
import type { Gender } from "./character-generator";
import { getModelLogoPath } from "./model-logo";

// ============================================
// 发型配置 (Hair)
// ============================================

// 不使用的发型变体（视觉效果不佳）
const EXCLUDED_HAIR: readonly string[] = [
  "variant29", // 短波波头（不采用）
  "variant59", // 不采用
] as const;

// 女性专属发型：长发、卷发、带发饰类
const FEMALE_ONLY_HAIR: readonly string[] = [
  "variant02",
  "variant04",
  "variant08", // 长卷发（垂肩）
  "variant10",
  "variant20",
  "variant23",
  "variant28",
  "variant30",
  "variant36",
  "variant37",
  "variant39", // 带发饰/头带
  "variant41",
  "variant45",
  "variant46",
  "variant47",
  "variant57", // 丸子头/盘发
  "variant62", // 包头布
  "variant63", // 深色包头
] as const;

// 生成所有发型变量 (1-63)，排除不使用的变体
const ALL_HAIR_VARIANTS: string[] = Array.from(
  { length: 63 },
  (_, i) => `variant${String(i + 1).padStart(2, "0")}`
).filter((v) => !EXCLUDED_HAIR.includes(v));

// 男性/非二元发型：排除女性专属
const NON_FEMALE_HAIR: string[] = ALL_HAIR_VARIANTS.filter(
  (v) => !FEMALE_ONLY_HAIR.includes(v)
);

// ============================================
// 身体/服装配置 (Body) - 25种
// ============================================

// 女性偏向服装：柔和、休闲、图案装饰类
const FEMALE_BODY: readonly string[] = [
  "variant01", "variant02", "variant03", "variant04", "variant05",
  "variant10", "variant11", "variant12", "variant15",
  "variant21", "variant22", "variant23", "variant24",
] as const;

// 男性偏向服装：西装、领带、正装、马甲类
const MALE_BODY: readonly string[] = [
  "variant01", "variant02", "variant03", "variant04", "variant05",
  "variant06", "variant07", "variant08", "variant09",
  "variant13", "variant14", "variant16", "variant17",
  "variant18", "variant19", "variant20", "variant25",
] as const;

// ============================================
// 眉毛配置 (Brows) - 13种
// ============================================

// 女性偏向眉毛：细、拱形、精致
const FEMALE_BROWS: readonly string[] = [
  "variant01", "variant04", "variant06",
  "variant08", "variant09", "variant10",
  "variant11", "variant12", "variant13",
] as const;

// 男性偏向眉毛：粗重、平直、倾斜
const MALE_BROWS: readonly string[] = [
  "variant01", "variant02", "variant03",
  "variant05", "variant06", "variant07",
  "variant09", "variant13",
] as const;

// ============================================
// 嘴型配置 (Lips)
// ============================================

// 禁止使用的嘴型
const FORBIDDEN_LIPS: readonly string[] = [
  "variant01",
  "variant02",
  "variant05",
] as const;

// 说话动画时切换的嘴型
const TALKING_LIPS: readonly string[] = ["variant04", "variant11"] as const;

// 生成所有嘴型变量 (1-30)
const ALL_LIPS_VARIANTS: string[] = Array.from(
  { length: 30 },
  (_, i) => `variant${String(i + 1).padStart(2, "0")}`
);

// 静止状态可用的嘴型 (排除禁止的和说话专用的)
const IDLE_LIPS: string[] = ALL_LIPS_VARIANTS.filter(
  (v) => !FORBIDDEN_LIPS.includes(v) && !TALKING_LIPS.includes(v)
);

const ALL_EYES_VARIANTS: readonly string[] = [
  "variant01",
  "variant02",
  "variant03",
  "variant04",
  "variant05",
] as const;

const FORBIDDEN_EYES: readonly string[] = ["variant03"] as const;

const DAY_EYES: string[] = ALL_EYES_VARIANTS.filter((v) => !FORBIDDEN_EYES.includes(v));

export function getDayEyesForSeed(seed: string): string {
  return DAY_EYES[hashString(seed) % DAY_EYES.length];
}

// ============================================
// 头像背景色
// ============================================

const AVATAR_BG_COLORS: readonly string[] = [
  "e8d5c4", "d4e5d7", "d5dce8", "e8d4d9", "ddd4e8",
  "d4e8e5", "e8e4d4", "d4d8e8", "e5d4d4", "dae8d4",
] as const;

// ============================================
// 工具函数
// ============================================

/**
 * 根据 seed 生成稳定的哈希值
 */
function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return Math.abs(hash);
}

/**
 * 根据 seed 获取背景色
 */
export function getAvatarBgColor(seed: string): string {
  return AVATAR_BG_COLORS[hashString(seed) % AVATAR_BG_COLORS.length];
}

/**
 * 根据性别获取可用的身体/服装变量
 */
export function getBodyForSeed(seed: string, gender: Gender): string {
  const pool = gender === "female" ? FEMALE_BODY : MALE_BODY;
  return pool[hashString(seed) % pool.length];
}

/**
 * 根据性别获取可用的眉毛变量
 */
export function getBrowsForSeed(seed: string, gender: Gender): string {
  const pool = gender === "female" ? FEMALE_BROWS : MALE_BROWS;
  return pool[hashString(seed) % pool.length];
}

/**
 * 根据性别获取胡须概率
 */
export function getBeardProbability(gender: Gender): number {
  if (gender === "female") return 0;
  if (gender === "nonbinary") return 5;
  return 20; // male
}

/**
 * 根据性别获取可用的发型列表
 */
export function getHairVariantsForGender(gender: Gender): string[] {
  if (gender === "female") {
    // 女性只使用长发发型
    return [...FEMALE_ONLY_HAIR];
  }
  // 男性/非二元只使用非长发发型
  return [...NON_FEMALE_HAIR];
}

/**
 * 根据 seed 和性别获取稳定的发型
 */
export function getHairForSeed(seed: string, gender: Gender): string {
  const variants = getHairVariantsForGender(gender);
  return variants[hashString(seed) % variants.length];
}

/**
 * 获取静止状态的嘴型
 */
export function getIdleLipsForSeed(seed: string): string {
  return IDLE_LIPS[hashString(seed) % IDLE_LIPS.length];
}

/**
 * 获取说话动画的嘴型列表
 */
export function getTalkingLips(): readonly string[] {
  return TALKING_LIPS;
}

/**
 * 获取默认的静止嘴型 (用于不需要个性化的场景)
 */
export function getDefaultIdleLips(): string {
  // 使用 variant03 作为默认静止嘴型
  return "variant03";
}

// ============================================
// URL 构建
// ============================================

export interface AvatarUrlOptions {
  seed: string;
  gender?: Gender;
  eyes?: string;
  lips?: string;
  hair?: string;
  body?: string;
  brows?: string;
  scale?: number;
  translateY?: number;
  backgroundColor?: string | "transparent";
}

/**
 * 构建 DiceBear Notionists 头像 URL
 */
export function buildAvatarUrl(options: AvatarUrlOptions): string {
  const {
    seed,
    gender,
    eyes,
    lips,
    hair,
    body,
    brows,
    scale = 100,
    translateY = 0,
    backgroundColor,
  } = options;

  const params = new URLSearchParams();
  params.set("seed", seed);

  // 背景色
  if (backgroundColor) {
    params.set("backgroundColor", backgroundColor);
  } else {
    params.set("backgroundColor", getAvatarBgColor(seed));
  }

  // 缩放和位移
  if (scale !== 100) {
    params.set("scale", String(scale));
  }
  if (translateY !== 0) {
    params.set("translateY", String(translateY));
  }

  // 发型 - 如果提供了 gender，则根据性别选择
  if (hair) {
    params.set("hair", hair);
  } else if (gender) {
    params.set("hair", getHairForSeed(seed, gender));
  }

  const resolvedEyes = eyes ?? getDayEyesForSeed(seed);
  params.set("eyes", resolvedEyes);

  // 嘴型
  if (lips) {
    params.set("lips", lips);
  }

  // 身体/服装 - 根据性别选择候选池
  if (body) {
    params.set("body", body);
  } else if (gender) {
    params.set("body", getBodyForSeed(seed, gender));
  }

  // 眉毛 - 根据性别选择候选池
  if (brows) {
    params.set("brows", brows);
  } else if (gender) {
    params.set("brows", getBrowsForSeed(seed, gender));
  }

  // 胡子概率 - 按性别设置（女性=0，男性=20，非二元=5）
  params.set("beardProbability", String(gender ? getBeardProbability(gender) : 0));

  return `https://api.dicebear.com/7.x/notionists/svg?${params.toString()}`;
}

/**
 * 简化版 URL 构建 - 用于快速生成头像（兼容旧代码）
 */
export function buildSimpleAvatarUrl(
  seed: string,
  backgroundColorOrOptions?:
    | string
    | {
        backgroundColor?: string | "transparent";
        gender?: Gender;
        eyes?: string;
      }
): string {
  const backgroundColor =
    typeof backgroundColorOrOptions === "string"
      ? backgroundColorOrOptions
      : backgroundColorOrOptions?.backgroundColor;

  const gender =
    typeof backgroundColorOrOptions === "string" ? undefined : backgroundColorOrOptions?.gender;

  const eyes =
    typeof backgroundColorOrOptions === "string" ? undefined : backgroundColorOrOptions?.eyes;

  return buildAvatarUrl({
    seed,
    gender,
    eyes,
    backgroundColor: backgroundColor || getAvatarBgColor(seed),
  });
}

export const getModelLogoUrl = (modelRef?: ModelRef): string => getModelLogoPath(modelRef);

// ============================================
// 导出常量供外部使用
// ============================================

export const AvatarConfig = {
  FEMALE_ONLY_HAIR,
  NON_FEMALE_HAIR,
  ALL_HAIR_VARIANTS,
  FEMALE_BODY,
  MALE_BODY,
  FEMALE_BROWS,
  MALE_BROWS,
  TALKING_LIPS,
  IDLE_LIPS,
  FORBIDDEN_LIPS,
  AVATAR_BG_COLORS,
} as const;
