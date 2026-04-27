import { NotionAPI } from "notion-client"

const sanitizeForReactNotionX = (recordMap: any) => {
  if (!recordMap || typeof recordMap !== "object") return recordMap

  // replace undefined with null / remove invalid entries
  const sanitize = (input: any): any => {
    if (input === undefined) return null
    if (input === null) return null
    if (Array.isArray(input)) return input.map((v) => sanitize(v))
    if (typeof input === "object") {
      const out: any = {}
      for (const [k, v] of Object.entries(input)) {
        if (v === undefined) continue
        out[k] = sanitize(v)
      }
      return out
    }
    return input
  }

  const rm = sanitize(recordMap)

  // Ensure notion record values have stable string ids (react-notion-x / notion-utils may call `.replace` on ids).
  const fixRecordValues = (map: any) => {
    if (!map || typeof map !== "object") return
    for (const [key, entry] of Object.entries(map)) {
      const value: any = (entry as any)?.value ?? entry
      if (!value || typeof value !== "object") {
        delete map[key]
        continue
      }

      if (typeof value.id !== "string" || value.id.length === 0) {
        value.id = typeof key === "string" ? key : ""
      }

      if (Array.isArray(value.content)) {
        value.content = value.content.filter((x: any) => typeof x === "string")
      }

      // write back normalized shape
      if ((entry as any)?.value) (entry as any).value = value
      else map[key] = { ...(entry as any), value }
    }
  }

  fixRecordValues(rm.block)
  fixRecordValues(rm.collection)
  fixRecordValues(rm.collection_view)
  fixRecordValues(rm.notion_user)
  fixRecordValues(rm.space)

  return rm
}

export const getRecordMap = async (pageId: string) => {
  const api = new NotionAPI()
  const recordMap = await api.getPage(pageId)
  return sanitizeForReactNotionX(recordMap)
}
