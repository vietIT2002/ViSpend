import { useState } from "react";

import type { Account } from "../../types";
import { brandByCode } from "./banks";
import { accountEmoji } from "./util";

type LogoAccount = Pick<Account, "brand" | "icon" | "type" | "color">;

// Shows the brand logo when the account has one (loaded from VietQR's CDN);
// falls back to a colored emoji tile if there's no brand or the image fails.
export function AccountLogo({ acc, size = 40 }: { acc: LogoAccount; size?: number }) {
  const [failed, setFailed] = useState(false);
  const brand = brandByCode(acc.brand);
  const color = acc.color ?? "#5b6770";

  if (brand?.logo && !failed) {
    return (
      <span
        className="grid shrink-0 place-items-center overflow-hidden rounded-lg bg-white ring-1 ring-black/5"
        style={{ width: size, height: size }}
      >
        <img
          src={brand.logo}
          alt=""
          loading="lazy"
          className="h-full w-full object-contain p-1"
          onError={() => setFailed(true)}
        />
      </span>
    );
  }

  return (
    <span
      className="grid shrink-0 place-items-center rounded-lg"
      style={{ width: size, height: size, backgroundColor: color + "1f" }}
    >
      <span style={{ fontSize: size * 0.45 }}>{accountEmoji(acc)}</span>
    </span>
  );
}
