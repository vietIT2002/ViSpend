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
export function IconCoffee(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M5 8h11v5a4 4 0 0 1-4 4H9a4 4 0 0 1-4-4z" />
      <path d="M16 9h2.5a1.5 1.5 0 0 1 0 3H16" />
      <path d="M8 3v2M11 3v2" />
    </Svg>
  );
}
export function IconBus(p: IconProps) {
  return (
    <Svg {...p}>
      <rect x="4" y="4" width="16" height="13" rx="2" />
      <path d="M4 11h16M7 17v2M17 17v2" />
    </Svg>
  );
}
export function IconPlane(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M11 4.5a1 1 0 0 1 2 0V10l7 4v1.5l-7-2v3.5l2 1.5V20l-3-1-3 1v-1.5l2-1.5V13l-7 2v-1.5l7-4z" />
    </Svg>
  );
}
export function IconBed(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M3 7v12M3 18h18v-4a3 3 0 0 0-3-3H9v3" />
      <circle cx="6.5" cy="11.5" r="1.4" />
    </Svg>
  );
}
export function IconPhone(p: IconProps) {
  return (
    <Svg {...p}>
      <rect x="7" y="3" width="10" height="18" rx="2.5" />
      <path d="M11 18h2" />
    </Svg>
  );
}
export function IconWifi(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M5 9a11 11 0 0 1 14 0" />
      <path d="M7.5 12a7 7 0 0 1 9 0" />
      <path d="M10 15a3 3 0 0 1 4 0" />
      <circle cx="12" cy="18" r="0.5" fill="currentColor" stroke="none" />
    </Svg>
  );
}
export function IconBolt(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M13 3 5 13h6l-1 8 8-10h-6z" />
    </Svg>
  );
}
export function IconDroplet(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M12 3c4 5 6 8 6 11a6 6 0 0 1-12 0c0-3 2-6 6-11z" />
    </Svg>
  );
}
export function IconKey(p: IconProps) {
  return (
    <Svg {...p}>
      <circle cx="8" cy="8" r="4" />
      <path d="m11 11 8 8M16 16l2-2" />
    </Svg>
  );
}
export function IconBook(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M5 4h11a2 2 0 0 1 2 2v14H7a2 2 0 0 1-2-2z" />
      <path d="M5 18a2 2 0 0 1 2-2h11" />
    </Svg>
  );
}
export function IconPaw(p: IconProps) {
  return (
    <Svg {...p}>
      <circle cx="7" cy="9" r="1.5" />
      <circle cx="12" cy="7" r="1.5" />
      <circle cx="17" cy="9" r="1.5" />
      <path d="M9 15.5a3 3 0 0 1 6 0c0 1.7-1.3 2.8-3 2.8s-3-1.1-3-2.8z" />
    </Svg>
  );
}
export function IconShirt(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M9 4 4 7l2 3 2-1.2V20h8V8.8L18 10l2-3-5-3-3 2.2z" />
    </Svg>
  );
}
export function IconSparkles(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M11 4l1.6 4.4L17 10l-4.4 1.6L11 16l-1.6-4.4L5 10l4.4-1.6z" />
      <path d="M18 14l.6 1.8 1.8.6-1.8.6-.6 1.8-.6-1.8-1.8-.6 1.8-.6z" />
    </Svg>
  );
}
export function IconDumbbell(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M4 9v6M7 7v10M17 7v10M20 9v6M7 12h10" />
    </Svg>
  );
}
export function IconPill(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M6 13.5 13.5 6a4 4 0 0 1 5.6 5.6L11.6 19.1A4 4 0 0 1 6 13.5z" />
      <path d="m9 9 6 6" />
    </Svg>
  );
}
export function IconWrench(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M15.5 4a4 4 0 0 0-5 5l-6.5 6.5 3 3L13.5 12a4 4 0 0 0 5-5l-2.5 2.5L13.5 9 13 6.5z" />
    </Svg>
  );
}
export function IconRepeat(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M4 9a5 5 0 0 1 5-5h7M4 9l3-3M4 9l3 3" />
      <path d="M20 15a5 5 0 0 1-5 5H8M20 15l-3 3M20 15l-3-3" />
    </Svg>
  );
}
export function IconGamepad(p: IconProps) {
  return (
    <Svg {...p}>
      <rect x="3" y="8" width="18" height="9" rx="3" />
      <path d="M7 11v3M5.5 12.5h3" />
      <circle cx="16" cy="12" r="0.6" fill="currentColor" stroke="none" />
      <circle cx="18" cy="14" r="0.6" fill="currentColor" stroke="none" />
    </Svg>
  );
}
export function IconCash(p: IconProps) {
  return (
    <Svg {...p}>
      <rect x="3" y="6" width="18" height="12" rx="2" />
      <circle cx="12" cy="12" r="2.5" />
      <path d="M6 9h.01M18 15h.01" />
    </Svg>
  );
}
export function IconChart(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M4 19V5M4 19h16" />
      <path d="m7 14 3-4 3 2 5-6" />
      <path d="M20 6v3.5h-3.5" />
    </Svg>
  );
}
export function IconPiggy(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M4 12a6 5 0 0 1 6-5h3a6 5 0 0 1 6 5 6 5 0 0 1-2 3.6V18h-2.4l-.5-1.5h-2.6L14 18H8v-2.4A6 5 0 0 1 4 12z" />
      <path d="M3 11h1.6" />
      <circle cx="9" cy="11" r="0.5" fill="currentColor" stroke="none" />
    </Svg>
  );
}
export function IconCoins(p: IconProps) {
  return (
    <Svg {...p}>
      <ellipse cx="9" cy="7" rx="5" ry="2.5" />
      <path d="M4 7v4c0 1.4 2.2 2.5 5 2.5s5-1.1 5-2.5V7" />
      <path d="M10 14c.4 1.2 2.4 2 5 2 2.8 0 5-1.1 5-2.5v-4c0-1.4-2.2-2.5-5-2.5" />
    </Svg>
  );
}
export function IconUsers(p: IconProps) {
  return (
    <Svg {...p}>
      <circle cx="9" cy="8" r="3" />
      <path d="M3.5 19a5.5 5.5 0 0 1 11 0" />
      <path d="M16 6a3 3 0 0 1 0 6M17 14.5a5.5 5.5 0 0 1 3.5 4.5" />
    </Svg>
  );
}
export function IconCircle(p: IconProps) {
  return (
    <Svg {...p}>
      <circle cx="12" cy="12" r="8" />
    </Svg>
  );
}

export const CATEGORY_ICONS: Record<string, (p: IconProps) => ReactElement> = {
  // Core
  tag: IconTag,
  food: IconFood,
  car: IconCar,
  bus: IconBus,
  cart: IconCart,
  bill: IconBill,
  heart: IconHeart,
  film: IconFilm,
  home: IconHome,
  gift: IconGift,
  wallet: IconWallet,
  spend: IconSpendMark,
  // Expenses
  coffee: IconCoffee,
  plane: IconPlane,
  bed: IconBed,
  phone: IconPhone,
  wifi: IconWifi,
  bolt: IconBolt,
  droplet: IconDroplet,
  key: IconKey,
  book: IconBook,
  paw: IconPaw,
  shirt: IconShirt,
  sparkles: IconSparkles,
  dumbbell: IconDumbbell,
  pill: IconPill,
  wrench: IconWrench,
  repeat: IconRepeat,
  gamepad: IconGamepad,
  users: IconUsers,
  circle: IconCircle,
  // Income
  cash: IconCash,
  chart: IconChart,
  piggy: IconPiggy,
  coins: IconCoins,
  // Aliases for backend seed icon names
  utensils: IconFood,
  "shopping-bag": IconCart,
  receipt: IconBill,
  "heart-pulse": IconHeart,
};

export function CategoryIcon({ name, size = 16 }: { name: string | null; size?: number }) {
  const Cmp = (name && CATEGORY_ICONS[name]) || IconTag;
  return <Cmp size={size} />;
}
