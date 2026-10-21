import { useEffect, useRef, useState } from 'react'
import { useTodo } from '../contexts/TodoContext';
import { CheckIcon, PencilIcon, RepeatIcon, TrashIcon, XIcon } from './Icons';
import RepeatPicker from './RepeatPicker';
import { repeatLabel } from '../recurrence';
import { MAX_TEXT, PRIORITIES, PRIORITY_STYLE, capitalize, dueGroup, dueLabel, fieldClass, toISODate } from '../todoUtils';

const DUE_STYLE = {
  overdue: "text-rose-700",
  today: "text-brand-700",
  upcoming: "text-slate-600",
}

const iconBtn =
  "inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 disabled:pointer-events-none disabled:opacity-30"

function TodoItem({ todo }) {
  const [isTodoEditable, setIsTodoEditable] = useState(false)
  const [todoMsg, setTodoMsg] = useState(todo.todo)
  const [due, setDue] = useState(todo.due || "")
  const [priority, setPriority] = useState(todo.priority || "medium")
  const [repeat, setRepeat] = useState(todo.repeat || null)
  const {updateTodo, deleteTodo, toggleComplete} = useTodo()
  const inputRef = useRef(null)

  useEffect(() => {
    if (!isTodoEditable) {
      setTodoMsg(todo.todo)
      setDue(todo.due || "")
      setPriority(todo.priority || "medium")
      setRepeat(todo.repeat || null)
    }
  }, [todo.todo, todo.due, todo.priority, todo.repeat, isTodoEditable])

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
    updateTodo(todo.id, {...todo, todo: text, due, priority, repeat})
    setIsTodoEditable(false)
  }

  const cancelEdit = () => {
    setIsTodoEditable(false)
  }

  const onKeyDown = (e) => {
    if (e.key === "Enter") editTodo()
    if (e.key === "Escape") cancelEdit()
  }

  const group = todo.completed ? "done" : dueGroup(todo, toISODate())
  const overdue = group === "overdue"

  return (
      <div
          className={`group flex items-start gap-3 rounded-xl border px-3 py-2.5 transition ${
              isTodoEditable
                ? "border-brand-500 bg-white ring-4 ring-brand-100"
                : overdue
                  ? "border-rose-100 bg-rose-50 hover:border-rose-300"
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
              className={`mt-1.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-100 disabled:opacity-40 ${
                  todo.completed
                    ? "border-emerald-500 bg-emerald-500 text-white"
                    : "border-slate-300 text-transparent hover:border-brand-500"
              }`}
          >
              <CheckIcon width={14} height={14} strokeWidth={3} />
          </button>

          <div className="min-w-0 flex-1">
              {isTodoEditable ? (
                  <>
                      <input
                          ref={inputRef}
                          type="text"
                          aria-label="Edit task"
                          maxLength={MAX_TEXT}
                          className="w-full bg-transparent py-1.5 text-[15px] text-slate-900 outline-none"
                          value={todoMsg}
                          onChange={(e) => setTodoMsg(e.target.value)}
                          onKeyDown={onKeyDown}
                      />
                      <div className="mt-1 flex flex-wrap gap-2 pb-1">
                          <input type="date" aria-label="Due date" className={fieldClass} value={due} onChange={(e) => setDue(e.target.value)} onKeyDown={onKeyDown} />
                          <select aria-label="Priority" className={fieldClass} value={priority} onChange={(e) => setPriority(e.target.value)}>
                              {PRIORITIES.map((p) => <option key={p} value={p}>{capitalize(p)}</option>)}
                          </select>
                          <RepeatPicker value={repeat} onChange={setRepeat} due={due} label={false} />
                      </div>
                  </>
              ) : (
                  <>
                      <p
                          className={`break-words pt-1.5 text-[15px] transition ${
                              todo.completed ? "text-slate-400 line-through" : "text-slate-800"
                          }`}
                          onDoubleClick={() => !todo.completed && setIsTodoEditable(true)}
                      >
                          {todo.todo}
                      </p>
                      <div className="mt-1 flex flex-wrap items-center gap-2 pb-1 text-xs">
                          <span className={`rounded-full px-2 py-0.5 font-medium ring-1 ring-inset ${PRIORITY_STYLE[todo.priority] || PRIORITY_STYLE.medium}`}>
                              {capitalize(todo.priority || "medium")}<span className="sr-only"> priority</span>
                          </span>
                          {todo.due && (
                              <time dateTime={todo.due} className={`font-medium ${todo.completed ? "text-slate-400" : DUE_STYLE[group]}`}>
                                  <span className="sr-only">Due </span>{dueLabel(todo.due, toISODate())}
                              </time>
                          )}
                          {todo.repeat && (
                              <span className="inline-flex items-center gap-1 font-medium text-slate-500" title="Completing it schedules the next one">
                                  <RepeatIcon width={13} height={13} />
                                  <span className="sr-only">Repeats </span>{repeatLabel(todo.repeat)}
                              </span>
                          )}
                      </div>
                  </>
              )}
          </div>

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
