import React from "react"

type Props = {
  name?: string
  children: React.ReactNode
}

type State = {
  error: Error | null
  info: React.ErrorInfo | null
}

export default class ErrorBoundary extends React.Component<Props, State> {
  state: State = { error: null, info: null }

  static getDerivedStateFromError(error: Error) {
    return { error, info: null }
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    // Surface the real client-side exception in logs.
    console.error(`[ErrorBoundary${this.props.name ? `:${this.props.name}` : ""}]`, error, info)
    this.setState({ error, info })
  }

  render() {
    const { error, info } = this.state
    if (!error) return this.props.children

    return (
      <div
        style={{
          maxWidth: 900,
          margin: "0 auto",
          padding: "2rem 1.5rem",
          fontFamily:
            'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
          whiteSpace: "pre-wrap",
          wordBreak: "break-word",
        }}
      >
        <div style={{ fontSize: 18, marginBottom: 12 }}>
          {this.props.name ? `Client error in ${this.props.name}` : "Client error"}
        </div>
        <div style={{ color: "#ef4444", marginBottom: 12 }}>{String(error.message || error)}</div>
        {error.stack && (
          <details open>
            <summary style={{ cursor: "pointer" }}>Stack</summary>
            <div style={{ marginTop: 8, opacity: 0.9 }}>{error.stack}</div>
          </details>
        )}
        {info?.componentStack && (
          <details>
            <summary style={{ cursor: "pointer" }}>Component stack</summary>
            <div style={{ marginTop: 8, opacity: 0.9 }}>{info.componentStack}</div>
          </details>
        )}
      </div>
    )
  }
}

