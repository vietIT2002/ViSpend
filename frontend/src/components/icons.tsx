import type { ReactElement, ReactNode, SVGProps } from "react";

/**
 * Custom line-icon set (stroke 1.6, consistent weight) replaces Lucide,
 * which the minimalist-ui design protocol bans as a generic default.
 */
type IconProps = SVGProps<SVGSVGElement> & { size?: number };

function Svg({ size = 18, children, ...props }: IconProps & { children: ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      {children}
    </svg>
  );
}

export function IconWallet(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M3 8.5A2.5 2.5 0 0 1 5.5 6H17v12H5.5A2.5 2.5 0 0 1 3 15.5z" />
      <path d="M17 9h3.2a.8.8 0 0 1 .8.8v4.4a.8.8 0 0 1-.8.8H17z" />
      <circle cx="17.8" cy="12" r="0.4" fill="currentColor" stroke="none" />
    </Svg>
  );
}

export function IconSpendMark(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M6 4h12v16l-2-1.2-2 1.2-2-1.2-2 1.2-2-1.2L6 20z" />
      <path d="M9 8h6" />
      <path d="M9 11h3" />
      <path d="M9 16v-2.2" />
      <path d="M12 16v-4" />
      <path d="M15 16v-6" />
    </Svg>
  );
}

export function IconDashboard(p: IconProps) {
  return (
    <Svg {...p}>
      <rect x="3" y="3" width="7.5" height="9" rx="1.2" />
      <rect x="3" y="15" width="7.5" height="6" rx="1.2" />
      <rect x="13.5" y="3" width="7.5" height="6" rx="1.2" />
      <rect x="13.5" y="12" width="7.5" height="9" rx="1.2" />
    </Svg>
  );
}

export function IconFlow(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M7 5v9" />
      <path d="m3.5 10.5 3.5 3.5 3.5-3.5" />
      <path d="M17 19v-9" />
      <path d="m20.5 13.5-3.5-3.5-3.5 3.5" />
    </Svg>
  );
}

export function IconTag(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M4 12.5V5.5A1.5 1.5 0 0 1 5.5 4h7a2 2 0 0 1 1.4.6l5 5a2 2 0 0 1 0 2.8l-6.5 6.5a2 2 0 0 1-2.8 0l-5-5A2 2 0 0 1 4 12.5Z" />
      <circle cx="8.5" cy="8.5" r="1.2" />
    </Svg>
  );
}

export function IconLogout(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M14 5H7a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h7" />
      <path d="M17 8.5 20.5 12 17 15.5" />
      <path d="M20 12h-9" />
    </Svg>
  );
}

export function IconPlus(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M12 5v14" />
      <path d="M5 12h14" />
    </Svg>
  );
}

export function IconTrash(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M4 7h16" />
      <path d="M9 7V5.5A1.5 1.5 0 0 1 10.5 4h3A1.5 1.5 0 0 1 15 5.5V7" />
      <path d="M6 7l.8 11.2A2 2 0 0 0 8.8 20h6.4a2 2 0 0 0 2-1.8L18 7" />
    </Svg>
  );
}

export function IconCheck(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="m4.5 12.5 5 5 10-11" />
    </Svg>
  );
}

export function IconChevronDown(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="m6 9.5 6 6 6-6" />
    </Svg>
  );
}

export function IconPencil(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M4 20h4l10.5-10.5a2 2 0 0 0 0-2.8l-1.2-1.2a2 2 0 0 0-2.8 0L4 16z" />
      <path d="m13.5 6.5 4 4" />
    </Svg>
  );
}

export function IconX(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M6 6l12 12" />
      <path d="M18 6 6 18" />
    </Svg>
  );
}

// --- Category icons (pick one when creating a category) ---
export function IconFood(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M5 3v7a2 2 0 0 0 2 2v9M9 3v9" />
      <path d="M16 3c-1.5 0-2.5 1.8-2.5 4.5S14.5 12 16 12v9" />
    </Svg>
  );
}
export function IconCar(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M4 13l1.6-4.2A2 2 0 0 1 7.5 7.5h9a2 2 0 0 1 1.9 1.3L20 13v5a1 1 0 0 1-1 1h-1a1 1 0 0 1-1-1v-1H7v1a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1z" />
      <path d="M6.5 16h.01M17.5 16h.01M4 13h16" />
    </Svg>
  );
}
export function IconCart(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M3 4h2l2.2 11.2a1.5 1.5 0 0 0 1.5 1.3h7.6a1.5 1.5 0 0 0 1.5-1.2L20 8H6" />
      <circle cx="9" cy="20" r="1" />
      <circle cx="17" cy="20" r="1" />
    </Svg>
  );
}
export function IconBill(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M6 3h12v18l-2-1.5L14 21l-2-1.5L10 21l-2-1.5L6 21z" />
      <path d="M9 8h6M9 12h6" />
    </Svg>
  );
}
export function IconHeart(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M12 20s-7-4.3-7-9.3A3.7 3.7 0 0 1 12 8a3.7 3.7 0 0 1 7 2.7C19 15.7 12 20 12 20z" />
    </Svg>
  );
}
export function IconFilm(p: IconProps) {
  return (
    <Svg {...p}>
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <path d="M3 9h18M3 15h18M8 4v16M16 4v16" />
    </Svg>
  );
}
export function IconHome(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M4 11l8-6 8 6" />
      <path d="M6 10v9h12v-9" />
    </Svg>
  );
}
export function IconGift(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M4 11h16v9H4zM4 7h16v4H4zM12 7v13" />
      <path d="M12 7S10.5 3.5 8.5 4.5 9.5 7 12 7zM12 7s1.5-3.5 3.5-2.5S14.5 7 12 7z" />
    </Svg>
  );
}

export const CATEGORY_ICONS: Record<string, (p: IconProps) => ReactElement> = {
  tag: IconTag,
  food: IconFood,
  car: IconCar,
  cart: IconCart,
  bill: IconBill,
  heart: IconHeart,
  film: IconFilm,
  home: IconHome,
  gift: IconGift,
  wallet: IconWallet,
  spend: IconSpendMark,
};

export function CategoryIcon({ name, size = 16 }: { name: string | null; size?: number }) {
  const Cmp = (name && CATEGORY_ICONS[name]) || IconTag;
  return <Cmp size={size} />;
}
