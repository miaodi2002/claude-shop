'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Users, DollarSign, Database, Activity } from 'lucide-react'

interface AdminStats {
  accounts: {
    total: number
    available: number
    sold: number
    maintenance: number
  }
  revenue: {
    total: number
    monthly: number
    average: number
    currency: string
  }
  recentActivity: Array<{
    id: string
    action: string
    entityName: string
    adminUsername: string
    createdAt: string
  }>
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await fetch('/api/v1/admin/stats')
        if (response.ok) {
          const data = await response.json()
          if (data.success) {
            setStats(data.data)
          }
        }
      } catch (error) {
        console.error('Failed to fetch admin stats:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchStats()
  }, [])

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={`skeleton-${i}`} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Admin Dashboard</h1>
          <Button 
            variant="outline"
            onClick={() => router.push('/admin/claude-accounts')}
          >
            Manage Accounts
          </Button>
        </div>

        {stats && (
          <>
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Accounts</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.accounts.total}</div>
                  <p className="text-xs text-muted-foreground">
                    {stats.accounts.available} available
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    ${stats.revenue.total} {stats.revenue.currency}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    ${stats.revenue.monthly} this month
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Sold Accounts</CardTitle>
                  <Database className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.accounts.sold}</div>
                  <p className="text-xs text-muted-foreground">
                    Avg: ${stats.revenue.average}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Maintenance</CardTitle>
                  <Activity className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.accounts.maintenance}</div>
                  <p className="text-xs text-muted-foreground">
                    Accounts in maintenance
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Recent Activity */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
                <CardDescription>
                  Latest administrative actions and account changes
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {stats.recentActivity.slice(0, 10).map((activity) => (
                    <div key={activity.id} className="flex items-center justify-between py-2">
                      <div className="space-y-1">
                        <p className="text-sm font-medium">
                          {activity.action.replace(/_/g, ' ').toLowerCase()}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {activity.entityName} by {activity.adminUsername}
                        </p>
                      </div>
                      <div className="text-right">
                        <Badge variant="outline" className="text-xs">
                          {activity.action}
                        </Badge>
                        <p className="text-xs text-muted-foreground mt-1">
                          {new Date(activity.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
                <CardDescription>
                  Common administrative tasks
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <Button 
                    variant="outline" 
                    className="h-20 flex-col"
                    onClick={() => router.push('/admin/claude-accounts')}
                  >
                    <Users className="h-6 w-6 mb-2" />
                    <span className="text-sm">Manage Accounts</span>
                  </Button>
                  <Button variant="outline" className="h-20 flex-col">
                    <DollarSign className="h-6 w-6 mb-2" />
                    <span className="text-sm">View Revenue</span>
                  </Button>
                  <Button 
                    variant="outline" 
                    className="h-20 flex-col"
                    onClick={() => router.push('/admin/claude-accounts/new')}
                  >
                    <Database className="h-6 w-6 mb-2" />
                    <span className="text-sm">Add Account</span>
                  </Button>
                  <Button variant="outline" className="h-20 flex-col">
                    <Activity className="h-6 w-6 mb-2" />
                    <span className="text-sm">View Logs</span>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  )
}