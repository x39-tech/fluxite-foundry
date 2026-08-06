import { useMemo } from "react";
import { useLibraryStore } from "app/store";
import { CategoryCatalog } from "codex/categories";
import { getCategoryCatalog } from "codex/libraryStore";

/** The categories of every loaded library. */
export function useCategoryCatalog(): CategoryCatalog {
  const libraryStore = useLibraryStore();
  return useMemo(() => getCategoryCatalog(libraryStore), [libraryStore]);
}
