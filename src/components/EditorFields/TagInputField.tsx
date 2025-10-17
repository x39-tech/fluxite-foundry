import { TagInput, TagInputProps } from "components/TagInput";

interface TagInputFieldProps {
  className?: string;
  values: string[];
  onValuesChanged: (newValues: string[]) => void;
}

export const TagInputField = ({
  className,
  values,
  onValuesChanged,
  ...props
}: TagInputFieldProps &
  Omit<TagInputProps, "className" | "values" | "onValueChanged">) => {
  return (
    <TagInput
      className={className}
      values={values}
      onValuesChange={(values) => {
        onValuesChanged(values.map((value) => value as string));
      }}
      {...props}
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
