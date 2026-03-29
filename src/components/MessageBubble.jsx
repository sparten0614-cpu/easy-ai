import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism'
import { useState } from 'react'

export default function MessageBubble({ role, content, createdAt }) {
  const isUser = role === 'user'
  const isSystem = role === 'system'

  const time = createdAt ? new Date(createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''

  if (isSystem) {
    return (
      <div className="my-3 flex justify-center">
        <div className="px-4 py-2 rounded-full text-xs font-medium"
          style={{ background: 'var(--warning-bg)', color: 'var(--warning)', border: '1px solid rgba(245, 158, 11, 0.15)' }}>
          {content}
        </div>
      </div>
    )
  }

  return (
    <div className={`mb-5 flex gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
      {/* Avatar */}
      <div className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold mt-0.5"
        style={{
          background: isUser ? 'var(--avatar-user)' : 'var(--avatar-ai)',
          color: '#fff',
          boxShadow: 'var(--shadow-sm)',
        }}>
        {isUser ? 'U' : 'Ea'}
      </div>

      {/* Content */}
      <div className={`max-w-[78%] min-w-0 ${isUser ? 'items-end' : 'items-start'} flex flex-col`}>
        {/* Role label */}
        <div className={`text-[11px] font-medium mb-1 px-1 ${isUser ? 'text-right' : 'text-left'}`}
          style={{ color: 'var(--text-muted)' }}>
          {isUser ? 'You' : 'Easy AI'} {time && <span className="font-normal ml-1">{time}</span>}
        </div>

        <div className="px-4 py-3 rounded-2xl text-sm leading-relaxed"
          style={{
            background: isUser ? 'var(--accent)' : 'var(--bg-tertiary)',
            color: isUser ? '#fff' : 'var(--text-primary)',
            border: isUser ? 'none' : '1px solid var(--border-subtle)',
            borderTopRightRadius: isUser ? '6px' : undefined,
            borderTopLeftRadius: isUser ? undefined : '6px',
            boxShadow: 'var(--shadow-sm)',
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
                      return <CodeBlock language={match[1]}>{children}</CodeBlock>
                    }
                    return (
                      <code className="px-1.5 py-0.5 rounded text-xs"
                        style={{ background: 'var(--bg-glass-hover)', color: 'var(--accent-hover)' }}
                        {...props}>
                        {children}
                      </code>
                    )
                  },
                  p({ children }) {
                    return <p className="mb-2.5 last:mb-0 leading-relaxed">{children}</p>
                  },
                  ul({ children }) {
                    return <ul className="mb-2.5 ml-4 list-disc space-y-1">{children}</ul>
                  },
                  ol({ children }) {
                    return <ol className="mb-2.5 ml-4 list-decimal space-y-1">{children}</ol>
                  },
                  li({ children }) {
                    return <li className="leading-relaxed">{children}</li>
                  },
                  a({ href, children }) {
                    return (
                      <a href={href} target="_blank" rel="noopener noreferrer"
                        className="underline underline-offset-2 decoration-1" style={{ color: 'var(--accent-hover)' }}>
                        {children}
                      </a>
                    )
                  },
                  blockquote({ children }) {
                    return (
                      <blockquote className="my-2.5 pl-3 border-l-2 italic"
                        style={{ borderColor: 'var(--border-accent)', color: 'var(--text-secondary)' }}>
                        {children}
                      </blockquote>
                    )
                  },
                  h1({ children }) {
                    return <h1 className="text-lg font-semibold mb-2 mt-3 first:mt-0">{children}</h1>
                  },
                  h2({ children }) {
                    return <h2 className="text-base font-semibold mb-2 mt-3 first:mt-0">{children}</h2>
                  },
                  h3({ children }) {
                    return <h3 className="text-sm font-semibold mb-1.5 mt-2.5 first:mt-0">{children}</h3>
                  },
                  hr() {
                    return <hr className="my-3" style={{ borderColor: 'var(--border-subtle)' }} />
                  },
                  table({ children }) {
                    return (
                      <div className="overflow-x-auto my-2.5 rounded-lg" style={{ border: '1px solid var(--border-subtle)' }}>
                        <table className="w-full text-xs" style={{ borderCollapse: 'collapse' }}>
                          {children}
                        </table>
                      </div>
                    )
                  },
                  th({ children }) {
                    return (
                      <th className="px-3 py-2 text-left font-semibold text-xs"
                        style={{ borderBottom: '1px solid var(--border-default)', background: 'var(--bg-glass)', color: 'var(--text-secondary)' }}>
                        {children}
                      </th>
                    )
                  },
                  td({ children }) {
                    return (
                      <td className="px-3 py-2 text-xs"
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
      </div>
    </div>
  )
}

function CodeBlock({ language, children }) {
  const [copied, setCopied] = useState(false)
  const code = String(children).replace(/\n$/, '')

  function handleCopy() {
    navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="relative group my-3 rounded-xl overflow-hidden" style={{ border: '1px solid var(--border-subtle)' }}>
      <div className="flex items-center justify-between px-4 py-2 text-xs"
        style={{ background: 'var(--bg-secondary)', color: 'var(--text-muted)' }}>
        <span className="font-medium">{language}</span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1 px-2 py-0.5 rounded-md text-xs cursor-pointer transition-colors"
          style={{ background: copied ? 'var(--success-bg)' : 'transparent', color: copied ? 'var(--success)' : 'var(--text-muted)' }}>
          {copied ? 'Copied!' : 'Copy'}
        </button>
      </div>
      <SyntaxHighlighter
        style={oneDark}
        language={language}
        PreTag="div"
        customStyle={{
          margin: 0,
          borderRadius: 0,
          fontSize: '13px',
          lineHeight: '1.6',
          padding: '16px',
          background: '#1a1b26',
        }}>
        {code}
      </SyntaxHighlighter>
    </div>
  )
}
