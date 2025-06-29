'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSuperAdminCompanies, type SuperAdminCompany } from '@/lib/hooks/useSuperAdminCompanies'
import { useAuthStore } from '@/lib/stores/auth'
import { Button } from '@workspace/ui/components/button'
import { 
  Search, 
  Building2, 
  Users, 
  FolderOpen, 
  Ticket, 
  TrendingUp,
  Calendar,
  ExternalLink,
  BarChart3
} from 'lucide-react'

export default function SuperAdminCompaniesPage() {
  const router = useRouter()
  const { user: currentUser } = useAuthStore()
  const [searchQuery, setSearchQuery] = useState('')

  const { data: companies = [], isLoading, error } = useSuperAdminCompanies()

  // Check if current user is super admin
  if (currentUser?.role !== 'super_admin') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Access Denied</h1>
          <p className="text-gray-600 mb-4">You don't have permission to access this page.</p>
          <Button onClick={() => router.push('/dashboard')}>
            Return to Dashboard
          </Button>
        </div>
      </div>
    )
  }

  // Filter companies based on search
  const filteredCompanies = companies.filter(company =>
    company.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    company.slug.toLowerCase().includes(searchQuery.toLowerCase())
  )

  // Calculate overall statistics
  const totalStats = companies.reduce(
    (acc, company) => ({
      users: acc.users + company.stats.users.total,
      activeUsers: acc.activeUsers + company.stats.users.active,
      projects: acc.projects + company.stats.projects.total,
      tickets: acc.tickets + company.stats.tickets.total,
    }),
    { users: 0, activeUsers: 0, projects: 0, tickets: 0 }
  )

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading companies...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Error Loading Companies</h1>
          <p className="text-gray-600">Failed to load company data. Please try again.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Super Admin - Company Management</h1>
              <p className="text-gray-600 mt-2">Overview and management of all companies in the system</p>
            </div>
            <div className="text-sm text-gray-500">
              Total Companies: {companies.length}
            </div>
          </div>
        </div>

        {/* Overall Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Building2 className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Companies</p>
                <p className="text-2xl font-bold text-gray-900">{companies.length}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <Users className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Users</p>
                <p className="text-2xl font-bold text-gray-900">{totalStats.users}</p>
                <p className="text-xs text-gray-500">{totalStats.activeUsers} active</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-purple-100 rounded-lg">
                <FolderOpen className="h-6 w-6 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Projects</p>
                <p className="text-2xl font-bold text-gray-900">{totalStats.projects}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-orange-100 rounded-lg">
                <Ticket className="h-6 w-6 text-orange-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Tickets</p>
                <p className="text-2xl font-bold text-gray-900">{totalStats.tickets}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="bg-white rounded-lg shadow mb-8 p-6">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <input
              type="text"
              placeholder="Search companies..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>

        {/* Companies Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCompanies.map((company) => (
            <div key={company.id} className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow">
              {/* Company Header */}
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">{company.name}</h3>
                    <p className="text-sm text-gray-500">/{company.slug}</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => router.push(`/admin/companies/${company.id}`)}
                  >
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Company Stats */}
              <div className="p-6">
                <div className="space-y-4">
                  {/* Users */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <Users className="h-4 w-4 text-gray-400 mr-2" />
                      <span className="text-sm text-gray-600">Users</span>
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-medium text-gray-900">
                        {company.stats.users.total}
                      </span>
                      <div className="text-xs text-gray-500">
                        {company.stats.users.active} active
                      </div>
                    </div>
                  </div>

                  {/* Projects */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <FolderOpen className="h-4 w-4 text-gray-400 mr-2" />
                      <span className="text-sm text-gray-600">Projects</span>
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-medium text-gray-900">
                        {company.stats.projects.total}
                      </span>
                      <div className="text-xs text-gray-500">
                        {company.stats.projects.active} active
                      </div>
                    </div>
                  </div>

                  {/* Tickets */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <Ticket className="h-4 w-4 text-gray-400 mr-2" />
                      <span className="text-sm text-gray-600">Tickets</span>
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-medium text-gray-900">
                        {company.stats.tickets.total}
                      </span>
                      <div className="text-xs text-gray-500">
                        {company.stats.tickets.inProgress} in progress
                      </div>
                    </div>
                  </div>

                  {/* Admins */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <BarChart3 className="h-4 w-4 text-gray-400 mr-2" />
                      <span className="text-sm text-gray-600">Admins</span>
                    </div>
                    <span className="text-sm font-medium text-gray-900">
                      {company.stats.users.admins}
                    </span>
                  </div>
                </div>

                {/* Company Age */}
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <div className="flex items-center text-xs text-gray-500">
                    <Calendar className="h-3 w-3 mr-1" />
                    Created {new Date(company.created_at).toLocaleDateString()}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {filteredCompanies.length === 0 && (
          <div className="text-center py-12">
            <Building2 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">No companies found matching your search.</p>
          </div>
        )}
      </div>
    </div>
  )
}