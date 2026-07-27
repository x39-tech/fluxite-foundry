import { useId } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./scn-ui/DropdownMenu";
import { Button } from "./scn-ui/Button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./scn-ui/Dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "./scn-ui/Table";
import { Checkbox } from "./scn-ui/Checkbox";
import { ValidatedInput } from "./ValidatedInput";
import { validateNewItemId } from "utils/inputValidation";
import { SmallIconButton } from "./SmallIconButton";
import { PlusIcon, Trash2Icon } from "lucide-react";
import { getUniqueItemId } from "utils/utils";
import {
  LocalizedClassEnumChoice,
  LocalizedInstanceEnumChoice,
} from "features/deviceClassEditor/stateTransformations";
import { useCurrentLocale } from "app/store";
import {
  addEnumChoice,
  deleteEnumChoice,
  modifyEnumChoice,
  modifyEnumChoiceLocalizedValue,
} from "features/deviceClassEditor/state";
import { ClassMemberId, CodexId, EnumChoiceParent } from "app/persistentState";

interface Props {
  id?: string;
  forName: string;
  parent: EnumChoiceParent;
  classChoices: LocalizedClassEnumChoice[];
  instanceChoices?: LocalizedInstanceEnumChoice[];
  exclusions?: readonly ClassMemberId[];
  onExclusionChanged: (choiceId: ClassMemberId, excluded: boolean) => void;
}

interface ClassDisplayChoice extends LocalizedClassEnumChoice {
  removed: boolean;
}

export const EnumChoicesEditor = ({
  id,
  forName,
  parent,
  classChoices,
  instanceChoices,
  exclusions,
  onExclusionChanged,
}: Props) => {
  const idPrefix = useId();
  const locale = useCurrentLocale();

  const excludedSet = new Set<string>(exclusions ?? []);
  const classDisplayChoices: ClassDisplayChoice[] = classChoices.map(
    (choice) => ({
      ...choice,
      removed: excludedSet.has(choice.id ?? choice.codexId),
    }),
  );

  const instanceChoiceIds = instanceChoices?.map((choice) => choice.codexId);

  return (
    <div id={id} className="flex gap-2">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm">
            View
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem className="text-muted-foreground text-xs font-medium pointer-events-none">
            From Class
          </DropdownMenuItem>
          {classDisplayChoices.map((choice, index) => (
            <DropdownMenuItem
              key={index}
              className={`pointer-events-none ${choice.removed && "text-muted-foreground line-through"}`}
            >
              {index}: {choice.name.value}
            </DropdownMenuItem>
          ))}
          <DropdownMenuItem className="text-muted-foreground text-xs font-medium pointer-events-none">
            From Instance
          </DropdownMenuItem>
          {instanceChoices?.map((choice, index) => (
            <DropdownMenuItem key={index} className="pointer-events-none">
              {classDisplayChoices.length + index}: {choice.name.value}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
      <Dialog>
        <DialogTrigger asChild>
          <Button size="sm">Modify</Button>
        </DialogTrigger>
        <DialogContent className="max-h-[90vh] grid-rows-[auto_1fr]">
          <DialogHeader>
            <DialogTitle>Enum Choices for {forName}</DialogTitle>
            <DialogDescription>
              Manage class-level enum choices and add custom instance-specific
              enum choices
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-2 overflow-y-auto min-h-0">
            <Table id={`${idPrefix}-class-choices`}>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-5">ID</TableHead>
                  <TableHead className="pl-5">Name</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {classDisplayChoices.map((choice, index) => (
                  <TableRow
                    key={index}
                    className={choice.removed ? "text-muted-foreground" : ""}
                  >
                    <TableCell className="pl-5">{choice.codexId}</TableCell>
                    <TableCell className="pl-5">{choice.name.value}</TableCell>
                    <TableCell className="w-[32px]">
                      <Checkbox
                        checked={!choice.removed}
                        onCheckedChange={(checked) =>
                          typeof checked === "boolean" &&
                          onExclusionChanged(
                            choice.id ?? choice.codexId,
                            !checked,
                          )
                        }
                      />
                    </TableCell>
                  </TableRow>
                ))}
                {instanceChoices?.map((choice, index) => {
                  return (
                    <TableRow key={index}>
                      <TableCell>
                        <ValidatedInput
                          sizeVariant="unspecified"
                          popoverSide="left"
                          value={choice.codexId}
                          onConfirm={(value) =>
                            modifyEnumChoice(
                              choice.id,
                              (draft) => (draft.codexId = CodexId(value)),
                            )
                          }
                          validator={(value) =>
                            validateNewItemId(
                              value,
                              (instanceChoiceIds || []).filter(
                                (value) => value !== choice.codexId,
                              ),
                            )
                          }
                        />
                      </TableCell>
                      <TableCell>
                        <ValidatedInput
                          sizeVariant="unspecified"
                          popoverSide="left"
                          value={choice.name.value || ""}
                          onConfirm={(value) =>
                            modifyEnumChoiceLocalizedValue(
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
                          onClick={() => deleteEnumChoice(choice.id)}
                        >
                          <Trash2Icon className="size-5 stroke-red-500" />
                        </SmallIconButton>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
              <TableFooter>
                <TableRow>
                  <TableCell colSpan={3} className="px-0 py-0">
                    <Button
                      variant="ghost"
                      className="w-full rounded-none"
                      onClick={() => {
                        const newId = getUniqueItemId(
                          instanceChoiceIds || [],
                          "new-choice",
                        );
                        addEnumChoice(
                          parent,
                          CodexId(newId),
                          "New Choice",
                          undefined,
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
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
