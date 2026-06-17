import { useMemo } from 'react'
import { useUser } from '@/context/UserContext'
import { checkCrudPermission } from '@/constants/permissions'
import type { CrudAction, CrudModule, Persona } from '@/constants/permissions'

interface AuthorizationResult {
  allowed: boolean
  persona: Persona
  isAdmin: boolean
}

export function useAuthorization(
  module: CrudModule,
  action: CrudAction = 'read'
): AuthorizationResult {
  const { currentUserPersona } = useUser()

  return useMemo(() => ({
    allowed: checkCrudPermission(currentUserPersona, module, action),
    persona: currentUserPersona,
    isAdmin: currentUserPersona === 'SystemAdministrator',
  }), [currentUserPersona, module, action])
}

export function canUserPerform(
  persona: Persona,
  module: CrudModule,
  action: CrudAction
): boolean {
  return checkCrudPermission(persona, module, action)
}

export default useAuthorization
