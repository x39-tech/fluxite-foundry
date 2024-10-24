import { DmxSerializerState } from "app/state";
import { getCurrentEditor, useCurrentEditorPart } from "../state";
import { useAppStore } from "app/store";
import { getUniqueItemId } from "utils/utils";
import { Condition, Mapping } from "e173";

export function useDmxSerializer(): DmxSerializerState | undefined {
  return useCurrentEditorPart((state) => state.dmx);
}

export function addDmxChunk() {
  useAppStore.setState((state) => {
    const dmx = getCurrentEditor(state)?.dmx.udr;
    if (!dmx) {
      return;
    }

    const offsetsInUse = Object.values(dmx.chunks).reduce((acc, chunk) => {
      acc.push(...chunk.offsets);
      return acc;
    }, [] as number[]);
    offsetsInUse.sort((a, b) => a - b);
    let lastOffset = -1;
    for (const offset of offsetsInUse) {
      if (offset - lastOffset > 1) {
        break;
      }
      lastOffset = offset;
    }

    const offsetToUse = lastOffset + 1;
    const chunkIds = Object.keys(dmx.chunks);
    const newChunkId = getUniqueItemId(chunkIds, `chunk${offsetToUse}`);

    dmx.chunks[newChunkId] = {
      offsets: [offsetToUse],
      mappingGroups: [
        {
          mappings: [],
        },
      ],
    };
  });
}

export function removeDmxChunk(chunkId: string) {
  useAppStore.setState((state) => {
    const dmx = getCurrentEditor(state)?.dmx.udr;
    if (!dmx) {
      return;
    }

    delete dmx.chunks[chunkId];
  });
}

export function changeDmxChunkOffsets(chunkId: string, newOffsets: string[]) {
  useAppStore.setState((state) => {
    const dmx = getCurrentEditor(state)?.dmx.udr;
    if (!dmx) {
      return;
    }

    const chunk = dmx.chunks[chunkId];
    if (!chunk) {
      return;
    }

    try {
      const newOffsetsInt = newOffsets.map((o) => parseInt(o));
      for (const offset of newOffsetsInt) {
        if (offset < 0 || offset >= 512) {
          throw new Error("Invalid offset");
        }

        for (const [curChunkId, chunk] of Object.entries(dmx.chunks)) {
          if (curChunkId !== chunkId && chunk.offsets.includes(offset)) {
            throw new Error("Offset already in use");
          }
        }
      }

      chunk.offsets = [...new Set(newOffsetsInt)];
    } catch (e) {
      // TODO user feedback
      console.log(`Error adding DMX chunk: ${e}`);
      return;
    }
  });
}

export function addParameterMappingGroup(chunkId: string) {
  useAppStore.setState((state) => {
    const currentEditor = getCurrentEditor(state);
    if (!currentEditor) {
      return;
    }

    const dmx = currentEditor.dmx.udr;
    if (!dmx) {
      return;
    }

    const chunk = dmx.chunks[chunkId];
    if (!chunk) {
      return;
    }

    chunk.mappingGroups.push({ mappings: [] });
  });
}

export function removeParameterMappingGroup(chunkId: string, index: number) {
  useAppStore.setState((state) => {
    const dmx = getCurrentEditor(state)?.dmx.udr;
    if (!dmx) {
      return;
    }

    const chunk = dmx.chunks[chunkId];
    if (!chunk) {
      return;
    }

    chunk.mappingGroups.splice(index, 1);
  });
}

export function addParameterMapping(
  chunkId: string,
  mappingGroupIndex: number,
) {
  useAppStore.setState((state) => {
    const currentEditor = getCurrentEditor(state);
    if (!currentEditor) {
      return;
    }

    const dmx = currentEditor.dmx.udr;
    if (!dmx) {
      return;
    }

    const chunk = dmx.chunks[chunkId];
    if (!chunk) {
      return;
    }

    chunk.mappingGroups[mappingGroupIndex].mappings.push({
      mappedParam: Object.keys(currentEditor.parameters.parameters)[0] || "",
      ranges: [],
    });
  });
}

export function updateParameterMapping(
  chunkId: string,
  mappingGroupIndex: number,
  mappingIndex: number,
  newValue: Mapping,
) {
  useAppStore.setState((state) => {
    const dmx = getCurrentEditor(state)?.dmx.udr;
    if (!dmx) {
      return;
    }

    const chunk = dmx.chunks[chunkId];
    if (!chunk) {
      return;
    }

    chunk.mappingGroups[mappingGroupIndex].mappings[mappingIndex] = newValue;
  });
}

export function removeParameterMapping(
  chunkId: string,
  mappingGroupIndex: number,
  mappingIndex: number,
) {
  useAppStore.setState((state) => {
    const dmx = getCurrentEditor(state)?.dmx.udr;
    if (!dmx) {
      return;
    }

    const chunk = dmx.chunks[chunkId];
    if (!chunk) {
      return;
    }

    chunk.mappingGroups[mappingGroupIndex].mappings.splice(mappingIndex, 1);
  });
}

export function addCondition(chunkId: string, mappingGroupIndex: number) {
  useAppStore.setState((state) => {
    const dmx = getCurrentEditor(state)?.dmx.udr;
    if (!dmx) {
      return;
    }

    const otherChunkIds = Object.keys(dmx.chunks).filter(
      (otherChunkId) => otherChunkId != chunkId,
    );
    // Can't add a condition if there are no other chunks to reference
    if (otherChunkIds.length === 0) {
      return;
    }

    const chunk = dmx.chunks[chunkId];
    if (!chunk) {
      return;
    }

    const newCondition: Condition = {
      chunk: otherChunkIds[0],
      chunkStart: 0,
      chunkEnd: 255,
    };
    const mappingGroup = chunk.mappingGroups[mappingGroupIndex];

    if (mappingGroup.conditions && mappingGroup.conditions.length > 0) {
      const condition = mappingGroup.conditions[0];
      if (
        condition.conditions &&
        !condition.chunk &&
        !condition.chunkStart &&
        !condition.chunkEnd &&
        condition.match
      ) {
        condition.conditions.push(newCondition);
        mappingGroup.conditions.splice(1);
      }
    } else {
      mappingGroup.conditions = [
        {
          match: "any",
          conditions: [newCondition],
        },
      ];
    }
  });
}

export function updateCondition(
  chunkId: string,
  mappingGroupIndex: number,
  conditionIndex: number,
  newCondition: Condition,
) {
  useAppStore.setState((state) => {
    const dmx = getCurrentEditor(state)?.dmx.udr;
    if (!dmx) {
      return;
    }

    const chunk = dmx.chunks[chunkId];
    if (!chunk) {
      return;
    }

    chunk.mappingGroups[mappingGroupIndex].conditions![conditionIndex] =
      newCondition;
  });
}

export function removeCondition(
  chunkId: string,
  mappingGroupIndex: number,
  conditionIndex: number,
) {
  useAppStore.setState((state) => {
    const dmx = getCurrentEditor(state)?.dmx.udr;
    if (!dmx) {
      return;
    }

    const chunk = dmx.chunks[chunkId];
    if (!chunk) {
      return;
    }

    chunk.mappingGroups[mappingGroupIndex].conditions!.splice(
      conditionIndex,
      1,
    );
  });
}
