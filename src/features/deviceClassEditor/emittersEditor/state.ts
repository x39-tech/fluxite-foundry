import { useMemo } from "react";
import { msg } from "@lingui/core/macro";
import {
  Access,
  CodexId,
  Emitter,
  EmitterCommonColor,
  EmittersStructure,
  EntityId,
  Lifetime,
  ParameterReference,
  Spd,
  SpdMapping,
} from "app/persistentState";
import { getWithId, newEntityId } from "app/stateUtils";
import { asOneChange, useAppRuntimeStore } from "app/store";
import {
  EMITTERS_CLASS_CODEX_ID,
  INTENSITY_COLOR_LIBRARY,
  SPD_RESOURCE_CLASS_CODEX_ID,
} from "codex/codex";
import { getNewestVersionOfEachLibrary } from "codex/libraryStore";
import { getUniqueItemId, ItemEditor } from "utils/utils";
import {
  DeviceClassDraft,
  updateCurrentEditor,
  useCurrentEditorPart,
  useCurrentEditorPartShallow,
} from "../state";
import {
  DEFAULT_SPD_START,
  DEFAULT_SPD_STEP,
  spdBackedResourceIds,
} from "./spd";
import { SpdSamples } from "./spd";

const UNDO = {
  createStructure: msg({
    id: "deviceClassEditor.emitters.undo.createStructure",
    message: "Add Emitters Structure",
  }),
  deleteStructure: msg({
    id: "deviceClassEditor.emitters.undo.deleteStructure",
    message: "Delete Emitters Structure",
  }),
  editStructure: msg({
    id: "deviceClassEditor.emitters.undo.editStructure",
    message: "Edit Emitters Structure",
  }),
  addGroup: msg({
    id: "deviceClassEditor.emitters.undo.addGroup",
    message: "Add Emitter Group",
  }),
  editGroup: msg({
    id: "deviceClassEditor.emitters.undo.editGroup",
    message: "Edit Emitter Group",
  }),
  deleteGroup: msg({
    id: "deviceClassEditor.emitters.undo.deleteGroup",
    message: "Delete Emitter Group",
  }),
  addEmitter: msg({
    id: "deviceClassEditor.emitters.undo.addEmitter",
    message: "Add Emitter",
  }),
  editEmitter: msg({
    id: "deviceClassEditor.emitters.undo.editEmitter",
    message: "Edit Emitter",
  }),
  deleteEmitter: msg({
    id: "deviceClassEditor.emitters.undo.deleteEmitter",
    message: "Delete Emitter",
  }),
  editSpd: msg({
    id: "deviceClassEditor.emitters.undo.editSpd",
    message: "Edit Spectral Power Distribution",
  }),
  importSpd: msg({
    id: "deviceClassEditor.emitters.undo.importSpd",
    message: "Import Spectral Power Distribution",
  }),
  changeSpdStorage: msg({
    id: "deviceClassEditor.emitters.undo.changeSpdStorage",
    message: "Change Spectral Power Distribution Storage",
  }),
};

/** An emitter and the id it is stored under. */
export type EmitterWithId = Emitter & { id: EntityId };

// ---------------------------------------------------------------------------
// Read
// ---------------------------------------------------------------------------

export function useEmittersStructure(): EmittersStructure | undefined {
  return useCurrentEditorPart((editor) => editor.emittersStructure);
}

export function useEmitterGroupEditors(): ItemEditor[] {
  const groupIds =
    useCurrentEditorPartShallow((editor) => editor.emitterGroupEditors) ?? [];
  const codexIds =
    useCurrentEditorPartShallow((editor) =>
      groupIds.map((id) => editor.emitterGroups[id]?.codexId ?? null),
    ) ?? [];

  return useMemo(
    () =>
      groupIds.reduce<ItemEditor[]>((acc, id, index) => {
        const codexId = codexIds[index];
        if (codexId) acc.push({ id, codexId });
        return acc;
      }, []),
    // The arrays are compared shallowly by the hooks above, so their contents
    // are what actually changes identity here.
    [groupIds, codexIds],
  );
}

export function useEmitterGroupCodexIds(): string[] {
  return (
    useCurrentEditorPartShallow((editor) =>
      Object.values(editor.emitterGroups).map((group) => group.codexId),
    ) ?? []
  );
}

/** The emitters of one group, in the order they are written out. */
export function useEmittersOfGroup(groupId: EntityId): EmitterWithId[] {
  const emitterIds =
    useCurrentEditorPartShallow(
      (editor) => editor.emitterGroups[groupId]?.emitters,
    ) ?? [];
  const emitters = useCurrentEditorPart((editor) => editor.emitters);

  return useMemo(
    () =>
      emitterIds.reduce<EmitterWithId[]>((acc, id) => {
        const emitter = emitters?.[id];
        if (emitter) acc.push({ ...emitter, id });
        return acc;
      }, []),
    // The id list is compared shallowly by the hook above, so its contents are
    // what actually changes identity here.
    [emitterIds, emitters],
  );
}

export function useEmitter(id: EntityId): Emitter | undefined {
  return useCurrentEditorPart((editor) => editor.emitters[id]);
}

/** The codexIds already taken by the emitters of one group. */
export function useEmitterCodexIds(groupId: EntityId): string[] {
  return useEmittersOfGroup(groupId).map((emitter) => emitter.codexId);
}

/** The resources whose contents the Emitters structure manages. */
export function useSpdBackedResourceIds(): Set<EntityId> {
  const emitters = useCurrentEditorPart((editor) => editor.emitters);
  return useMemo(
    () => spdBackedResourceIds({ emitters: emitters ?? {} }),
    [emitters],
  );
}

/** The codexId of the resource an SPD is stored in, for display. */
export function useSpdResourceCodexId(
  spd: Spd | undefined,
): CodexId | undefined {
  return useCurrentEditorPart((editor) =>
    spd?.storage.type === "resource"
      ? editor.resources[spd.storage.resourceId]?.codexId
      : undefined,
  );
}

// ---------------------------------------------------------------------------
// Write - the structure
// ---------------------------------------------------------------------------

export function createEmittersStructure() {
  updateCurrentEditor(UNDO.createStructure, (editor) => {
    if (editor.emittersStructure) return;

    const localClass = getWithId(
      editor.structureClasses,
      (cls) => cls.codexId === EMITTERS_CLASS_CODEX_ID,
    );

    editor.emittersStructure = {
      codexId: EMITTERS_CLASS_CODEX_ID,
      class: localClass
        ? { type: "local", id: localClass.id }
        : {
            type: "imported",
            library: INTENSITY_COLOR_LIBRARY,
            codexId: EMITTERS_CLASS_CODEX_ID,
          },
      access: ["read"],
      lifetime: "static",
    };

    if (!localClass) {
      declareLibrary(editor, INTENSITY_COLOR_LIBRARY);
    }
  });
}

export function deleteEmittersStructure() {
  updateCurrentEditor(UNDO.deleteStructure, (editor) => {
    for (const emitter of Object.values(editor.emitters)) {
      if (emitter.spd?.storage.type === "resource") {
        removeResource(editor, emitter.spd.storage.resourceId);
      }
    }

    editor.emittersStructure = undefined;
    editor.emitterGroupEditors = [];
    editor.emitterGroups = {};
    editor.emitters = {};
    editor.emitterControlGroups = {};
  });
}

export function modifyEmittersStructure(
  recipe: (structure: EmittersStructure) => void,
) {
  updateCurrentEditor(UNDO.editStructure, (editor) => {
    if (editor.emittersStructure) recipe(editor.emittersStructure);
  });
}

export function setEmittersStructureAccess(access: Access[]) {
  modifyEmittersStructure((structure) => {
    structure.access = access;
  });
}

export function setEmittersStructureLifetime(lifetime: Lifetime) {
  modifyEmittersStructure((structure) => {
    structure.lifetime = lifetime;
    if (lifetime === "static") {
      structure.access = structure.access.filter((access) => access === "read");
    }
  });
}

// ---------------------------------------------------------------------------
// Write - groups and emitters
// ---------------------------------------------------------------------------

export function addEmitterGroup() {
  updateCurrentEditor(UNDO.addGroup, (editor) => {
    const codexId = getUniqueItemId(
      Object.values(editor.emitterGroups).map((group) => group.codexId),
      "emitter-group",
    );

    const groupId = newEntityId();
    editor.emitterGroups[groupId] = { codexId: CodexId(codexId), emitters: [] };
    editor.emitterGroupEditors.push(groupId);
  });
}

export function setEmitterGroupCodexId(groupId: EntityId, codexId: CodexId) {
  updateCurrentEditor(UNDO.editGroup, (editor) => {
    const group = editor.emitterGroups[groupId];
    if (group) group.codexId = codexId;
  });
}

export function deleteEmitterGroup(groupId: EntityId) {
  updateCurrentEditor(UNDO.deleteGroup, (editor) => {
    const group = editor.emitterGroups[groupId];
    if (!group) return;

    for (const id of group.emitters) {
      const emitter = editor.emitters[id];
      if (emitter?.spd?.storage.type === "resource") {
        removeResource(editor, emitter.spd.storage.resourceId);
      }
      delete editor.emitters[id];
    }

    delete editor.emitterGroups[groupId];
    editor.emitterGroupEditors = editor.emitterGroupEditors.filter(
      (id) => id !== groupId,
    );

    for (const control of Object.values(editor.emitterControlGroups)) {
      control.emitterGroups = control.emitterGroups.filter(
        (id) => id !== groupId,
      );
    }
  });
}

export function addEmitter(groupId: EntityId) {
  updateCurrentEditor(UNDO.addEmitter, (editor) => {
    const group = editor.emitterGroups[groupId];
    if (!group) return;

    const siblings = group.emitters.map((id) => editor.emitters[id]);
    const codexId = getUniqueItemId(
      siblings.map((emitter) => emitter.codexId),
      "emitter",
    );

    const emitterId = newEntityId();
    editor.emitters[emitterId] = {
      codexId: CodexId(codexId),
      // Table 8-9 wants exactly one emitter per group at full brightness, so
      // the first one added starts there.
      relativeBrightness: siblings.length === 0 ? 1 : undefined,
    };
    group.emitters.push(emitterId);
  });
}

export function modifyEmitter(
  id: EntityId,
  recipe: (emitter: Emitter) => void,
) {
  updateCurrentEditor(UNDO.editEmitter, (editor) => {
    const emitter = editor.emitters[id];
    if (emitter) recipe(emitter);
  });
}

export function setEmitterCodexId(id: EntityId, codexId: CodexId) {
  modifyEmitter(id, (emitter) => {
    emitter.codexId = codexId;
  });
}

export function setEmitterCommonColor(
  id: EntityId,
  commonColor: EmitterCommonColor | undefined,
) {
  modifyEmitter(id, (emitter) => {
    emitter.commonColor = commonColor;
  });
}

export function setEmitterRelativeBrightness(
  id: EntityId,
  relativeBrightness: number | undefined,
) {
  modifyEmitter(id, (emitter) => {
    emitter.relativeBrightness = relativeBrightness;
  });
}

export function setEmitterDirectControl(
  id: EntityId,
  directControl: ParameterReference | undefined,
) {
  modifyEmitter(id, (emitter) => {
    emitter.directControl = directControl;
  });
}

export function deleteEmitter(groupId: EntityId, id: EntityId) {
  updateCurrentEditor(UNDO.deleteEmitter, (editor) => {
    const emitter = editor.emitters[id];
    if (!emitter) return;

    if (emitter.spd?.storage.type === "resource") {
      removeResource(editor, emitter.spd.storage.resourceId);
    }

    delete editor.emitters[id];

    const group = editor.emitterGroups[groupId];
    if (group) {
      group.emitters = group.emitters.filter((other) => other !== id);
    }
  });
}

// ---------------------------------------------------------------------------
// Write - spectral power distributions
// ---------------------------------------------------------------------------

/** Gives an emitter an SPD, stored in a resource of its own by default. */
export function addSpd(emitterId: EntityId) {
  asOneChange(UNDO.editSpd, () => {
    updateCurrentEditor(UNDO.editSpd, (editor) => {
      const emitter = editor.emitters[emitterId];
      if (!emitter || emitter.spd) return;

      emitter.spd = {
        storage: {
          type: "resource",
          resourceId: createSpdResource(editor, emitter.codexId),
        },
        start: DEFAULT_SPD_START,
        step: DEFAULT_SPD_STEP,
        mappings: [],
      };
    });
  });
}

export function deleteSpd(emitterId: EntityId) {
  updateCurrentEditor(UNDO.editSpd, (editor) => {
    const emitter = editor.emitters[emitterId];
    if (!emitter?.spd) return;

    if (emitter.spd.storage.type === "resource") {
      removeResource(editor, emitter.spd.storage.resourceId);
    }
    emitter.spd = undefined;
  });
}

/**
 * Moves an SPD between being written inline and being written to a resource.
 *
 * The samples do not move: they live in the document either way, and this only
 * decides how the exported file carries them.
 */
export function setSpdStorage(emitterId: EntityId, toResource: boolean) {
  asOneChange(UNDO.changeSpdStorage, () => {
    updateCurrentEditor(UNDO.changeSpdStorage, (editor) => {
      const emitter = editor.emitters[emitterId];
      const spd = emitter?.spd;
      if (!spd) return;

      if (toResource && spd.storage.type === "inline") {
        spd.storage = {
          type: "resource",
          resourceId: createSpdResource(editor, emitter.codexId),
        };
      } else if (!toResource && spd.storage.type === "resource") {
        removeResource(editor, spd.storage.resourceId);
        spd.storage = { type: "inline" };
      }
    });
  });
}

export function setSpdGrid(
  emitterId: EntityId,
  grid: { start?: number; step?: number },
) {
  updateCurrentEditor(UNDO.editSpd, (editor) => {
    const spd = editor.emitters[emitterId]?.spd;
    if (!spd) return;

    if (grid.start !== undefined) spd.start = grid.start;
    if (grid.step !== undefined && grid.step > 0) spd.step = grid.step;
  });
}

/**
 * Adds the curves from an imported file to an emitter's SPD.
 *
 * The file's own grid wins when the emitter had no curves yet; parseSpdFile has
 * already refused anything that does not match one it did have.
 */
export function addSpdMappings(emitterId: EntityId, samples: SpdSamples) {
  updateCurrentEditor(UNDO.importSpd, (editor) => {
    const spd = editor.emitters[emitterId]?.spd;
    if (!spd) return;

    if (spd.mappings.length === 0) {
      spd.start = samples.start;
      spd.step = samples.step;
    }

    spd.mappings.push(...samples.mappings);
    spd.mappings.sort((a, b) => a.value - b.value);
  });
}

export function replaceSpdMappings(
  emitterId: EntityId,
  mappings: SpdMapping[],
) {
  updateCurrentEditor(UNDO.editSpd, (editor) => {
    const spd = editor.emitters[emitterId]?.spd;
    if (spd) spd.mappings = mappings;
  });
}

export function removeSpdMapping(emitterId: EntityId, mappingIndex: number) {
  updateCurrentEditor(UNDO.editSpd, (editor) => {
    const spd = editor.emitters[emitterId]?.spd;
    if (spd) spd.mappings.splice(mappingIndex, 1);
  });
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

// The resource an emitter's SPD file is written to. Its contents are generated
// on export, so it holds no asset and carries no default in state.
function createSpdResource(
  editor: DeviceClassDraft,
  emitterCodexId: CodexId,
): EntityId {
  const codexId = getUniqueItemId(
    Object.values(editor.resources).map((resource) => resource.codexId),
    `spd-${emitterCodexId}`,
  );

  const localClass = getWithId(
    editor.resourceClasses,
    (cls) => cls.codexId === SPD_RESOURCE_CLASS_CODEX_ID,
  );

  const resourceId = newEntityId();
  editor.resources[resourceId] = {
    codexId: CodexId(codexId),
    class: localClass
      ? { type: "local", id: localClass.id }
      : {
          type: "imported",
          library: INTENSITY_COLOR_LIBRARY,
          codexId: SPD_RESOURCE_CLASS_CODEX_ID,
        },
    access: ["read"],
    lifetime: "static",
    mediaType: "application/json",
  };
  editor.resourceEditors.push(resourceId);

  if (!localClass) {
    declareLibrary(editor, INTENSITY_COLOR_LIBRARY);
  }

  return resourceId;
}

function removeResource(editor: DeviceClassDraft, resourceId: EntityId) {
  delete editor.resources[resourceId];
  editor.resourceEditors = editor.resourceEditors.filter(
    (id) => id !== resourceId,
  );
}

// Nothing else in the app maintains `libraries` when an imported class starts
// being used, so a structure that pulls in a standard library declares it here.
function declareLibrary(editor: DeviceClassDraft, libraryId: string) {
  if (editor.libraries[libraryId]) return;

  const version = getNewestVersionOfEachLibrary(
    useAppRuntimeStore.getState().libraries,
  ).find((library) => library.id === libraryId)?.version;

  if (version) {
    editor.libraries[libraryId] = version;
  }
}
