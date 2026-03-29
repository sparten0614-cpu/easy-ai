import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism'

export default function MessageBubble({ role, content, createdAt }) {
  const isUser = role === 'user'
  const isSystem = role === 'system'

  const time = createdAt ? new Date(createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''

  if (isSystem) {
    return (
      <div className="mb-4 flex justify-center">
        <div className="px-4 py-2 rounded-xl text-xs"
          style={{ background: 'var(--bg-tertiary)', color: 'var(--warning)', border: '1px solid rgba(245, 158, 11, 0.2)' }}>
          {content}
        </div>
      </div>
    )
  }

  return (
    <div className={`mb-4 flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div className="max-w-[75%]">
        <div className="px-4 py-3 rounded-2xl text-sm leading-relaxed"
          style={{
            background: isUser ? 'var(--accent)' : 'var(--bg-glass)',
            color: isUser ? '#fff' : 'var(--text-primary)',
            border: isUser ? 'none' : '1px solid var(--border-subtle)',
          }}>
          {isUser ? (
            <span className="whitespace-pre-wrap">{content}</span>
          ) : (
            <div className="markdown-body">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  code({ inline, className, children, ...props }) {
                    const match = /language-(\w+)/.exec(className || '')
                    if (!inline && match) {
                      return (
                        <div className="relative group my-2">
                          <div className="flex items-center justify-between px-3 py-1.5 rounded-t-lg text-xs"
                            style={{ background: '#1e1e2e', color: 'var(--text-muted)' }}>
                            <span>{match[1]}</span>
                            <button
                              onClick={() => navigator.clipboard.writeText(String(children).replace(/\n$/, ''))}
                              className="opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer px-2 py-0.5 rounded text-xs"
                              style={{ background: 'var(--bg-glass-hover)', color: 'var(--text-secondary)' }}>
                              Copy
                            </button>
                          </div>
                          <SyntaxHighlighter
                            style={oneDark}
                            language={match[1]}
                            PreTag="div"
                            customStyle={{
                              margin: 0,
                              borderTopLeftRadius: 0,
                              borderTopRightRadius: 0,
                              borderBottomLeftRadius: '8px',
                              borderBottomRightRadius: '8px',
                              fontSize: '13px',
                              padding: '12px 16px',
                            }}
                            {...props}>
                            {String(children).replace(/\n$/, '')}
                          </SyntaxHighlighter>
                        </div>
                      )
                    }
                    return (
                      <code className="px-1.5 py-0.5 rounded text-xs"
                        style={{ background: 'var(--bg-tertiary)', color: 'var(--accent-hover)' }}
                        {...props}>
                        {children}
                      </code>
                    )
                  },
                  p({ children }) {
                    return <p className="mb-2 last:mb-0">{children}</p>
                  },
                  ul({ children }) {
                    return <ul className="mb-2 ml-4 list-disc">{children}</ul>
                  },
                  ol({ children }) {
                    return <ol className="mb-2 ml-4 list-decimal">{children}</ol>
                  },
                  li({ children }) {
                    return <li className="mb-1">{children}</li>
                  },
                  a({ href, children }) {
                    return (
                      <a href={href} target="_blank" rel="noopener noreferrer"
                        className="underline" style={{ color: 'var(--accent-hover)' }}>
                        {children}
                      </a>
                    )
                  },
                  blockquote({ children }) {
                    return (
                      <blockquote className="my-2 pl-3 border-l-2"
                        style={{ borderColor: 'var(--border-accent)', color: 'var(--text-secondary)' }}>
                        {children}
                      </blockquote>
                    )
                  },
                  table({ children }) {
                    return (
                      <div className="overflow-x-auto my-2">
                        <table className="w-full text-xs" style={{ borderCollapse: 'collapse' }}>
                          {children}
                        </table>
                      </div>
                    )
                  },
                  th({ children }) {
                    return (
                      <th className="px-3 py-1.5 text-left font-medium"
                        style={{ borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-secondary)' }}>
                        {children}
                      </th>
                    )
                  },
                  td({ children }) {
                    return (
                      <td className="px-3 py-1.5"
                        style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                        {children}
                      </td>
                    )
                  },
                }}
              />
            </div>
          )}
        </div>
        {time && (
          <div className={`mt-1 text-[10px] px-2 ${isUser ? 'text-right' : 'text-left'}`}
            style={{ color: 'var(--text-muted)' }}>
            {time}
          </div>
        )}
      </div>
    </div>
  )
}
