import React from 'react';

export interface AdminTableProps {
  /** CSS min-width (default: --admin-table-min-width). */
  minWidth?: string;
  colgroup?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

/**
 * Shared scrollable admin data table shell (dense headers via .admin-table in index.css).
 */
export function AdminTable({
  minWidth = 'var(--admin-table-min-width)',
  colgroup,
  children,
  className = '',
}: AdminTableProps) {
  return (
    <div className={`admin-table-wrap min-w-0 ${className}`.trim()}>
      <table
        className="w-full table-fixed border-collapse admin-table text-sm"
        style={{ minWidth }}
      >
        {colgroup}
        {children}
      </table>
    </div>
  );
}
