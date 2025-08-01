interface TableProps {
  className?: string;
  children: React.ReactNode;
}

export const Table = ({ className = "", children }: TableProps) => {
  return (
    <table
      className={`[&>tbody>tr:first-child]:border-t [&>tbody>tr:first-child]:border-gray-500 [&>tbody>tr:nth-child(odd)]:bg-gray-500/15 [&_td]:py-[6px] [&_td]:px-2 [&_td]:align-middle [&_td]:text-sm [&_td]:align-middle ${className}`}
    >
      {children}
    </table>
  );
};
