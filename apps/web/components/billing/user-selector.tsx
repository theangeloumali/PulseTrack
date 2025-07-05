'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@workspace/ui/components/card';
import { Button } from '@workspace/ui/components/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@workspace/ui/components/select';
import { Label } from '@workspace/ui/components/label';
import { useCompanyUsers } from '@/lib/hooks/useUsers';
import { useBillingSettings } from '@/lib/hooks/useBilling';
import { useGenerateBillingPeriodForUser } from '@/lib/hooks/usePayments';
import type { BillingFrequency } from '@/lib/db/schema';
import { User, Loader2, X } from 'lucide-react';

interface UserSelectorProps {
  companyId: string;
  isOpen: boolean;
  onClose: () => void;
}

export function UserSelector({ companyId, isOpen, onClose }: UserSelectorProps) {
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [selectedFrequency, setSelectedFrequency] = useState<BillingFrequency>('monthly');

  const { data: users, isLoading: usersLoading } = useCompanyUsers();
  const { data: companySettings } = useBillingSettings(companyId);
  const generateForUserMutation = useGenerateBillingPeriodForUser(companyId);

  const handleGenerate = async () => {
    if (!selectedUserId) {
      alert('Please select a user');
      return;
    }

    try {
      await generateForUserMutation.mutateAsync({
        target_user_id: selectedUserId,
        frequency: selectedFrequency,
      });
      alert('Billing period generated successfully for selected user!');
      onClose();
    } catch (error) {
      console.error('Error generating billing period for user:', error);
      alert('Failed to generate billing period. Please try again.');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <Card className="w-full max-w-md">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Generate for Specific User
            </CardTitle>
            <CardDescription>
              Create a billing period for a specific user
            </CardDescription>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="h-8 w-8 p-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="user-select">Select User</Label>
            <Select value={selectedUserId} onValueChange={setSelectedUserId}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a user..." />
              </SelectTrigger>
              <SelectContent>
                {usersLoading ? (
                  <div className="flex items-center justify-center p-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="ml-2">Loading users...</span>
                  </div>
                ) : (
                  users?.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.first_name} {user.last_name} - {user.email}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="frequency-select">Billing Frequency</Label>
            <Select value={selectedFrequency} onValueChange={(value) => setSelectedFrequency(value as BillingFrequency)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="weekly">Weekly</SelectItem>
                <SelectItem value="bi_monthly">Bi-Monthly</SelectItem>
                <SelectItem value="monthly">Monthly</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {companySettings?.billing_frequency && (
            <div className="text-sm text-muted-foreground p-3 bg-muted rounded-lg">
              <strong>Default company frequency:</strong> {companySettings.billing_frequency.replace('_', '-')}
            </div>
          )}

          <div className="flex gap-2 pt-4">
            <Button variant="outline" onClick={onClose} className="flex-1">
              Cancel
            </Button>
            <Button 
              onClick={handleGenerate} 
              disabled={generateForUserMutation.isPending || !selectedUserId}
              className="flex-1"
            >
              {generateForUserMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                'Generate Period'
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}