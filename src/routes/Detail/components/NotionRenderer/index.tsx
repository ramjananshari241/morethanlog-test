import dynamic from "next/dynamic"
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
  if (!url || typeof url !== "string") return ""
  return url
}

const SafeImage = (props: any) => {
  const rawSrc: any = props?.src
  const src =
    typeof rawSrc === "string"
      ? rawSrc
      : typeof rawSrc?.src === "string"
        ? rawSrc.src
        : ""

  if (!src) return null

  const alt = typeof props?.alt === "string" ? props.alt : ""
  const style = props?.style || {}

  return (
    // Use native img to avoid Next/Image strict src parsing.
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

const SafeLink = (props: any) => {
  const rawHref: any = props?.href
  const href = typeof rawHref === "string" ? rawHref : ""
  if (!href) return <>{props.children}</>
  return (
    <a href={href} target={props?.target} rel={props?.rel}>
      {props.children}
    </a>
  )
}

type Props = {
  recordMap: ExtendedRecordMap
}

const NotionRenderer: FC<Props> = ({ recordMap }) => {
  const [scheme] = useScheme()
  return (
    <StyledWrapper>
      <ErrorBoundary name="NotionRenderer">
        <_NotionRenderer
          darkMode={scheme === "dark"}
          recordMap={recordMap}
          components={{
            Code,
            Collection,
            Equation,
            Modal,
            Pdf,
            nextImage: SafeImage,
            nextLink: SafeLink,
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
