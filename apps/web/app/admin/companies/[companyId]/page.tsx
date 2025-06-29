'use client'

import React, { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useSuperAdminCompanies } from '@/lib/hooks/useSuperAdminCompanies'
import { useSuperAdminUsers } from '@/lib/hooks/useSuperAdminUsers'
import { useAuthStore } from '@/lib/stores/auth'
import { Button } from '@workspace/ui/components/button'
import { 
  ArrowLeft, 
  Building2, 
  Users, 
  FolderOpen, 
  Ticket, 
  Calendar,
  Mail,
  Shield,
  Activity,
  BarChart3,
  Settings,
  UserCheck,
  UserX
} from 'lucide-react'

export default function CompanyDetailsPage() {
  const params = useParams()
  const router = useRouter()
  const { user: currentUser } = useAuthStore()
  const companyId = params.companyId as string

  const { data: companies = [], isLoading: companiesLoading } = useSuperAdminCompanies()
  const { data: users = [], isLoading: usersLoading } = useSuperAdminUsers()

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

  // Find the specific company
  const company = companies.find(c => c.id === companyId)
  
  // Filter users for this company
  const companyUsers = users.filter(user => user.companies?.id === companyId)

  if (companiesLoading || usersLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading company details...</p>
        </div>
      </div>
    )
  }

  if (!company) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Company Not Found</h1>
          <p className="text-gray-600 mb-4">The requested company could not be found.</p>
          <Button onClick={() => router.push('/admin/companies')}>
            Back to Companies
          </Button>
        </div>
      </div>
    )
  }

  // Calculate user statistics
  const userStats = {
    total: companyUsers.length,
    active: companyUsers.filter(u => u.status === 'active').length,
    inactive: companyUsers.filter(u => u.status === 'inactive').length,
    admins: companyUsers.filter(u => ['super_admin', 'system_admin', 'company_admin'].includes(u.role)).length,
    managers: companyUsers.filter(u => u.role === 'manager').length,
    users: companyUsers.filter(u => u.role === 'user').length,
  }

  const roleColors = {
    super_admin: 'bg-purple-100 text-purple-800',
    system_admin: 'bg-red-100 text-red-800',
    company_admin: 'bg-blue-100 text-blue-800',
    manager: 'bg-green-100 text-green-800',
    user: 'bg-gray-100 text-gray-800',
  }

  const getRoleName = (role: string) => {
    const roleNames = {
      super_admin: 'Super Admin',
      system_admin: 'System Admin',
      company_admin: 'Company Admin',
      manager: 'Manager',
      user: 'User'
    }
    return roleNames[role as keyof typeof roleNames] || role
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push('/admin/companies')}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Companies
            </Button>
          </div>
          
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Building2 className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-gray-900">{company.name}</h1>
                  <p className="text-gray-600">/{company.slug}</p>
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm text-gray-500">Company ID</div>
              <div className="text-xs font-mono text-gray-400">{company.id}</div>
              <div className="text-xs text-gray-500 mt-1">
                Created {new Date(company.created_at).toLocaleDateString()}
              </div>
            </div>
          </div>
        </div>

        {/* Overview Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <Users className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Users</p>
                <p className="text-2xl font-bold text-gray-900">{company.stats.users.total}</p>
                <p className="text-xs text-gray-500">{company.stats.users.active} active</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-purple-100 rounded-lg">
                <FolderOpen className="h-6 w-6 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Projects</p>
                <p className="text-2xl font-bold text-gray-900">{company.stats.projects.total}</p>
                <p className="text-xs text-gray-500">{company.stats.projects.active} active</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-orange-100 rounded-lg">
                <Ticket className="h-6 w-6 text-orange-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Tickets</p>
                <p className="text-2xl font-bold text-gray-900">{company.stats.tickets.total}</p>
                <p className="text-xs text-gray-500">{company.stats.tickets.inProgress} in progress</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Shield className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Admins</p>
                <p className="text-2xl font-bold text-gray-900">{company.stats.users.admins}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Company Information */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
          {/* Company Details */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Company Information
            </h2>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-600">Name</label>
                <p className="text-gray-900">{company.name}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">Slug</label>
                <p className="text-gray-900 font-mono">/{company.slug}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">Created</label>
                <p className="text-gray-900">{new Date(company.created_at).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">Last Updated</label>
                <p className="text-gray-900">{new Date(company.updated_at).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}</p>
              </div>
            </div>
          </div>

          {/* User Breakdown */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              User Breakdown
            </h2>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Super Admins</span>
                <span className="text-sm font-medium text-gray-900">
                  {companyUsers.filter(u => u.role === 'super_admin').length}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">System Admins</span>
                <span className="text-sm font-medium text-gray-900">
                  {companyUsers.filter(u => u.role === 'system_admin').length}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Company Admins</span>
                <span className="text-sm font-medium text-gray-900">
                  {companyUsers.filter(u => u.role === 'company_admin').length}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Managers</span>
                <span className="text-sm font-medium text-gray-900">{userStats.managers}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Users</span>
                <span className="text-sm font-medium text-gray-900">{userStats.users}</span>
              </div>
              <div className="pt-2 border-t border-gray-200">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-600">Total</span>
                  <span className="text-sm font-bold text-gray-900">{userStats.total}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Status Overview */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Status Overview
            </h2>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <UserCheck className="h-4 w-4 text-green-600" />
                  <span className="text-sm text-gray-600">Active Users</span>
                </div>
                <span className="text-sm font-medium text-green-600">{userStats.active}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <UserX className="h-4 w-4 text-red-600" />
                  <span className="text-sm text-gray-600">Inactive Users</span>
                </div>
                <span className="text-sm font-medium text-red-600">{userStats.inactive}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FolderOpen className="h-4 w-4 text-blue-600" />
                  <span className="text-sm text-gray-600">Active Projects</span>
                </div>
                <span className="text-sm font-medium text-blue-600">{company.stats.projects.active}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Ticket className="h-4 w-4 text-orange-600" />
                  <span className="text-sm text-gray-600">Open Tickets</span>
                </div>
                <span className="text-sm font-medium text-orange-600">{company.stats.tickets.inProgress}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Users Table */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <Users className="h-5 w-5" />
              Company Users ({companyUsers.length})
            </h2>
          </div>
          
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    User
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Role
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Hourly Rate
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Joined
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {companyUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
                          <span className="text-sm font-medium text-gray-700">
                            {user.first_name?.[0] || user.email?.[0]?.toUpperCase() || 'U'}
                          </span>
                        </div>
                        <div className="ml-3">
                          <div className="text-sm font-medium text-gray-900">
                            {user.first_name || user.last_name ? 
                              `${user.first_name || ''} ${user.last_name || ''}`.trim() : 
                              'No Name'
                            }
                          </div>
                          <div className="text-sm text-gray-500 flex items-center gap-1">
                            <Mail className="h-3 w-3" />
                            {user.email}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                        roleColors[user.role as keyof typeof roleColors] || 'bg-gray-100 text-gray-800'
                      }`}>
                        {getRoleName(user.role)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                        user.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {user.status === 'active' ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {user.hourly_rate ? `$${user.hourly_rate}/hr` : 'Not set'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(user.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {companyUsers.length === 0 && (
            <div className="text-center py-12">
              <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No users found for this company.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}