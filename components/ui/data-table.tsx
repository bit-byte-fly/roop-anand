"use client";

import { ReactNode, useState } from "react";
import {
  ColumnDef,
  PaginationState,
  RowData,
  SortingState,
  Updater,
  createPaginatedRowModel,
  createSortedRowModel,
  functionalUpdate,
  rowPaginationFeature,
  rowSortingFeature,
  tableFeatures,
  useTable,
} from "@tanstack/react-table";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export const adminDataTableFeatures = tableFeatures({
  rowSortingFeature,
  sortedRowModel: createSortedRowModel(),
  rowPaginationFeature,
  paginatedRowModel: createPaginatedRowModel(),
  columnMeta: {} as { className?: string },
});

export type DataTableColumnDef<TData extends RowData> = ColumnDef<
  typeof adminDataTableFeatures,
  TData
>;

interface ServerTableState {
  pagination: PaginationState;
  rowCount: number;
  sorting: SortingState;
  onPaginationChange: (pagination: PaginationState) => void;
  onSortingChange: (sorting: SortingState) => void;
}

interface DataTableProps<TData extends RowData> {
  columns: DataTableColumnDef<TData>[];
  data: TData[];
  title?: string;
  emptyState?: ReactNode;
  serverState?: ServerTableState;
  initialPageSize?: number;
  pageSizeOptions?: number[];
  getRowId?: (row: TData) => string;
}

const defaultPageSizes = [5, 10, 20, 50];

export function DataTable<TData extends RowData>({
  columns,
  data,
  title = "Records",
  emptyState,
  serverState,
  initialPageSize = 10,
  pageSizeOptions = defaultPageSizes,
  getRowId,
}: DataTableProps<TData>) {
  const [localPagination, setLocalPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: initialPageSize,
  });
  const [localSorting, setLocalSorting] = useState<SortingState>([]);

  const pagination = serverState?.pagination ?? localPagination;
  const sorting = serverState?.sorting ?? localSorting;
  const rowCount = serverState?.rowCount ?? data.length;
  const pageCount = Math.max(1, Math.ceil(rowCount / pagination.pageSize));

  const handlePaginationChange = (updater: Updater<PaginationState>) => {
    const next = functionalUpdate(updater, pagination);
    if (serverState) serverState.onPaginationChange(next);
    else setLocalPagination(next);
  };

  const handleSortingChange = (updater: Updater<SortingState>) => {
    const next = functionalUpdate(updater, sorting);
    const nextPagination = { ...pagination, pageIndex: 0 };
    if (serverState) {
      serverState.onSortingChange(next);
      serverState.onPaginationChange(nextPagination);
    } else {
      setLocalSorting(next);
      setLocalPagination(nextPagination);
    }
  };

  const table = useTable({
    features: adminDataTableFeatures,
    columns,
    data,
    state: { pagination, sorting },
    onPaginationChange: handlePaginationChange,
    onSortingChange: handleSortingChange,
    manualPagination: Boolean(serverState),
    manualSorting: Boolean(serverState),
    rowCount,
    pageCount,
    getRowId,
  });

  const firstResult = rowCount === 0 ? 0 : pagination.pageIndex * pagination.pageSize + 1;
  const lastResult = Math.min(
    (pagination.pageIndex + 1) * pagination.pageSize,
    rowCount,
  );
  const currentPage = pagination.pageIndex + 1;
  const firstNumberedPage = Math.max(
    1,
    Math.min(currentPage - 2, pageCount - 4),
  );
  const numberedPages = Array.from(
    { length: Math.min(5, pageCount) },
    (_, index) => firstNumberedPage + index,
  );

  if (rowCount === 0 && emptyState) return emptyState;

  return (
    <Card className="overflow-hidden border-0 shadow-lg">
      <div className="flex flex-col gap-3 border-b bg-white px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-medium text-slate-700">{title}</p>
          <p className="text-xs text-slate-500">
            Showing {firstResult}–{lastResult} of {rowCount}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500">Rows per page</span>
          <Select
            value={String(pagination.pageSize)}
            onValueChange={(value) =>
              table.setPagination({ pageIndex: 0, pageSize: Number(value) })
            }
          >
            <SelectTrigger className="h-8 w-[72px] bg-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {pageSizeOptions.map((size) => (
                <SelectItem key={size} value={String(size)}>
                  {size}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Table>
        <TableHeader>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow
              key={headerGroup.id}
              className="bg-slate-50 hover:bg-slate-50"
            >
              {headerGroup.headers.map((header) => {
                const sorted = header.column.getIsSorted();
                const sortable = header.column.getCanSort();
                const SortIcon =
                  sorted === "asc"
                    ? ArrowUp
                    : sorted === "desc"
                      ? ArrowDown
                      : ArrowUpDown;
                return (
                  <TableHead
                    key={header.id}
                    className={header.column.columnDef.meta?.className}
                    aria-sort={
                      sorted === "asc"
                        ? "ascending"
                        : sorted === "desc"
                          ? "descending"
                          : "none"
                    }
                  >
                    {header.isPlaceholder ? null : sortable ? (
                      <button
                        type="button"
                        onClick={header.column.getToggleSortingHandler()}
                        className={`-ml-2 inline-flex h-8 items-center gap-1.5 rounded-md px-2 font-medium transition-colors hover:bg-slate-200/70 hover:text-slate-900 ${
                          sorted ? "text-indigo-700" : "text-slate-600"
                        }`}
                      >
                        <table.FlexRender header={header} />
                        <SortIcon
                          className={`h-3.5 w-3.5 ${sorted ? "opacity-100" : "opacity-45"}`}
                        />
                      </button>
                    ) : (
                      <table.FlexRender header={header} />
                    )}
                  </TableHead>
                );
              })}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {table.getRowModel().rows.length > 0 ? (
            table.getRowModel().rows.map((row) => (
              <TableRow key={row.id} className="hover:bg-slate-50/80">
                {row.getAllCells().map((cell) => (
                  <TableCell
                    key={cell.id}
                    className={cell.column.columnDef.meta?.className}
                  >
                    <table.FlexRender cell={cell} />
                  </TableCell>
                ))}
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell
                colSpan={columns.length}
                className="h-28 text-center text-slate-500"
              >
                No records found.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

      <div className="flex flex-col gap-3 border-t bg-white px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-slate-500">
          Page {pagination.pageIndex + 1} of {pageCount}
        </p>
        <div className="flex flex-wrap items-center justify-end gap-1">
          <Button
            variant="outline"
            size="icon"
            onClick={() => table.firstPage()}
            disabled={!table.getCanPreviousPage()}
            className="h-8 w-8"
            title="First page"
            aria-label="First page"
          >
            <ChevronsLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
            className="h-8 w-8"
            title="Previous page"
            aria-label="Previous page"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          {numberedPages.map((page) => (
            <Button
              key={page}
              variant={page === currentPage ? "default" : "outline"}
              size="icon"
              onClick={() => table.setPageIndex(page - 1)}
              className={`h-8 w-8 text-xs ${page === currentPage ? "bg-indigo-600 hover:bg-indigo-700" : ""}`}
              aria-label={`Page ${page}`}
              aria-current={page === currentPage ? "page" : undefined}
            >
              {page}
            </Button>
          ))}
          <Button
            variant="outline"
            size="icon"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
            className="h-8 w-8"
            title="Next page"
            aria-label="Next page"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => table.lastPage()}
            disabled={!table.getCanNextPage()}
            className="h-8 w-8"
            title="Last page"
            aria-label="Last page"
          >
            <ChevronsRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </Card>
  );
}
