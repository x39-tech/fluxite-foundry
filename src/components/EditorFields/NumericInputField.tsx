import { NumericInput, NumericInputProps } from "@blueprintjs/core";
import { Tooltip2 } from "@blueprintjs/popover2";
import { Button } from "components/Button";

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
            minimal
            icon="TrashIcon"
            disabled={!props.value}
            onClick={() => {
              props.onValueChange(undefined);
            }}
          />
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
