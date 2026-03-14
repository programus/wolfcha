"use client";

/**
 * Invisible component that runs once on mount.
 * If the user has never saved model settings, fetches /api/provider-status
 * and writes the server-supplied defaults to localStorage so that the game
 * logic can use them immediately — without requiring the user to open the
 * Model Settings modal first.
 */
import { useEffect } from "react";
import { isModelSettingsConfigured, applyModelDefaults } from "@/lib/api-keys";
import type { ProviderStatusResponse } from "@/app/api/provider-status/route";

export function ModelDefaultsInit() {
  useEffect(() => {
    if (isModelSettingsConfigured()) return; // user has custom settings — nothing to do

    fetch("/api/provider-status")
      .then<ProviderStatusResponse>((res) => res.json())
      .then((data) => {
        if (isModelSettingsConfigured()) return; // another tab may have saved in the meantime
        const defaults = {
          playerModels: data.defaultPlayerModels ?? [],
          systemOnlyModels: data.defaultSystemOnlyModels ?? [],
          generatorModel: data.defaultGeneratorModel ?? "",
          summaryModel: data.defaultSummaryModel ?? "",
          reviewModel: data.defaultReviewModel ?? "",
        };
        // Only apply if the server actually has non-empty defaults to avoid
        // writing an empty selection that would hide all models.
        const hasAnyDefault =
          defaults.playerModels.length > 0 ||
          defaults.systemOnlyModels.length > 0 ||
          defaults.generatorModel ||
          defaults.summaryModel ||
          defaults.reviewModel;
        if (hasAnyDefault) {
          applyModelDefaults(defaults);
        }
      })
      .catch(() => {
        // Network error — silently ignore; defaults will be applied when modal opens
      });
  }, []); // run once on mount

  return null;
}
