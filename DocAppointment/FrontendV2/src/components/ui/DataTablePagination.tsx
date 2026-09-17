import type { Table } from '@tanstack/react-table'
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react'

export interface DataTablePaginationProps<TData = any> {
  table?: Table<TData>
  pageIndex?: number
  pageSize?: number
  totalCount?: number
  pageCount?: number
  canPreviousPage?: boolean
  canNextPage?: boolean
  onPageChange?: (pageIndex: number) => void
  onPreviousPage?: () => void
  onNextPage?: () => void
  onFirstPage?: () => void
  onLastPage?: () => void
  className?: string
}

function getVisiblePages(currentPage: number, totalPages: number): (number | '...')[] {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => i + 1)
  }

  if (currentPage <= 4) {
    return [1, 2, 3, 4, 5, '...', totalPages]
  }

  if (currentPage >= totalPages - 3) {
    return [1, '...', totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages]
  }

  return [1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages]
}

export function DataTablePagination<TData = any>({
  table,
  pageIndex: propPageIndex,
  pageSize: propPageSize,
  totalCount: propTotalCount,
  pageCount: propPageCount,
  canPreviousPage: propCanPrev,
  canNextPage: propCanNext,
  onPageChange,
  onPreviousPage: propOnPrev,
  onNextPage: propOnNext,
  onFirstPage: propOnFirst,
  onLastPage: propOnLast,
  className = '',
}: DataTablePaginationProps<TData>) {
  const pageIndex = table ? table.getState().pagination.pageIndex : (propPageIndex ?? 0)
  const pageSize = table ? table.getState().pagination.pageSize : (propPageSize ?? 10)
  
  const totalCount = propTotalCount !== undefined 
    ? propTotalCount 
    : (table ? table.getFilteredRowModel().rows.length : 0)

  const computedPageCount = table ? table.getPageCount() : (propPageCount ?? Math.ceil(totalCount / pageSize))
  const pageCount = Math.max(computedPageCount || 1, 1)
  const currentPage = pageIndex + 1 // 1-indexed for display and calculation

  const canPrevious = table ? table.getCanPreviousPage() : (propCanPrev ?? pageIndex > 0)
  const canNext = table ? table.getCanNextPage() : (propCanNext ?? pageIndex < pageCount - 1)

  const handlePageClick = (p: number) => {
    const targetIndex = p - 1
    if (table) {
      table.setPageIndex(targetIndex)
    } else if (onPageChange) {
      onPageChange(targetIndex)
    }
  }

  const handlePrevious = () => {
    if (table) table.previousPage()
    else if (propOnPrev) propOnPrev()
    else if (onPageChange) onPageChange(pageIndex - 1)
  }

  const handleNext = () => {
    if (table) table.nextPage()
    else if (propOnNext) propOnNext()
    else if (onPageChange) onPageChange(pageIndex + 1)
  }

  const handleFirst = () => {
    if (table) table.setPageIndex(0)
    else if (propOnFirst) propOnFirst()
    else if (onPageChange) onPageChange(0)
  }

  const handleLast = () => {
    if (table) table.setPageIndex(pageCount - 1)
    else if (propOnLast) propOnLast()
    else if (onPageChange) onPageChange(pageCount - 1)
  }

  const startEntry = totalCount === 0 ? 0 : pageIndex * pageSize + 1
  const endEntry = Math.min((pageIndex + 1) * pageSize, totalCount)
  const pages = getVisiblePages(currentPage, pageCount)

  return (
    <div className={`p-2.5 sm:p-3 border-t border-slate-200 bg-slate-50/70 flex flex-col md:flex-row items-center justify-between gap-3 text-xs text-slate-500 ${className}`}>
      {/* Entry Count Label */}
      <div className="font-medium text-slate-600 order-2 md:order-1 text-center md:text-left">
        Showing <span className="font-bold text-slate-900">{startEntry}</span> to <span className="font-bold text-slate-900">{endEntry}</span> of <span className="font-bold text-slate-900">{totalCount}</span> entries
      </div>

      {/* Navigation Controls with Numbered Page Buttons for Direct Jump */}
      <div className="flex items-center flex-wrap justify-center gap-1 sm:gap-1.5 order-1 md:order-2">
        {/* First Page Button */}
        <button
          type="button"
          onClick={handleFirst}
          disabled={!canPrevious}
          className="h-8 w-8 rounded-md bg-white border border-slate-200/90 shadow-2xs hover:bg-slate-50 hover:border-slate-300 text-slate-600 disabled:opacity-40 disabled:pointer-events-none flex items-center justify-center transition-all shrink-0"
          title="First Page"
        >
          <ChevronsLeft className="w-4 h-4" />
        </button>

        {/* Previous Button */}
        <button
          type="button"
          onClick={handlePrevious}
          disabled={!canPrevious}
          className="h-8 w-8 rounded-md bg-white border border-slate-200/90 shadow-2xs hover:bg-slate-50 hover:border-slate-300 text-slate-600 disabled:opacity-40 disabled:pointer-events-none flex items-center justify-center transition-all shrink-0"
          title="Previous Page"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        {/* Numbered Page Buttons */}
        <div className="flex items-center gap-1">
          {pages.map((p, idx) => {
            if (p === '...') {
              return (
                <span
                  key={`ellipsis-${idx}`}
                  className="h-8 w-6 flex items-center justify-center text-slate-400 font-bold select-none text-xs"
                >
                  •••
                </span>
              )
            }

            const isCurrent = p === currentPage
            return (
              <button
                key={p}
                type="button"
                onClick={() => handlePageClick(p)}
                disabled={isCurrent}
                className={`h-8 min-w-[2rem] px-2 rounded-md text-xs font-bold transition-all flex items-center justify-center shrink-0 ${
                  isCurrent
                    ? 'bg-indigo-600 text-white shadow-xs border border-indigo-600 cursor-default'
                    : 'bg-white text-slate-700 hover:bg-slate-50 hover:border-slate-300 border border-slate-200/90 shadow-2xs cursor-pointer'
                }`}
                title={`Jump to page ${p}`}
              >
                {p}
              </button>
            )
          })}
        </div>

        {/* Next Button */}
        <button
          type="button"
          onClick={handleNext}
          disabled={!canNext}
          className="h-8 w-8 rounded-md bg-white border border-slate-200/90 shadow-2xs hover:bg-slate-50 hover:border-slate-300 text-slate-600 disabled:opacity-40 disabled:pointer-events-none flex items-center justify-center transition-all shrink-0"
          title="Next Page"
        >
          <ChevronRight className="w-4 h-4" />
        </button>

        {/* Last Page Button */}
        <button
          type="button"
          onClick={handleLast}
          disabled={!canNext}
          className="h-8 w-8 rounded-md bg-white border border-slate-200/90 shadow-2xs hover:bg-slate-50 hover:border-slate-300 text-slate-600 disabled:opacity-40 disabled:pointer-events-none flex items-center justify-center transition-all shrink-0"
          title="Last Page"
        >
          <ChevronsRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}
