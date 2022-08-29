import { Button, NumericInput, NumericInputProps } from "@blueprintjs/core";
import { Tooltip2 } from "@blueprintjs/popover2";

export interface NumericInputTableRowProps {
  label: string;
}

export const NumericInputTableRow: React.FC<
  NumericInputTableRowProps & NumericInputProps
> = (props) => {
  return (
    <tr>
      <td style={{ verticalAlign: "middle" }}>{props.label}</td>
      <td>
        <NumericInput {...props} />
      </td>
    </tr>
  );
};

export interface ClearableNumericInputProps extends NumericInputProps {
  onValueChange: (value?: number) => void;
}

export const ClearableNumericInput: React.FC<ClearableNumericInputProps> = (
  props
) => {
  return (
    <NumericInput
      leftElement={
        <Tooltip2
          content="Clear property value"
          placement="left"
          disabled={!props.value}
        >
          <Button
            minimal
            icon="delete"
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

export const ClearableNumericInputTableRow: React.FC<
  ClearableNumericInputProps & NumericInputTableRowProps
> = (props) => {
  return (
    <tr>
      <td style={{ verticalAlign: "middle" }}>{props.label}</td>
      <td>
        <ClearableNumericInput {...props} />
      </td>
    </tr>
  );
};
