'use client';

import {useState, useEffect} from 'react';
import {useRouter} from 'next/navigation';
import {
  Users,
  UserPlus,
  Search,
  Edit,
  Shield,
  MoreVertical,
  Archive,
  ArchiveRestore,
  Trash2,
} from 'lucide-react';
import {Button} from '@workspace/ui/components/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@workspace/ui/components/card';
import {Badge} from '@workspace/ui/components/badge';
import {Input} from '@workspace/ui/components/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@workspace/ui/components/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@workspace/ui/components/alert-dialog';
import {useCompanyUsers} from '@/lib/hooks/useUsers';
import {useCompanyStore, CompanyUser} from '@/lib/stores/company';
import {useAuthStore} from '@/lib/stores/auth';
import {useRoleAccess} from '@/lib/hooks/useRoleAccess';
import {InviteUserModal} from '@/components/modals/invite-user-modal';
import {EditUserModal} from '@/components/modals/edit-user-modal';
import {useArchiveUser, useRestoreUser, useDeleteUser} from '@/lib/hooks/useUserActions';
import {cn} from '@workspace/ui/lib/utils';
import type {UserRole, UserStatus} from '@/lib/db/schema';

export default function CompanyUsersPage() {
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [editingUser, setEditingUser] = useState<CompanyUser | null>(null);
  const [showArchived, setShowArchived] = useState(false);
  const [actionDialog, setActionDialog] = useState<{
    isOpen: boolean;
    type: 'archive' | 'restore' | 'delete' | null;
    user: CompanyUser | null;
  }>({isOpen: false, type: null, user: null});
  const router = useRouter();

  const {user: currentUser} = useAuthStore();
  const {canAccessCompany} = useRoleAccess();
  const {
    getFilteredUsers,
    getUserStats,
    roleFilter,
    statusFilter,
    searchQuery,
    setRoleFilter,
    setStatusFilter,
    setSearchQuery,
  } = useCompanyStore();

  const {isLoading, error} = useCompanyUsers();
  const archiveUser = useArchiveUser();
  const restoreUser = useRestoreUser();
  const deleteUser = useDeleteUser();

  // Redirect users without company access
  useEffect(() => {
    if (currentUser && !canAccessCompany()) {
      router.push('/dashboard');
    }
  }, [currentUser, canAccessCompany, router]);

  // Don't render the page if user doesn't have access
  if (currentUser && !canAccessCompany()) {
    return <div></div>;
  }

  // Filter users based on archive status
  const baseFilteredUsers = getFilteredUsers();
  const filteredUsers = baseFilteredUsers.filter((user) => {
    if (showArchived) {
      return user.archived_at !== null && user.archived_at !== undefined;
    } else {
      return user.archived_at === null || user.archived_at === undefined;
    }
  });
  const stats = getUserStats();

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin':
        return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400';
      case 'manager':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400';
      case 'user':
        return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-800/50 dark:text-gray-300';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400';
      case 'inactive':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-800/50 dark:text-gray-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-800/50 dark:text-gray-300';
    }
  };

  const formatHourlyRate = (rate: number | null | undefined) => {
    if (!rate) return 'Not set';
    return `$${rate}/hr`;
  };

  const handleAction = async () => {
    if (!actionDialog.user || !actionDialog.type) return;

    try {
      switch (actionDialog.type) {
        case 'archive':
          await archiveUser.mutateAsync({userId: actionDialog.user.id});
          break;
        case 'restore':
          await restoreUser.mutateAsync({userId: actionDialog.user.id});
          break;
        case 'delete':
          await deleteUser.mutateAsync({userId: actionDialog.user.id});
          break;
      }
      setActionDialog({isOpen: false, type: null, user: null});
    } catch (error) {
      // Error handling is done in the mutation hooks
    }
  };

  if (error) {
    return (
      <div className="min-h-screen bg-background">
        <div className="flex items-center justify-center py-12">
          <Card className="w-96">
            <CardHeader>
              <CardTitle>Error</CardTitle>
              <CardDescription>Failed to load company users</CardDescription>
            </CardHeader>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card shadow border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-6">
            <div className="flex items-center space-x-4">
              <Users className="h-8 w-8 text-muted-foreground" />
              <div>
                <h1 className="text-3xl font-bold text-foreground">Company Users</h1>
                <p className="text-muted-foreground mt-1">
                  Manage your team members and permissions
                </p>
              </div>
            </div>
            <Button
              onClick={() => setShowInviteModal(true)}
              className="flex items-center space-x-2">
              <UserPlus className="h-4 w-4" />
              <span>Invite User</span>
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-muted-foreground">Total Users</p>
                    <p className="text-2xl font-bold text-foreground">{stats.total}</p>
                  </div>
                  <Users className="h-8 w-8 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-muted-foreground">Active Users</p>
                    <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                      {stats.active}
                    </p>
                  </div>
                  <div className="h-8 w-8 rounded-full bg-green-100 dark:bg-green-900/20 flex items-center justify-center">
                    <div className="h-3 w-3 rounded-full bg-green-500 dark:bg-green-400" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-muted-foreground">Admins</p>
                    <p className="text-2xl font-bold text-red-600 dark:text-red-400">
                      {stats.admins}
                    </p>
                  </div>
                  <Shield className="h-8 w-8 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-muted-foreground">Managers</p>
                    <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                      {stats.managers}
                    </p>
                  </div>
                  <Shield className="h-8 w-8 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Filters */}
          <Card className="mb-6">
            <CardContent className="p-6">
              <div className="flex flex-col sm:flex-row gap-4">
                {/* Search */}
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                    <Input
                      placeholder="Search users..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>

                {/* Role Filter */}
                <select
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value as UserRole)}
                  className="px-3 py-2 border border-input rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring">
                  <option value="all">All Roles</option>
                  <option value="super_admin">Super Admin</option>
                  <option value="system_admin">System Admin</option>
                  <option value="company_admin">Company Admin</option>
                  <option value="manager">Manager</option>
                  <option value="user">User</option>
                </select>

                {/* Status Filter */}
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as UserStatus)}
                  className="px-3 py-2 border border-input rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring">
                  <option value="all">All Status</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>

                {/* Archive Toggle */}
                <Button
                  variant={showArchived ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setShowArchived(!showArchived)}
                  className="flex items-center gap-2">
                  <Archive className="h-4 w-4" />
                  {showArchived ? 'Show Active' : 'Show Archived'}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Users List */}
          <Card>
            <CardHeader>
              <CardTitle>Team Members ({filteredUsers.length})</CardTitle>
              <CardDescription>Manage user roles, status, and hourly rates</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
                </div>
              ) : filteredUsers.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Users className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-sm font-medium text-foreground mb-2">No users found</h3>
                  <p className="text-sm text-muted-foreground">
                    {searchQuery || roleFilter !== 'all' || statusFilter !== 'all'
                      ? 'Try adjusting your filters'
                      : 'Invite your first team member to get started'}
                  </p>
                </div>
              ) : (
                <div className="overflow-hidden">
                  <table className="min-w-full divide-y divide-border">
                    <thead className="bg-muted/50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                          User
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                          Role
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                          Hourly Rate
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                          Joined
                        </th>
                        <th className="relative px-6 py-3">
                          <span className="sr-only">Actions</span>
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-card divide-y divide-border">
                      {filteredUsers.map((user) => (
                        <tr
                          key={user.id}
                          className={cn('hover:bg-muted/50', user.archived_at && 'opacity-75')}>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="flex-shrink-0 h-10 w-10">
                                <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                                  <span className="text-sm font-medium text-muted-foreground">
                                    {user.first_name?.[0] || user.email?.[0]?.toUpperCase() || '?'}
                                  </span>
                                </div>
                              </div>
                              <div className="ml-4">
                                <div className="flex items-center gap-2">
                                  <div className="text-sm font-medium text-foreground">
                                    {user.first_name && user.last_name
                                      ? `${user.first_name} ${user.last_name}`
                                      : user.email}
                                  </div>
                                  {user.archived_at && (
                                    <span className="text-xs bg-yellow-100 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-400 px-2 py-1 rounded">
                                      Archived
                                    </span>
                                  )}
                                </div>
                                <div className="text-sm text-muted-foreground">{user.email}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <Badge className={`${getRoleColor(user.role)} border-0`}>
                              {user.role}
                            </Badge>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <Badge
                              className={`${getStatusColor(user.status || 'active')} border-0`}>
                              {user.status || 'active'}
                            </Badge>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground">
                            {formatHourlyRate(user.hourly_rate)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                            {new Date(user.created_at).toLocaleDateString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            {/* Only show actions if current user is admin or it's not themselves */}
                            {['super_admin', 'system_admin', 'company_admin'].includes(
                              currentUser?.role || '',
                            ) &&
                              currentUser?.id !== user.id && (
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="sm">
                                      <MoreVertical className="h-4 w-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    <DropdownMenuItem onClick={() => setEditingUser(user)}>
                                      <Edit className="mr-2 h-4 w-4" />
                                      Edit User
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    {user.archived_at ? (
                                      <DropdownMenuItem
                                        onClick={() =>
                                          setActionDialog({isOpen: true, type: 'restore', user})
                                        }>
                                        <ArchiveRestore className="mr-2 h-4 w-4" />
                                        Restore User
                                      </DropdownMenuItem>
                                    ) : (
                                      <DropdownMenuItem
                                        onClick={() =>
                                          setActionDialog({isOpen: true, type: 'archive', user})
                                        }>
                                        <Archive className="mr-2 h-4 w-4" />
                                        Archive User
                                      </DropdownMenuItem>
                                    )}
                                    {['super_admin', 'system_admin'].includes(
                                      currentUser?.role || '',
                                    ) && (
                                      <DropdownMenuItem
                                        className="text-red-600 dark:text-red-400"
                                        onClick={() =>
                                          setActionDialog({isOpen: true, type: 'delete', user})
                                        }>
                                        <Trash2 className="mr-2 h-4 w-4" />
                                        Delete User
                                      </DropdownMenuItem>
                                    )}
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>

      {/* Modals */}
      {showInviteModal && (
        <InviteUserModal isOpen={showInviteModal} onClose={() => setShowInviteModal(false)} />
      )}

      {editingUser && (
        <EditUserModal
          isOpen={!!editingUser}
          onClose={() => setEditingUser(null)}
          user={editingUser}
        />
      )}

      {/* Confirmation Dialog */}
      <AlertDialog
        open={actionDialog.isOpen}
        onOpenChange={(open) => {
          if (!open) {
            setActionDialog({isOpen: false, type: null, user: null});
          }
        }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {actionDialog.type === 'archive' && 'Archive User'}
              {actionDialog.type === 'restore' && 'Restore User'}
              {actionDialog.type === 'delete' && 'Delete User'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {actionDialog.type === 'archive' && (
                <>
                  Are you sure you want to archive{' '}
                  <strong>
                    {actionDialog.user?.first_name}{' '}
                    {actionDialog.user?.last_name || actionDialog.user?.email}
                  </strong>
                  ? This will set their status to inactive.
                </>
              )}
              {actionDialog.type === 'restore' && (
                <>
                  Are you sure you want to restore{' '}
                  <strong>
                    {actionDialog.user?.first_name}{' '}
                    {actionDialog.user?.last_name || actionDialog.user?.email}
                  </strong>
                  ? This will restore their previous status.
                </>
              )}
              {actionDialog.type === 'delete' && (
                <>
                  Are you sure you want to permanently delete{' '}
                  <strong>
                    {actionDialog.user?.first_name}{' '}
                    {actionDialog.user?.last_name || actionDialog.user?.email}
                  </strong>
                  ? This action cannot be undone.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleAction}
              className={actionDialog.type === 'delete' ? 'bg-red-600 hover:bg-red-700' : ''}>
              {actionDialog.type === 'archive' && 'Archive'}
              {actionDialog.type === 'restore' && 'Restore'}
              {actionDialog.type === 'delete' && 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
