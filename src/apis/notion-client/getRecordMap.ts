import { NotionAPI } from "notion-client"
import { getPageContentBlockIds, idToUuid, mergeRecordMaps } from "notion-utils"

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

/** Any block lists child ids in `content`; if those rows are missing, the page renders short. */
const collectMissingContentIds = (recordMap: any): string[] => {
  const table = recordMap?.block
  if (!table || typeof table !== "object") return []
  const missing = new Set<string>()
  for (const entry of Object.values(table)) {
    const v = (entry as any)?.value ?? entry
    const ids = v?.content
    if (!Array.isArray(ids)) continue
    for (const id of ids) {
      if (typeof id === "string" && id.length && !table[id]) missing.add(id)
    }
  }
  return Array.from(missing)
}

const mergeBlocksFromChunk = (recordMap: any, chunk: any) => {
  const newBlocks =
    chunk?.recordMap?.block ?? chunk?.block ?? chunk?.recordMapWithRoles?.block
  if (newBlocks && recordMap.block) {
    Object.assign(recordMap.block, newBlocks)
  }
}

const mergeChunkIntoRecordMap = (recordMap: any, chunk: any) => {
  if (chunk?.recordMap) {
    const merged = mergeRecordMaps(recordMap, chunk.recordMap)
    for (const k of Object.keys(merged)) {
      ;(recordMap as any)[k] = (merged as any)[k]
    }
    return
  }
  mergeBlocksFromChunk(recordMap, chunk)
}

/**
 * Keep fetching `getBlocks` until every `content[]` reference exists in `recordMap.block`.
 * `getPage({ fetchMissingBlocks })` + `getPageContentBlockIds` can still miss edges on long pages.
 */
const fetchAllMissingBlocks = async (
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

  const maxPasses = 250
  const chunkSize = 80

  for (let pass = 0; pass < maxPasses; pass++) {
    const fromContent = collectMissingContentIds(recordMap)
    let fromTree: string[] = []
    try {
      fromTree = getPageContentBlockIds(recordMap, rootId).filter(
        (id) => !recordMap.block?.[id]
      )
    } catch {
      // ignore — tree walk is best-effort
    }

    const needed = [...new Set([...fromContent, ...fromTree])]
    if (!needed.length) break

    const countBefore = Object.keys(recordMap.block || {}).length

    for (let i = 0; i < needed.length; i += chunkSize) {
      const slice = needed.slice(i, i + chunkSize)
      try {
        const chunk: any = await api.getBlocks(slice)
        mergeChunkIntoRecordMap(recordMap, chunk)
      } catch {
        // one batch failed; continue
      }
    }

    const countAfter = Object.keys(recordMap.block || {}).length
    if (countAfter <= countBefore) break
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
  await fetchAllMissingBlocks(api, recordMap, pageId)
  return recordMap
}
