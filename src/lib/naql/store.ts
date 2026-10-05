import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { CORPUS } from "./corpus";
import type { Source, SourcePage } from "./types";

type NaqlState = {
  uploads: Source[];
  selectedIds: string[];
  pageOffset: Record<string, number>;
  addUpload: (source: Source) => void;
  removeUpload: (id: string) => void;
  toggleSelected: (id: string) => void;
  selectOnly: (id: string) => void;
  selectAll: () => void;
  setPageOffset: (id: string, offset: number) => void;
};

export function allSources(uploads: Source[]): Source[] {
  return [...CORPUS, ...uploads];
}

export function selectedSources(state: {
  uploads: Source[];
  selectedIds: string[];
}): Source[] {
  const all = allSources(state.uploads);
  if (state.selectedIds.length === 0) return all;
  return all.filter((s) => state.selectedIds.includes(s.id));
}

export function findSourcePage(
  sources: Source[],
  sourceId: string,
  page: number,
): { source: Source; page: SourcePage } | null {
  const source = sources.find((s) => s.id === sourceId);
  if (!source) return null;
  const found = source.pages.find((p) => p.page === page);
  if (!found) return null;
  return { source, page: found };
}

const memoryStorage = {
  getItem: () => null,
  setItem: () => {},
  removeItem: () => {},
};

export const useNaqlStore = create<NaqlState>()(
  persist(
    (set, get) => ({
      uploads: [],
      selectedIds: CORPUS.map((s) => s.id),
      pageOffset: {},
      addUpload: (source) =>
        set({
          uploads: [source, ...get().uploads].slice(0, 8),
          selectedIds: [source.id, ...get().selectedIds.filter((id) => id !== source.id)],
        }),
      removeUpload: (id) =>
        set({
          uploads: get().uploads.filter((s) => s.id !== id),
          selectedIds: get().selectedIds.filter((s) => s !== id),
        }),
      toggleSelected: (id) => {
        const cur = get().selectedIds;
        set({
          selectedIds: cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id],
        });
      },
      selectOnly: (id) => set({ selectedIds: [id] }),
      selectAll: () =>
        set({ selectedIds: allSources(get().uploads).map((s) => s.id) }),
      setPageOffset: (id, offset) =>
        set({ pageOffset: { ...get().pageOffset, [id]: offset } }),
    }),
    {
      name: "naql-library-v1",
      storage: createJSONStorage(() =>
        typeof window === "undefined" ? memoryStorage : localStorage,
      ),
      partialize: (s) => ({
        uploads: s.uploads,
        selectedIds: s.selectedIds,
        pageOffset: s.pageOffset,
      }),
    },
  ),
);
