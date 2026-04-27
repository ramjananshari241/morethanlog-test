import { idToUuid } from "notion-utils"
import { ExtendedRecordMap, ID } from "notion-types"

export default function getAllPageIds(
  response: ExtendedRecordMap,
  viewId?: string
) {
  const collectionQuery = response?.collection_query as any
  const blockMap = (response as any)?.block as any
  const collectionMap = (response as any)?.collection as any

  // Some environments / Notion responses may not include `collection_query`.
  // In that case, we fall back to extracting page ids directly from the block map.
  const fallbackFromBlocks = () => {
    if (!blockMap) return [] as ID[]

    const firstCollectionValue = (Object.values(collectionMap || {}) as any[])[0]
      ?.value as any
    const collectionId =
      firstCollectionValue?.value?.id ?? firstCollectionValue?.id

    const candidates = Object.entries(blockMap)
      .filter(([, entry]: any) => {
        const v = entry?.value?.value ?? entry?.value
        if (v?.type !== "page") return false
        if (v?.parent_table !== "collection") return false
        // If we can detect the target collection id, restrict; otherwise accept all collection pages.
        if (collectionId && v?.parent_id !== collectionId) return false
        return true
      })
      .map(([id]) => id as ID)

    return candidates
  }

  if (!collectionQuery || Object.keys(collectionQuery).length === 0) {
    const pageIds = fallbackFromBlocks()
    if (pageIds.length) return pageIds.map((id) => idToUuid(id))
    // Return empty and let callers fetch collection data via other means.
    return []
  }

  const views = Object.values(collectionQuery)[0] as any

  let pageIds: ID[] = []
  if (viewId) {
    const vId = idToUuid(viewId)
    pageIds = views[vId]?.blockIds
  } else {
    const pageSet = new Set<ID>()
    // * type not exist
    Object.values(views).forEach((view: any) => {
      view?.collection_group_results?.blockIds?.forEach((id: ID) =>
        pageSet.add(id)
      )
    })
    pageIds = [...pageSet]
  }
  if (!pageIds?.length) {
    const fallbackIds = fallbackFromBlocks()
    if (fallbackIds.length) return fallbackIds.map((id) => idToUuid(id))
  }

  return pageIds.map((id) => idToUuid(id))
}
