import type { CSSProperties, ReactNode } from "react";
import { colors, fontSize, fontWeight, space, radii } from "@/theme";

export interface Column<T> {
  key: string;
  header: string;
  render: (row: T) => ReactNode;
  align?: "left" | "right" | "center";
}

export interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  keyExtractor: (row: T) => string;
  emptyMessage?: string;
  "data-testid"?: string;
}

const tableStyle: CSSProperties = {
  width: "100%",
  borderCollapse: "collapse",
  fontSize: fontSize.small,
};

const thStyle = (align: string): CSSProperties => ({
  textAlign: align as CSSProperties["textAlign"],
  padding: `${space["3"]} ${space["4"]}`,
  fontWeight: fontWeight.bold,
  color: colors.textSecondary,
  borderBottom: `2px solid ${colors.border}`,
  fontSize: fontSize.extraSmall,
  textTransform: "uppercase",
  letterSpacing: "0.03em",
});

const tdStyle = (align: string): CSSProperties => ({
  textAlign: align as CSSProperties["textAlign"],
  padding: `${space["3"]} ${space["4"]}`,
  borderBottom: `1px solid ${colors.border}`,
  color: colors.textPrimary,
  fontWeight: fontWeight.normal,
});

const emptyStyle: CSSProperties = {
  padding: space["8"],
  textAlign: "center",
  color: colors.textTertiary,
};

export function DataTable<T>({
  columns,
  data,
  keyExtractor,
  emptyMessage = "No data available",
  "data-testid": testId,
}: DataTableProps<T>) {
  return (
    <div
      style={{ overflowX: "auto", borderRadius: radii.large }}
      data-testid={testId}
    >
      <table style={tableStyle}>
        <thead>
          <tr>
            {columns.map((col) => (
              <th key={col.key} style={thStyle(col.align ?? "left")}>
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.length === 0 ? (
            <tr>
              <td colSpan={columns.length} style={emptyStyle}>
                {emptyMessage}
              </td>
            </tr>
          ) : (
            data.map((row) => (
              <tr key={keyExtractor(row)}>
                {columns.map((col) => (
                  <td key={col.key} style={tdStyle(col.align ?? "left")}>
                    {col.render(row)}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
