'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table'
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { 
  ChevronUp, 
  ChevronDown, 
  Edit, 
  Trash2, 
  Eye,
  ChevronLeft,
  ChevronRight
} from 'lucide-react'
import { 
  ClaudeAccount, 
  ClaudeAccountQuery,
  getStatusBadgeVariant,
  getTierBadgeVariant,
  formatUsage
} from '@/lib/validation/claude-account'
import { formatDate } from '@/lib/utils'

interface PaginationInfo {
  total: number
  totalPages: number
  currentPage: number
  hasNext: boolean
  hasPrevious: boolean
}

interface ClaudeAccountsTableProps {
  accounts: ClaudeAccount[]
  isLoading: boolean
  sortBy: ClaudeAccountQuery['sortBy']
  sortOrder: ClaudeAccountQuery['sortOrder']
  onSort: (field: string) => void
  onDelete: (accountId: string) => Promise<void>
  pagination?: PaginationInfo
  currentPage: number
  onPageChange: (page: number) => void
}

export function ClaudeAccountsTable({
  accounts,
  isLoading,
  sortBy,
  sortOrder,
  onSort,
  onDelete,
  pagination,
  currentPage,
  onPageChange,
}: ClaudeAccountsTableProps) {
  const [deleteDialog, setDeleteDialog] = useState<{
    open: boolean
    account: ClaudeAccount | null
    isDeleting: boolean
  }>({
    open: false,
    account: null,
    isDeleting: false,
  })

  const handleDeleteClick = (account: ClaudeAccount) => {
    setDeleteDialog({
      open: true,
      account,
      isDeleting: false,
    })
  }

  const handleDeleteConfirm = async () => {
    if (!deleteDialog.account) return

    setDeleteDialog(prev => ({ ...prev, isDeleting: true }))
    
    try {
      await onDelete(deleteDialog.account.id)
      setDeleteDialog({
        open: false,
        account: null,
        isDeleting: false,
      })
    } catch (error) {
      console.error('Error deleting account:', error)
      setDeleteDialog(prev => ({ ...prev, isDeleting: false }))
    }
  }

  const handleDeleteCancel = () => {
    setDeleteDialog({
      open: false,
      account: null,
      isDeleting: false,
    })
  }

  const SortButton = ({ field, children }: { field: string; children: React.ReactNode }) => (
    <button
      onClick={() => onSort(field)}
      className="flex items-center gap-1 hover:text-foreground transition-colors"
    >
      {children}
      {sortBy === field && (
        sortOrder === 'asc' ? 
        <ChevronUp className="h-4 w-4" /> : 
        <ChevronDown className="h-4 w-4" />
      )}
    </button>
  )

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Account Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Organization</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Tier</TableHead>
              <TableHead>Usage</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="w-32">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {[...Array(5)].map((_, i) => (
              <TableRow key={`skeleton-${i}`}>
                <TableCell><div className="h-4 w-32 bg-gray-200 rounded animate-pulse" /></TableCell>
                <TableCell><div className="h-4 w-24 bg-gray-200 rounded animate-pulse" /></TableCell>
                <TableCell><div className="h-4 w-20 bg-gray-200 rounded animate-pulse" /></TableCell>
                <TableCell><div className="h-6 w-16 bg-gray-200 rounded animate-pulse" /></TableCell>
                <TableCell><div className="h-6 w-14 bg-gray-200 rounded animate-pulse" /></TableCell>
                <TableCell><div className="h-4 w-24 bg-gray-200 rounded animate-pulse" /></TableCell>
                <TableCell><div className="h-4 w-20 bg-gray-200 rounded animate-pulse" /></TableCell>
                <TableCell><div className="h-8 w-24 bg-gray-200 rounded animate-pulse" /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    )
  }

  if (accounts.length === 0) {
    return (
      <div className="text-center py-12">
        <h3 className="text-lg font-semibold text-muted-foreground">No accounts found</h3>
        <p className="text-sm text-muted-foreground mt-2">
          No Claude accounts match your current filters.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>
                <SortButton field="accountName">Account Name</SortButton>
              </TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Organization</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Tier</TableHead>
              <TableHead>Usage</TableHead>
              <TableHead>
                <SortButton field="createdAt">Created</SortButton>
              </TableHead>
              <TableHead className="w-32">Actions</TableHead>
            </TableRow>
          </TableHeader>
        <TableBody>
          {accounts.map((account) => (
            <TableRow key={account.id}>
              <TableCell className="font-medium">
                {account.accountName}
              </TableCell>
              <TableCell>
                {account.email || <span className="text-muted-foreground">—</span>}
              </TableCell>
              <TableCell>
                {account.organization || <span className="text-muted-foreground">—</span>}
              </TableCell>
              <TableCell>
                <Badge variant={getStatusBadgeVariant(account.status)}>
                  {account.status}
                </Badge>
              </TableCell>
              <TableCell>
                <Badge variant={getTierBadgeVariant(account.tier)}>
                  {account.tier}
                </Badge>
              </TableCell>
              <TableCell className="font-mono text-sm">
                {formatUsage(account.currentUsage, account.usageLimit)}
              </TableCell>
              <TableCell>
                {formatDate(account.createdAt)}
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  <Link href={`/admin/claude-accounts/${account.id}/edit`}>
                    <Button variant="outline" size="icon" className="h-8 w-8">
                      <Edit className="h-4 w-4" />
                    </Button>
                  </Link>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8 text-destructive hover:text-destructive"
                    onClick={() => handleDeleteClick(account)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      </div>

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-sm text-muted-foreground order-2 sm:order-1">
            Showing {((currentPage - 1) * 10) + 1} to {Math.min(currentPage * 10, pagination.total)} of {pagination.total} accounts
          </div>
          <div className="flex items-center gap-2 order-1 sm:order-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(currentPage - 1)}
              disabled={!pagination.hasPrevious}
              aria-label="Go to previous page"
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              <span className="hidden sm:inline">Previous</span>
              <span className="sm:hidden">Prev</span>
            </Button>
            <span className="text-sm px-2" aria-label={`Page ${currentPage} of ${pagination.totalPages}`}>
              {currentPage} / {pagination.totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(currentPage + 1)}
              disabled={!pagination.hasNext}
              aria-label="Go to next page"
            >
              <span className="hidden sm:inline">Next</span>
              <span className="sm:hidden">Next</span>
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialog.open} onOpenChange={handleDeleteCancel}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Claude Account</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete the account "{deleteDialog.account?.accountName}"? 
              This action cannot be undone and will permanently remove the account and all its data.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={handleDeleteCancel}
              disabled={deleteDialog.isDeleting}
            >
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleDeleteConfirm}
              loading={deleteDialog.isDeleting}
            >
              Delete Account
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}