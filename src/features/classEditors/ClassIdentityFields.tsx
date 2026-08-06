// The ID, name and description every kind of class carries.

import { CodexId, EntityId } from "app/persistentState";
import { useCurrentLocale } from "app/store";
import { validateNewItemId } from "utils/inputValidation";
import { FieldSet } from "components/FieldSet";
import { Label } from "components/scn-ui/Label";
import { ValidatedInput } from "components/ValidatedInput";
import { ValidatedTextarea } from "components/ValidatedTextarea";
import { ClassKind } from "./context";
import { useClassCodexIds, useClassOperations } from "./state";

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

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-4">
        <FieldSet>
          <Label htmlFor={`${idPrefix}-id`}>ID</Label>
          <ValidatedInput
            id={`${idPrefix}-id`}
            value={codexId}
            onConfirm={(newValue) =>
              operations.setClassCodexId(kind, id, CodexId(newValue))
            }
            validator={(input) =>
              validateNewItemId(
                input,
                takenIds.filter((taken) => taken !== codexId),
              )
            }
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
