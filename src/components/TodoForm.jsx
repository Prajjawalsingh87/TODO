import { useState } from 'react'
import { useTodo } from '../contexts/TodoContext';
import { PlusIcon } from './Icons';

function TodoForm() {
    const [todo, setTodo] = useState("")
    const {addTodo} = useTodo()

    const add = (e) => {
      e.preventDefault()

      const text = todo.trim()
      if (!text) return

      addTodo({ todo: text, completed: false})
      setTodo("")
    }

  return (
      <form onSubmit={add} className="flex gap-2">
          <label htmlFor="new-todo" className="sr-only">New todo</label>
          <input
              id="new-todo"
              type="text"
              placeholder="What needs to be done?"
              autoComplete="off"
              maxLength={200}
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
      </form>
  );
}

export default TodoForm;
