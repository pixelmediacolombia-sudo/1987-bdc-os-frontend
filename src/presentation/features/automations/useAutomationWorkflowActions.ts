import type { Dispatch, FormEvent, SetStateAction } from 'react'
import { appServices } from '../../../core/container'
import type { WorkflowDefinition, WorkflowRecord } from '../../../domain/automation/workflow'
import { EDITOR_WORKFLOW_KEY, type WorkflowListItem } from './automation-workflow-editor.helpers'

type Options = {
  dealerId: string
  workflow: WorkflowRecord | null
  definition: WorkflowDefinition | null
  nameDraft: string
  hasUnsavedDraft: boolean
  canPublish: boolean
  setWorkflow: Dispatch<SetStateAction<WorkflowRecord | null>>
  setDefinition: Dispatch<SetStateAction<WorkflowDefinition | null>>
  setItems: Dispatch<SetStateAction<WorkflowListItem[]>>
  setNameDraft: Dispatch<SetStateAction<string>>
  setSelectedNodeId: Dispatch<SetStateAction<string | null>>
  setSaving: Dispatch<SetStateAction<boolean>>
  setPublishing: Dispatch<SetStateAction<boolean>>
  setError: Dispatch<SetStateAction<string>>
  setSavedNotice: Dispatch<SetStateAction<string>>
  setShowCreate: Dispatch<SetStateAction<boolean>>
  setShowRuns: Dispatch<SetStateAction<boolean>>
  setShowDiscardConfirm: Dispatch<SetStateAction<boolean>>
  resetConnections: () => void
}

export function useAutomationWorkflowActions(options: Options) {
  const {
    dealerId, workflow, definition, nameDraft, hasUnsavedDraft, canPublish,
    setWorkflow, setDefinition, setItems, setNameDraft, setSelectedNodeId,
    setSaving, setPublishing, setError, setSavedNotice, setShowCreate,
    setShowRuns, setShowDiscardConfirm, resetConnections,
  } = options

  function returnToList() {
    setWorkflow(null)
    setDefinition(null)
    resetConnections()
    setError('')
    setShowRuns(false)
    setShowDiscardConfirm(false)
    try { window.sessionStorage.removeItem(`${EDITOR_WORKFLOW_KEY}${dealerId}`) } catch { /* Navigation still works without browser storage. */ }
  }

  function requestReturnToList() {
    if (hasUnsavedDraft) setShowDiscardConfirm(true)
    else returnToList()
  }

  async function openWorkflow(id: string) {
    setError('')
    setSavedNotice('')
    resetConnections()
    try {
      const result = await appServices.automationWorkflows.get(dealerId, id)
      setWorkflow(result.workflow)
      setDefinition(result.workflow.draft.definition)
      setSelectedNodeId(null)
      try { window.sessionStorage.setItem(`${EDITOR_WORKFLOW_KEY}${dealerId}`, id) } catch { /* The editor can still open without browser storage. */ }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No pudimos abrir el borrador.')
    }
  }

  async function createWorkflow(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const name = nameDraft.trim()
    if (!dealerId || !name) return
    setSaving(true)
    setError('')
    try {
      const result = await appServices.automationWorkflows.create(dealerId, name)
      setWorkflow(result.workflow)
      setDefinition(result.workflow.draft.definition)
      try { window.sessionStorage.setItem(`${EDITOR_WORKFLOW_KEY}${dealerId}`, result.workflow.id) } catch { /* The editor can still open without browser storage. */ }
      setItems((current) => [{ id: result.workflow.id, name: result.workflow.name, draftRevision: result.workflow.draft.revision, publishedRevision: null, updatedAt: result.workflow.draft.updatedAt }, ...current])
      setNameDraft('')
      setShowCreate(false)
      setSelectedNodeId(null)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No pudimos crear el borrador.')
    } finally {
      setSaving(false)
    }
  }

  async function saveDraft() {
    if (!workflow || !definition || !dealerId) return
    setSaving(true)
    setError('')
    setSavedNotice('')
    try {
      const result = await appServices.automationWorkflows.saveDraft(dealerId, workflow, definition.name, definition)
      setWorkflow(result.workflow)
      setDefinition(result.workflow.draft.definition)
      setItems((current) => current.map((item) => item.id === workflow.id ? { ...item, name: result.workflow.name, draftRevision: result.workflow.draft.revision, updatedAt: result.workflow.draft.updatedAt } : item))
      setSavedNotice('Borrador guardado')
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No pudimos guardar el borrador.')
    } finally {
      setSaving(false)
    }
  }

  async function publishWorkflow() {
    if (!workflow || !dealerId || !canPublish) return
    setPublishing(true)
    setError('')
    setSavedNotice('')
    try {
      const result = await appServices.automationWorkflows.publish(dealerId, workflow)
      setWorkflow(result.workflow)
      setItems((current) => current.map((item) => item.id === workflow.id ? { ...item, publishedRevision: result.workflow.published?.revision ?? null, updatedAt: result.workflow.draft.updatedAt } : item))
      setSavedNotice(`Workflow publicado · v${result.workflow.published?.revision ?? workflow.draft.revision}`)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No pudimos publicar el workflow.')
    } finally {
      setPublishing(false)
    }
  }

  return { returnToList, requestReturnToList, openWorkflow, createWorkflow, saveDraft, publishWorkflow }
}
