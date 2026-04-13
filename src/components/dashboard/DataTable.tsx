import type { ReactNode } from "react";

type Column<T> = {
  key: string;
  header: string;
  render: (row: T) => ReactNode;
  align?: "left" | "right" | "center";
};

type DataTableProps<T> = {
  columns: Column<T>[];
  rows: T[];
  data?: T[];
};

export default function DataTable<T>({ columns, rows }: DataTableProps<T>) {
  return (
    <div className="overflow-x-auto rounded-[18px] bg-white ring-1 ring-slate-950/[0.05]">
      <table className="min-w-full divide-y divide-slate-100">
        <thead className="bg-slate-50/60">
          <tr>
            {columns.map((column) => (
              <th
                key={column.key}
                className={`px-5 py-4 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400 ${
                  column.align === "right"
                    ? "text-right"
                    : column.align === "center"
                      ? "text-center"
                      : "text-left"
                }`}
              >
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 bg-white">
          {rows.map((row, index) => (
            <tr key={index} className="transition-colors duration-150 hover:bg-slate-50/70">
              {columns.map((column) => (
                <td
                  key={column.key}
                  className={`px-5 py-4 text-sm leading-6 text-slate-700 ${
                    column.align === "right"
                      ? "text-right"
                      : column.align === "center"
                        ? "text-center"
                        : "text-left"
                  }`}
                >
                  {column.render(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
