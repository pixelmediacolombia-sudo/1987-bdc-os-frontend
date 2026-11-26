import type { WorkflowDefinition, WorkflowIssue, WorkflowRecord } from '../../domain/automation/workflow'
import { HttpClient } from '../http/http-client'

type ListItem = { id: string; name: string; draftRevision: number; publishedRevision: number | null; updatedAt: string }

export class HttpAutomationWorkflowRepository {
  private readonly http: HttpClient

  constructor(http: HttpClient) { this.http = http }

  async list(dealerId: string): Promise<ListItem[]> {
    const result = await this.http.get<{ workflows: ListItem[] }>(`/auth/automation/workflows?dealerId=${encodeURIComponent(dealerId)}`)
    return result.workflows
  }

  async get(dealerId: string, id: string): Promise<{ workflow: WorkflowRecord; validationIssues: WorkflowIssue[] }> {
    return this.http.get(`/auth/automation/workflows/${encodeURIComponent(id)}?dealerId=${encodeURIComponent(dealerId)}`)
  }

  async create(dealerId: string, name: string): Promise<{ workflow: WorkflowRecord; validationIssues: WorkflowIssue[] }> {
    return this.http.post('/auth/automation/workflows', { dealerId, name })
  }

  async saveDraft(dealerId: string, workflow: WorkflowRecord, name: string, definition: WorkflowDefinition): Promise<{ workflow: WorkflowRecord; validationIssues: WorkflowIssue[] }> {
    return this.http.put(`/auth/automation/workflows/${encodeURIComponent(workflow.id)}/draft?dealerId=${encodeURIComponent(dealerId)}`, {
      dealerId, name, definition, expectedRevision: workflow.draft.revision,
    })
  }
}
