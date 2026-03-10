"use client";

import { useCallback, useEffect, useMemo, useState, startTransition } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import {
  ALL_MODELS,
  PLAYER_MODELS,
  filterPlayerModels,
  type ModelRef,
  type ProviderName,
} from "@/types/game";
import {
  getPlayerModelSelection,
  setPlayerModelSelection,
  getGeneratorModelPreference,
  getSummaryModelPreference,
  getReviewModelPreference,
  setGeneratorModel,
  setSummaryModel,
  setReviewModel,
  getSystemOnlyModels,
  setSystemOnlyModels,
} from "@/lib/api-keys";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { ProviderStatusResponse } from "@/app/api/provider-status/route";
import { LockSimple, CheckCircle, WarningCircle, Robot, Gear } from "@phosphor-icons/react";

// ---------------------------------------------------------------------------
// Provider metadata
// ---------------------------------------------------------------------------

const PROVIDER_META: Record<
  ProviderName,
  { label: string; order: number; requiresKey: boolean }
> = {
  dashscope: { label: "DashScope", order: 1, requiresKey: false },
  zenmux: { label: "ZenMux", order: 2, requiresKey: false },
  openai: { label: "OpenAI Direct", order: 3, requiresKey: true },
  google: { label: "Google Direct", order: 4, requiresKey: true },
  anthropic: { label: "Anthropic Direct", order: 5, requiresKey: true },
  "openai-compatible": { label: "Custom Endpoint", order: 6, requiresKey: true },
};

// Determine the "base" family of a model for grouping within ZenMux
function getModelFamily(model: string): string {
  if (/gemini/i.test(model)) return "Gemini";
  if (/gpt|openai/i.test(model)) return "GPT";
  if (/claude|anthropic/i.test(model)) return "Claude";
  if (/deepseek/i.test(model)) return "DeepSeek";
  if (/qwen/i.test(model)) return "Qwen";
  if (/doubao|seed/i.test(model)) return "Doubao";
  if (/kimi|moonshot/i.test(model)) return "Kimi";
  if (/glm|z-ai/i.test(model)) return "GLM";
  if (/minimax/i.test(model)) return "MiniMax";
  if (/grok|x-ai/i.test(model)) return "Grok";
  return "Other";
}

// Derive a human-readable short label from a model ID
function modelShortLabel(model: string): string {
  // Remove provider prefix like "google/" or "openai/"
  const afterSlash = model.includes("/") ? model.split("/").slice(1).join("/") : model;
  return afterSlash;
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ProviderSection {
  provider: ProviderName;
  label: string;
  order: number;
  configured: boolean;
  models: ModelRef[];
  /** True if these are the built-in project models (always available when provider is configured) */
  isBuiltin: boolean;
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface ModelSettingsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** When true the controls are read-only (game is in progress) */
  disabled?: boolean;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ModelSettingsModal({ open, onOpenChange, disabled = false }: ModelSettingsModalProps) {
  const t = useTranslations();

  // Fetch provider status from server
  // null = not yet loaded; non-null = loaded (derive "loading" from null check)
  const [providerStatus, setProviderStatus] = useState<Record<ProviderName, boolean> | null>(null);
  /** Dynamic model IDs configured via OPENAI_COMPATIBLE_MODELS env var on the server. */
  const [dynamicCompatibleModels, setDynamicCompatibleModels] = useState<string[]>([]);
  /** Derived loading indicator: true while status hasn't resolved yet */
  const statusLoading = open && providerStatus === null;

  useEffect(() => {
    if (!open) return;
    let cancelled = false;

    fetch("/api/provider-status")
      .then<ProviderStatusResponse>((res) => res.json())
      .then((data) => {
        if (!cancelled) {
          setProviderStatus(data.providers);
          setDynamicCompatibleModels(data.openaiCompatibleModels ?? []);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setProviderStatus({
            zenmux: true,
            dashscope: true,
            openai: false,
            google: false,
            anthropic: false,
            "openai-compatible": false,
          });
          setDynamicCompatibleModels([]);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [open]);

  // Build the full candidate model pool (memoized to avoid re-creation)
  const allCandidates: ModelRef[] = useMemo(() => {
    // Start with all unique models from PLAYER_MODELS (project built-in)
    const seen = new Set<string>();
    const result: ModelRef[] = [];

    for (const ref of PLAYER_MODELS) {
      const key = `${ref.provider}:${ref.model}`;
      if (!seen.has(key)) {
        seen.add(key);
        result.push(ref);
      }
    }

    // Add server-direct models from ALL_MODELS (openai, google, anthropic, openai-compatible)
    // These appear in ALL_MODELS but not PLAYER_MODELS
    for (const ref of filterPlayerModels(ALL_MODELS)) {
      const key = `${ref.provider}:${ref.model}`;
      if (!seen.has(key)) {
        seen.add(key);
        result.push(ref);
      }
    }

    // Add dynamic openai-compatible models from OPENAI_COMPATIBLE_MODELS env var
    for (const model of dynamicCompatibleModels) {
      const key = `openai-compatible:${model}`;
      if (!seen.has(key)) {
        seen.add(key);
        result.push({ provider: "openai-compatible", model });
      }
    }

    return result;
  }, [dynamicCompatibleModels]);

  // Build provider sections
  const sections: ProviderSection[] = useMemo(() => {
    const map = new Map<ProviderName, ModelRef[]>();

    for (const ref of allCandidates) {
      const existing = map.get(ref.provider) ?? [];
      existing.push(ref);
      map.set(ref.provider, existing);
    }

    return Array.from(map.entries())
      .map(([provider, models]) => {
        const meta = PROVIDER_META[provider];
        const configured = providerStatus?.[provider] ?? false;
        const builtinModels = new Set(PLAYER_MODELS.map((r) => r.model));
        return {
          provider,
          label: meta.label,
          order: meta.order,
          configured,
          models,
          isBuiltin: models.every((m) => builtinModels.has(m.model)),
        } satisfies ProviderSection;
      })
      .sort((a, b) => a.order - b.order);
  }, [allCandidates, providerStatus]);

  // Current selection state (local, committed on save)
  // `selected` = all toggled-on models (player + system-only)
  const [selected, setSelected] = useState<Set<string>>(new Set());
  // `systemOnly` = subset of `selected` that should NOT be used for player AI
  const [systemOnly, setSystemOnly] = useState<Set<string>>(new Set());

  // System AI model preferences (empty string = auto)
  const [sysGenerator, setSysGenerator] = useState("");
  const [sysSummary, setSysSummary] = useState("");
  const [sysReview, setSysReview] = useState("");

  // Initialize selection from storage when modal opens
  useEffect(() => {
    if (!open) return;
    const playerModels = getPlayerModelSelection();
    const sysOnlyModels = getSystemOnlyModels();
    startTransition(() => {
      // selected = player models + system-only models
      setSelected(new Set([...playerModels, ...sysOnlyModels]));
      setSystemOnly(new Set(sysOnlyModels));
      setSysGenerator(getGeneratorModelPreference());
      setSysSummary(getSummaryModelPreference());
      setSysReview(getReviewModelPreference());
    });
  }, [open]);

  // All currently available models (provider is configured)
  const availableModels = useMemo(
    () => allCandidates.filter((ref) => providerStatus?.[ref.provider] ?? false),
    [allCandidates, providerStatus]
  );

  // Models available for system AI dropdowns: only models the user has toggled on;
  // if nothing is selected, fall back to all available.
  const systemAIOptions = useMemo(
    () =>
      selected.size === 0
        ? availableModels
        : availableModels.filter((ref) => selected.has(ref.model)),
    [availableModels, selected]
  );

  const toggleModel = useCallback(
    (model: string, provider: ProviderName) => {
      if (disabled) return;
      if (!(providerStatus?.[provider] ?? false)) return;

      setSelected((prev) => {
        const next = new Set(prev);
        if (next.has(model)) {
          next.delete(model);
          // untoggling a model also clears its system-only flag
          setSystemOnly((so) => {
            const s = new Set(so);
            s.delete(model);
            return s;
          });
        } else {
          next.add(model);
        }
        return next;
      });
    },
    [disabled, providerStatus]
  );

  const toggleSystemOnly = useCallback(
    (model: string, e: React.MouseEvent | React.ChangeEvent) => {
      e.stopPropagation();
      if (disabled) return;
      setSystemOnly((prev) => {
        const next = new Set(prev);
        if (next.has(model)) {
          next.delete(model);
        } else {
          next.add(model);
        }
        return next;
      });
    },
    [disabled]
  );

  const handleSelectAll = useCallback(() => {
    if (disabled) return;
    setSelected((prev) => {
      const next = new Set(prev);
      for (const ref of allCandidates) {
        if (providerStatus?.[ref.provider]) next.add(ref.model);
      }
      return next;
    });
  }, [disabled, allCandidates, providerStatus]);

  const handleDeselectAll = useCallback(() => {
    if (disabled) return;
    setSelected(new Set());
    setSystemOnly(new Set());
  }, [disabled]);

  const handleSave = useCallback(() => {
    // player selection = all toggled-on models minus system-only models
    const playerArr = Array.from(selected).filter((m) => !systemOnly.has(m));
    setPlayerModelSelection(playerArr);
    setSystemOnlyModels(Array.from(systemOnly));
    setGeneratorModel(sysGenerator);
    setSummaryModel(sysSummary);
    setReviewModel(sysReview);
    toast.success(t("modelSettings.toast.saved"));
    onOpenChange(false);
  }, [selected, systemOnly, sysGenerator, sysSummary, sysReview, onOpenChange, t]);

  const configuredModelCount = useMemo(
    () => allCandidates.filter((ref) => providerStatus?.[ref.provider] ?? false).length,
    [allCandidates, providerStatus]
  );

  // Count of models that will be used for player AI (selected minus system-only)
  const playerModelCount = useMemo(
    () =>
      Array.from(selected).filter(
        (m) =>
          !systemOnly.has(m) &&
          allCandidates.some((ref) => ref.model === m && (providerStatus?.[ref.provider] ?? false))
      ).length,
    [selected, systemOnly, allCandidates, providerStatus]
  );

  // Use static mapping to avoid dynamic translation key (required by next-intl)
  const getConfigureHint = useCallback(
    (provider: ProviderName): string => {
      switch (provider) {
        case "openai": return t("modelSettings.configureHint.openai");
        case "google": return t("modelSettings.configureHint.google");
        case "anthropic": return t("modelSettings.configureHint.anthropic");
        case "openai-compatible": return t("modelSettings.configureHint.openaiCompatible");
        default: return t("modelSettings.configureHint.default");
      }
    },
    [t]
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[92vw] max-w-lg max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-serif text-(--text-primary)">
            <Robot size={18} weight="duotone" />
            {t("modelSettings.title")}
          </DialogTitle>
          <DialogDescription className="text-(--text-muted)">
            {disabled
              ? t("modelSettings.descriptionLocked")
              : t("modelSettings.description")}
          </DialogDescription>
        </DialogHeader>

        {/* Scrollable model list */}
        <div className="flex-1 overflow-y-auto pr-1 space-y-5 min-h-0">
          {statusLoading ? (
            <div className="py-8 text-center text-sm text-(--text-muted)">
              {t("modelSettings.loading")}
            </div>
          ) : (
            sections.map((section) => (
              <div key={section.provider}>
                {/* Provider header */}
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-sm font-semibold text-(--text-primary)">
                    {section.label}
                  </span>
                  {section.configured ? (
                    <span className="flex items-center gap-1 text-xs text-emerald-500">
                      <CheckCircle size={13} weight="fill" />
                      {t("modelSettings.status.available")}
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-xs text-(--text-muted)">
                      <LockSimple size={13} weight="fill" />
                      {t("modelSettings.status.notConfigured")}
                    </span>
                  )}
                  {section.isBuiltin && section.configured && (
                    <Badge variant="secondary" className="text-[10px] h-4 px-1.5">
                      {t("modelSettings.badge.builtin")}
                    </Badge>
                  )}
                </div>

                {/* Model rows */}
                <div className="space-y-1">
                  {section.models.map((ref) => {
                    const isAvailable = section.configured;
                    const isChecked = selected.has(ref.model) && isAvailable;
                    const isSysOnly = systemOnly.has(ref.model);
                    const family = getModelFamily(ref.model);
                    const shortLabel = modelShortLabel(ref.model);

                    return (
                      <div
                        key={ref.model}
                        className={[
                          "flex items-center justify-between gap-3 rounded-md px-3 py-2 transition-colors",
                          isAvailable && !disabled
                            ? "bg-(--bg-card) hover:bg-(--bg-hover) cursor-pointer"
                            : "opacity-40 cursor-not-allowed bg-(--bg-card)/50",
                        ].join(" ")}
                        onClick={() => isAvailable && !disabled && toggleModel(ref.model, ref.provider)}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-xs font-mono text-(--text-secondary) truncate flex-1">
                            {shortLabel}
                          </span>
                          <span className="text-[10px] text-(--text-muted) shrink-0 hidden sm:inline">
                            {family}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {isChecked && (
                            <label
                              className="flex items-center gap-1 text-[10px] text-(--text-muted) cursor-pointer select-none"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <input
                                type="checkbox"
                                checked={isSysOnly}
                                disabled={disabled}
                                onChange={(e) => toggleSystemOnly(ref.model, e)}
                                className="cursor-pointer"
                              />
                              {t("modelSettings.systemOnly")}
                            </label>
                          )}
                          {!isAvailable ? (
                            <LockSimple size={14} className="text-(--text-muted)" />
                          ) : (
                            <Switch
                              checked={isChecked}
                              onCheckedChange={() => toggleModel(ref.model, ref.provider)}
                              disabled={disabled || !isAvailable}
                              onClick={(e) => e.stopPropagation()}
                            />
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {!section.configured && PROVIDER_META[section.provider].requiresKey && (
                  <p className="mt-1.5 flex items-center gap-1.5 text-[11px] text-(--text-muted)">
                    <WarningCircle size={12} />
                    {getConfigureHint(section.provider)}
                  </p>
                )}
              </div>
            ))
          )}
        </div>

        {/* System AI section */}
        {!statusLoading && (
          <div className="border-t border-(--border-color) pt-4 space-y-3">
            <div className="flex items-center gap-2">
              <Gear size={14} className="text-(--text-muted)" />
              <span className="text-sm font-semibold text-(--text-primary)">
                {t("modelSettings.systemAI.title")}
              </span>
              <span className="text-xs text-(--text-muted)">
                {t("modelSettings.systemAI.hint")}
              </span>
            </div>
            {([
              { label: t("modelSettings.systemAI.generator"), value: sysGenerator, onChange: setSysGenerator },
              { label: t("modelSettings.systemAI.summary"), value: sysSummary, onChange: setSysSummary },
              { label: t("modelSettings.systemAI.review"), value: sysReview, onChange: setSysReview },
            ] as const).map(({ label, value, onChange }) => (
              <div key={label} className="flex items-center gap-3">
                <span className="text-xs text-(--text-secondary) shrink-0 w-20">{label}</span>
                <Select
                  value={value || "__auto__"}
                  onValueChange={disabled ? undefined : (v) => onChange(v === "__auto__" ? "" : v)}
                  disabled={disabled || statusLoading}
                >
                  <SelectTrigger className="h-8 text-xs flex-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__auto__">
                      {t("modelSettings.systemAI.auto")}
                    </SelectItem>
                    {systemAIOptions.map((ref) => (
                      <SelectItem key={ref.model} value={ref.model}>
                        {modelShortLabel(ref.model)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ))}
          </div>
        )}

        {/* Footer */}
        {!statusLoading && (
          <div className="pt-3 border-t border-(--border-color) space-y-3">
            <p className="text-xs text-(--text-muted)">
              {selected.size === 0
                ? t("modelSettings.footer.allUsed", { total: configuredModelCount })
                : t("modelSettings.footer.selectedCount", { count: playerModelCount, total: configuredModelCount })}
            </p>

            <div className="flex items-center justify-between gap-2">
              <div className="flex gap-2">
                {!disabled && (
                  <>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="text-xs h-7"
                      onClick={handleSelectAll}
                    >
                      {t("modelSettings.actions.selectAll")}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="text-xs h-7"
                      onClick={handleDeselectAll}
                    >
                      {t("modelSettings.actions.deselectAll")}
                    </Button>
                  </>
                )}
              </div>

              {disabled ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => onOpenChange(false)}
                >
                  {t("modelSettings.actions.close")}
                </Button>
              ) : (
                <Button type="button" size="sm" onClick={handleSave}>
                  {t("modelSettings.actions.save")}
                </Button>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
