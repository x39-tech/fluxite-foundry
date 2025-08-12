import { NumericInput, NumericInputProps } from "@blueprintjs/core";
import { Tooltip2 } from "@blueprintjs/popover2";
import { TrashIcon } from "@heroicons/react/24/solid";
import { Button } from "components/scn-ui/Button";

interface NumericInputTableRowProps {
  label: string;
}

export const NumericInputTableRow = (
  props: NumericInputTableRowProps & NumericInputProps,
) => {
  return (
    <tr>
      <td style={{ verticalAlign: "middle" }}>{props.label}</td>
      <td>
        <NumericInput {...props} />
      </td>
    </tr>
  );
};

interface ClearableNumericInputProps extends NumericInputProps {
  onValueChange: (value?: number) => void;
}

export const ClearableNumericInput = (props: ClearableNumericInputProps) => {
  return (
    <NumericInput
      leftElement={
        <Tooltip2
          className="flex"
          content="Clear property value"
          placement="left"
          disabled={!props.value}
        >
          <Button
            size="icon"
            variant="ghost"
            className="size-7 px-1"
            disabled={!props.value}
            onClick={() => {
              props.onValueChange(undefined);
            }}
          >
            <TrashIcon />
          </Button>
        </Tooltip2>
      }
      {...props}
    />
  );
};

export const ClearableNumericInputTableRow = (
  props: ClearableNumericInputProps & NumericInputTableRowProps,
) => {
  return (
    <tr>
      <td style={{ verticalAlign: "middle" }}>{props.label}</td>
      <td>
        <ClearableNumericInput {...props} />
      </td>
    </tr>
  );
};
