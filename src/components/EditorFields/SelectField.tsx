import { Select } from "../Select";

interface SelectFieldProps {
  values: string[];
  displayValues?: string[];
  selectedValue: string;
  onSelectionChanged: (newValue: string) => void;
}

export const SelectField = ({
  values,
  displayValues,
  selectedValue,
  onSelectionChanged,
}: SelectFieldProps) => {
  return (
    <Select
      onChange={(event) => onSelectionChanged(event.currentTarget.value)}
      value={selectedValue}
    >
      {values.map((value, index) => {
        return (
          <option key={index} value={value}>
            {displayValues && index < displayValues.length
              ? displayValues[index]
              : value}
          </option>
        );
      })}
    </Select>
  );
};

export interface SelectTableRowProps extends SelectFieldProps {
  label: string;
}

export const SelectTableRow = (props: SelectTableRowProps) => {
  return (
    <tr>
      <td style={{ verticalAlign: "middle" }}>{props.label}</td>
      <td>
        <SelectField {...props} />
      </td>
    </tr>
  );
};
