import { useEffect, useRef, useState } from 'react'
import { useTodo } from '../contexts/TodoContext';
import { CheckIcon, PencilIcon, TrashIcon, XIcon } from './Icons';

const iconBtn =
  "inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 disabled:pointer-events-none disabled:opacity-30"

function TodoItem({ todo }) {
  const [isTodoEditable, setIsTodoEditable] = useState(false)
  const [todoMsg, setTodoMsg] = useState(todo.todo)
  const {updateTodo, deleteTodo, toggleComplete} = useTodo()
  const inputRef = useRef(null)

  useEffect(() => {
    if (!isTodoEditable) setTodoMsg(todo.todo)
  }, [todo.todo, isTodoEditable])

  useEffect(() => {
    if (isTodoEditable) {
      inputRef.current?.focus()
      inputRef.current?.select()
    }
  }, [isTodoEditable])

  const editTodo = () => {
    const text = todoMsg.trim()
    if (!text) {
      cancelEdit()
      return
    }
    updateTodo(todo.id, {...todo, todo: text})
    setIsTodoEditable(false)
  }

  const cancelEdit = () => {
    setTodoMsg(todo.todo)
    setIsTodoEditable(false)
  }

  const onKeyDown = (e) => {
    if (e.key === "Enter") editTodo()
    if (e.key === "Escape") cancelEdit()
  }

  return (
      <div
          className={`group flex items-center gap-3 rounded-xl border px-3 py-2.5 transition ${
              isTodoEditable
                ? "border-brand-500 bg-white ring-4 ring-brand-100"
                : "border-slate-200 bg-white hover:border-slate-300"
          }`}
      >
          <button
              type="button"
              role="checkbox"
              aria-checked={todo.completed}
              aria-label={todo.completed ? `Mark "${todo.todo}" as not done` : `Mark "${todo.todo}" as done`}
              onClick={() => toggleComplete(todo.id)}
              disabled={isTodoEditable}
              className={`inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-100 disabled:opacity-40 ${
                  todo.completed
                    ? "border-emerald-500 bg-emerald-500 text-white"
                    : "border-slate-300 text-transparent hover:border-brand-500"
              }`}
          >
              <CheckIcon width={14} height={14} strokeWidth={3} />
          </button>

          {isTodoEditable ? (
              <input
                  ref={inputRef}
                  type="text"
                  aria-label="Edit todo"
                  maxLength={200}
                  className="min-w-0 flex-1 bg-transparent py-1 text-[15px] text-slate-900 outline-none"
                  value={todoMsg}
                  onChange={(e) => setTodoMsg(e.target.value)}
                  onKeyDown={onKeyDown}
              />
          ) : (
              <p
                  className={`min-w-0 flex-1 break-words py-1 text-[15px] transition ${
                      todo.completed ? "text-slate-400 line-through" : "text-slate-800"
                  }`}
                  onDoubleClick={() => !todo.completed && setIsTodoEditable(true)}
              >
                  {todo.todo}
              </p>
          )}

          <div className="flex shrink-0 items-center gap-0.5">
              {isTodoEditable ? (
                  <>
                      <button type="button" className={`${iconBtn} text-brand-600 hover:bg-brand-50 hover:text-brand-700`} onClick={editTodo} aria-label="Save">
                          <CheckIcon />
                      </button>
                      <button type="button" className={iconBtn} onClick={cancelEdit} aria-label="Cancel editing">
                          <XIcon />
                      </button>
                  </>
              ) : (
                  <>
                      <button
                          type="button"
                          className={iconBtn}
                          onClick={() => setIsTodoEditable(true)}
                          disabled={todo.completed}
                          aria-label="Edit"
                          title={todo.completed ? "Completed todos can't be edited" : "Edit"}
                      >
                          <PencilIcon />
                      </button>
                      <button
                          type="button"
                          className={`${iconBtn} hover:bg-rose-50 hover:text-rose-600`}
                          onClick={() => deleteTodo(todo.id)}
                          aria-label="Delete"
                          title="Delete"
                      >
                          <TrashIcon />
                      </button>
                  </>
              )}
          </div>
      </div>
  );
}

export default TodoItem;
