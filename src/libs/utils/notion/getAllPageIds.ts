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
  if (!collectionQuery || Object.keys(collectionQuery).length === 0) {
    const firstCollectionValue = Object.values(collectionMap || {})[0]?.value
    const collectionId =
      firstCollectionValue?.value?.id ?? firstCollectionValue?.id

    if (collectionId && blockMap) {
      const pageIds = Object.entries(blockMap)
        .filter(([, entry]: any) => {
          const v = entry?.value?.value ?? entry?.value
          return (
            v?.type === "page" &&
            v?.parent_table === "collection" &&
            v?.parent_id === collectionId
          )
        })
        .map(([id]) => id as ID)

      // if Notion returns dashed uuids, normalize to the format used elsewhere
      return pageIds.map((id) => idToUuid(id))
    }

    throw new Error(
      [
        "Notion response missing `collection_query` and fallback failed.",
        "Please verify NOTION_PAGE_ID points to a database (collection view) and is published to web.",
      ].join(" ")
    )
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
  return pageIds.map((id) => idToUuid(id))
}
