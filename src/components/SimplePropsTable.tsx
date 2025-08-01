import { Table } from "./Table";

interface Props {
  name?: string;
  className?: string;
  children: React.ReactNode;
}

// Provides a table with some options pre-set and optimized for display as part of
// the editor components. Children are rendered underneath the <tbody>, so they
// should be <tr> elements.

// If provided, 'name' will be rendered in a table header.

export const SimplePropsTable = ({ name, className, children }: Props) => {
  return (
    <Table className={className}>
      <colgroup>
        <col span={1} className="w-1/3" />
        <col span={1} />
      </colgroup>
      {name ? (
        <thead>
          <tr className="text-left">
            <th colSpan={2} className="py-[6px] px-2">
              {name}
            </th>
          </tr>
        </thead>
      ) : (
        <></>
      )}
      <tbody>{children}</tbody>
    </Table>
  );
};
