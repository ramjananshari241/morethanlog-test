import { NotionAPI } from "notion-client"

const normalizeRecordMapIdsInPlace = (recordMap: any) => {
  if (!recordMap || typeof recordMap !== "object") return recordMap

  const fixTable = (table: any) => {
    if (!table || typeof table !== "object") return
    for (const [key, entry] of Object.entries(table)) {
      const e: any = entry as any
      const v: any = e?.value ?? e
      if (!v || typeof v !== "object") continue

      // Some notion blocks may miss `id` which later code expects to be a string.
      if (typeof v.id !== "string" || v.id.length === 0) {
        v.id = typeof key === "string" ? key : ""
      }

      if (Array.isArray(v.content)) {
        v.content = v.content.filter((x: any) => typeof x === "string")
      }

      if (e?.value) e.value = v
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
    // collections aren't required for rendering a single page and can be slow/flaky
    fetchCollections: false,
  })
  return normalizeRecordMapIdsInPlace(recordMap)
}
