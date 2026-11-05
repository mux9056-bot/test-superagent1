import type { ReactNode, SVGProps } from 'react';

export type IconName =
  | 'today'
  | 'calendar'
  | 'list'
  | 'check-circle'
  | 'inbox'
  | 'hash'
  | 'plus'
  | 'search'
  | 'close'
  | 'menu'
  | 'more'
  | 'trash'
  | 'edit'
  | 'note'
  | 'alert'
  | 'check'
  | 'info'
  | 'arrow-left'
  | 'refresh';

const paths: Record<IconName, ReactNode> = {
  today: (
    <>
      <rect x="3" y="4.5" width="18" height="16" rx="3" />
      <path d="M3 9h18M8 2.5v4M16 2.5v4" />
      <path d="m9 14 2 2 4-4" />
    </>
  ),
  calendar: (
    <>
      <rect x="3" y="4.5" width="18" height="16" rx="3" />
      <path d="M3 9h18M8 2.5v4M16 2.5v4" />
    </>
  ),
  list: (
    <>
      <path d="M8 6h13M8 12h13M8 18h13" />
      <path d="M3.5 6h.01M3.5 12h.01M3.5 18h.01" />
    </>
  ),
  'check-circle': (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="m8.5 12 2.5 2.5 4.5-5" />
    </>
  ),
  inbox: (
    <>
      <path d="M4 4.5h16l2 10.5v4a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-4z" />
      <path d="M2 15h5l1.5 3h7L17 15h5" />
    </>
  ),
  hash: <path d="M5 9h14M5 15h14M10 3 8 21M16 3l-2 18" />,
  plus: <path d="M12 5v14M5 12h14" />,
  search: (
    <>
      <circle cx="11" cy="11" r="7" />
      <path d="m16.5 16.5 4 4" />
    </>
  ),
  close: <path d="m6 6 12 12M18 6 6 18" />,
  menu: <path d="M4 7h16M4 12h16M4 17h16" />,
  more: (
    <>
      <circle cx="5" cy="12" r="1.2" fill="currentColor" stroke="none" />
      <circle cx="12" cy="12" r="1.2" fill="currentColor" stroke="none" />
      <circle cx="19" cy="12" r="1.2" fill="currentColor" stroke="none" />
    </>
  ),
  trash: (
    <>
      <path d="M4 7h16M9 7V4h6v3M6 7l1 14h10l1-14" />
      <path d="M10 11v6M14 11v6" />
    </>
  ),
  edit: (
    <>
      <path d="m14 4 6 6L8 22H2v-6z" />
      <path d="m12 6 6 6" />
    </>
  ),
  note: (
    <>
      <path d="M5 3.5h9l5 5V20a1.5 1.5 0 0 1-1.5 1.5h-12A1.5 1.5 0 0 1 4 20V5a1.5 1.5 0 0 1 1-1.5Z" />
      <path d="M14 3.5V9h5M8 13h8M8 17h5" />
    </>
  ),
  alert: (
    <>
      <path d="M12 3 2.5 20h19z" />
      <path d="M12 9v5M12 17.5v.01" />
    </>
  ),
  check: <path d="m4.5 12.5 5 5 10-11" />,
  info: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v6M12 7.5v.01" />
    </>
  ),
  'arrow-left': <path d="M19 12H5M11 6l-6 6 6 6" />,
  refresh: (
    <>
      <path d="M20 12a8 8 0 1 1-2.34-5.66" />
      <path d="M20 4v5h-5" />
    </>
  ),
};

export function Icon({
  name,
  size = 18,
  ...rest
}: { name: IconName; size?: number } & SVGProps<SVGSVGElement>) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...rest}
    >
      {paths[name]}
    </svg>
  );
}
