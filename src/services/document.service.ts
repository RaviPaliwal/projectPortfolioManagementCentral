import { Pm_documentsService } from '@/generated'
import type { Pm_documents } from '@/generated/models/Pm_documentsModel'
import { unwrapList, unwrapSingle, normalizeLookupId } from './common'

/**
 * Fetch all active documents for a specific entity GUID and module name.
 */
export async function fetchDocumentsForEntity(
  moduleName: string,
  entityId: string
): Promise<Pm_documents[]> {
  try {
    const result = await Pm_documentsService.getAll({
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
    })
    return unwrapList<Pm_documents>(result)
  } catch (err) {
    console.error(`[documentService] fetchDocumentsForEntity failed for ${moduleName}/${entityId}:`, err)
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
    const payload: Record<string, any> = {
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
    const created = unwrapSingle<Pm_documents>(metadataResult)
    if (!created?.pm_documentid) {
      throw new Error('Failed to create document metadata record.')
    }

    // 2. Upload the file binary content to the 'pm_file' column of the newly created record
    await Pm_documentsService.upload(
      created.pm_documentid,
      'pm_file',
      file,
      file.name
    )

    // Return the updated document record
    const updatedResult = await Pm_documentsService.get(created.pm_documentid)
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
  try {
    await Pm_documentsService.delete(documentId)
    return true
  } catch (err) {
    console.error(`[documentService] deleteDocument failed for ${documentId}:`, err)
    return false
  }
}
