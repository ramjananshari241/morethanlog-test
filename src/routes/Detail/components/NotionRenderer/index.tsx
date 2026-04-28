import dynamic from "next/dynamic"
import Link from "next/link"
import { ExtendedRecordMap } from "notion-types"
import useScheme from "src/hooks/useScheme"
import { customMapImageUrl } from "src/libs/utils/notion/customMapImageUrl"

// core styles shared by all of react-notion-x (required)
import "react-notion-x/src/styles.css"

// used for code syntax highlighting (optional)
import "prismjs/themes/prism-tomorrow.css"

// used for rendering equations (optional)

import "katex/dist/katex.min.css"
import { FC, useLayoutEffect, useRef } from "react"
import styled from "@emotion/styled"
import ErrorBoundary from "src/components/ErrorBoundary"

const _NotionRenderer = dynamic(
  () => import("react-notion-x").then((m) => m.NotionRenderer),
  { ssr: false }
)

const Code = dynamic(() =>
  import("react-notion-x/build/third-party/code").then(async (m) => m.Code)
)

const Collection = dynamic(() =>
  import("react-notion-x/build/third-party/collection").then(
    (m) => m.Collection
  )
)
const Equation = dynamic(() =>
  import("react-notion-x/build/third-party/equation").then((m) => m.Equation)
)
const Pdf = dynamic(
  () => import("react-notion-x/build/third-party/pdf").then((m) => m.Pdf),
  {
    ssr: false,
  }
)
const Modal = dynamic(
  () => import("react-notion-x/build/third-party/modal").then((m) => m.Modal),
  {
    ssr: false,
  }
)

const mapPageUrl = (id?: string) => {
  const safe = typeof id === "string" ? id : ""
  const cleaned = safe.split("-").join("")
  return cleaned ? `https://www.notion.so/${cleaned}` : ""
}

const mapImageUrl = (url?: string, block?: any) => {
  if (typeof url !== "string" || !url) return ""
  try {
    if (block) return customMapImageUrl(url, block)
  } catch {
    // ignore and fall back
  }
  return url
}

const SafeImage = (props: any) => {
  const src = typeof props?.src === "string" ? props.src : props?.src?.src
  if (!src || typeof src !== "string") return null
  const alt = typeof props?.alt === "string" ? props.alt : ""
  const style = props?.style || {}
  return (
    <img
      src={src}
      alt={alt}
      loading={props?.loading}
      decoding={props?.decoding}
      referrerPolicy={props?.referrerPolicy}
      style={style}
    />
  )
}

type Props = {
  recordMap: ExtendedRecordMap
  rootPageId?: string
}

const resolveRootPageId = (recordMap: any, preferred?: string) => {
  const block = recordMap?.block
  if (!block || typeof block !== "object") return preferred

  const candidates: string[] = []
  if (typeof preferred === "string" && preferred.length) {
    candidates.push(preferred)
    candidates.push(preferred.split("-").join(""))
  }

  for (const id of candidates) {
    if ((block as any)[id]) return id
  }

  // Fallback: pick first page block key
  for (const [id, entry] of Object.entries(block)) {
    const v: any = (entry as any)?.value ?? entry
    if (v?.type === "page") return id
  }

  return preferred
}

const normalizeNotionMedia = (root: HTMLElement) => {
  const candidates = root.querySelectorAll(
    ".notion-asset-wrapper iframe, .notion-embed iframe, .notion-video iframe, .notion-asset-wrapper video"
  )

  candidates.forEach((node) => {
    const el = node as HTMLElement

    const rect = el.getBoundingClientRect()
    if (el.tagName === "IFRAME" && rect.width && rect.width < 120) return

    const innerHost =
      (el.closest(".notion-embed, .notion-video") as HTMLElement | null) ??
      (el.closest(".notion-asset-wrapper") as HTMLElement | null)
    const host = (innerHost ?? el.parentElement) as HTMLElement | null
    if (!host) return

    host.style.position = "relative"
    host.style.display = "block"
    host.style.width = "100%"
    host.style.maxWidth = "100%"
    host.style.overflow = "hidden"
    host.style.borderRadius = "0.75rem"

    const asset = host.closest(".notion-asset-wrapper") as HTMLElement | null
    if (asset) {
      asset.style.width = "100%"
      asset.style.maxWidth = "100%"
    }

    el.style.width = "100%"
    el.style.maxWidth = "100%"

    if (el.tagName === "IFRAME") {
      const iframe = el as HTMLIFrameElement
      iframe.setAttribute("width", "100%")
      iframe.style.border = "0"
      iframe.style.display = "block"
    }

    // Treat embeds as responsive media by default (avoid "flat" players)
    host.style.height = "0"
    host.style.paddingBottom = "56.25%"

    el.style.position = "absolute"
    el.style.inset = "0"
    el.style.height = "100%"

    el.dataset.mtMediaNormalized = "1"
    host.dataset.mtMediaNormalized = "1"
  })
}

const NotionRenderer: FC<Props> = ({ recordMap, rootPageId }) => {
  const [scheme] = useScheme()
  const resolvedRootPageId = resolveRootPageId(recordMap as any, rootPageId)
  const rootRef = useRef<HTMLDivElement | null>(null)

  useLayoutEffect(() => {
    const root = rootRef.current
    if (!root) return

    let raf = 0
    const schedule = () => {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => normalizeNotionMedia(root))
    }

    schedule()

    const mo = new MutationObserver(schedule)
    mo.observe(root, { subtree: true, childList: true })

    const ro =
      typeof ResizeObserver !== "undefined"
        ? new ResizeObserver(schedule)
        : null
    ro?.observe(root)

    return () => {
      mo.disconnect()
      ro?.disconnect()
      cancelAnimationFrame(raf)
    }
  }, [recordMap, resolvedRootPageId, scheme])

  return (
    <StyledWrapper ref={rootRef}>
      <ErrorBoundary name="NotionRenderer">
        <_NotionRenderer
          darkMode={scheme === "dark"}
          recordMap={recordMap}
          rootPageId={resolvedRootPageId}
          fullPage={false}
          components={{
            Code,
            Collection,
            Equation,
            Modal,
            Pdf,
            nextImage: SafeImage,
            nextLink: Link,
          }}
          mapImageUrl={mapImageUrl as any}
          mapPageUrl={mapPageUrl}
        />
      </ErrorBoundary>
    </StyledWrapper>
  )
}

export default NotionRenderer

const StyledWrapper = styled.div`
  /* // TODO: why render? */
  .notion-collection-page-properties {
    display: none !important;
  }
  /* minor change to force rebuild (noop) */
  .notion-page {
    padding: 0;
  }
  .notion-list {
    width: 100%;
  }
  .notion-asset-wrapper {
    margin: 1.25rem 0;
    width: 100%;
    display: flex;
    justify-content: center;
  }
  /* Unify media sizing/alignment inside posts */
  .notion-asset-wrapper > * {
    width: 100%;
    max-width: 100%;
  }
  /* Some notion blocks set inline max-width; override to align */
  .notion-asset-wrapper,
  .notion-asset-wrapper > *,
  .notion-asset-wrapper > * > * {
    max-width: 100% !important;
  }
  /* Force any nested wrapper to full width */
  .notion-asset-wrapper > div,
  .notion-asset-wrapper > div > div,
  .notion-asset-wrapper > div > div > div {
    width: 100% !important;
    max-width: 100% !important;
  }
  .notion-asset-wrapper img,
  .notion-asset-wrapper video,
  .notion-asset-wrapper iframe {
    display: block;
    width: 100%;
    max-width: 100%;
    height: auto;
    border-radius: 0.75rem;
    overflow: hidden;
    background: ${({ theme }) => theme.colors.gray2};
  }
  .notion-asset-wrapper iframe {
    width: 100%;
    border: 0;
    border-radius: 0.75rem;
    height: auto;
  }

  /* Video / embed blocks sometimes have their own fixed sizing */
  .notion-video,
  .notion-video iframe,
  .notion-video video {
    width: 100% !important;
    max-width: 100% !important;
  }
  .notion-video {
    display: block !important;
    position: relative;
    /* force responsive 16:9 container even if Notion sets fixed size */
    padding-bottom: 56.25%;
    height: 0 !important;
    overflow: hidden;
    border-radius: 0.75rem;
  }
  .notion-video iframe,
  .notion-video video {
    position: absolute !important;
    inset: 0 !important;
    width: 100% !important;
    height: 100% !important;
  }

  /* Embeds: keep same shape as video to avoid "flat" players */
  .notion-embed {
    width: 100% !important;
    max-width: 100% !important;
    display: block !important;
    position: relative;
    padding-bottom: 56.25%;
    height: 0 !important;
    overflow: hidden;
    border-radius: 0.75rem;
  }
  .notion-embed iframe {
    position: absolute !important;
    inset: 0 !important;
    width: 100% !important;
    max-width: 100% !important;
    height: 100% !important;
  }
  /* last-resort: any notion iframe should be responsive */
  .notion-page iframe {
    max-width: 100% !important;
  }
  .notion-image {
    align-items: center;
  }
  .notion-image,
  .notion-image > picture,
  .notion-image > img {
    width: 100% !important;
    max-width: 100% !important;
  }
  .notion-quote {
    border-left-color: rgba(255, 255, 255, 0.25);
  }
`
