import { TagInput } from "@blueprintjs/core";

interface TagInputFieldProps {
  values: string[];
  onValuesChanged: (newValues: string[]) => void;
}

export const TagInputField = ({
  values,
  onValuesChanged,
}: TagInputFieldProps) => {
  return (
    <TagInput
      values={values}
      onChange={(values) => {
        onValuesChanged(values.map((value) => value as string));
      }}
    />
  );
};

export interface TagInputTableRowProps extends TagInputFieldProps {
  label: string;
}

export const TagInputTableRow = (props: TagInputTableRowProps) => {
  return (
    <tr>
      <td style={{ verticalAlign: "middle" }}>{props.label}</td>
      <td>
        <TagInputField {...props} />
      </td>
    </tr>
  );
};
