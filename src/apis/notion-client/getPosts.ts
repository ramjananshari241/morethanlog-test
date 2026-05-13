import { CONFIG } from "site.config"
import { NotionAPI } from "notion-client"
import { idToUuid } from "notion-utils"

import getAllPageIds from "src/libs/utils/notion/getAllPageIds"
import getPageProperties from "src/libs/utils/notion/getPageProperties"
import { TPosts } from "src/types"

const sanitizeForNextProps = (input: any): any => {
  if (input === undefined) return null
  if (input === null) return null
  if (Array.isArray(input)) return input.map((v) => sanitizeForNextProps(v))
  if (typeof input === "object") {
    const out: any = {}
    for (const [k, v] of Object.entries(input)) {
      if (v === undefined) continue
      out[k] = sanitizeForNextProps(v)
    }
    return out
  }
  return input
}

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
  const collectionId = Object.keys((response as any).collection || {})[0]
  const collectionViewId = Object.keys((response as any).collection_view || {})[0]

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
    let pageIds = getAllPageIds(response)

    // If `collection_query` isn't present, `getPage` may not include row blocks.
    // In that case, explicitly query the collection to retrieve row page ids.
    if ((!pageIds || pageIds.length === 0) && collectionId && collectionViewId) {
      try {
        const collectionView =
          (response as any)?.collection_view?.[collectionViewId]?.value ??
          (response as any)?.collection_view?.[collectionViewId]

        const collectionData: any = await api.getCollectionData(
          collectionId,
          collectionViewId,
          collectionView,
          { limit: 9999 }
        )

        const result = collectionData?.result ?? collectionData
        pageIds =
          result?.blockIds ??
          result?.collection_group_results?.blockIds ??
          result?.reducerResults?.collection_group_results?.blockIds ??
          []
      } catch (e) {
        console.log("[getPosts] getCollectionData failed", {
          collectionId,
          collectionViewId,
        })
      }
    }

    console.log("[getPosts] pageIds", {
      count: pageIds?.length || 0,
      viaCollectionData: !Object.keys((response as any).collection_query || {}).length,
    })

    // If we got ids via collection query, the row blocks may not be present in `response.block`.
    // Prefetch missing blocks so `getPageProperties` can parse title/slug/etc.
    if (pageIds?.length) {
      const missing = pageIds.filter((pid: string) => !getBlockValue(block, pid))
      if (missing.length) {
        try {
          const chunk: any = await api.getBlocks(missing)
          const newBlocks =
            chunk?.recordMap?.block ?? chunk?.block ?? chunk?.recordMapWithRoles?.block
          if (newBlocks) Object.assign(block as any, newBlocks)
          console.log("[getPosts] prefetched blocks", {
            requested: missing.length,
            added: newBlocks ? Object.keys(newBlocks).length : 0,
          })
        } catch (e) {
          console.log("[getPosts] getBlocks failed", { count: missing.length })
        }
      }
    }

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

    const postOrder = (CONFIG as any).blog?.postOrder ?? "date"
    if (postOrder === "date") {
      data.sort((a: any, b: any) => {
        const dateA: any = new Date(a?.date?.start_date || a.createdTime)
        const dateB: any = new Date(b?.date?.start_date || b.createdTime)
        return dateB - dateA
      })
    }

    const posts = data as TPosts
    const ok = posts.filter((p: any) => p?.title && p?.slug).length
    console.log("[getPosts] parsed posts", { total: posts.length, withTitleAndSlug: ok })
    return sanitizeForNextProps(posts)
  }
}
