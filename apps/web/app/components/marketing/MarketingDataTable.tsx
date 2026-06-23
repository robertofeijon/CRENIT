import type { ReactNode } from 'react';

export type MarketingTableColumn = {
  key: string;
  header: string;
  className?: string;
};

export type MarketingTableRow = {
  key: string;
  cells: ReactNode[];
};

type MarketingDataTableProps = {
  columns: MarketingTableColumn[];
  rows: MarketingTableRow[];
  footer?: string;
  empty?: ReactNode;
};

export default function MarketingDataTable({ columns, rows, footer, empty }: MarketingDataTableProps) {
  if (!rows.length && empty) {
    return <div className="marketing-data-table marketing-data-table--empty">{empty}</div>;
  }

  return (
    <div className="marketing-data-table">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[28rem] text-left text-sm">
          <thead>
            <tr>
              {columns.map((col) => (
                <th key={col.key} className={`marketing-data-table__th ${col.className ?? ''}`}>
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="marketing-data-table__body">
            {rows.map((row) => (
              <tr key={row.key} className="marketing-data-table__row">
                {row.cells.map((cell, i) => (
                  <td key={`${row.key}-${columns[i]?.key ?? i}`} className="marketing-data-table__td">
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {footer ? <p className="marketing-data-table__footer">{footer}</p> : null}
    </div>
  );
}
