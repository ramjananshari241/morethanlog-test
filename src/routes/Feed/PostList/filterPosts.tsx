import { DEFAULT_CATEGORY } from "src/constants"
import { TPost } from "src/types"
import { CONFIG } from "site.config"

interface FilterPostsParams {
  posts: TPost[]
  q: string
  tag?: string
  category?: string
  order?: string
}

export function filterPosts({
  posts,
  q,
  tag = undefined,
  category = DEFAULT_CATEGORY,
  order = "desc",
}: FilterPostsParams): TPost[] {
  const filtered = posts.filter((post) => {
    const tagContent = post.tags ? post.tags.join(" ") : ""
    const searchContent = post.title + post.summary + tagContent
    return (
      searchContent.toLowerCase().includes(q.toLowerCase()) &&
      (!tag || (post.tags && post.tags.includes(tag))) &&
      (category === DEFAULT_CATEGORY ||
        (post.category && post.category.includes(category)))
    )
  })

  const postOrder = (CONFIG as any).blog?.postOrder ?? "date"
  if (postOrder === "notion") {
    return order === "asc" ? [...filtered].reverse() : filtered
  }

  return filtered.sort((a, b) => {
    const dateA = new Date(a.date?.start_date || (a as any).createdTime).getTime()
    const dateB = new Date(b.date?.start_date || (b as any).createdTime).getTime()
    return order === "desc" ? dateB - dateA : dateA - dateB
  })
}
