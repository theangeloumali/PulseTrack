'use client';

import {useState} from 'react';
import {Modal} from '@/components/ui/modal';
import {Button} from '@workspace/ui/components/button';
import {Input} from '@workspace/ui/components/input';
import {Label} from '@workspace/ui/components/label';
import {useInviteUser} from '@/lib/hooks/useUsers';

interface InviteUserModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function InviteUserModal({isOpen, onClose}: InviteUserModalProps) {
  const [formData, setFormData] = useState({
    email: '',
    firstName: '',
    lastName: '',
    role: 'user' as 'super_admin' | 'system_admin' | 'company_admin' | 'manager' | 'user',
    hourlyRate: '',
  });

  const inviteUserMutation = useInviteUser();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.email.trim()) {
      alert('Email is required');
      return;
    }

    try {
      await inviteUserMutation.mutateAsync({
        email: formData.email.trim(),
        role: formData.role,
        firstName: formData.firstName.trim() || undefined,
        lastName: formData.lastName.trim() || undefined,
        hourlyRate: formData.hourlyRate ? parseFloat(formData.hourlyRate) : undefined,
      });

      alert(
        'User invitation sent successfully! They will receive an email with instructions to set up their account.',
      );
      handleClose();
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to invite user');
    }
  };

  const handleClose = () => {
    setFormData({
      email: '',
      firstName: '',
      lastName: '',
      role: 'user',
      hourlyRate: '',
    });
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Invite User to Company"
      description="Send an invitation to a new user to join your company">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">Email *</Label>
          <Input
            id="email"
            type="email"
            placeholder="user@example.com"
            value={formData.email}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setFormData((prev) => ({...prev, email: e.target.value}))
            }
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="firstName">First Name</Label>
            <Input
              id="firstName"
              placeholder="John"
              value={formData.firstName}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setFormData((prev) => ({...prev, firstName: e.target.value}))
              }
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="lastName">Last Name</Label>
            <Input
              id="lastName"
              placeholder="Doe"
              value={formData.lastName}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setFormData((prev) => ({...prev, lastName: e.target.value}))
              }
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="role">Role</Label>
          <select
            id="role"
            value={formData.role}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
              setFormData((prev) => ({
                ...prev,
                role: e.target.value as
                  | 'super_admin'
                  | 'system_admin'
                  | 'company_admin'
                  | 'manager'
                  | 'user',
              }))
            }
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50">
            <option value="user">User</option>
            <option value="manager">Manager</option>
            <option value="company_admin">Company Admin</option>
            <option value="system_admin">System Admin</option>
            <option value="super_admin">Super Admin</option>
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
              setFormData((prev) => ({...prev, hourlyRate: e.target.value}))
            }
          />
        </div>

        <div className="flex justify-end space-x-2 pt-4">
          <Button type="button" variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={inviteUserMutation.isPending}>
            {inviteUserMutation.isPending ? 'Inviting...' : 'Send Invitation'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
