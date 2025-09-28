import { useMemo } from "react";
import { Draft, produceWithPatches } from "immer";
import * as FlexLayout from "flexlayout-react";
import { useShallow } from "zustand/react/shallow";
import {
  Access,
  createParameterDatabase,
  DefinitionLocalization,
  DeviceClass,
  DeviceLibrary,
  Lifetime,
  Error as E173Error,
} from "e173";
import {
  AppPersistentState,
  EditorType,
  DeviceClassEditorState,
} from "app/state";
import {
  useAppPersistentStore,
  updateAppRuntimeState,
  updateAppPersistentState,
  useUdrDatabase,
} from "app/store";
import {
  lookupDeviceParameterClass,
  lookupParameterClass,
  ResolvedParameterClass,
} from "udr/udrDatabase";

// ---------------------------------------------------------------------------
// Read
// ---------------------------------------------------------------------------

export function useCurrentEditorId(): string | undefined {
  return useAppPersistentStore(
    (state) => state.openEditors.editors[state.openEditors.selectedEditor]?.id,
  );
}

export function useCurrentEditorPart<T>(
  reducer: (state: DeviceClassEditorState) => T,
): T | undefined {
  return useAppPersistentStore((state) => {
    const currentEditor = getCurrentEditor(state);
    if (!currentEditor) {
      return undefined;
    }

    return reducer(currentEditor);
  });
}

export function useCurrentEditorPartShallow<T>(
  reducer: (state: DeviceClassEditorState) => T,
): T | undefined {
  return useAppPersistentStore(
    useShallow((state) => {
      const currentEditor = getCurrentEditor(state);
      if (!currentEditor) {
        return undefined;
      }

      return reducer(currentEditor);
    }),
  );
}

export function useLibraries(): Record<string, string> | undefined {
  return useCurrentEditorPart((state) => state.libraries);
}

export function useParametersWithClasses(): Record<
  string,
  ResolvedParameterClass
> {
  const parameters = useCurrentEditorPart(
    (state) => state.parameters.parameters,
  );
  const libraries = useCurrentEditorPart((state) => state.libraries);
  const deviceLibrary = useCurrentEditorPart((state) => state.deviceLibrary);
  const localizations = useCurrentEditorPart((state) => state.localizations);
  const udrDatabase = useUdrDatabase();

  return useMemo(() => {
    if (!parameters || !deviceLibrary || !libraries || !localizations) {
      return {};
    }

    return Object.entries(parameters).reduce(
      (acc, [paramId, param]) => {
        let paramClass = undefined;

        if (param.library) {
          const libraryVersion = libraries[param.library];
          if (!libraryVersion) {
            return acc;
          }

          paramClass = lookupParameterClass(
            udrDatabase,
            param.library,
            libraryVersion,
            param.class,
          );
        } else {
          paramClass = lookupDeviceParameterClass(
            deviceLibrary,
            localizations,
            param.class,
          );
        }

        if (!paramClass) {
          return acc;
        }

        acc[paramId] = paramClass;
        return acc;
      },
      {} as Record<string, ResolvedParameterClass>,
    );
  }, [parameters, libraries, deviceLibrary, localizations, udrDatabase]);
}

const EMPTY_DEVICE_LIBRARY: DeviceLibrary = {
  parameterClasses: {},
  structureClasses: {},
  serializerClasses: {},
};

export function useDeviceLibrary(): DeviceLibrary {
  return (
    useCurrentEditorPart((state) => state.deviceLibrary) || EMPTY_DEVICE_LIBRARY
  );
}

const EMPTY_OBJ = {};

export function useDeviceLocalizations(): Record<
  string,
  DefinitionLocalization
> {
  return useCurrentEditorPart((state) => state.localizations) || EMPTY_OBJ;
}

// ---------------------------------------------------------------------------
// Write
// ---------------------------------------------------------------------------

export function updateCurrentEditor(
  updater: (editor: Draft<DeviceClassEditorState>) => void,
) {
  updateAppPersistentState((state) => {
    const [nextState, patches, _invPatches] = produceWithPatches(
      state,
      (state) => {
        const currentEditor = getCurrentEditor(state);
        if (!currentEditor) {
          return state;
        }

        updater(currentEditor);
      },
    );

    if (
      patches.some((patch) => {
        if (
          patch.path.length >= 3 &&
          patch.path[0] == "deviceClassEditors" &&
          typeof patch.path[2] == "string"
        ) {
          return ["libraries", "deviceLibrary", "parameters", "dmx"].includes(
            patch.path[2],
          );
        }
      })
    ) {
      updateDmxController(getCurrentEditor(nextState)!);
    }

    return nextState;
  });
}

export function setWindowLayout(model: FlexLayout.IJsonModel) {
  updateCurrentEditor((editor) => (editor.windowLayout = model.layout));
}

export function updateDmxController(editor: DeviceClassEditorState) {
  if (editor.dmx.udr) {
    try {
      const deviceClass = exportDeviceClass(editor);
      const db = createParameterDatabase(deviceClass);
      updateAppRuntimeState((state) => {
        state.dmxController = {
          state: "available",
          db,
        };
      });
    } catch (e) {
      const err = e as E173Error;
      updateAppRuntimeState((state) => {
        state.dmxController = {
          state: "error",
          error: err,
        };
      });
    }
  }
}

export function getCurrentEditor<S extends AppPersistentState>(
  state: S,
): DeviceClassEditorState | undefined {
  const currentEditor =
    state.openEditors.editors[state.openEditors.selectedEditor];
  if (!currentEditor || currentEditor.type != EditorType.DEVICE_CLASS) {
    return undefined;
  }
  return state.deviceClassEditors[currentEditor.id];
}

export function exportDeviceClass(editor: DeviceClassEditorState): DeviceClass {
  const deviceClass: DeviceClass = {
    libraries: editor.libraries,
    deviceLibrary: editor.deviceLibrary ? editor.deviceLibrary : undefined,
    ...editor.basicData,
    parameters: editor.parameters.parameters,
    structures: {
      ...editor.structures.structures,
    },
    localizations: editor.localizations ? editor.localizations : undefined,
  };

  if (editor.dmx.udr) {
    deviceClass.serializers = {
      dmx: {
        library: "org.esta.lib.core",
        class: "esta-dmx",
        access: [Access.Read],
        lifetime: Lifetime.Static,
        default: editor.dmx.udr,
      },
    };
  }

  return deviceClass;
}
