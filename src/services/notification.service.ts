import { SystemusersService, SendMessageService } from '@/generated'
import type { Systemusers } from '@/generated/models/SystemusersModel'
import { unwrapSingle, unwrapList } from './common'

export async function sendNotificationToUser(
  userId: string,
  channel: 'Teams' | 'Outlook',
  subject: string,
  message: string
): Promise<boolean> {
  console.log(`[NotificationService] sendNotificationToUser called: userId=${userId}, channel=${channel}, subject="${subject}"`)
  try {
    const cleanUserId = userId.replace(/[{}]/g, '').trim().toLowerCase()
    if (!cleanUserId) {
      console.warn('[NotificationService] Empty userId provided.')
      return false
    }

    console.log(`[NotificationService] Fetching systemuser details for ID: ${cleanUserId}`)
    const userResult = await SystemusersService.get(cleanUserId, { select: ['internalemailaddress', 'fullname'] })
    console.log('[NotificationService] Systemuser fetch result:', JSON.stringify(userResult))
    
    if (!userResult.success) {
      console.error('[NotificationService] Failed to fetch systemuser:', userResult.error)
      return false
    }
    const user = unwrapSingle<Systemusers>(userResult)
    console.log('[NotificationService] Unwrapped user:', JSON.stringify(user))
    
    if (!user || !user.internalemailaddress) {
      console.warn('[NotificationService] No email address found for user ID:', cleanUserId)
      return false
    }

    const payload = {
      text: channel,
      text_1: message,
      text_2: user.internalemailaddress,
      text_3: subject,
    }
    console.log('[NotificationService] Triggering SendMessage Flow with payload:', JSON.stringify(payload))
    const flowResult = await SendMessageService.Run(payload)
    console.log('[NotificationService] Flow execution response:', JSON.stringify(flowResult))

    if (!flowResult.success) {
      console.error('[NotificationService] SendMessage Flow failed:', flowResult.error)
      return false
    }

    console.log(`[NotificationService] Successfully sent flow message to ${user.fullname} (${user.internalemailaddress})`)
    return true
  } catch (err) {
    console.error('[NotificationService] Exception sending notification:', err)
    return false
  }
}

export async function sendNotificationToUserName(
  userName: string,
  channel: 'Teams' | 'Outlook',
  subject: string,
  message: string
): Promise<boolean> {
  console.log(`[NotificationService] sendNotificationToUserName called: userName=${userName}, channel=${channel}, subject="${subject}"`)
  try {
    console.log(`[NotificationService] Querying systemusers where fullname eq '${userName}'`)
    const usersResult = await SystemusersService.getAll({
      filter: `fullname eq '${userName.replace(/'/g, "''")}'`,
      select: ['systemuserid', 'internalemailaddress', 'fullname'],
    })
    console.log('[NotificationService] Query systemusers result:', JSON.stringify(usersResult))
    
    if (!usersResult.success) {
      console.error('[NotificationService] Failed to search systemusers by name:', usersResult.error)
      return false
    }
    const list = unwrapList<Systemusers>(usersResult)
    console.log('[NotificationService] Unwrapped users list count:', list.length)
    if (list.length === 0 || !list[0].internalemailaddress) {
      console.warn('[NotificationService] No user or email address found for username:', userName)
      return false
    }

    const user = list[0]
    const payload = {
      text: channel,
      text_1: message,
      text_2: user.internalemailaddress,
      text_3: subject,
    }
    console.log('[NotificationService] Triggering SendMessage Flow with payload:', JSON.stringify(payload))
    const flowResult = await SendMessageService.Run(payload)
    console.log('[NotificationService] Flow execution response:', JSON.stringify(flowResult))

    if (!flowResult.success) {
      console.error('[NotificationService] SendMessage Flow failed:', flowResult.error)
      return false
    }

    console.log(`[NotificationService] Successfully sent flow message to ${user.fullname} (${user.internalemailaddress})`)
    return flowResult.success
  } catch (err) {
    console.error('[NotificationService] Exception in sendNotificationToUserName:', err)
    return false
  }
}
