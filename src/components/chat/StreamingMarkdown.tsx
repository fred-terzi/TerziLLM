// ============================================================
// StreamingMarkdown — renders markdown with syntax highlighting
// ============================================================

import ReactMarkdown from 'react-markdown'

interface StreamingMarkdownProps {
  content: string
}

export function StreamingMarkdown({ content }: StreamingMarkdownProps) {
  return (
    <div className="prose prose-invert prose-sm max-w-none break-words">
      <ReactMarkdown
        components={{
          // Style code blocks
          code({ className, children, ...props }) {
            const isInline = !className
            if (isInline) {
              return (
                <code
                  className="bg-slate-700/50 px-1.5 py-0.5 rounded text-sm font-mono text-emerald-300"
                  {...props}
                >
                  {children}
                </code>
              )
            }
            return (
              <div className="relative group">
                <pre className="bg-slate-800/80 rounded-lg p-4 overflow-x-auto border border-slate-700/50">
                  <code className={`${className} text-sm font-mono`} {...props}>
                    {children}
                  </code>
                </pre>
              </div>
            )
          },
          // Style links
          a({ children, ...props }) {
            return (
              <a
                className="text-blue-400 hover:text-blue-300 underline"
                target="_blank"
                rel="noopener noreferrer"
                {...props}
              >
                {children}
              </a>
            )
          },
          // Style lists
          ul({ children }) {
            return <ul className="list-disc list-inside space-y-1">{children}</ul>
          },
          ol({ children }) {
            return <ol className="list-decimal list-inside space-y-1">{children}</ol>
          },
          // Paragraphs
          p({ children }) {
            return <p className="mb-2 last:mb-0 leading-relaxed">{children}</p>
          },
          // Blockquotes
          blockquote({ children }) {
            return (
              <blockquote className="border-l-4 border-slate-500 pl-4 italic text-slate-300">
                {children}
              </blockquote>
            )
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  )
}
