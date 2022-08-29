import { HTMLSelect } from "@blueprintjs/core";

export interface SelectFieldProps {
  values: string[];
  selectedValue: string;
  onSelectionChanged: (newValue: string) => void;
}

export const SelectField: React.FC<SelectFieldProps> = ({
  values,
  selectedValue,
  onSelectionChanged,
}) => {
  return (
    <HTMLSelect
      onChange={(event) => {
        onSelectionChanged(event.currentTarget.value);
      }}
    >
      {values.map((value) => {
        return (
          <option value={value} selected={value === selectedValue}>
            {value}
          </option>
        );
      })}
    </HTMLSelect>
  );
};

export interface SelectTableRowProps extends SelectFieldProps {
  label: string;
}

export const SelectTableRow: React.FC<SelectTableRowProps> = (props) => {
  return (
    <tr>
      <td style={{ verticalAlign: "middle" }}>{props.label}</td>
      <td>
        <SelectField {...props} />
      </td>
    </tr>
  );
};
