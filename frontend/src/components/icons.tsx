import type { LucideIcon } from "lucide-react";
import {
  ArrowRightLeft,
  Banknote,
  BedDouble,
  Book,
  Bus,
  Car,
  Check,
  ChevronDown,
  Circle,
  Coffee,
  Coins,
  Droplet,
  Dumbbell,
  Film,
  Gamepad2,
  Gift,
  Heart,
  Home,
  Key,
  LayoutDashboard,
  LogOut,
  PawPrint,
  Pencil,
  PiggyBank,
  Pill,
  Plane,
  Plus,
  Receipt,
  Repeat,
  Shirt,
  ShoppingCart,
  Smartphone,
  Sparkles,
  Tag,
  Trash2,
  TrendingUp,
  Users,
  Utensils,
  Wallet,
  Wifi,
  Wrench,
  X,
  Zap,
} from "lucide-react";
import type { ReactNode, SVGProps } from "react";

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

// The brand mark stays a custom logo (not a generic icon from the set).
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

// App-wide icons now come from Lucide; aliased to the names used across the app.
export {
  Plus as IconPlus,
  Trash2 as IconTrash,
  Pencil as IconPencil,
  X as IconX,
  Check as IconCheck,
  ChevronDown as IconChevronDown,
  LogOut as IconLogout,
  LayoutDashboard as IconDashboard,
  ArrowRightLeft as IconFlow,
  Tag as IconTag,
  Wallet as IconWallet,
  Banknote as IconCash,
  TrendingUp as IconChart,
  Key as IconKey,
  Repeat as IconRepeat,
  Sparkles as IconSparkles,
};

// Selectable category icons (keys are stored on the Category record).
export const CATEGORY_ICONS: Record<string, LucideIcon> = {
  tag: Tag,
  food: Utensils,
  car: Car,
  bus: Bus,
  cart: ShoppingCart,
  bill: Receipt,
  heart: Heart,
  film: Film,
  home: Home,
  gift: Gift,
  wallet: Wallet,
  coffee: Coffee,
  plane: Plane,
  bed: BedDouble,
  phone: Smartphone,
  wifi: Wifi,
  bolt: Zap,
  droplet: Droplet,
  key: Key,
  book: Book,
  paw: PawPrint,
  shirt: Shirt,
  sparkles: Sparkles,
  dumbbell: Dumbbell,
  pill: Pill,
  wrench: Wrench,
  repeat: Repeat,
  gamepad: Gamepad2,
  users: Users,
  circle: Circle,
  cash: Banknote,
  chart: TrendingUp,
  piggy: PiggyBank,
  coins: Coins,
  // Aliases for backend seed icon names.
  utensils: Utensils,
  "shopping-bag": ShoppingCart,
  receipt: Receipt,
  "heart-pulse": Heart,
};

export function CategoryIcon({ name, size = 16 }: { name: string | null; size?: number }) {
  const Cmp = (name && CATEGORY_ICONS[name]) || Tag;
  return <Cmp size={size} />;
}
