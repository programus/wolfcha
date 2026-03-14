"use client";

import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { useTranslations } from "next-intl";
import type { Player, Role } from "@/types/game";

const WOLF_ROLES: Role[] = ["Werewolf", "WhiteWolfKing"];
const GOD_ROLES: Role[] = ["Seer", "Witch", "Hunter", "Guard", "Idiot"];

// Per-role colors — muted to match the game's dark gothic palette
const ROLE_COLOR: Record<Role, string> = {
  Werewolf:     "#8a1c1c",  // deep blood red (matches --color-blood)
  WhiteWolfKing:"#c0392b",  // crimson (darker/more muted than pure scarlet)
  Seer:         "#7c5cbf",  // muted violet
  Witch:        "#4a8a45",  // muted forest green (clearly green, away from blue)
  Hunter:       "#b8822a",  // muted amber/bronze (close to --color-gold-dim)
  Guard:        "#3a68b0",  // deeper pure blue (clearly blue, away from teal)
  Idiot:        "#b05090",  // muted rose
  Villager:     "var(--text-secondary)",
};

// Group capsule background colors
const WOLF_BG  = "rgba(138, 28,  28,  0.20)";
const GOD_BG   = "rgba(197, 160, 89,  0.32)";
const VIL_BG   = "rgba(128, 128, 128, 0.26)";

interface RoleCompositionChipProps {
  players: Player[];
}

export function RoleCompositionChip({ players }: RoleCompositionChipProps) {
  const t = useTranslations();
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number }>({ top: 0, left: 0 });
  const [mounted, setMounted] = useState(false);
  const triggerRef = useRef<HTMLDivElement>(null);

  useEffect(() => { queueMicrotask(() => setMounted(true)); }, []);

  const handleClick = useCallback(() => {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setPos({ top: rect.bottom + 8, left: rect.left });
    }
    setOpen((v) => !v);
  }, []);

  useEffect(() => {
    if (!open) return;
    const close = () => setOpen(false);
    const onMouseDown = (e: MouseEvent) => {
      if (triggerRef.current && !triggerRef.current.contains(e.target as Node)) close();
    };
    document.addEventListener("mousedown", onMouseDown);
    window.addEventListener("resize", close);
    window.addEventListener("scroll", close, true);
    return () => {
      document.removeEventListener("mousedown", onMouseDown);
      window.removeEventListener("resize", close);
      window.removeEventListener("scroll", close, true);
    };
  }, [open]);

  const { aliveCount, totalCount, villagerCount, wolfRoleGroups, godRoleGroups, wolfDots, godDots, villagerDots } =
    useMemo(() => {
      const counts = new Map<Role, number>();
      for (const p of players) {
        counts.set(p.role, (counts.get(p.role) ?? 0) + 1);
      }
      const aliveCount = players.filter((p) => p.alive).length;
      const totalCount = players.length;
      const villagerCount = counts.get("Villager") ?? 0;

      const wolfRoleGroups = WOLF_ROLES
        .map((role) => ({ role, count: counts.get(role) ?? 0 }))
        .filter((g) => g.count > 0);
      const godRoleGroups = GOD_ROLES
        .map((role) => ({ role, count: counts.get(role) ?? 0 }))
        .filter((g) => g.count > 0);

      // Separate dot arrays per group, one entry per player
      const wolfDots = WOLF_ROLES.flatMap((role) =>
        Array<Role>(counts.get(role) ?? 0).fill(role)
      );
      const godDots = GOD_ROLES.flatMap((role) =>
        Array<Role>(counts.get(role) ?? 0).fill(role)
      );
      const villagerDots = Array<Role>(villagerCount).fill("Villager");

      return { aliveCount, totalCount, villagerCount, wolfRoleGroups, godRoleGroups, wolfDots, godDots, villagerDots };
    }, [players]);

  const getRoleLabel = (role: Role): string => {
    const map: Record<Role, string> = {
      Werewolf: t("roles.werewolf"),
      WhiteWolfKing: t("roles.whiteWolfKing"),
      Seer: t("roles.seer"),
      Witch: t("roles.witch"),
      Hunter: t("roles.hunter"),
      Guard: t("roles.guard"),
      Idiot: t("roles.idiot"),
      Villager: t("roles.villager"),
    };
    return map[role];
  };

  const popover = (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0, y: -6, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -6, scale: 0.97 }}
          transition={{ duration: 0.15 }}
          className="fixed min-w-45 rounded-lg border border-(--border-color) bg-(--bg-card) shadow-xl overflow-hidden"
          style={{ zIndex: 9999, top: pos.top, left: pos.left }}
        >
          {/* Title */}
          <div className="px-3 py-2 border-b border-(--border-color) bg-(--bg-secondary)">
            <span className="text-xs font-semibold uppercase tracking-wider text-(--text-muted)">
              {t("roleComposition.title")}
            </span>
          </div>

          {/* Wolf faction */}
          <div className="px-3 py-2">
            <div className="text-xs font-semibold text-(--color-blood) mb-1.5">
              🐺 {t("roleComposition.wolfFaction")}
            </div>
            {wolfRoleGroups.map((g) => (
              <div key={g.role} className="flex items-center justify-between text-sm py-0.5 gap-3">
                <div className="flex items-center gap-2">
                  <span
                    style={{
                      display: "block", width: "8px", height: "8px",
                      borderRadius: "50%", backgroundColor: ROLE_COLOR[g.role], flexShrink: 0,
                    }}
                  />
                  <span className="text-(--text-secondary)">{getRoleLabel(g.role)}</span>
                </div>
                <span className="font-mono text-(--text-muted)">×{g.count}</span>
              </div>
            ))}
          </div>

          {/* God faction */}
          {godRoleGroups.length > 0 && (
            <>
              <div className="border-t border-(--border-color)" />
              <div className="px-3 py-2">
                <div className="text-xs font-semibold text-(--color-gold) mb-1.5">
                  🔮 {t("roleComposition.godFaction")}
                </div>
                {godRoleGroups.map((g) => (
                  <div key={g.role} className="flex items-center justify-between text-sm py-0.5 gap-3">
                    <div className="flex items-center gap-2">
                      <span
                        style={{
                          display: "block", width: "8px", height: "8px",
                          borderRadius: "50%", backgroundColor: ROLE_COLOR[g.role], flexShrink: 0,
                        }}
                      />
                      <span className="text-(--text-secondary)">{getRoleLabel(g.role)}</span>
                    </div>
                    <span className="font-mono text-(--text-muted)">×{g.count}</span>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* Villager faction */}
          {villagerCount > 0 && (
            <>
              <div className="border-t border-(--border-color)" />
              <div className="px-3 py-2">
                <div className="text-xs font-semibold text-(--text-secondary) mb-1.5">
                  🧑 {t("roleComposition.villagerFaction")}
                </div>
                <div className="flex items-center justify-between text-sm py-0.5 gap-3">
                  <div className="flex items-center gap-2">
                    <span
                      style={{
                        display: "block", width: "8px", height: "8px",
                        borderRadius: "50%", backgroundColor: ROLE_COLOR.Villager, opacity: 0.45, flexShrink: 0,
                      }}
                    />
                    <span className="text-(--text-secondary)">{t("roles.villager")}</span>
                  </div>
                  <span className="font-mono text-(--text-muted)">×{villagerCount}</span>
                </div>
              </div>
            </>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );

  return (
    <>
      {/*
        Wrapper stretches to full topbar height so dots can be positioned
        relative to the topbar top edge, not just the Alive item.
      */}
      <div style={{ position: "relative", alignSelf: "stretch", display: "flex", alignItems: "center" }}>
        {/* Role composition dots — midway between topbar top edge and the Alive text */}
        <div
          style={{
            position: "absolute",
            top: "-3px",
            left: "50%",
            transform: "translateX(-50%)",
            display: "flex",
            gap: "4px",
            pointerEvents: "none",
          }}
        >
          {/* Wolf group */}
          {wolfDots.length > 0 && (
            <span style={{
              display: "flex", gap: "2px", alignItems: "center",
              backgroundColor: WOLF_BG,
              borderRadius: "4px", padding: "2px 3px",
            }}>
              {wolfDots.map((role, i) => (
                <span key={i} style={{
                  display: "block", width: "5px", height: "5px",
                  borderRadius: "50%", backgroundColor: ROLE_COLOR[role],
                }} />
              ))}
            </span>
          )}
          {/* God group */}
          {godDots.length > 0 && (
            <span style={{
              display: "flex", gap: "2px", alignItems: "center",
              backgroundColor: GOD_BG,
              borderRadius: "4px", padding: "2px 3px",
            }}>
              {godDots.map((role, i) => (
                <span key={i} style={{
                  display: "block", width: "5px", height: "5px",
                  borderRadius: "50%", backgroundColor: ROLE_COLOR[role],
                }} />
              ))}
            </span>
          )}
          {/* Villager group */}
          {villagerDots.length > 0 && (
            <span style={{
              display: "flex", gap: "2px", alignItems: "center",
              backgroundColor: VIL_BG,
              borderRadius: "4px", padding: "2px 3px",
            }}>
              {villagerDots.map((_, i) => (
                <span key={i} style={{
                  display: "block", width: "5px", height: "5px",
                  borderRadius: "50%", backgroundColor: ROLE_COLOR.Villager, opacity: 0.45,
                }} />
              ))}
            </span>
          )}
        </div>

        {/* Alive item — unchanged style, triggers popover on click */}
        <div
          ref={triggerRef}
          className="wc-topbar__item cursor-pointer rounded px-1 -mx-1 hover:bg-(--color-accent-bg) transition-colors"
          onClick={handleClick}
          title={t("roleComposition.title")}
        >
          <span className="text-xs uppercase tracking-wider opacity-60">Alive</span>
          <span className="font-serif text-lg font-bold">{aliveCount}/{totalCount}</span>
        </div>
      </div>

      {/* Popover rendered via portal to escape topbar stacking context */}
      {mounted && createPortal(popover, document.body)}
    </>
  );
}
