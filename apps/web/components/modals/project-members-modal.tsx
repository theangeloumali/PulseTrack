'use client'

import { useState } from 'react'
import { Modal } from '@/components/ui/modal'
import { Button } from '@workspace/ui/components/button'
import { Badge } from '@workspace/ui/components/badge'
import { Users, UserPlus, X, Crown, User } from 'lucide-react'
import { 
  useProjectMembersQuery, 
  useAddProjectMember, 
  useRemoveProjectMember, 
  useUpdateProjectMemberRole 
} from '@/lib/hooks/useProjects'
import { useAssignableUsers } from '@/lib/hooks/useUsers'
import { useAuthStore } from '@/lib/stores/auth'
import { useRoleAccess } from '@/lib/hooks/useRoleAccess'

// Define the type for member data returned from query
interface ProjectMemberWithUser {
  id: string
  role: 'lead' | 'member'
  created_at: string
  user: {
    id: string
    first_name: string | null
    last_name: string | null
    email: string
    avatar_url: string | null
  }
}

interface ProjectMembersModalProps {
  isOpen: boolean
  onClose: () => void
  projectId: string
  projectName: string
}

export function ProjectMembersModal({ isOpen, onClose, projectId, projectName }: ProjectMembersModalProps) {
  const [showAddMember, setShowAddMember] = useState(false)
  const [selectedUserId, setSelectedUserId] = useState('')
  const [selectedRole, setSelectedRole] = useState<'lead' | 'member'>('member')

  const { user: currentUser } = useAuthStore()
  const { canManageUsers } = useRoleAccess()
  const { data: members = [], isLoading: membersLoading } = useProjectMembersQuery(projectId)
  const { data: availableUsers = [] } = useAssignableUsers()
  
  // Check if current user can manage project members
  const canManageMembers = canManageUsers() // Only admins can manage users/project members
  
  const addMemberMutation = useAddProjectMember()
  const removeMemberMutation = useRemoveProjectMember()
  const updateRoleMutation = useUpdateProjectMemberRole()

  // Filter out users who are already members
  const memberUserIds = new Set(members.map(m => m.user?.id))
  const nonMembers = availableUsers.filter(user => !memberUserIds.has(user.id))

  const handleAddMember = async () => {
    if (!selectedUserId) return

    try {
      await addMemberMutation.mutateAsync({
        projectId,
        userId: selectedUserId,
        role: selectedRole
      })
      
      setSelectedUserId('')
      setSelectedRole('member')
      setShowAddMember(false)
      alert('Member added successfully')
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to add member')
    }
  }

  const handleRemoveMember = async (userId: string) => {
    if (!confirm('Are you sure you want to remove this member from the project?')) return

    try {
      await removeMemberMutation.mutateAsync({ projectId, userId })
      alert('Member removed successfully')
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to remove member')
    }
  }

  const handleRoleChange = async (userId: string, newRole: 'lead' | 'member') => {
    try {
      await updateRoleMutation.mutateAsync({ projectId, userId, role: newRole })
      alert('Role updated successfully')
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to update role')
    }
  }

  const getRoleIcon = (role: string) => {
    return role === 'lead' ? <Crown className="h-4 w-4" /> : <User className="h-4 w-4" />
  }

  const getRoleColor = (role: string) => {
    return role === 'lead' ? 'bg-yellow-100 text-yellow-800' : 'bg-blue-100 text-blue-800'
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Project Members"
      description={`Manage team members for ${projectName}`}
      size="lg"
    >
      <div className="space-y-6">
        {/* Add Member Section */}
        {!showAddMember ? (
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-2">
              <Users className="h-5 w-5 text-gray-600" />
              <span className="text-sm text-gray-600">
                {members.length} {members.length === 1 ? 'member' : 'members'}
              </span>
            </div>
            {canManageMembers && nonMembers.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowAddMember(true)}
                className="flex items-center space-x-2"
              >
                <UserPlus className="h-4 w-4" />
                <span>Add Member</span>
              </Button>
            )}
          </div>
        ) : canManageMembers ? (
          <div className="border rounded-lg p-4 bg-gray-50">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-medium">Add New Member</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowAddMember(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select User
                </label>
                <select
                  value={selectedUserId}
                  onChange={(e) => setSelectedUserId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Choose a user...</option>
                  {nonMembers.map(user => (
                    <option key={user.id} value={user.id}>
                      {user.first_name} {user.last_name} ({user.email})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Role
                </label>
                <select
                  value={selectedRole}
                  onChange={(e) => setSelectedRole(e.target.value as 'lead' | 'member')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="member">Member</option>
                  <option value="lead">Lead</option>
                </select>
              </div>

              <div className="flex justify-end space-x-2">
                <Button
                  variant="outline"
                  onClick={() => setShowAddMember(false)}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleAddMember}
                  disabled={!selectedUserId || addMemberMutation.isPending}
                >
                  {addMemberMutation.isPending ? 'Adding...' : 'Add Member'}
                </Button>
              </div>
            </div>
          </div>
        ) : null}

        {/* Members List */}
        <div className="space-y-3">
          {membersLoading ? (
            <div className="text-center py-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="text-sm text-gray-600 mt-2">Loading members...</p>
            </div>
          ) : members.length === 0 ? (
            <div className="text-center py-6">
              <Users className="h-12 w-12 text-gray-400 mx-auto mb-2" />
              <p className="text-gray-600">No members assigned to this project</p>
              <p className="text-sm text-gray-500">Add team members to get started</p>
            </div>
          ) : (
            members.map(member => (
              <div
                key={member.id}
                className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50"
              >
                <div className="flex items-center space-x-3">
                  <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center">
                    <span className="text-sm font-medium text-gray-600">
                      {member.user?.first_name?.[0] || member.user?.email?.[0]?.toUpperCase() || '?'}
                    </span>
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">
                      {member.user?.first_name} {member.user?.last_name}
                    </p>
                    <p className="text-sm text-gray-600">{member.user?.email}</p>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  {canManageMembers ? (
                    <>
                      <select
                        value={member.role}
                        onChange={(e) => handleRoleChange(member.user!.id, e.target.value as 'lead' | 'member')}
                        className="text-xs px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                        disabled={updateRoleMutation.isPending}
                      >
                        <option value="member">Member</option>
                        <option value="lead">Lead</option>
                      </select>
                      
                      {member.user?.id !== currentUser?.id && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveMember(member.user!.id)}
                          disabled={removeMemberMutation.isPending}
                          className="text-red-600 hover:text-red-800 hover:bg-red-50"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </>
                  ) : (
                    <Badge className={`${getRoleColor(member.role)} flex items-center space-x-1`}>
                      {getRoleIcon(member.role)}
                      <span className="capitalize">{member.role}</span>
                    </Badge>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </Modal>
  )
}
