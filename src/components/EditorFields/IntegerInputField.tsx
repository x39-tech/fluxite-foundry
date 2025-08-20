import { IntegerInput, IntegerInputProps } from "components/IntegerInput";

interface IntegerInputTableRowProps {
  label: string;
}

export const IntegerInputTableRow = (
  props: IntegerInputTableRowProps & IntegerInputProps,
) => {
  return (
    <tr>
      <td style={{ verticalAlign: "middle" }}>{props.label}</td>
      <td>
        <IntegerInput {...props} />
      </td>
    </tr>
  );
};
