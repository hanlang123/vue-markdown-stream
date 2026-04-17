/**
 * Type declarations for optional peer dependencies.
 *
 * These modules are dynamically imported at runtime and may not be installed.
 * This declaration file prevents TypeScript errors during type checking.
 */
declare module 'mermaid' {
  interface MermaidConfig {
    startOnLoad?: boolean
    theme?: string
    securityLevel?: string
    [key: string]: unknown
  }

  interface RenderResult {
    svg: string
  }

  interface MermaidAPI {
    initialize(config: MermaidConfig): void
    render(id: string, code: string): Promise<RenderResult>
  }

  const mermaid: MermaidAPI
  export default mermaid
}
