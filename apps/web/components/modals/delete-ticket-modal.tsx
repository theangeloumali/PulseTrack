'use client';

import {useState} from 'react';
import {Button} from '@workspace/ui/components/button';
import {Card, CardContent, CardHeader, CardTitle} from '@workspace/ui/components/card';
import {useDeleteTicketMutation} from '@/lib/hooks/useTickets';
import {AlertTriangle, Loader2} from 'lucide-react';
import {Ticket} from '@/lib/db/schema';

interface DeleteTicketModalProps {
  isOpen: boolean;
  onClose: () => void;
  ticket: Ticket | null;
  onSuccess?: () => void;
}

export function DeleteTicketModal({isOpen, onClose, ticket, onSuccess}: DeleteTicketModalProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const deleteTicketMutation = useDeleteTicketMutation();

  const handleDelete = async () => {
    if (!ticket) return;

    setIsDeleting(true);
    try {
      await deleteTicketMutation.mutateAsync(ticket.id);
      onSuccess?.();
      onClose();
    } catch (error) {
      console.error('Failed to delete ticket:', error);
    } finally {
      setIsDeleting(false);
    }
  };

  if (!isOpen || !ticket) return null;

  return (
    <div
      className="fixed inset-0 backdrop-blur-sm flex items-center justify-center z-50"
      onClick={onClose}>
      <Card className="w-full max-w-md mx-4" onClick={(e) => e.stopPropagation()}>
        <CardHeader>
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-6 w-6 text-red-600" />
            <CardTitle className="text-lg">Delete Ticket</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="text-sm text-muted-foreground mb-2">
              Are you sure you want to delete this ticket? This action cannot be undone.
            </p>
            <div className="bg-muted/50 p-3 rounded-md">
              <p className="font-medium text-sm">{ticket.title}</p>
              {ticket.description && (
                <p className="text-xs text-muted-foreground mt-1 truncate">{ticket.description}</p>
              )}
            </div>
          </div>

          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={onClose} disabled={isDeleting}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={isDeleting}>
              {isDeleting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                'Delete Ticket'
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
