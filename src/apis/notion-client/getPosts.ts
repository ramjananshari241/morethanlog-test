import { CONFIG } from "site.config"
import { NotionAPI } from "notion-client"
import { idToUuid } from "notion-utils"

import getAllPageIds from "src/libs/utils/notion/getAllPageIds"
import getPageProperties from "src/libs/utils/notion/getPageProperties"
import { TPosts } from "src/types"

/**
 * @param {{ includePages: boolean }} - false: posts only / true: include pages
 */

// TODO: react query를 사용해서 처음 불러온 뒤로는 해당데이터만 사용하도록 수정
export const getPosts = async () => {
  let id = CONFIG.notionConfig.pageId as string
  const api = new NotionAPI()

  const response = await api.getPage(id)
  id = idToUuid(id)
  const collectionValue = Object.values(response.collection)[0]?.value as any
  const collection = collectionValue?.value ?? collectionValue
  const block = response.block
  const schema = collection?.schema

  const getBlockValue = (blockMap: any, pageId: string) => {
    const dashed = idToUuid(pageId)
    const raw = dashed.replace(/-/g, "")
    const entry =
      blockMap?.[pageId]?.value ?? blockMap?.[dashed]?.value ?? blockMap?.[raw]?.value
    return entry?.value ?? entry
  }

  const blockValue = getBlockValue(block, id)
  const rawMetadata = blockValue

  // Check Type
  if (
    rawMetadata?.type !== "collection_view_page" &&
    rawMetadata?.type !== "collection_view"
  ) {
    // Build-time visibility (Vercel logs): helps diagnose wrong pageId or unexpected Notion response.
    console.log("[getPosts] root page type not collection view", {
      pageId: id,
      type: rawMetadata?.type,
      hasCollection: !!Object.keys(response.collection || {}).length,
      hasCollectionQuery: !!Object.keys((response as any).collection_query || {}).length,
      blockKeys: Object.keys(block || {}).length,
    })
    return []
  } else {
    // Construct Data
    const pageIds = getAllPageIds(response)
    console.log("[getPosts] pageIds", { count: pageIds.length })
    const data = []
    for (let i = 0; i < pageIds.length; i++) {
      const id = pageIds[i]
      const properties = (await getPageProperties(id, block, schema)) || null
      // Add fullwidth, createdtime to properties
      const pageBlockValue = getBlockValue(block, id)
      properties.createdTime = new Date(
        pageBlockValue?.created_time
      ).toString()
      properties.fullWidth =
        (pageBlockValue?.format as any)?.page_full_width ?? false

      data.push(properties)
    }

    // Sort by date
    data.sort((a: any, b: any) => {
      const dateA: any = new Date(a?.date?.start_date || a.createdTime)
      const dateB: any = new Date(b?.date?.start_date || b.createdTime)
      return dateB - dateA
    })

    const posts = data as TPosts
    const ok = posts.filter((p: any) => p?.title && p?.slug).length
    console.log("[getPosts] parsed posts", { total: posts.length, withTitleAndSlug: ok })
    return posts
  }
}
