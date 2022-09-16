import { HTMLTable } from "@blueprintjs/core";

export interface SimplePropsTableProps {
  name?: string;
  children: React.ReactNode;
}

// Provides a Blueprint HTMLTable with some options pre-set and optimized for display as part of
// the editor components.

// If provided, 'name' will be rendered in a table header.

export const SimplePropsTable: React.FC<SimplePropsTableProps> = ({
  name,
  children,
}) => {
  return (
    <HTMLTable striped condensed style={{ marginBottom: "10px" }}>
      <colgroup>
        <col span={1} style={{ width: "35%" }} />
        <col span={1} />
      </colgroup>
      {name ? (
        <thead>
          <tr>
            <th colSpan={2}>{name}</th>
          </tr>
        </thead>
      ) : (
        <></>
      )}
      <tbody>{children}</tbody>
    </HTMLTable>
  );
};
