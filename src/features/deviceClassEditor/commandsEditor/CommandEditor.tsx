import { useEffect, useId } from "react";
import { PlusIcon, QuestionMarkCircleIcon } from "@heroicons/react/24/outline";
import { FieldSet } from "components/FieldSet";
import { Label } from "components/scn-ui/Label";
import { AppInput } from "components/AppInput";
import { RenderError } from "components/RenderError";
import { ItemClassDisplay } from "components/ItemClassDisplay";
import { CommandClassDisplay } from "./CommandClassDisplay";
import { ValidatedInput } from "components/ValidatedInput";
import { LabeledCheckbox } from "components/LabeledCheckbox";
import { Item, ItemGroup } from "components/scn-ui/Item";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "components/scn-ui/DropdownMenu";
import { Button } from "components/scn-ui/Button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "components/scn-ui/Tooltip";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTrigger,
  DialogTitle,
} from "components/scn-ui/Dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "components/scn-ui/Table";
import { Checkbox } from "components/scn-ui/Checkbox";
import {
  getLocalizedCommand,
  LocalizedEnumChoice,
  LocalizedEnumInstanceChoices,
} from "udr/udrDatabase";
import { getUniqueItemId, unitToString } from "utils/utils";
import { validateNewItemId } from "utils/inputValidation";
import {
  changeCommandId,
  EnumChoiceLocation,
  modifyCommand,
  modifyCommandEnumChoice,
  modifyCommandFriendlyName,
  removeCommandEnumChoice,
  useCommand,
  useCommandClass,
  useCommandIds,
} from "./state";
import { useDeviceLocalizations } from "../state";
import { TrashIcon } from "@heroicons/react/24/solid";
import { SmallIconButton } from "components/SmallIconButton";

interface Props {
  id: string;
}

export const CommandEditor = ({ id }: Props) => {
  const commandIds = useCommandIds();
  const unlocalizedCommand = useCommand(id);
  const commandClass = useCommandClass(unlocalizedCommand);
  const localizations = useDeviceLocalizations();

  const idPrefix = useId();

  const commandHasReturnValues =
    commandClass?.returns && Object.values(commandClass?.returns).length > 0;

  // Completion Notification must be true if the command class has a return value
  useEffect(() => {
    if (unlocalizedCommand && commandHasReturnValues) {
      modifyCommand(id, (command) => (command.completionNotification = true));
    }
  }, [commandClass]);

  if (!unlocalizedCommand || !commandClass) {
    // TODO: better user feedback here
    return <RenderError />;
  }

  const command = getLocalizedCommand(unlocalizedCommand, localizations);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-4">
        <FieldSet>
          <Label htmlFor={`${idPrefix}-library`}>Library</Label>
          <AppInput
            id={`${idPrefix}-library`}
            disabled
            value={command.library || "Device Library"}
          />
        </FieldSet>
        <FieldSet>
          <Label htmlFor={`${idPrefix}-class`}>Class</Label>
          <ItemClassDisplay
            id={`${idPrefix}-class`}
            value={command.class}
            tooltipRenderer={() => (
              <CommandClassDisplay commandClass={commandClass} />
            )}
          />
        </FieldSet>
        <FieldSet>
          <Label htmlFor={`${idPrefix}-id`}>ID</Label>
          <ValidatedInput
            id={`${idPrefix}-id`}
            value={id}
            onConfirm={(newValue) => changeCommandId(id, newValue)}
            validator={(input) =>
              validateNewItemId(
                input,
                commandIds.filter((value) => value !== id),
              )
            }
          />
        </FieldSet>
        <FieldSet>
          <Label htmlFor={`${idPrefix}-friendlyName`}>Display Name</Label>
          <ValidatedInput
            id={`${idPrefix}-friendlyName`}
            value={command.friendlyName || ""}
            onConfirm={(newValue) => modifyCommandFriendlyName(id, newValue)}
          />
        </FieldSet>
        <LabeledCheckbox
          checked={command.completionNotification}
          disabled={commandHasReturnValues}
          onChange={(checked) =>
            modifyCommand(
              id,
              (draft) => (draft.completionNotification = checked),
            )
          }
        >
          Supports Completion Notification
        </LabeledCheckbox>
      </div>
      <FieldSet>
        <Label htmlFor={`${idPrefix}-arguments`}>Arguments</Label>
        <ItemGroup id={`${idPrefix}-arguments`}>
          {commandClass.arguments &&
            Object.entries(commandClass.arguments).map(
              ([argId, argument], index) => (
                <div key={index} className="flex flex-col gap-1">
                  <div className="text-sm ml-2">{argId}</div>
                  <Item variant="outline" className="items-start">
                    <FieldSet>
                      <Label>Name</Label>
                      <div className="text-sm flex gap-1">
                        {argument.name}
                        {argument.description && (
                          <Tooltip>
                            <TooltipTrigger>
                              <QuestionMarkCircleIcon className="size-5 opacity-50" />
                            </TooltipTrigger>
                            <TooltipContent>
                              {argument.description}
                            </TooltipContent>
                          </Tooltip>
                        )}
                      </div>
                    </FieldSet>
                    <FieldSet>
                      <Label id={`${idPrefix}-arg-${argId}-dataType`}>
                        Data Type
                      </Label>
                      <div
                        aria-labelledby={`${idPrefix}-arg-${argId}-dataType`}
                        className="text-sm"
                      >
                        {argument.dataType}
                      </div>
                    </FieldSet>
                    <FieldSet>
                      <Label id={`${idPrefix}-arg-${argId}-required`}>
                        Required
                      </Label>
                      <div
                        aria-labelledby={`${idPrefix}-arg-${argId}-required`}
                      >
                        {argument.required ? "Yes" : "No"}
                      </div>
                    </FieldSet>
                    {argument.unit && (
                      <FieldSet>
                        <Label id={`${idPrefix}-arg-${argId}-unit`}>Unit</Label>
                        <div
                          aria-labelledby={`${idPrefix}-arg-${argId}-unit`}
                          className="text-sm"
                        >
                          {unitToString(argument.unit)}
                        </div>
                      </FieldSet>
                    )}
                    {argument.choices && (
                      <FieldSet>
                        <Label htmlFor={`${idPrefix}-arg-${argId}-choices`}>
                          Enum Choices
                        </Label>
                        <EnumChoices
                          id={`${idPrefix}-arg-${argId}-choices`}
                          argName={argument.name}
                          classChoices={argument.choices}
                          instanceChoices={command.argumentChoices?.[argId]}
                          onExclusionChanged={(choiceId, excluded) =>
                            modifyCommand(id, (draft) => {
                              draft.argumentChoices ||= {};
                              draft.argumentChoices[argId] ||= { excluded: [] };
                              draft.argumentChoices[argId].excluded ||= [];

                              const excludedList =
                                draft.argumentChoices[argId].excluded;

                              if (excluded) {
                                if (!excludedList.includes(choiceId)) {
                                  excludedList.push(choiceId);
                                }
                              } else {
                                draft.argumentChoices[argId].excluded =
                                  excludedList.filter(
                                    (value) => value !== choiceId,
                                  );
                              }
                            })
                          }
                          onInstanceChoiceRemoved={(choiceIndex) =>
                            removeCommandEnumChoice(
                              id,
                              argId,
                              choiceIndex,
                              EnumChoiceLocation.Argument,
                            )
                          }
                          onInstanceChoiceUpdated={(
                            choiceIndex,
                            updatedChoice,
                          ) =>
                            modifyCommandEnumChoice(
                              id,
                              argId,
                              choiceIndex,
                              updatedChoice,
                              EnumChoiceLocation.Argument,
                            )
                          }
                        />
                      </FieldSet>
                    )}
                  </Item>
                </div>
              ),
            )}
        </ItemGroup>
      </FieldSet>
    </div>
  );
};

interface EnumChoicesProps {
  id: string;
  argName: string;
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

const EnumChoices = ({
  id,
  argName,
  classChoices,
  instanceChoices,
  onExclusionChanged,
  onInstanceChoiceUpdated,
  onInstanceChoiceRemoved,
}: EnumChoicesProps) => {
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
            <DialogTitle>Enum Choices for {argName}</DialogTitle>
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
