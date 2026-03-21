"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Skull, HourglassSimple, CheckCircle, Target, Users, SpinnerGap } from "@phosphor-icons/react";
import { WerewolfIcon } from "@/components/icons/FlatIcons";
import type { GameState, Player } from "@/types/game";
import { isWolfRole } from "@/types/game";
import { useTranslations } from "next-intl";
import type { WolfConsultStatus } from "@/hooks/useGameLogic";

interface WolfPlanningPanelProps {
  gameState: GameState;
  humanPlayer: Player | null;
  consultStatus?: WolfConsultStatus;
  consultText?: string;
  consultTarget?: number | null;
  onConsultRequest?: () => void;
}

export function WolfPlanningPanel({ gameState, humanPlayer, consultStatus = "idle", consultText = "", consultTarget = null, onConsultRequest }: WolfPlanningPanelProps) {
  const t = useTranslations();
  const wolves = gameState.players.filter(p => isWolfRole(p.role) && p.alive);
  const wolfVotes = gameState.nightActions.wolfVotes || {};
  const votedCount = Object.keys(wolfVotes).length;

  // 统计每个目标的票数
  const voteTargets: Record<number, { voters: Player[], target: Player | undefined }> = {};
  
  Object.entries(wolfVotes).forEach(([voterId, targetSeat]) => {
    const voter = gameState.players.find(p => p.playerId === voterId);
    const target = gameState.players.find(p => p.seat === targetSeat);
    
    if (!voteTargets[targetSeat]) {
      voteTargets[targetSeat] = { voters: [], target };
    }
    if (voter) {
      voteTargets[targetSeat].voters.push(voter);
    }
  });

  // 按票数排序
  const sortedTargets = Object.entries(voteTargets)
    .sort(([, a], [, b]) => b.voters.length - a.voters.length);

  // 判断是否达成一致
  const isConsensus = sortedTargets.length === 1 && votedCount === wolves.length;

  return (
    <div className="wc-wolf-panel bg-[#1a1512] border border-[#3e2723] rounded-lg p-4 text-[#f0e6d2]">
      {/* 标题 */}
      <div className="flex items-center gap-2 mb-4">
        <div className="w-8 h-8 bg-[var(--color-wolf)] rounded-full flex items-center justify-center">
          <WerewolfIcon size={16} className="text-white" />
        </div>
        <div>
          <div className="text-sm font-bold">{t("wolfPlanning.title")}</div>
          <div className="text-xs text-[#a09080]">{t("wolfPlanning.subtitle")}</div>
        </div>
      </div>

      {/* 狼队友状态 */}
      <div className="mb-4">
        <div className="text-xs text-[#a09080] mb-2">{t("wolfPlanning.teammateStatus")}</div>
        <div className="flex flex-col sm:flex-row gap-2">
          {wolves.map(wolf => {
          const hasVoted = wolfVotes[wolf.playerId] !== undefined;
          const votedTarget = hasVoted 
            ? gameState.players.find(p => p.seat === wolfVotes[wolf.playerId])
            : null;
          
          return (
            <motion.div
              key={wolf.playerId}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className={`flex items-center gap-2 p-2 rounded flex-1 min-w-0 ${
                wolf.isHuman ? "bg-[#3e2723]" : "bg-[#2a201a]"
              }`}
            >
              <div className="w-6 h-6 bg-[var(--color-wolf)] rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0">
                {wolf.seat + 1}
              </div>
              <span className="text-xs sm:text-sm flex-1 min-w-0 truncate">
                {wolf.isHuman ? t("common.you") : wolf.displayName}
              </span>
              {hasVoted ? (
                <span className="flex items-center gap-1 text-[10px] sm:text-xs text-green-400 shrink-0">
                  <CheckCircle size={12} weight="fill" />
                  <span className="font-bold">
                    {t("mentions.seatLabel", { seat: wolfVotes[wolf.playerId] + 1 })}
                  </span>
                </span>
              ) : (
                <span className="flex items-center gap-1 text-[10px] sm:text-xs text-yellow-400 shrink-0">
                  <HourglassSimple size={12} className="animate-pulse" />
                  <span className="hidden sm:inline">{t("wolfPlanning.thinking")}</span>
                  <span className="sm:hidden">...</span>
                </span>
              )}
            </motion.div>
          );
        })}
        </div>
      </div>

      {/* 目标汇总 */}
      {sortedTargets.length > 0 && (
        <div className="border-t border-[#3e2723] pt-3">
          <div className="text-xs text-[#a09080] mb-2">{t("wolfPlanning.targetSummary")}</div>
          <AnimatePresence mode="popLayout">
            {sortedTargets.map(([targetSeat, { voters, target }]) => (
              <motion.div
                key={targetSeat}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className={`flex items-center gap-2 p-2 rounded mb-1 ${
                  isConsensus ? "bg-[var(--color-wolf)]/30 border border-[var(--color-wolf)]" : "bg-[#2a201a]"
                }`}
              >
                <Skull size={16} className="text-[var(--color-danger)]" />
                <span className="font-bold">{t("mentions.seatLabel", { seat: Number(targetSeat) + 1 })}</span>
                <span className="text-xs text-[#a09080] truncate">{target?.displayName}</span>
                <span className="ml-auto text-sm font-bold text-[var(--color-danger)]">
                  {t("wolfPlanning.votes", { count: voters.length })}
                </span>
              </motion.div>
            ))}
          </AnimatePresence>
          
          {isConsensus && (
            <div className="mt-2 text-center text-xs text-green-400 flex items-center justify-center gap-1">
              <CheckCircle size={12} weight="fill" />
              {t("wolfPlanning.consensus")}
            </div>
          )}
        </div>
      )}

      {/* 提示 */}
      {!wolfVotes[humanPlayer?.playerId || ""] && humanPlayer && isWolfRole(humanPlayer.role) && (
        <div className="mt-3 text-xs text-yellow-400 flex items-center gap-1">
          <Target size={12} />
          {t("wolfPlanning.hint")}
        </div>
      )}

      {/* 听取AI队友意见区域 */}
      {humanPlayer && isWolfRole(humanPlayer.role) && onConsultRequest && (
        <div className="mt-3 border-t border-[#3e2723] pt-3">
          {/* 空闲：显示按钮 */}
          {consultStatus === "idle" && (() => {
            const aiWolves = wolves.filter(w => !w.isHuman);
            const hasAiTeammates = aiWolves.length > 0;
            return (
              <button
                type="button"
                onClick={hasAiTeammates ? onConsultRequest : undefined}
                disabled={!hasAiTeammates}
                className={`w-full flex items-center justify-center gap-2 py-2 px-3 rounded text-xs font-semibold transition-colors ${
                  hasAiTeammates
                    ? "bg-[#3e2723] hover:bg-[#5a3825] text-[#f0c070] cursor-pointer"
                    : "bg-[#2a201a] text-[#6a5a4a] cursor-not-allowed"
                }`}
              >
                <Users size={14} />
                {hasAiTeammates ? t("wolfPlanning.consultButton") : t("wolfPlanning.consultNoTeammate")}
              </button>
            );
          })()}

          {/* 讨论中：流式文字 */}
          {(consultStatus === "consulting" || consultStatus === "done") && (
            <div>
              <div className="flex items-center gap-1 text-xs text-[#a09080] mb-1">
                {consultStatus === "consulting" ? (
                  <>
                    <SpinnerGap size={12} className="animate-spin" />
                    {t("wolfPlanning.consultingLabel")}
                  </>
                ) : (
                  <>
                    <CheckCircle size={12} weight="fill" className="text-green-400" />
                    {t("wolfPlanning.consultDiscussion")}
                  </>
                )}
              </div>
              <div className="max-h-32 overflow-y-auto text-[11px] text-[#c8b89a] bg-[#12100e] rounded p-2 whitespace-pre-wrap leading-relaxed">
                {consultText || "…"}
              </div>
              {consultStatus === "done" && consultTarget !== null && (() => {
                const rec = gameState.players.find((p) => p.seat === consultTarget);
                return rec ? (
                  <motion.div
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-2 flex items-center gap-2 p-2 rounded bg-[var(--color-wolf)]/20 border border-[var(--color-wolf)]/50 text-xs"
                  >
                    <Target size={12} className="text-[var(--color-danger)] shrink-0" />
                    <span className="text-[#f0e6d2]">
                      {t("wolfPlanning.consultRecommend", { seat: rec.seat + 1, name: rec.displayName })}
                    </span>
                  </motion.div>
                ) : null;
              })()}
            </div>
          )}

          {/* 已放弃 */}
          {consultStatus === "aborted" && (
            <div className="text-xs text-[#a09080] italic">{t("wolfPlanning.consultAborted")}</div>
          )}
        </div>
      )}
    </div>
  );
}
