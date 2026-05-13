import { NotionAPI } from "notion-client"
import { getPageContentBlockIds, idToUuid } from "notion-utils"

// Minimal normalization: don't change shapes, just ensure ids exist
// because react-notion-x / notion-utils may call `.replace` on ids internally.
const normalizeRecordMapIdsInPlace = (recordMap: any) => {
  if (!recordMap || typeof recordMap !== "object") return recordMap

  const fixTable = (table: any) => {
    if (!table || typeof table !== "object") return
    for (const [key, entry] of Object.entries(table)) {
      const e: any = entry as any
      const hasWrappedValue = Object.prototype.hasOwnProperty.call(e, "value")
      const v: any = hasWrappedValue ? e.value : e
      if (!v || typeof v !== "object") continue

      // Some sources wrap values as `{ value: { ...actualValue } }`.
      // react-notion-x expects the inner value object.
      if (hasWrappedValue && v?.value && typeof v.value === "object") {
        const inner = v.value
        if (inner?.type || inner?.id) {
          e.value = inner
        }
      }

      const vv: any = hasWrappedValue ? e.value : v

      // Important: only touch the inner `value` object. If `e.value` is missing/undefined,
      // mutating `e` would corrupt the recordMap shape and break serialization.
      if (typeof vv.id !== "string" || vv.id.length === 0) {
        vv.id = typeof key === "string" ? key : ""
      }

      if (hasWrappedValue) e.value = vv
    }
  }

  fixTable(recordMap.block)
  fixTable(recordMap.collection)
  fixTable(recordMap.collection_view)
  fixTable(recordMap.notion_user)
  fixTable(recordMap.space)

  return recordMap
}

const mergeBlocksFromChunk = (recordMap: any, chunk: any) => {
  const newBlocks =
    chunk?.recordMap?.block ?? chunk?.block ?? chunk?.recordMapWithRoles?.block
  if (newBlocks && recordMap.block) {
    Object.assign(recordMap.block, newBlocks)
  }
}

/**
 * Extra fetch passes for very long Notion pages: `getPage({ fetchMissingBlocks })`
 * can still leave referenced block ids unfetched in edge cases; walk the tree and
 * `getBlocks` until complete (bounded passes to avoid infinite loops).
 */
const fetchAllReferencedBlocks = async (
  api: NotionAPI,
  recordMap: any,
  pageId: string
) => {
  const rootDashed = idToUuid(pageId)
  const rootNoDash = rootDashed.replace(/-/g, "")
  const rootId = recordMap.block?.[rootDashed]
    ? rootDashed
    : recordMap.block?.[rootNoDash]
      ? rootNoDash
      : rootDashed
  const maxPasses = 80
  const chunkSize = 100

  for (let pass = 0; pass < maxPasses; pass++) {
    let needed: string[] = []
    try {
      needed = getPageContentBlockIds(recordMap, rootId).filter(
        (id) => !recordMap.block?.[id]
      )
    } catch {
      break
    }
    if (!needed.length) break

    const blockCountBefore = Object.keys(recordMap.block || {}).length

    for (let i = 0; i < needed.length; i += chunkSize) {
      const slice = needed.slice(i, i + chunkSize)
      try {
        const chunk: any = await api.getBlocks(slice)
        mergeBlocksFromChunk(recordMap, chunk)
      } catch {
        break
      }
    }

    const blockCountAfter = Object.keys(recordMap.block || {}).length
    if (blockCountAfter <= blockCountBefore) break
  }
}

export const getRecordMap = async (pageId: string) => {
  const api = new NotionAPI()
  const recordMap = await api.getPage(pageId, {
    fetchMissingBlocks: true,
    signFileUrls: true,
    // fetching collections is unnecessary for single page render and can be flaky
    fetchCollections: false,
  })
  normalizeRecordMapIdsInPlace(recordMap)
  await fetchAllReferencedBlocks(api, recordMap, pageId)
  return recordMap
}
