import { Condition, Mapping } from "e173";
import { DmxController, DmxSerializerState } from "app/state";
import { updateCurrentEditor, useCurrentEditorPart } from "../state";
import { getUniqueItemId } from "utils/utils";
import { useAppRuntimeStore } from "app/store";

// ---------------------------------------------------------------------------
// Read
// ---------------------------------------------------------------------------

export function useDmxSerializer(): DmxSerializerState | undefined {
  return useCurrentEditorPart((state) => state.dmx);
}

export function useDmxController(): DmxController {
  return useAppRuntimeStore((state) => state.dmxController);
}

// ---------------------------------------------------------------------------
// Write
// ---------------------------------------------------------------------------

export function addDmxChunk() {
  updateCurrentEditor((editor) => {
    const dmx = editor.dmx.udr;

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
  updateCurrentEditor((editor) => {
    delete editor.dmx.udr.chunks[chunkId];
  });
}

export function changeDmxChunkOffsets(chunkId: string, newOffsets: string[]) {
  updateCurrentEditor((editor) => {
    const dmx = editor.dmx.udr;

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
  updateCurrentEditor((editor) => {
    const chunk = editor.dmx.udr.chunks[chunkId];
    if (!chunk) {
      return;
    }

    chunk.mappingGroups.push({ mappings: [] });
  });
}

export function removeParameterMappingGroup(chunkId: string, index: number) {
  updateCurrentEditor((editor) => {
    const chunk = editor.dmx.udr.chunks[chunkId];
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
  updateCurrentEditor((editor) => {
    const chunk = editor.dmx.udr.chunks[chunkId];
    if (!chunk) {
      return;
    }

    chunk.mappingGroups[mappingGroupIndex].mappings.push({
      mappedParam: Object.keys(editor.parameters.parameters)[0] || "",
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
  updateCurrentEditor((editor) => {
    const chunk = editor.dmx.udr.chunks[chunkId];
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
  updateCurrentEditor((editor) => {
    const chunk = editor.dmx.udr.chunks[chunkId];
    if (!chunk) {
      return;
    }

    chunk.mappingGroups[mappingGroupIndex].mappings.splice(mappingIndex, 1);
  });
}

export function addCondition(chunkId: string, mappingGroupIndex: number) {
  updateCurrentEditor((editor) => {
    const dmx = editor.dmx.udr;
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
  updateCurrentEditor((editor) => {
    const chunk = editor.dmx.udr.chunks[chunkId];
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
  updateCurrentEditor((editor) => {
    const chunk = editor.dmx.udr.chunks[chunkId];
    if (!chunk) {
      return;
    }

    chunk.mappingGroups[mappingGroupIndex].conditions!.splice(
      conditionIndex,
      1,
    );
  });
}
