// The ID, name and description every kind of class carries.

import { toast } from "sonner";
import { CodexId, EntityId } from "app/persistentState";
import { useCurrentLocale } from "app/store";
import {
  FullCategoryId,
  joinParameterClassId,
  splitParameterClassId,
} from "codex/categories";
import { useCategoryCatalog } from "hooks/useCategoryCatalog";
import { validateNewItemId } from "utils/inputValidation";
import { CategoryField } from "components/CategoryField";
import { FieldSet } from "components/FieldSet";
import { Label } from "components/scn-ui/Label";
import { ValidatedInput } from "components/ValidatedInput";
import { ValidatedTextarea } from "components/ValidatedTextarea";
import { ClassKind, classKinds } from "./context";
import {
  CLASS_KIND_NAMES,
  useClassCodexIds,
  useClassOperations,
} from "./state";

interface Props {
  idPrefix: string;
  kind: ClassKind;
  id: EntityId;
  codexId: CodexId;
  name: string;
  description?: string;
}

export const ClassIdentityFields = ({
  idPrefix,
  kind,
  id,
  codexId,
  name,
  description,
}: Props) => {
  const takenIds = useClassCodexIds(kind);
  const operations = useClassOperations();
  const locale = useCurrentLocale();
  const catalog = useCategoryCatalog();

  // A parameter class ID is unique in that it has a category and an identifier
  // joined by a path separator.
  const categorized = kind === classKinds.PARAMETER;
  const { category, identifier } = categorized
    ? splitParameterClassId(codexId)
    : { category: "", identifier: codexId };

  const otherIds = takenIds.filter((taken) => taken !== codexId);

  const setCodexId = (
    newCategory: FullCategoryId,
    newIdentifier: string,
  ): boolean => {
    const newCodexId = joinParameterClassId(newCategory, newIdentifier);

    if (otherIds.includes(CodexId(newCodexId))) {
      toast(`${CLASS_KIND_NAMES[kind]} ${newCodexId} already exists.`);
      return false;
    }

    operations.setClassCodexId(kind, id, CodexId(newCodexId));
    return true;
  };

  // The standard requires identifiers to be unique within their category, so
  // only the siblings in the same category are checked for uniqueness.
  const siblingIdentifiers = otherIds
    .map((taken) =>
      categorized
        ? splitParameterClassId(taken)
        : { category: "", identifier: taken },
    )
    .filter((parts) => parts.category === category)
    .map((parts) => parts.identifier);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-4">
        {categorized && (
          <FieldSet>
            <Label htmlFor={`${idPrefix}-category`}>Category</Label>
            <CategoryField
              id={`${idPrefix}-category`}
              value={category}
              catalog={catalog}
              locale={locale}
              onValueChange={(newCategory) =>
                setCodexId(newCategory, identifier)
              }
            />
          </FieldSet>
        )}
        <FieldSet>
          <Label htmlFor={`${idPrefix}-id`}>ID</Label>
          <ValidatedInput
            id={`${idPrefix}-id`}
            value={identifier}
            onConfirm={(newValue) => setCodexId(category, newValue)}
            validator={(input) => validateNewItemId(input, siblingIdentifiers)}
          />
        </FieldSet>
        <FieldSet>
          <Label htmlFor={`${idPrefix}-name`}>Name</Label>
          <ValidatedInput
            id={`${idPrefix}-name`}
            value={name}
            onConfirm={(newValue) =>
              operations.setClassLocalizedValue(
                kind,
                id,
                "name",
                newValue,
                locale,
              )
            }
          />
        </FieldSet>
      </div>
      {categorized && (
        <div className="text-xs text-muted-foreground">
          Full ID: <span className="font-mono">{codexId}</span>
        </div>
      )}
      <FieldSet>
        <Label htmlFor={`${idPrefix}-description`}>Description</Label>
        <ValidatedTextarea
          className="max-w-2xl"
          id={`${idPrefix}-description`}
          value={description ?? ""}
          onConfirm={(newValue) =>
            operations.setClassLocalizedValue(
              kind,
              id,
              "description",
              newValue,
              locale,
            )
          }
        />
      </FieldSet>
    </div>
  );
};
