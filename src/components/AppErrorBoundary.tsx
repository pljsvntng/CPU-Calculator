import { Component, type ReactNode } from 'react'
export class AppErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() { return { failed: true } }
  render() {
    if (!this.state.failed) return this.props.children
    return <main className="main-content"><section className="panel training-panel" role="alert"><p className="eyebrow">WORKSPACE RECOVERY</p><h1>The workspace could not be displayed.</h1><p>Reload to start a fresh session. Your current unsaved draft will reset; saved missions and learning progress remain in browser storage.</p><button className="button primary" onClick={()=>window.location.reload()}>Reload workspace</button></section></main>
  }
}
