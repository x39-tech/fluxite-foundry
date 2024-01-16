import { nanoid } from "nanoid";
import { StructuresEditorState } from "app/state";
import {
  getCurrentEditor,
  useCurrentEditorPart,
} from "features/deviceClassEditor/state";
import { useAppStore } from "app/store";

// Temp: TODO Fix
/* eslint-disable */
export type StructureValue = any;
function getDefaultStructureFactory(): { [k: string]: any } {
  return {};
}
/* eslint-enable */

export function useStructures(): StructuresEditorState | undefined {
  return useCurrentEditorPart((state) => state.structures);
}

export function useStructureIds(): string[] {
  const ids = useCurrentEditorPart((state) =>
    Object.keys(state.structures.structures),
  );
  return ids ?? [];
}

export function createNewStructure(structClass: string, id: string) {
  useAppStore.setState((state) => {
    const structures = getCurrentEditor(state)?.structures;
    if (!structures) {
      return;
    }

    if (id in structures.structures) {
      return;
    }

    const factory = getDefaultStructureFactory();
    if (!(structClass in factory)) {
      return;
    }

    structures.structures[id] = factory[structClass]();

    structures.itemEditorLayout.push({
      id: nanoid(),
      udrId: id,
    });
  });
}
