import { NotionAPI } from "notion-client"

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

export const getRecordMap = async (pageId: string) => {
  const api = new NotionAPI()
  const recordMap = await api.getPage(pageId, {
    fetchMissingBlocks: true,
    signFileUrls: true,
    // fetching collections is unnecessary for single page render and can be flaky
    fetchCollections: false,
  })
  return normalizeRecordMapIdsInPlace(recordMap)
}
