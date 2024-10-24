import { nanoid } from "nanoid";
import { Draft } from "immer";
import { ItemEditor, ParametersEditorState } from "app/state";
import { Lifetime, Parameter, ParameterAccess } from "e173";
import { getCurrentEditor, useCurrentEditorPart } from "../state";
import { useAppStore } from "app/store";

export function useParameters(): ParametersEditorState | undefined {
  return useCurrentEditorPart((state) => state.parameters);
}

export function useParameterEditors(): ItemEditor[] {
  const editors = useCurrentEditorPart((state) =>
    state.parameters.itemEditorLayout.filter(
      (editor) => editor.udrId in state.parameters.parameters,
    ),
  );
  return editors ?? [];
}

export function useParameterIds(): string[] {
  const ids = useCurrentEditorPart((state) =>
    Object.keys(state.parameters.parameters),
  );
  return ids ?? [];
}

export function useParameter(id: string): Parameter | undefined {
  return useCurrentEditorPart((state) => state.parameters.parameters[id]);
}

export function createNewParameter(
  library: string,
  paramClass: string,
  id: string,
  friendlyName: string,
) {
  useAppStore.setState((state) => {
    const paramState = getCurrentEditor(state)?.parameters;
    if (!paramState) {
      return;
    }

    if (id in paramState.parameters) {
      return;
    }

    paramState.parameters[id] = {
      library,
      class: paramClass,
      access: [ParameterAccess.ReadActual, ParameterAccess.Write],
      lifetime: Lifetime.Runtime,
      "@friendlyName": friendlyName,
    };

    paramState.itemEditorLayout.push({
      id: nanoid(),
      udrId: id,
    });
  });
}

export function modifyParameter(
  id: string,
  recipe: (state: Draft<Parameter>) => void,
) {
  useAppStore.setState((state) => {
    const param = getCurrentEditor(state)?.parameters.parameters[id];
    if (!param) {
      return;
    }

    recipe(param);
  });
}

export function changeParameterId(id: string, newId: string) {
  useAppStore.setState((state) => {
    const paramState = getCurrentEditor(state)?.parameters;
    if (!paramState || newId in paramState.parameters) {
      return;
    }

    const existingParam = paramState.parameters[id];
    if (!existingParam) {
      return;
    }

    // Update UDR
    paramState.parameters[newId] = existingParam;
    delete paramState.parameters[id];

    // Update UI paramState
    paramState.itemEditorLayout.forEach((siEditorparamState) => {
      if (siEditorparamState.udrId === id) {
        siEditorparamState.udrId = newId;
      }
    });
  });
}

export function deleteParameter(id: string) {
  useAppStore.setState((state) => {
    const paramState = getCurrentEditor(state)?.parameters;
    if (!paramState) {
      return;
    }

    delete paramState.parameters[id];
    paramState.itemEditorLayout = paramState.itemEditorLayout.filter(
      (value) => value.udrId !== id,
    );
  });
}
