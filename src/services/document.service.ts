import { Pm_documentsService } from '@/generated'
import type { Pm_documents } from '@/generated/models/Pm_documentsModel'
import type { IGetAllOptions } from '@/generated/models/CommonModels'
import { unwrapList, unwrapSingle, normalizeLookupId } from './common'
import { writeAuditLog } from './changelog.service'

/**
 * Fetch all active documents for a specific entity GUID and module name.
 */
export async function fetchDocumentsForEntity(
  moduleName: string,
  entityId: string
): Promise<Pm_documents[]> {
  try {
    const options: IGetAllOptions = {
      filter: `pm_module eq '${moduleName}' and pm_entityguid eq '${entityId}' and statecode eq 0`,
      select: [
        'pm_documentid',
        'pm_documenttitle',
        'pm_entityguid',
        'pm_module',
        'pm_file_name',
        'ownerid',
        'createdon',
        'pm_file'
      ],
      orderBy: ['createdon desc'],
      top: 100,
    }
    const result = await Pm_documentsService.getAll(options)
    if (!result.success) {
      console.error(`[documentService] fetchDocumentsForEntity failed for ${moduleName}/${entityId}:`, result.error)
      return []
    }
    return unwrapList<Pm_documents>(result)
  } catch (err) {
    console.error(`[documentService] fetchDocumentsForEntity exception for ${moduleName}/${entityId}:`, err)
    return []
  }
}

/**
 * Upload a document record to Dataverse and attach the file content.
 */
export async function uploadDocument(
  moduleName: string,
  entityId: string,
  file: File,
  ownerId?: string
): Promise<Pm_documents | null> {
  try {
    // 1. Create the document metadata record using OData binding for the owner lookup
    const payload: Record<string, unknown> = {
      pm_documenttitle: file.name,
      pm_module: moduleName,
      pm_entityguid: entityId,
      statecode: 0,
    }

    const normalizedOwner = normalizeLookupId(ownerId)
    if (normalizedOwner) {
      payload['ownerid@odata.bind'] = `/systemusers(${normalizedOwner})`
    }

    const metadataResult = await Pm_documentsService.create(payload as any)
    if (!metadataResult.success) {
      console.error(`[documentService] uploadDocument metadata creation failed:`, metadataResult.error)
      return null
    }
    const created = unwrapSingle<Pm_documents>(metadataResult)
    if (!created?.pm_documentid) {
      throw new Error('Failed to create document metadata record.')
    }

    writeAuditLog({
      actionType: 'Create',
      entityName: 'pm_documents',
      recordId: created.pm_documentid,
      recordName: file.name,
      newValue: `Uploaded file to module ${moduleName} for entity ${entityId}`
    })

    // 2. Upload the file binary content to the 'pm_file' column of the newly created record
    await Pm_documentsService.upload(
      created.pm_documentid,
      'pm_file',
      file,
      file.name
    )

    // Return the updated document record
    const updatedResult = await Pm_documentsService.get(created.pm_documentid)
    if (!updatedResult.success) {
      console.error(`[documentService] uploadDocument fetch updated document failed:`, updatedResult.error)
      return null
    }
    return unwrapSingle<Pm_documents>(updatedResult)
  } catch (err) {
    console.error(`[documentService] uploadDocument failed for ${moduleName}/${entityId}:`, err)
    return null
  }
}

/**
 * Download the binary content of a document.
 */
export async function downloadDocumentFile(documentId: string): Promise<Uint8Array | null> {
  try {
    const result = await Pm_documentsService.downloadFile(documentId, 'pm_file')
    if (!result.success) {
      console.error(`[documentService] downloadDocumentFile failed for ${documentId}:`, result.error)
      return null
    }
    return result.data || null
  } catch (err) {
    console.error(`[documentService] downloadDocumentFile failed for ${documentId}:`, err)
    return null
  }
}

/**
 * Delete a document record (and its attached file) from Dataverse.
 */
export async function deleteDocument(documentId: string): Promise<boolean> {
  let recordName = documentId
  try {
    const details = await Pm_documentsService.get(documentId, { select: ['pm_documenttitle'] })
    if (details.success) {
      const uItem = unwrapSingle<Pm_documents>(details)
      if (uItem?.pm_documenttitle) recordName = uItem.pm_documenttitle
    }
  } catch (e) {
    console.warn('[documentService] Failed to retrieve document details for auditing:', e)
  }

  try {
    await Pm_documentsService.delete(documentId)
    writeAuditLog({
      actionType: 'Update',
      entityName: 'pm_documents',
      recordId: documentId,
      recordName: recordName,
      fieldName: 'deleted',
      oldValue: 'Active',
      newValue: 'Deleted'
    })
    return true
  } catch (err) {
    console.error(`[documentService] deleteDocument failed for ${documentId}:`, err)
    return false
  }
}

