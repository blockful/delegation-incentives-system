import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { DataTable, type Column } from "@/components/molecules";

interface TestRow {
  id: string;
  name: string;
  value: number;
}

const columns: Column<TestRow>[] = [
  { key: "name", header: "Name", render: (r) => r.name },
  { key: "value", header: "Value", render: (r) => String(r.value), align: "right" },
];

const data: TestRow[] = [
  { id: "1", name: "Alice", value: 100 },
  { id: "2", name: "Bob", value: 200 },
];

describe("DataTable", () => {
  it("renders column headers", () => {
    render(<DataTable columns={columns} data={data} keyExtractor={(r) => r.id} />);
    expect(screen.getByText("Name")).toBeInTheDocument();
    expect(screen.getByText("Value")).toBeInTheDocument();
  });

  it("renders data rows", () => {
    render(<DataTable columns={columns} data={data} keyExtractor={(r) => r.id} />);
    expect(screen.getByText("Alice")).toBeInTheDocument();
    expect(screen.getByText("200")).toBeInTheDocument();
  });

  it("shows empty message when data is empty", () => {
    render(
      <DataTable
        columns={columns}
        data={[]}
        keyExtractor={(r) => r.id}
        emptyMessage="Nothing here"
      />,
    );
    expect(screen.getByText("Nothing here")).toBeInTheDocument();
  });

  it("applies data-testid", () => {
    render(
      <DataTable
        columns={columns}
        data={data}
        keyExtractor={(r) => r.id}
        data-testid="my-table"
      />,
    );
    expect(screen.getByTestId("my-table")).toBeInTheDocument();
  });
});
