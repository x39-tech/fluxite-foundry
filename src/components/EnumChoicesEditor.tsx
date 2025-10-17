import { useId } from "react";
import {
  LocalizedEnumChoice,
  LocalizedEnumInstanceChoices,
} from "udr/udrDatabase";
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
import { TrashIcon } from "@heroicons/react/24/solid";
import { getUniqueItemId } from "utils/utils";
import { PlusIcon } from "@heroicons/react/24/outline";

interface Props {
  id?: string;
  forName: string;
  classChoices: LocalizedEnumChoice[];
  instanceChoices?: LocalizedEnumInstanceChoices;
  onExclusionChanged: (choiceId: string, excluded: boolean) => void;
  // Added or changed
  onInstanceChoiceUpdated: (index: number, choice: LocalizedEnumChoice) => void;
  onInstanceChoiceRemoved: (index: number) => void;
}

interface ClassDisplayChoice extends LocalizedEnumChoice {
  removed: boolean;
}

export const EnumChoicesEditor = ({
  id,
  forName,
  classChoices,
  instanceChoices,
  onExclusionChanged,
  onInstanceChoiceUpdated,
  onInstanceChoiceRemoved,
}: Props) => {
  const idPrefix = useId();

  const classDisplayChoices: ClassDisplayChoice[] = classChoices.map(
    (choice) => {
      if (instanceChoices?.excluded?.includes(choice.id)) {
        return { ...choice, removed: true };
      } else {
        return { ...choice, removed: false };
      }
    },
  );

  const instanceChoiceIds = instanceChoices?.additional?.map(
    (choice) => choice.id,
  );

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
              {index}: {choice.name}
            </DropdownMenuItem>
          ))}
          <DropdownMenuItem className="text-muted-foreground text-xs font-medium pointer-events-none">
            From Instance
          </DropdownMenuItem>
          {instanceChoices?.additional?.map((choice, index) => (
            <DropdownMenuItem key={index} className="pointer-events-none">
              {classDisplayChoices.length + index}: {choice.name}
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
                    <TableCell className="pl-5">{choice.id}</TableCell>
                    <TableCell className="pl-5">{choice.name}</TableCell>
                    <TableCell className="w-[32px]">
                      <Checkbox
                        checked={!choice.removed}
                        onCheckedChange={(checked) =>
                          typeof checked === "boolean" &&
                          onExclusionChanged(choice.id, !checked)
                        }
                      />
                    </TableCell>
                  </TableRow>
                ))}
                {instanceChoices?.additional?.map((choice, index) => {
                  return (
                    <TableRow key={index}>
                      <TableCell>
                        <ValidatedInput
                          sizeVariant="unspecified"
                          popoverSide="left"
                          value={choice.id}
                          onConfirm={(value) =>
                            onInstanceChoiceUpdated(index, {
                              id: value,
                              name: choice.name,
                            })
                          }
                          validator={(value) =>
                            validateNewItemId(
                              value,
                              (instanceChoiceIds || []).filter(
                                (value) => value !== choice.id,
                              ),
                            )
                          }
                        />
                      </TableCell>
                      <TableCell>
                        <ValidatedInput
                          sizeVariant="unspecified"
                          popoverSide="left"
                          value={choice.name}
                          onConfirm={(value) =>
                            onInstanceChoiceUpdated(index, {
                              id: choice.id,
                              name: value,
                            })
                          }
                        />
                      </TableCell>
                      <TableCell className="w-[32px]">
                        <SmallIconButton
                          onClick={() => onInstanceChoiceRemoved(index)}
                        >
                          <TrashIcon className="size-5 fill-red-500" />
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
                        onInstanceChoiceUpdated(-1, {
                          id: newId,
                          name: "New Choice",
                        });
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
