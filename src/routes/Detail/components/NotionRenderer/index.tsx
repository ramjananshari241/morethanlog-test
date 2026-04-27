import dynamic from "next/dynamic"
import Image from "next/image"
import Link from "next/link"
import { ExtendedRecordMap } from "notion-types"
import useScheme from "src/hooks/useScheme"

// core styles shared by all of react-notion-x (required)
import "react-notion-x/src/styles.css"

// used for code syntax highlighting (optional)
import "prismjs/themes/prism-tomorrow.css"

// used for rendering equations (optional)

import "katex/dist/katex.min.css"
import { FC } from "react"
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

const mapImageUrl = (url?: string) => {
  return typeof url === "string" ? url : ""
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

const NotionRenderer: FC<Props> = ({ recordMap, rootPageId }) => {
  const [scheme] = useScheme()
  const resolvedRootPageId = resolveRootPageId(recordMap as any, rootPageId)
  const blockMap: any = (recordMap as any)?.block
  const rootEntry: any = blockMap?.[resolvedRootPageId as any]
  const rootValue: any = rootEntry?.value ?? rootEntry
  const debug = {
    blockCount: blockMap ? Object.keys(blockMap).length : 0,
    rootPageId,
    resolvedRootPageId,
    hasResolvedRoot: !!rootEntry,
    rootType: rootValue?.type,
    rootContentCount: Array.isArray(rootValue?.content)
      ? rootValue.content.length
      : undefined,
  }
  // eslint-disable-next-line no-console
  console.log("[NotionRenderer debug]", debug)
  return (
    <StyledWrapper>
      <pre
        style={{
          marginBottom: "1rem",
          padding: "0.75rem 1rem",
          borderRadius: 12,
          background: "rgba(0,0,0,0.25)",
          whiteSpace: "pre-wrap",
          wordBreak: "break-word",
          fontSize: 12,
          lineHeight: 1.4,
          opacity: 0.9,
        }}
      >
        Notion debug:
        {"\n"}
        {JSON.stringify(debug, null, 2)}
      </pre>
      <ErrorBoundary name="NotionRenderer">
        <_NotionRenderer
          darkMode={scheme === "dark"}
          recordMap={recordMap}
          rootPageId={resolvedRootPageId}
          fullPage={true}
          components={{
            Code,
            Collection,
            Equation,
            Modal,
            Pdf,
            nextImage: Image,
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
  .notion-page {
    padding: 0;
  }
  .notion-list {
    width: 100%;
  }
`
