type AuditAction =
  | 'user.create'
  | 'user.update'
  | 'user.delete'
  | 'user.role_change'
  | 'user.invite'
  | 'company.create'
  | 'company.update'
  | 'billing.payment_delete'
  | 'billing.period_reset'
  | 'auth.login'
  | 'auth.logout';

interface AuditEntry {
  action: AuditAction;
  userId: string;
  targetId?: string;
  metadata?: Record<string, unknown>;
  timestamp: string;
}

export function logAudit(entry: Omit<AuditEntry, 'timestamp'>): void {
  const fullEntry: AuditEntry = {
    ...entry,
    timestamp: new Date().toISOString(),
  };

  // Redact sensitive fields
  if (fullEntry.metadata) {
    const redacted = {...fullEntry.metadata};
    for (const key of ['email', 'password', 'token', 'hourlyRate', 'hourly_rate']) {
      if (key in redacted) {
        redacted[key] = '[REDACTED]';
      }
    }
    fullEntry.metadata = redacted;
  }

  // In production, this should go to a proper audit log service
  // For now, structured console logging
  console.log(JSON.stringify({type: 'AUDIT', ...fullEntry}));
}
