import { TagInput } from "components/TagInput";

interface TagInputFieldProps {
  className?: string;
  values: string[];
  onValuesChanged: (newValues: string[]) => void;
}

export const TagInputField = ({
  className,
  values,
  onValuesChanged,
}: TagInputFieldProps) => {
  return (
    <TagInput
      className={className}
      values={values}
      onValuesChange={(values) => {
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
