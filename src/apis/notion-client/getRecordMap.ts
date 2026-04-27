import { NotionAPI } from "notion-client"

const sanitizeForReactNotionX = (recordMap: any) => {
  if (!recordMap || typeof recordMap !== "object") return recordMap

  // Replace undefined with null (Next props + react-notion-x friendliness)
  const sanitize = (input: any): any => {
    if (input === undefined) return null
    if (input === null) return null
    if (Array.isArray(input)) return input.map((v) => sanitize(v))
    if (typeof input === "object") {
      const out: any = {}
      for (const [k, v] of Object.entries(input)) {
        if (v === undefined) {
          out[k] = null
          continue
        }
        out[k] = sanitize(v)
      }
      return out
    }
    return input
  }

  const rm = sanitize(recordMap)

  // Ensure notion record values have stable string ids (react-notion-x / notion-utils may call `.replace` on ids).
  const fixRecordValues = (map: any, tableName: string) => {
    if (!map || typeof map !== "object") return
    for (const [key, entry] of Object.entries(map)) {
      // notion-client usually returns { role, value }. Keep that shape whenever possible.
      const hasWrappedValue = !!(entry as any)?.value
      const value: any = hasWrappedValue ? (entry as any).value : entry
      if (!value || typeof value !== "object") continue

      if (typeof value.id !== "string" || value.id.length === 0) {
        value.id = typeof key === "string" ? key : ""
      }

      if (Array.isArray(value.content)) {
        value.content = value.content.filter((x: any) => typeof x === "string")
      }

      // Write back without changing the outer shape unnecessarily.
      if (hasWrappedValue) {
        ;(entry as any).value = value
      } else {
        // If this table unexpectedly isn't wrapped, wrap it rather than spreading into a new shape.
        map[key] = { role: "reader", value }
      }
    }
  }

  fixRecordValues(rm.block, "block")
  fixRecordValues(rm.collection, "collection")
  fixRecordValues(rm.collection_view, "collection_view")
  fixRecordValues(rm.notion_user, "notion_user")
  fixRecordValues(rm.space, "space")

  return rm
}

export const getRecordMap = async (pageId: string) => {
  const api = new NotionAPI()
  const recordMap = await api.getPage(pageId)
  return sanitizeForReactNotionX(recordMap)
}
