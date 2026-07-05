import {
  SystemusersService,
  TeamsService,
  ManageTeamsService,
  TeammembershipsService,
} from '@/generated'
import type { Systemusers } from '@/generated/models/SystemusersModel'
import type { Teams } from '@/generated/models/TeamsModel'
import type { Teammemberships } from '@/generated/models/TeammembershipsModel'
import type { IGetAllOptions } from '@/generated/models/CommonModels'
import { unwrapList, normalizeLookupId } from './common'
import { writeAuditLog } from './changelog.service'

export async function fetchSystemUsers(): Promise<Systemusers[]> {
  try {
    const options: IGetAllOptions = {
      select: ['systemuserid', 'fullname', 'internalemailaddress']
    }
    const response = await SystemusersService.getAll(options)
    if (!response.success) {
      console.error('[TeamService] fetchSystemUsers failed:', response.error)
      return []
    }
    return unwrapList<Systemusers>(response)
  } catch (err) {
    console.error('[TeamService] fetchSystemUsers exception:', err)
    return []
  }
}

export type TeamOption = {
  id: string
  name: string
  description?: string
  type: 'team'
}

export async function fetchOwnerTeams(): Promise<TeamOption[]> {
  try {
    const options: IGetAllOptions = {
      select: ['teamid', 'name', 'description', 'teamtype', 'systemmanaged'],
      orderBy: ['name asc'],
      filter: "_administratorid_value ne 9280b346-649b-4cb2-a9bc-2de1e4d66c48 and name ne 'org34d5ddb1'",
      top: 500,
    }
    const result = await TeamsService.getAll(options)
    if (!result.success) {
      console.error('[TeamService] fetchOwnerTeams failed:', result.error)
      return []
    }
    const list = unwrapList<Teams>(result)
    const filtered = list.filter((t) => t.teamtype === 0 && !t.systemmanaged)
    return filtered.map((team) => ({
      id: team.teamid,
      name: team.name,
      description: team.description,
      type: 'team',
    }))
  } catch (err) {
    console.error('[TeamService] fetchOwnerTeams exception:', err)
    return []
  }
}

export async function fetchTeamMembers(teamId: string): Promise<Systemusers[]> {
  try {
    const options: IGetAllOptions = {
      select: ['systemuserid'],
      filter: `teamid eq '${teamId}'`,
    }
    const membershipResult = await TeammembershipsService.getAll(options)
    if (!membershipResult.success) {
      console.error('[TeamService] fetchTeamMembers failed to get memberships:', membershipResult.error)
      return []
    }

    const membershipList = unwrapList<Teammemberships>(membershipResult)
    const userIds: string[] = membershipList
      .map((m: Teammemberships) => m.systemuserid || '')
      .filter((id: string | undefined) => !!id)

    if (userIds.length === 0) {
      return []
    }

    const chunkSize = 50
    const chunks: string[][] = []
    for (let i = 0; i < userIds.length; i += chunkSize) {
      chunks.push(userIds.slice(i, i + chunkSize))
    }

    const chunkPromises = chunks.map(async (chunkIds, index) => {
      const joinedOrConditions = chunkIds.map((id) => `systemuserid eq '${id}'`).join(' or ')
      const chunkFilter = `(${joinedOrConditions})`

      try {
        const chunkOptions: IGetAllOptions = {
          select: ['systemuserid', 'fullname', 'internalemailaddress', 'domainname', 'windowsliveid'],
          filter: chunkFilter,
        }
        const result = await SystemusersService.getAll(chunkOptions)
        if (!result.success) {
          console.error(`[TeamService] Chunk ${index + 1} failed:`, result.error)
          return []
        }
        return unwrapList<Systemusers>(result)
      } catch (chunkErr) {
        console.error(`[TeamService] Chunk ${index + 1} exception:`, chunkErr)
        return []
      }
    })

    const resolvedChunks = await Promise.all(chunkPromises)
    return resolvedChunks.flat()

  } catch (err) {
    console.error(`[TeamService] fetchTeamMembers exception for team ${teamId}:`, err)
    return []
  }
}

export async function manageTeamMember(teamId: string, userId: string, action: 'Add' | 'Remove'): Promise<boolean> {
  try {
    const result = await ManageTeamsService.Run({
      text: teamId,
      text_1: userId,
      text_2: action
    })

    if (result && result.success) {
      writeAuditLog({
        actionType: 'Update',
        entityName: 'teammemberships',
        recordId: teamId,
        recordName: `Team membership adjustment`,
        fieldName: 'membership',
        oldValue: action === 'Add' ? 'Not Member' : 'Member',
        newValue: action === 'Add' ? 'Member' : 'Not Member',
        description: `${action}ed user '${userId}' to/from team '${teamId}'`
      })
      return true
    } else {
      console.error(`[TeamService] manageTeamMember Flow returned a failure status:`, result?.error)
      return false
    }
  } catch (err) {
    console.error(`[TeamService] manageTeamMember exception:`, err)
    return false
  }
}
