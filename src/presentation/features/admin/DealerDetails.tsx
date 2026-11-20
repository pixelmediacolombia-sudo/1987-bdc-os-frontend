import { useState } from 'react'
import Icon from '../../components/Icon'
import type { Dealer, DealerInvitation } from '../../../domain/dealer/dealer'
import { DealerStatusBadge } from './AdminStates'
import { DealerConfigurationPanel } from './DealerConfigurationPanel'
import { MemberInviteForm } from './MemberInviteForm'

export function DealerDetails({ dealer, onClose, onInviteMember, onInvited, onDelete }: {
  dealer: Dealer; onClose: () => void; onInviteMember: (name: string, email: string) => Promise<DealerInvitation>; onInvited: () => void; onDelete: (dealerId: string) => Promise<void>
}) {
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState('')

  async function deleteDealer() {
    setDeleting(true)
    setDeleteError('')
    try { await onDelete(dealer.id) }
    catch (cause) { setDeleteError(cause instanceof Error ? cause.message : 'No pudimos eliminar el dealer.') }
    finally { setDeleting(false) }
  }

  return <div className="overlay drawer-overlay" onMouseDown={(event) => { if (event.target === event.currentTarget && !confirmDelete) onClose() }}>
    <aside className="drawer admin-dealer-drawer" role="dialog" aria-modal="true" aria-labelledby="dealer-detail-title">
      <div className="drawer-top"><span className="eyebrow">RESUMEN DE CUENTA</span><button className="icon-button" aria-label="Cerrar detalle del dealer" onClick={onClose}><Icon name="close" /></button></div>
      <span className="dealer-detail-avatar">{dealer.initials}</span><h2 id="dealer-detail-title">{dealer.name}</h2><p className="dealer-id">ID · {dealer.id}</p><DealerStatusBadge status={dealer.status} />
      <div className="dealer-detail-facts"><div><small>Miembros activos</small><strong>{dealer.users}</strong></div><div><small>Invitaciones pendientes</small><strong>{dealer.pendingInvitations}</strong></div></div>
      <div className="dealer-detail-note">Los miembros se cuentan después de aceptar la invitación y crear su contraseña. El estado se actualizará a Activo al completar ese proceso.</div>
      <DealerConfigurationPanel dealerId={dealer.id} />
      <MemberInviteForm onInvite={onInviteMember} onInvited={onInvited} />
      <button className="secondary dealer-detail-close" onClick={onClose}>Cerrar ficha</button><button className="dealer-delete-trigger" onClick={() => setConfirmDelete(true)}>Eliminar dealer</button>
      {deleteError && <p className="admin-form-error" role="alert">{deleteError}</p>}
      {confirmDelete && <div className="dealer-delete-confirm" role="alertdialog" aria-labelledby="dealer-delete-title" aria-describedby="dealer-delete-warning"><h3 id="dealer-delete-title">¿Eliminar {dealer.name}?</h3><p id="dealer-delete-warning">Esta acción no se puede deshacer. También eliminará sus invitaciones, membresías y datos asociados al dealer.</p><div><button className="secondary" onClick={() => setConfirmDelete(false)} disabled={deleting}>Cancelar</button><button className="dealer-delete-button" onClick={() => void deleteDealer()} disabled={deleting}>{deleting ? 'Eliminando…' : 'Sí, eliminar dealer'}</button></div></div>}
    </aside>
  </div>
}
