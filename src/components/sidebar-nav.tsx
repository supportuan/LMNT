"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { iconForHref, NavIcon } from "@/components/nav-icons";
import type { NavGroup, NavItem } from "@/lib/policy";

function isActive(pathname: string, href: string, search?: string | null) {
  const [path, query] = href.split("?");
  const params = new URLSearchParams(search ?? "");
  if (query) {
    const expected = new URLSearchParams(query);
    for (const [key, value] of expected.entries()) {
      if (params.get(key) !== value) return false;
    }
    return pathname === path;
  }
  if (path === "/app/home" || path === "/app/overview") {
    return pathname === path || pathname === "/";
  }
  if (path === "/app/assets") {
    if (pathname !== "/app/assets") return false;
    const view = params.get("view");
    return !view || !["maintenance", "categories"].includes(view);
  }
  return pathname === path || pathname.startsWith(`${path}/`);
}

function NavLink({
  item,
  pathname,
  search,
  nested,
}: {
  item: NavItem;
  pathname: string;
  search: string | null;
  nested?: boolean;
}) {
  const active = isActive(pathname, item.href, search);
  const icon = iconForHref(item.href, item.label);

  return (
    <Link
      href={item.href}
      title={item.label}
      className={`group flex items-center justify-start gap-3 rounded-[12px] px-3 py-2.5 text-sm transition ${
        nested ? "pl-4" : ""
      } ${
        active
          ? "neu-pressed bg-[var(--workspace-accent-muted)] font-semibold text-[var(--workspace-accent)]"
          : "text-[var(--sidebar-muted)] hover:bg-[var(--workspace-elevated)] hover:text-[var(--sidebar-text)]"
      }`}
    >
      <NavIcon name={icon} className="shrink-0" />
      <span className="truncate">{item.label}</span>
    </Link>
  );
}

export function SidebarNav({
  groups,
}: {
  groups: NavGroup[];
  variant?: "default" | "trainer-os";
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const search = searchParams.toString();

  return (
    <nav className="min-h-0 flex-1 space-y-5 overflow-y-auto overscroll-contain px-3 py-4">
      {groups.map((group, groupIndex) => (
        <div key={group.label ?? `group-${groupIndex}`}>
          {group.label && (
            <div className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--sidebar-muted)]">
              {group.label}
            </div>
          )}
          <ul className="space-y-1">
            {group.items.map((item) => (
              <li key={`${item.href}-${item.label}`}>
                {item.children?.length ? (
                  <div>
                    <div className="px-3 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--sidebar-muted)]">
                      {item.label}
                    </div>
                    <ul className="space-y-1">
                      {item.children.map((child) => (
                        <li key={`${child.href}-${child.label}`}>
                          <NavLink item={child} pathname={pathname} search={search} nested />
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : (
                  <NavLink item={item} pathname={pathname} search={search} />
                )}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </nav>
  );
}
