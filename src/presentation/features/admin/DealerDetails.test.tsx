import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import type { Dealer } from '../../../domain/dealer/dealer'
import { DealerDetails } from './DealerDetails'

describe('DealerDetails', () => {
  it('lets an admin save the verified dealer name to the backend', async () => {
    const dealer: Dealer = {
      id: '11111111-1111-4111-8111-111111111111', name: 'Dealer sin nombre', users: 0,
      pendingInvitations: 0, status: 'Activo', initials: 'DS',
    }
    const onRename = vi.fn().mockResolvedValue(undefined)
    render(<DealerDetails dealer={dealer} onClose={vi.fn()} onInviteMember={vi.fn()} onInvited={vi.fn()} onRename={onRename} onDelete={vi.fn()} />)

    fireEvent.change(screen.getByLabelText('Nombre visible'), { target: { value: 'Country Club DMV' } })
    fireEvent.click(screen.getByRole('button', { name: 'Guardar nombre' }))

    await waitFor(() => expect(onRename).toHaveBeenCalledWith('Country Club DMV'))
    expect((await screen.findByRole('status')).textContent).toContain('Nombre guardado en la ficha del dealer.')
  })
})
