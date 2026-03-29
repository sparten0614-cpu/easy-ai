import { useState, useEffect } from 'react'
import { db } from '../stores/db.js'

export default function ManagePage() {
  const [tab, setTab] = useState('conversations')
  const [conversations, setConversations] = useState([])
  const [memories, setMemories] = useState([])
  const [tasks, setTasks] = useState([])
  const [newMemory, setNewMemory] = useState({ title: '', content: '' })
  const [newTask, setNewTask] = useState('')

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    const [convs, mems, tsks] = await Promise.all([
      db.conversations.orderBy('updatedAt').reverse().toArray(),
      db.memories.orderBy('createdAt').reverse().toArray(),
      db.tasks.orderBy('createdAt').reverse().toArray(),
    ])
    setConversations(convs)
    setMemories(mems)
    setTasks(tsks)
  }

  async function deleteConversation(id) {
    await db.messages.where('conversationId').equals(id).delete()
    await db.conversations.delete(id)
    loadData()
  }

  async function addMemory() {
    if (!newMemory.title.trim() || !newMemory.content.trim()) return
    await db.memories.add({ ...newMemory, createdAt: Date.now() })
    setNewMemory({ title: '', content: '' })
    loadData()
  }

  async function deleteMemory(id) {
    await db.memories.delete(id)
    loadData()
  }

  async function addTask() {
    if (!newTask.trim()) return
    await db.tasks.add({ title: newTask.trim(), status: 'pending', createdAt: Date.now(), updatedAt: Date.now() })
    setNewTask('')
    loadData()
  }

  async function toggleTask(id, currentStatus) {
    const newStatus = currentStatus === 'done' ? 'pending' : 'done'
    await db.tasks.update(id, { status: newStatus, updatedAt: Date.now() })
    loadData()
  }

  async function deleteTask(id) {
    await db.tasks.delete(id)
    loadData()
  }

  const tabs = [
    { id: 'conversations', label: 'Conversations', count: conversations.length },
    { id: 'memories', label: 'Memories', count: memories.length },
    { id: 'tasks', label: 'Tasks', count: tasks.length },
  ]

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-3xl mx-auto px-6 py-8">
        <h1 className="text-2xl font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>
          Manage
        </h1>
        <p className="text-sm mb-6" style={{ color: 'var(--text-muted)' }}>
          View and manage your conversations, memories, and tasks.
        </p>

        {/* Tabs */}
        <div className="flex gap-1 mb-6 p-1 rounded-xl" style={{ background: 'var(--bg-secondary)' }}>
          {tabs.map(t => (
            <button key={t.id}
              onClick={() => setTab(t.id)}
              className="flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all cursor-pointer"
              style={{
                background: tab === t.id ? 'var(--bg-glass-hover)' : 'transparent',
                color: tab === t.id ? 'var(--text-primary)' : 'var(--text-muted)',
                border: tab === t.id ? '1px solid var(--border-subtle)' : '1px solid transparent',
              }}>
              {t.label} <span className="ml-1 text-xs opacity-60">{t.count}</span>
            </button>
          ))}
        </div>

        {/* Conversations tab */}
        {tab === 'conversations' && (
          <div className="space-y-2">
            {conversations.length === 0 ? (
              <Empty text="No conversations yet." />
            ) : (
              conversations.map(conv => (
                <div key={conv.id} className="flex items-center justify-between p-3 rounded-xl"
                  style={{ background: 'var(--bg-glass)', border: '1px solid var(--border-subtle)' }}>
                  <div>
                    <div className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{conv.title}</div>
                    <div className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                      {conv.model} &middot; {new Date(conv.updatedAt).toLocaleDateString()}
                    </div>
                  </div>
                  <button onClick={() => deleteConversation(conv.id)}
                    className="text-xs px-2 py-1 rounded cursor-pointer"
                    style={{ color: 'var(--danger)' }}>
                    Delete
                  </button>
                </div>
              ))
            )}
          </div>
        )}

        {/* Memories tab */}
        {tab === 'memories' && (
          <div>
            <div className="flex gap-2 mb-4">
              <input value={newMemory.title}
                onChange={e => setNewMemory(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Title"
                className="flex-1 px-3 py-2 rounded-lg text-sm bg-transparent outline-none"
                style={{ border: '1px solid var(--border-subtle)', color: 'var(--text-primary)' }}
              />
              <input value={newMemory.content}
                onChange={e => setNewMemory(prev => ({ ...prev, content: e.target.value }))}
                placeholder="Content"
                className="flex-2 px-3 py-2 rounded-lg text-sm bg-transparent outline-none"
                style={{ border: '1px solid var(--border-subtle)', color: 'var(--text-primary)' }}
              />
              <button onClick={addMemory}
                className="px-4 py-2 rounded-lg text-sm font-medium cursor-pointer"
                style={{ background: 'var(--accent)', color: '#fff' }}>
                Add
              </button>
            </div>
            <div className="space-y-2">
              {memories.length === 0 ? (
                <Empty text="No memories stored yet." />
              ) : (
                memories.map(mem => (
                  <div key={mem.id} className="flex items-start justify-between p-3 rounded-xl"
                    style={{ background: 'var(--bg-glass)', border: '1px solid var(--border-subtle)' }}>
                    <div>
                      <div className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{mem.title}</div>
                      <div className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>{mem.content}</div>
                    </div>
                    <button onClick={() => deleteMemory(mem.id)}
                      className="text-xs px-2 py-1 rounded cursor-pointer flex-shrink-0"
                      style={{ color: 'var(--danger)' }}>
                      Delete
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Tasks tab */}
        {tab === 'tasks' && (
          <div>
            <div className="flex gap-2 mb-4">
              <input value={newTask}
                onChange={e => setNewTask(e.target.value)}
                placeholder="Add a task..."
                onKeyDown={e => e.key === 'Enter' && addTask()}
                className="flex-1 px-3 py-2 rounded-lg text-sm bg-transparent outline-none"
                style={{ border: '1px solid var(--border-subtle)', color: 'var(--text-primary)' }}
              />
              <button onClick={addTask}
                className="px-4 py-2 rounded-lg text-sm font-medium cursor-pointer"
                style={{ background: 'var(--accent)', color: '#fff' }}>
                Add
              </button>
            </div>
            <div className="space-y-2">
              {tasks.length === 0 ? (
                <Empty text="No tasks yet." />
              ) : (
                tasks.map(task => (
                  <div key={task.id} className="flex items-center justify-between p-3 rounded-xl"
                    style={{ background: 'var(--bg-glass)', border: '1px solid var(--border-subtle)' }}>
                    <div className="flex items-center gap-3">
                      <button onClick={() => toggleTask(task.id, task.status)}
                        className="w-5 h-5 rounded-md flex items-center justify-center cursor-pointer flex-shrink-0"
                        style={{
                          border: task.status === 'done' ? 'none' : '2px solid var(--border-subtle)',
                          background: task.status === 'done' ? 'var(--success)' : 'transparent',
                          color: '#fff',
                        }}>
                        {task.status === 'done' && '✓'}
                      </button>
                      <span className="text-sm"
                        style={{
                          color: task.status === 'done' ? 'var(--text-muted)' : 'var(--text-primary)',
                          textDecoration: task.status === 'done' ? 'line-through' : 'none',
                        }}>
                        {task.title}
                      </span>
                    </div>
                    <button onClick={() => deleteTask(task.id)}
                      className="text-xs px-2 py-1 rounded cursor-pointer"
                      style={{ color: 'var(--danger)' }}>
                      Delete
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function Empty({ text }) {
  return (
    <div className="p-8 rounded-xl text-center"
      style={{ background: 'var(--bg-glass)', border: '1px solid var(--border-subtle)' }}>
      <p className="text-sm" style={{ color: 'var(--text-muted)' }}>{text}</p>
    </div>
  )
}
