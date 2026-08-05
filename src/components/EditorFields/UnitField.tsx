import { FCUnit, fcUnitNames, FCUnitName } from "app/persistentState";
import { cn } from "utils/utils";
import { IntegerInput } from "components/IntegerInput";
import { SelectField } from "./SelectField";

// Unit is optional, so we need a 'none' value which is distinct from the
// standard's own `none` unit, which is a unit that happens to be dimensionless.
const NO_UNIT = "unspecified";

interface Props {
  id?: string;
  value?: FCUnit;
  onValueChanged: (unit: FCUnit | undefined) => void;
}

// A unit and its exponent presented separately editable in a single field
// sharing a border.
export const UnitField = ({ id, value, onValueChanged }: Props) => {
  const names = Object.values(fcUnitNames);

  return (
    <div
      id={id}
      className={cn(
        "flex h-9 w-3xs items-center rounded-md border border-input bg-transparent",
        "shadow-xs transition-[color,box-shadow] dark:bg-input/30",
        "focus-within:border-ring focus-within:ring-ring/50 focus-within:ring-[3px]",
      )}
    >
      <SelectField
        className="h-full min-w-0 flex-1 rounded-r-none border-0 bg-transparent shadow-none focus-visible:ring-0 dark:bg-transparent dark:hover:bg-transparent"
        aria-label="Unit"
        values={[NO_UNIT, ...names]}
        displayValues={["Not specified", ...names]}
        selectedValue={value?.name ?? NO_UNIT}
        onSelectionChanged={(newValue) =>
          onValueChanged(
            newValue === NO_UNIT
              ? undefined
              : { ...value, name: newValue as FCUnitName },
          )
        }
      />
      {value && (
        <>
          <div className="h-5 w-px shrink-0 bg-border" />
          <label className="flex h-full shrink-0 items-center pl-2">
            {/* Caret to label the box as an exponent */}
            <span aria-hidden className="text-sm text-muted-foreground">
              ^
            </span>
            <IntegerInput
              // Uncontrolled, to work around a limitation: exponents are
              // routinely negative, and a controlled input cannot hold the lone
              // "-" a user types while entering a negative number.
              key={value.name}
              className="w-12"
              inputClassName="h-8 border-0 bg-transparent px-1 shadow-none focus-visible:ring-0 dark:bg-transparent"
              aria-label="Unit exponent"
              placeholder="1"
              hideControls
              defaultValue={value.exponent}
              onValueConfirm={(exponent) =>
                onValueChanged(
                  exponent === null
                    ? { name: value.name }
                    : { ...value, exponent },
                )
              }
            />
          </label>
        </>
      )}
    </div>
  );
};
