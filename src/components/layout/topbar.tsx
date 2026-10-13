import * as React from "react";
import { Bell, Menu, LogOut, User as UserIcon, Sun, Moon } from "lucide-react";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { useNavigate } from "@tanstack/react-router";
import { SearchInput } from "@/components/ui/search-input";
import { useAuth } from "@/lib/auth";
import { useGlobalSearch } from "@/lib/queries/search";
import { useUnreadNotificationCount } from "@/lib/queries/notifications";
import { useTheme } from "@/lib/theme";

export function Topbar({ onMenuClick }: { onMenuClick: () => void }) {
  const { profile, signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [query, setQuery] = React.useState("");
  const { data: results } = useGlobalSearch(query);
  const { data: unread } = useUnreadNotificationCount();
  const [searchOpen, setSearchOpen] = React.useState(false);

  return (
    <header className="flex h-14 items-center gap-3 border-b border-ink-100 bg-surface-raised px-4">
      <button className="text-ink-500 md:hidden" onClick={onMenuClick} aria-label="Open menu">
        <Menu className="h-5 w-5" />
      </button>

      <div className="relative w-full max-w-md">
        <SearchInput
          placeholder="Search leads, clients, matters, invoices…"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setSearchOpen(true);
          }}
          onFocus={() => setSearchOpen(true)}
          onBlur={() => setTimeout(() => setSearchOpen(false), 150)}
        />
        {searchOpen && query.length > 1 && (
          <div className="absolute left-0 right-0 top-10 z-30 max-h-80 overflow-y-auto rounded-md border border-ink-200 bg-surface-raised shadow-lg">
            {!results || results.length === 0 ? (
              <p className="px-3 py-3 text-sm text-ink-400">No results.</p>
            ) : (
              results.map((r) => (
                <button
                  key={`${r.type}-${r.id}`}
                  className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-ink-50"
                  onMouseDown={() => {
                    navigate({ to: r.href });
                    setSearchOpen(false);
                    setQuery("");
                  }}
                >
                  <span className="text-ink-800">{r.label}</span>
                  <span className="text-xs uppercase text-ink-400">{r.type}</span>
                </button>
              ))
            )}
          </div>
        )}
      </div>

      <div className="ml-auto flex items-center gap-3">
        <button
          className="text-ink-500 hover:text-ink-800"
          onClick={toggleTheme}
          aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
          title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
        >
          {theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
        </button>

        <button className="relative text-ink-500 hover:text-ink-800" aria-label="Notifications">
          <Bell className="h-5 w-5" />
          {Boolean(unread) && (
            <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-danger text-[10px] text-white">
              {unread}
            </span>
          )}
        </button>

        <DropdownMenu.Root>
          <DropdownMenu.Trigger asChild>
            <button className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-ink-50">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-brass-600 text-xs font-medium text-white">
                {profile?.full_name?.slice(0, 1).toUpperCase() ?? "?"}
              </span>
              <span className="hidden text-ink-700 sm:inline">{profile?.full_name}</span>
            </button>
          </DropdownMenu.Trigger>
          <DropdownMenu.Portal>
            <DropdownMenu.Content align="end" className="min-w-[180px] rounded-md border border-ink-200 bg-surface-raised p-1 shadow-lg">
              <DropdownMenu.Item asChild>
                <button
                  className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-sm text-ink-700 hover:bg-ink-50"
                  onClick={() => navigate({ to: "/settings" })}
                >
                  <UserIcon className="h-4 w-4" /> Profile
                </button>
              </DropdownMenu.Item>
              <DropdownMenu.Item asChild>
                <button
                  className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-sm text-danger hover:bg-danger/10"
                  onClick={() => signOut()}
                >
                  <LogOut className="h-4 w-4" /> Log out
                </button>
              </DropdownMenu.Item>
            </DropdownMenu.Content>
          </DropdownMenu.Portal>
        </DropdownMenu.Root>
      </div>
    </header>
  );
}
