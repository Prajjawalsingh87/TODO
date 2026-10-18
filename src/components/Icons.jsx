const base = {
  width: 18,
  height: 18,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': true,
}

export const PlusIcon = (props) => (
  <svg {...base} {...props}><path d="M12 5v14M5 12h14" /></svg>
)

export const CheckIcon = (props) => (
  <svg {...base} {...props}><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>
)

export const PencilIcon = (props) => (
  <svg {...base} {...props}><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4z" /></svg>
)

export const TrashIcon = (props) => (
  <svg {...base} {...props}><path d="M3 6h18" /><path d="M8 6V4h8v2" /><path d="M19 6l-1 14H6L5 6" /></svg>
)

export const XIcon = (props) => (
  <svg {...base} {...props}><path d="M18 6L6 18M6 6l12 12" /></svg>
)

export const ClipboardIcon = (props) => (
  <svg {...base} {...props}><rect x="8" y="2" width="8" height="4" rx="1" /><path d="M16 4h2a2 2 0 012 2v14a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2h2" /><path d="M9 14l2 2 4-4" /></svg>
)
