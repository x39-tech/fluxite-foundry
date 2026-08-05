// Edits the enum choices a class defines.
//
// Not to be confused with components/EnumChoicesEditor, which is the enum
// choices editor for an instance (which shows the class's choices read-only and
// lets the instance exclude some of them or add its own).

import { PlusIcon, Trash2Icon } from "lucide-react";
import { CodexId, EntityId } from "app/persistentState";
import { useCurrentLocale } from "app/store";
import { getUniqueItemId } from "utils/utils";
import { validateNewItemId } from "utils/inputValidation";
import { Button } from "components/scn-ui/Button";
import { SmallIconButton } from "components/SmallIconButton";
import { ValidatedInput } from "components/ValidatedInput";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "components/scn-ui/Table";
import {
  OwnEnumChoiceParentType,
  useClassOperations,
  useOwnEnumChoices,
} from "./state";

interface Props {
  id?: string;
  parentType: OwnEnumChoiceParentType;
  parentId: EntityId;
}

export const ClassEnumChoicesEditor = ({ id, parentType, parentId }: Props) => {
  const choices = useOwnEnumChoices(parentType, parentId);
  const operations = useClassOperations();
  const locale = useCurrentLocale();

  const choiceIds = choices.map((choice) => choice.codexId);

  return (
    <Table id={id}>
      <TableHeader>
        <TableRow>
          <TableHead>ID</TableHead>
          <TableHead>Name</TableHead>
          <TableHead />
        </TableRow>
      </TableHeader>
      <TableBody>
        {choices.map((choice) => (
          <TableRow key={choice.id}>
            <TableCell>
              <ValidatedInput
                sizeVariant="unspecified"
                popoverSide="left"
                aria-label="Choice ID"
                value={choice.codexId}
                onConfirm={(value) =>
                  operations.setEnumChoiceCodexId(choice.id, CodexId(value))
                }
                validator={(value) =>
                  validateNewItemId(
                    value,
                    choiceIds.filter((taken) => taken !== choice.codexId),
                  )
                }
              />
            </TableCell>
            <TableCell>
              <ValidatedInput
                sizeVariant="unspecified"
                popoverSide="left"
                aria-label="Choice name"
                value={choice.name.value}
                onConfirm={(value) =>
                  operations.setEnumChoiceLocalizedValue(
                    choice.id,
                    "name",
                    value,
                    locale,
                  )
                }
              />
            </TableCell>
            <TableCell className="w-[32px]">
              <SmallIconButton
                aria-label={`Delete choice ${choice.codexId}`}
                onClick={() => operations.deleteEnumChoice(choice.id)}
              >
                <Trash2Icon className="size-5 stroke-red-500" />
              </SmallIconButton>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
      <TableFooter>
        <TableRow>
          <TableCell colSpan={3} className="px-0 py-0">
            <Button
              variant="ghost"
              aria-label="Add Enum Choice"
              className="w-full rounded-none"
              onClick={() => {
                const newId = getUniqueItemId(choiceIds, "new-choice");
                operations.addEnumChoice(
                  { type: parentType, id: parentId },
                  CodexId(newId),
                  "New Choice",
                  locale,
                );
              }}
            >
              <PlusIcon className="size-5" />
            </Button>
          </TableCell>
        </TableRow>
      </TableFooter>
    </Table>
  );
};
