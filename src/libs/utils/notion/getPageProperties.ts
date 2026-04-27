import { getTextContent, getDateValue, idToUuid } from "notion-utils"
import { NotionAPI } from "notion-client"
import { BlockMap, CollectionPropertySchemaMap } from "notion-types"
import { customMapImageUrl } from "./customMapImageUrl"

async function getPageProperties(
  id: string,
  block: BlockMap,
  schema: CollectionPropertySchemaMap
) {
  const api = new NotionAPI()
  const idDashed = idToUuid(id)
  const idRaw = idDashed.replace(/-/g, "")
  const blockEntry =
    (block?.[id]?.value as any) ??
    (block?.[idDashed]?.value as any) ??
    (block?.[idRaw]?.value as any)
  const blockValue = blockEntry?.value ?? blockEntry
  const rawProperties = Object.entries(blockValue?.properties || [])
  const excludeProperties = ["date", "select", "multi_select", "person", "file"]
  const properties: any = {}

  const canonicalKey = (name: string | undefined) => {
    if (!name) return undefined
    const normalized = name.toLowerCase().replace(/\s+/g, "")
    const map: Record<string, string> = {
      slug: "slug",
      status: "status",
      type: "type",
      tags: "tags",
      tag: "tags",
      category: "category",
      categories: "category",
      summary: "summary",
      description: "summary",
      title: "title",
      name: "title",
      thumbnail: "thumbnail",
      cover: "thumbnail",
      date: "date",
      author: "author",
    }
    return map[normalized] || name
  }

  for (let i = 0; i < rawProperties.length; i++) {
    const [key, val]: any = rawProperties[i]
    properties.id = id
    const outKey = canonicalKey(schema[key]?.name)
    if (!outKey) continue

    if (schema[key]?.type && !excludeProperties.includes(schema[key].type)) {
      properties[outKey] = getTextContent(val)
    } else {
      switch (schema[key]?.type) {
        case "file": {
          try {
            const Block = blockValue
            const url: string = val[0][1][0][1]
            const newurl = customMapImageUrl(url, Block)
            properties[outKey] = newurl
          } catch (error) {
            properties[outKey] = undefined
          }
          break
        }
        case "date": {
          const dateProperty: any = getDateValue(val)
          delete dateProperty.type
          properties[outKey] = dateProperty
          break
        }
        case "select": {
          const selects = getTextContent(val)
          if (selects[0]?.length) {
            properties[outKey] = selects.split(",")
          }
          break
        }
        case "multi_select": {
          const selects = getTextContent(val)
          if (selects[0]?.length) {
            properties[outKey] = selects.split(",")
          }
          break
        }
        case "person": {
          const rawUsers = val.flat()

          const users = []
          for (let i = 0; i < rawUsers.length; i++) {
            if (rawUsers[i][0][1]) {
              const userId = rawUsers[i][0]
              const res: any = await api.getUsers(userId)
              const resValue =
                res?.recordMapWithRoles?.notion_user?.[userId[1]]?.value
              const user = {
                id: resValue?.id,
                name:
                  resValue?.name ||
                  `${resValue?.family_name}${resValue?.given_name}` ||
                  undefined,
                profile_photo: resValue?.profile_photo || null,
              }
              users.push(user)
            }
          }
          properties[outKey] = users
          break
        }
        default:
          break
      }
    }
  }
  return properties
}

export { getPageProperties as default }
