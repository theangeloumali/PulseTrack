'use client'

import React, { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ActivityFeed } from '@/components/activity/activity-feed'
import { useAuth } from '@/lib/hooks/useAuth'
import { Card, CardContent, CardHeader, CardTitle } from '@workspace/ui/components/card'

export default function ActivityPage(): React.JSX.Element {
  const { user, isLoading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    // Redirect if user is not authenticated or still loading
    if (!isLoading && !user) {
      router.push('/dashboard')
    }
  }, [user, isLoading, router])

  // Show loading state while checking authentication
  if (isLoading) {
    return (
      <div className="h-full bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  // Redirect if no user (will trigger useEffect)
  if (!user) {
    return <div></div>
  }

  return (
    <div className="h-full bg-background">
      {/* Header */}
      <header className="bg-card shadow-sm border-b border-border">
        <div className="px-4">
          <div className="flex justify-between items-center py-4">
            <div>
              <h1 className="text-3xl font-bold text-foreground">Activity Feed</h1>
              <p className="text-muted-foreground">
                Stay up to date with your team's work across all projects
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Activity Feed */}
          <div className="lg:col-span-2">
            <ActivityFeed 
              limit={50}
              title="All Activity"
              showFilters={true}
            />
          </div>
          
          {/* Sidebar with Quick Stats */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">My Activity</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <ActivityFeed 
                  userId={user.id}
                  limit={10}
                  title=""
                  showFilters={false}
                />
              </CardContent>
            </Card>
            
            {/* Activity by Project - only show if user has company admin+ role */}
            {user.role && ['super_admin', 'system_admin', 'company_admin'].includes(user.role) && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Company Activity</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <ActivityFeed 
                    companyId={user.company_id}
                    limit={15}
                    title=""
                    showFilters={false}
                  />
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}