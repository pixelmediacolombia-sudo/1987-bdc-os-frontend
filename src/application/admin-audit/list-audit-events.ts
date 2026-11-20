import type { AuditFilters, AuditRepository } from '../../domain/admin-audit/audit-event'

export class ListAuditEvents {
  private readonly audit: AuditRepository

  constructor(audit: AuditRepository) { this.audit = audit }

  execute(filters: AuditFilters) {
    return this.audit.list(filters)
  }
}
