import { useState } from 'react'
import { useTodo } from '../contexts/TodoContext';
import { PlusIcon } from './Icons';
import { MAX_TEXT, PRIORITIES, capitalize, fieldClass } from '../todoUtils';

function TodoForm() {
    const [todo, setTodo] = useState("")
    const [due, setDue] = useState("")
    const [priority, setPriority] = useState("medium")
    const {addTodo} = useTodo()

    const add = (e) => {
      e.preventDefault()

      const text = todo.trim()
      if (!text) return

      addTodo({ todo: text, completed: false, due, priority })
      setTodo("")
      setDue("")
      setPriority("medium")
    }

  return (
      <form onSubmit={add}>
          <div className="flex gap-2">
              <label htmlFor="new-todo" className="sr-only">New task</label>
              <input
                  id="new-todo"
                  type="text"
                  placeholder="What needs to be done?"
                  autoComplete="off"
                  maxLength={MAX_TEXT}
                  aria-keyshortcuts="n"
                  className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-[15px] text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-brand-500 focus:bg-white focus:ring-4 focus:ring-brand-100"
                  value={todo}
                  onChange={(e) => setTodo(e.target.value)}
              />
              <button
                  type="submit"
                  disabled={!todo.trim()}
                  className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-brand-600 px-4 py-3 text-[15px] font-semibold text-white shadow-sm transition hover:bg-brand-700 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-100 disabled:cursor-not-allowed disabled:opacity-50"
              >
                  <PlusIcon />
                  <span>Add</span>
              </button>
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2">
              <label className="flex items-center gap-2 text-sm text-slate-600">
                  Due
                  <input type="date" className={fieldClass} value={due} onChange={(e) => setDue(e.target.value)} />
              </label>
              <label className="flex items-center gap-2 text-sm text-slate-600">
                  Priority
                  <select className={fieldClass} value={priority} onChange={(e) => setPriority(e.target.value)}>
                      {PRIORITIES.map((p) => <option key={p} value={p}>{capitalize(p)}</option>)}
                  </select>
              </label>
          </div>
      </form>
  );
}

export default TodoForm;
