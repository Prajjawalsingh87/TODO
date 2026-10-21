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

export const RepeatIcon = (props) => (
  <svg {...base} {...props}><path d="M17 2l4 4-4 4" /><path d="M3 11V9a3 3 0 013-3h15" /><path d="M7 22l-4-4 4-4" /><path d="M21 13v2a3 3 0 01-3 3H3" /></svg>
)

export const CopyIcon = (props) => (
  <svg {...base} {...props}><rect x="9" y="9" width="12" height="12" rx="2" /><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" /></svg>
)

export const CloudIcon = (props) => (
  <svg {...base} {...props}><path d="M17.5 19H7a5 5 0 11.9-9.9A6 6 0 0119 10.5a4.3 4.3 0 01-1.5 8.5z" /></svg>
)

export const BellIcon = (props) => (
  <svg {...base} {...props}><path d="M18 8a6 6 0 10-12 0c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.7 21a2 2 0 01-3.4 0" /></svg>
)
