"use client";

import { useCallback, useEffect, useState } from "react";
import type { CustomCharacter, CustomCharacterInput } from "@/types/custom-character";
import {
  DEFAULT_CUSTOM_CHARACTER_AGE,
  DEFAULT_CUSTOM_CHARACTER_GENDER,
  MAX_CUSTOM_CHARACTERS,
} from "@/types/custom-character";
import { fillCustomCharacterOptionalFields } from "@/lib/custom-character-defaults";

const STORAGE_KEY = "wolfcha:custom_characters";

function loadFromStorage(): CustomCharacter[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as CustomCharacter[];
  } catch {
    return [];
  }
}

function saveToStorage(chars: CustomCharacter[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(chars));
}

export function useCustomCharacters() {
  const [characters, setCharacters] = useState<CustomCharacter[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchCharacters = useCallback(async () => {
    setLoading(true);
    setError(null);
    setCharacters(loadFromStorage());
    setLoading(false);
  }, []);

  const createCharacter = useCallback(
    async (input: CustomCharacterInput): Promise<CustomCharacter | null> => {
      const current = loadFromStorage();
      if (current.length >= MAX_CUSTOM_CHARACTERS) {
        setError(`Maximum ${MAX_CUSTOM_CHARACTERS} custom characters allowed`);
        return null;
      }
      setLoading(true);
      setError(null);
      try {
        const normalized = fillCustomCharacterOptionalFields(input);
        const now = new Date().toISOString();
        const newChar: CustomCharacter = {
          id: crypto.randomUUID(),
          user_id: "local",
          display_name: normalized.display_name.trim(),
          gender: normalized.gender,
          age: normalized.age,
          mbti: normalized.mbti.toUpperCase(),
          basic_info: normalized.basic_info?.trim() || undefined,
          style_label: normalized.style_label?.trim() || undefined,
          avatar_seed: input.avatar_seed || `${input.display_name}-${Date.now()}`,
          is_deleted: false,
          created_at: now,
          updated_at: now,
        };
        const updated = [newChar, ...current];
        saveToStorage(updated);
        setCharacters(updated);
        return newChar;
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to create character");
        return null;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const updateCharacter = useCallback(
    async (id: string, input: Partial<CustomCharacterInput>): Promise<CustomCharacter | null> => {
      setLoading(true);
      setError(null);
      try {
        const current = loadFromStorage();
        const existing = current.find((c) => c.id === id);
        if (!existing) throw new Error("Character not found");

        const shouldNormalize =
          input.mbti !== undefined ||
          input.basic_info !== undefined ||
          input.style_label !== undefined;

        const normalizedInput = shouldNormalize
          ? fillCustomCharacterOptionalFields({
              display_name: input.display_name ?? "",
              gender:
                (input.gender as CustomCharacterInput["gender"]) ?? DEFAULT_CUSTOM_CHARACTER_GENDER,
              age: input.age ?? DEFAULT_CUSTOM_CHARACTER_AGE,
              mbti: input.mbti ?? "",
              basic_info: input.basic_info ?? "",
              style_label: input.style_label ?? "",
              avatar_seed: input.avatar_seed,
            })
          : null;

        const updated: CustomCharacter = {
          ...existing,
          updated_at: new Date().toISOString(),
          ...(input.display_name !== undefined ? { display_name: input.display_name.trim() } : {}),
          ...(input.gender !== undefined ? { gender: input.gender } : {}),
          ...(input.age !== undefined ? { age: input.age } : {}),
          ...(input.mbti !== undefined
            ? { mbti: (normalizedInput?.mbti ?? input.mbti).toUpperCase() }
            : {}),
          ...(input.basic_info !== undefined
            ? { basic_info: normalizedInput?.basic_info?.trim() || undefined }
            : {}),
          ...(input.style_label !== undefined
            ? { style_label: normalizedInput?.style_label?.trim() || undefined }
            : {}),
          ...(input.avatar_seed !== undefined ? { avatar_seed: input.avatar_seed } : {}),
        };

        const updatedList = current.map((c) => (c.id === id ? updated : c));
        saveToStorage(updatedList);
        setCharacters(updatedList);
        return updated;
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to update character");
        return null;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const deleteCharacter = useCallback(async (id: string): Promise<boolean> => {
    setLoading(true);
    setError(null);
    try {
      const current = loadFromStorage();
      const updated = current.filter((c) => c.id !== id);
      saveToStorage(updated);
      setCharacters(updated);
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete character");
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchCharacters();
  }, [fetchCharacters]);

  return {
    characters,
    loading,
    error,
    fetchCharacters,
    createCharacter,
    updateCharacter,
    deleteCharacter,
    canAddMore: characters.length < MAX_CUSTOM_CHARACTERS,
    remainingSlots: MAX_CUSTOM_CHARACTERS - characters.length,
  };
}
