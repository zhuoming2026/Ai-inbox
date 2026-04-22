import { Table, TableRow, TableCell, TableHeader } from '@tiptap/extension-table'

export const TableExtension = Table.configure({
  resizable: false,
})

export const TableRowExtension = TableRow
export const TableCellExtension = TableCell
export const TableHeaderExtension = TableHeader

export const tableExtensions = [
  TableExtension,
  TableRowExtension,
  TableCellExtension,
  TableHeaderExtension,
]
