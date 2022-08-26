import { TagInput } from "@blueprintjs/core";

export interface TagInputFieldProps {
  values: string[];
  onValuesChanged: (newValues: string[]) => void;
}

export const TagInputField: React.FC<TagInputFieldProps> = ({
  values,
  onValuesChanged,
}) => {
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

export const TagInputTableRow: React.FC<TagInputTableRowProps> = (props) => {
  return (
    <tr>
      <td>{props.label}</td>
      <td>
        <TagInputField {...props} />
      </td>
    </tr>
  );
};
