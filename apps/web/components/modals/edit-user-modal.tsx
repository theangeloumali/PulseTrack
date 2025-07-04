'use client'

import { useState, useEffect } from 'react'
import { Modal } from '@/components/ui/modal'
import { Button } from '@workspace/ui/components/button'
import { Input } from '@workspace/ui/components/input'
import { Label } from '@workspace/ui/components/label'
import { useUpdateUserRole, useUpdateUserStatus, useUpdateUserHourlyRate } from '@/lib/hooks/useUsers'
import { CompanyUser } from '@/lib/stores/company'

interface EditUserModalProps {
  isOpen: boolean
  onClose: () => void
  user: CompanyUser | null
}

export function EditUserModal({ isOpen, onClose, user }: EditUserModalProps) {
  const [formData, setFormData] = useState({
    role: 'user' as 'super_admin' | 'system_admin' | 'company_admin' | 'manager' | 'user',
    status: 'active' as 'active' | 'inactive',
    hourlyRate: ''
  })

  const updateRoleMutation = useUpdateUserRole()
  const updateStatusMutation = useUpdateUserStatus()
  const updateHourlyRateMutation = useUpdateUserHourlyRate()

  // Update form data when user changes
  useEffect(() => {
    if (user) {
      setFormData({
        role: user.role,
        status: user.status || 'active',
        hourlyRate: user.hourly_rate?.toString() || ''
      })
    }
  }, [user])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!user) return

    try {
      const updates: Promise<any>[] = []

      // Update role if changed
      if (formData.role !== user.role) {
        updates.push(updateRoleMutation.mutateAsync({
          userId: user.id,
          role: formData.role
        }))
      }

      // Update status if changed
      if (formData.status !== user.status) {
        updates.push(updateStatusMutation.mutateAsync({
          userId: user.id,
          status: formData.status
        }))
      }

      // Update hourly rate if changed
      const newHourlyRate = formData.hourlyRate ? parseFloat(formData.hourlyRate) : null
      if (newHourlyRate !== user.hourly_rate) {
        updates.push(updateHourlyRateMutation.mutateAsync({
          userId: user.id,
          hourlyRate: newHourlyRate
        }))
      }

      // Wait for all updates to complete
      if (updates.length > 0) {
        await Promise.all(updates)
        alert('User updated successfully')
      }

      onClose()
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to update user')
    }
  }

  const isLoading = updateRoleMutation.isPending || 
                   updateStatusMutation.isPending || 
                   updateHourlyRateMutation.isPending

  if (!user) return null

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Edit User"
      description={`Update settings for ${user.first_name || ''} ${user.last_name || ''} (${user.email})`}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            value={user.email}
            disabled
            className="bg-muted/50"
          />
          <p className="text-xs text-muted-foreground">Email cannot be changed</p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="role">Role</Label>
          <select 
            id="role"
            value={formData.role} 
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => 
              setFormData(prev => ({ ...prev, role: e.target.value as 'super_admin' | 'system_admin' | 'company_admin' | 'manager' | 'user' }))
            }
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <option value="user">User</option>
            <option value="manager">Manager</option>
            <option value="company_admin">Company Admin</option>
            <option value="system_admin">System Admin</option>
            <option value="super_admin">Super Admin</option>
          </select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="status">Status</Label>
          <select 
            id="status"
            value={formData.status} 
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => 
              setFormData(prev => ({ ...prev, status: e.target.value as 'active' | 'inactive' }))
            }
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="hourlyRate">Hourly Rate ($/hour)</Label>
          <Input
            id="hourlyRate"
            type="number"
            min="0"
            step="0.01"
            placeholder="0.00"
            value={formData.hourlyRate}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => 
              setFormData(prev => ({ ...prev, hourlyRate: e.target.value }))
            }
          />
        </div>

        <div className="flex justify-end space-x-2 pt-4">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button 
            type="submit" 
            disabled={isLoading}
          >
            {isLoading ? 'Updating...' : 'Update User'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
