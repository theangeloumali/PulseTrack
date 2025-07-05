'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@workspace/ui/components/card';
import { Button } from '@workspace/ui/components/button';
import { Badge } from '@workspace/ui/components/badge';
import type { BillingPeriod } from '@/lib/db/schema';
import { format } from 'date-fns';
import { AlertTriangle, Trash2, X, Loader2 } from 'lucide-react';

interface DeleteConfirmationModalProps {
  billingPeriod: BillingPeriod | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isDeleting: boolean;
}

export function DeleteConfirmationModal({
  billingPeriod,
  isOpen,
  onClose,
  onConfirm,
  isDeleting,
}: DeleteConfirmationModalProps) {
  if (!isOpen || !billingPeriod) return null;

  const isPaid = billingPeriod.payment_status === 'paid';
  const canDelete = !isPaid;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <Card className="w-full max-w-lg">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Delete Billing Period
            </CardTitle>
            <CardDescription>
              This action cannot be undone and will affect related data
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
          <div className="p-4 border rounded-lg bg-muted/50">
            <h4 className="font-medium mb-2">{billingPeriod.name}</h4>
            <div className="text-sm text-muted-foreground space-y-1">
              <div>
                <strong>Period:</strong> {format(new Date(billingPeriod.start_date), 'MMM dd')} - {format(new Date(billingPeriod.end_date), 'MMM dd, yyyy')}
              </div>
              <div className="flex items-center gap-2">
                <strong>Status:</strong>
                <Badge variant={isPaid ? 'default' : 'secondary'}>
                  {billingPeriod.payment_status}
                </Badge>
              </div>
              {billingPeriod.payment_amount && (
                <div>
                  <strong>Amount:</strong> ${billingPeriod.payment_amount}
                </div>
              )}
            </div>
          </div>

          {!canDelete && (
            <div className="p-4 border border-destructive rounded-lg bg-destructive/10">
              <div className="flex items-center gap-2 text-destructive">
                <AlertTriangle className="h-4 w-4" />
                <strong>Cannot Delete</strong>
              </div>
              <p className="text-sm text-destructive/80 mt-1">
                This billing period cannot be deleted because it has been marked as paid. 
                Deleting paid periods would affect financial records.
              </p>
            </div>
          )}

          {canDelete && (
            <div className="p-4 border border-yellow-300 rounded-lg bg-yellow-50 dark:bg-yellow-950 dark:border-yellow-800">
              <div className="flex items-center gap-2 text-yellow-800 dark:text-yellow-300">
                <AlertTriangle className="h-4 w-4" />
                <strong>Warning</strong>
              </div>
              <p className="text-sm text-yellow-700 dark:text-yellow-400 mt-1">
                Deleting this billing period will also remove:
              </p>
              <ul className="text-sm text-yellow-700 dark:text-yellow-400 mt-2 list-disc list-inside">
                <li>All payment history records for this period</li>
                <li>Any invoice generation history</li>
                <li>Time tracking associations with this period</li>
              </ul>
            </div>
          )}

          <div className="flex gap-2 pt-4">
            <Button variant="outline" onClick={onClose} className="flex-1">
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={onConfirm} 
              disabled={!canDelete || isDeleting}
              className="flex-1"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Period
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}