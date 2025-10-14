import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "components/scn-ui/Select";

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
      onValueChange={(newValue) => onSelectionChanged(newValue)}
      value={selectedValue}
    >
      <SelectTrigger>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {values.map((value, index) => {
          return (
            <SelectItem key={index} value={value}>
              {displayValues && index < displayValues.length
                ? displayValues[index]
                : value}
            </SelectItem>
          );
        })}
      </SelectContent>
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
