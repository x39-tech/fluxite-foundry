// Shared functions for working with enum choices, which can appear in both
// libraries and device classes and reference both item classes and items such
// as parameters and commands.

import { Draft } from "immer";
import {
  CodexId,
  EntityId,
  EnumChoice,
  EnumChoiceParent,
} from "app/persistentState";
import {
  enumChoiceParentsEqual,
  newEntityId,
  selectWithIds,
} from "app/stateUtils";
import { Unlocalized } from "features/localizations/types";
import { ClassDocument, ClassLocalizer } from "./context";

/** A document draft that owns a table of enum choices. */
type ChoiceHolder = Draft<Pick<ClassDocument, "enumChoices">>;

/**
 * Appends a choice to its parent's list. Does nothing if the parent already
 * has one with this codexId.
 */
export function addEnumChoiceTo(
  draft: ChoiceHolder,
  localizer: ClassLocalizer,
  parent: EnumChoiceParent,
  codexId: CodexId,
  name: string,
  description: string | undefined,
  locale: string,
): void {
  const siblings = Object.values(draft.enumChoices).filter((choice) =>
    enumChoiceParentsEqual(parent, choice.parent),
  );

  if (siblings.some((choice) => choice.codexId === codexId)) {
    return;
  }

  draft.enumChoices[newEntityId()] = {
    parent,
    codexId,
    index: siblings.length,
    localized: localizer.create("enumChoices", { name, description }, locale),
  };
}

export function modifyEnumChoiceIn(
  draft: ChoiceHolder,
  id: EntityId,
  recipe: (choice: Draft<Omit<Unlocalized<EnumChoice>, "parent">>) => void,
): void {
  const choice = draft.enumChoices[id];
  if (!choice) {
    return;
  }

  recipe(choice);
}

/** Removes a choice and closes the gap it leaves in its siblings' indexes. */
export function deleteEnumChoiceFrom(
  draft: ChoiceHolder,
  localizer: ClassLocalizer,
  id: EntityId,
): void {
  const choice = draft.enumChoices[id];
  if (!choice) {
    return;
  }

  const siblings = selectWithIds(draft.enumChoices, (sibling) =>
    enumChoiceParentsEqual(sibling.parent, choice.parent),
  );
  siblings.sort((a, b) => a.index - b.index);
  siblings
    .filter((sibling) => sibling.id !== id)
    .forEach((sibling, index) => {
      draft.enumChoices[sibling.id].index = index;
    });

  localizer.remove([{ table: "enumChoices", entityId: id }]);
  delete draft.enumChoices[id];
}

/**
 * Removes every choice belonging to any of the given parents, for cascading a
 * class deletion.
 */
export function deleteEnumChoicesOf(
  draft: ChoiceHolder,
  localizer: ClassLocalizer,
  parents: EnumChoiceParent[],
): void {
  const doomed = selectWithIds(draft.enumChoices, (choice) =>
    parents.some((parent) => enumChoiceParentsEqual(parent, choice.parent)),
  );

  localizer.remove(
    doomed.map((choice) => ({
      table: "enumChoices" as const,
      entityId: choice.id,
    })),
  );

  for (const choice of doomed) {
    delete draft.enumChoices[choice.id];
  }
}

/** The choices of one parent, in order of their indices. */
export function enumChoicesOf(
  document: Pick<ClassDocument, "enumChoices">,
  parent: EnumChoiceParent,
): (EnumChoice & { id: EntityId })[] {
  const choices = selectWithIds(document.enumChoices, (choice) =>
    enumChoiceParentsEqual(parent, choice.parent),
  );
  choices.sort((a, b) => a.index - b.index);
  return choices;
}
