import { HTMLTable } from "@blueprintjs/core";

export interface SimplePropsTableProps {
  name: string;
  children: React.ReactNode;
}

export const SimplePropsTable: React.FC<SimplePropsTableProps> = ({
  name,
  children,
}) => {
  return (
    <HTMLTable striped style={{ marginBottom: "10px" }}>
      <colgroup>
        <col span={1} style={{ width: "25%" }} />
        <col span={1} />
      </colgroup>
      <thead>
        <tr>
          <th colSpan={2}>{name}</th>
        </tr>
      </thead>
      <tbody>{children}</tbody>
    </HTMLTable>
  );
};
