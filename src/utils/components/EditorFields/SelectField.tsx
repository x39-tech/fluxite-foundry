import { HTMLSelect } from "@blueprintjs/core";

export interface SelectFieldProps {
  values: string[];
  displayValues?: string[];
  selectedValue: string;
  onSelectionChanged: (newValue: string) => void;
}

export const SelectField: React.FC<SelectFieldProps> = ({
  values,
  displayValues,
  selectedValue,
  onSelectionChanged,
}) => {
  return (
    <HTMLSelect
      onChange={(event) => onSelectionChanged(event.currentTarget.value)}
      defaultValue={selectedValue}
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
