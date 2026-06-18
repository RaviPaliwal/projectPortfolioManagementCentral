import {
  SystemusersService,
  TeamsService,
  ManageTeamsService,
  TeammembershipsService,
} from '@/generated'
import type { Systemusers } from '@/generated/models/SystemusersModel'
import type { Teams } from '@/generated/models/TeamsModel'
import type { Teammemberships } from '@/generated/models/TeammembershipsModel'
import { unwrapList, normalizeLookupId } from './common'
import { writeAuditLog } from './changelog.service'

export async function fetchSystemUsers(): Promise<Systemusers[]> {
  try {
    const response = await SystemusersService.getAll({
      select: ['systemuserid', 'fullname', 'internalemailaddress'] 
    } as any);

    let users = response as any;
    if (response && 'records' in response) users = response.records;
    if (response && 'value' in response) users = response.value;

    return Array.isArray(users) ? users : [];
  } catch (err) {
    console.warn('fetchSystemUsers failed:', err);
    return [];
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
    const result = await TeamsService.getAll({
      select: ['teamid', 'name', 'description', 'teamtype', 'systemmanaged'],
      orderBy: ['name asc'],
      filter: "_administratorid_value ne 9280b346-649b-4cb2-a9bc-2de1e4d66c48 and name ne 'org34d5ddb1'",
      top: 500,
    })
    const list = unwrapList<Teams>(result)
    const filtered = list.filter((t) => t.teamtype === 0 && !t.systemmanaged)
    return filtered.map((team) => ({
      id: team.teamid,
      name: team.name,
      description: team.description,
      type: 'team',
    }))
  } catch (err) {
    console.warn('[dataverseService] fetchOwnerTeams failed:', err)
    return []
  }
}

export async function fetchTeamMembers(teamId: string): Promise<Systemusers[]> {
  try {
    const membershipResult = await TeammembershipsService.getAll({
      select: ['systemuserid'],
      filter: `teamid eq '${teamId}'`,
    });

    const membershipList = unwrapList<Teammemberships>(membershipResult);
    const userIds: string[] = membershipList
      .map((m: Teammemberships) => m.systemuserid || '') 
      .filter((id: string | undefined) => !!id);

    if (userIds.length === 0) {
      return [];
    }

    const chunkSize = 50;
    const chunks: string[][] = [];
    for (let i = 0; i < userIds.length; i += chunkSize) {
      chunks.push(userIds.slice(i, i + chunkSize));
    }

    const chunkPromises = chunks.map(async (chunkIds, index) => {
      const joinedOrConditions = chunkIds.map((id) => `systemuserid eq '${id}'`).join(' or ');
      const chunkFilter = `(${joinedOrConditions})`;

      try {
        const result = await SystemusersService.getAll({
          select: ['systemuserid', 'fullname', 'internalemailaddress', 'domainname', 'windowsliveid'],
          filter: chunkFilter,
        });
        return unwrapList<Systemusers>(result);
      } catch (chunkErr) {
        console.warn(`[dataverseService] Chunk ${index + 1} failed:`, chunkErr);
        return [];
      }
    });

    const resolvedChunks = await Promise.all(chunkPromises);
    return resolvedChunks.flat();

  } catch (err) {
    console.warn(`[dataverseService] fetchTeamMembers failed for team ${teamId}:`, err);
    return [];
  }
}

export async function manageTeamMember(teamId: string, userId: string, action: 'Add' | 'Remove'): Promise<boolean> {
  try {
    const result = await ManageTeamsService.Run({
      text: teamId,
      text_1: userId,
      text_2: action
    } as any);
 
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
      return true;
    } else {
      console.warn(`[dataverseService] manageTeamMember Flow returned a failure status:`, result?.error);
      return false;
    }
  } catch (err) {
    console.warn(`[dataverseService] manageTeamMember service execution failed:`, err);
    return false;
  }
}
