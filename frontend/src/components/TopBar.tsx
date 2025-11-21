/* React */
import { useState } from "react";
import { NavLink, Link } from "react-router-dom";

/* App components */
import { useAuth } from "../auth/AuthContext";

 /* Reusable TopBar navigation for authenticated pages */
 // - Shows brand on the left.
 // - Middle nav: "Polls" (always), "Crea sondaggio" (admins only).
 // - Right side: current username + Logout button.
 //
 // Accessibility:
 // - <nav> landmark + aria-label
 // - Focus ring on interactive elements (Tailwind defaults).
export default function TopBar() {
  const { user, logout } = useAuth();
  const isAdmin = user?.role === "admin";

  // Fallback: use username if available, else part before "@"
  const username = user?.username ?? (user?.email?.split("@")[0] ?? "");

  // Mobile menu state (open/close)
  const [menuOpen, setMenuOpen] = useState(false);

  // Helper: close mobile menu and optionally run an action (e.g., logout)
  const closeMenu = (action?: () => void) => {
    setMenuOpen(false);
    action?.();
  };

  return (
    <nav
      aria-label="Primary"
      className="my-7 border-y border-gray-200 bg-white/80 backdrop-blur supports-[backdrop-filter]:bg-white/60 py-2"
    >
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4 sm:px-6">
        {/* Brand / Logo */}
        <div className="flex items-center gap-2">
          <Link to="/polls" className="flex items-center gap-2" onClick={() => closeMenu()}>
            <img
              src="/logo_icon.png"
              alt="PollsApp logo"
              className="h-7 w-auto"
            />
            <span className="text-sm font-semibold tracking-tight">
              PollsApp
            </span>
          </Link>
        </div>

        {/* Center nav (desktop) */}
        <ul className="hidden gap-6 md:flex">
          <li>
            <NavLink
              to="/polls"
              className={({ isActive }) =>
                [
                  "text-sm transition-colors",
                  isActive ? "text-black font-medium" : "text-gray-600 hover:text-black",
                ].join(" ")
              }
            >
              Sondaggi
            </NavLink>
          </li>

          {isAdmin && (
            <li>
              <NavLink
                to="/polls/new"
                className={({ isActive }) =>
                  [
                    "text-sm transition-colors",
                    isActive ? "text-black font-medium" : "text-gray-600 hover:text-black",
                  ].join(" ")
                }
              >
                Crea sondaggio
              </NavLink>
            </li>
          )}
        </ul>

        {/* Right: user + logout (desktop) */}
        <div className="hidden items-center gap-3 md:flex">
          <span className="text-sm text-gray-700">{user?.username}</span>
          <button
            type="button"
            onClick={() => logout()}
            className="rounded-lg border px-3 py-1.5 text-sm hover:bg-gray-50"
          >
            Logout
          </button>
        </div>

        {/* Hamburger button (mobile only) */}
        <button
          type="button"
          onClick={() => setMenuOpen((prev) => !prev)}
          className="md:hidden p-2 rounded hover:bg-gray-100"
          aria-label="Toggle menu"
          aria-expanded={menuOpen}
          aria-controls="mobile-menu"
        >
          {/* Simple hamburgher icons: hamburger - X */}
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5 text-gray-700"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d={
                menuOpen
                  ? "M6 18L18 6M6 6l12 12" // X icon when open
                  : "M4 6h16M4 12h16M4 18h16" // hamburger icon when closed
              }
            />
          </svg>
        </button>
      </div>

      {/* Mobile menu (visible when menuOpen) */}
      <div
        id="mobile-menu"
        className={`md:hidden overflow-hidden transition-all duration-200 ease-out ${
          menuOpen ? "max-h-64 opacity-100 translate-y-0" : "max-h-0 opacity-0 -translate-y-1"
        } border-t border-gray-200 bg-white shadow-md`}
      >
        <ul className="flex flex-col p-4 space-y-3 text-sm">
          <li>
            <NavLink
              to="/polls"
              onClick={() => closeMenu()}
              className={({ isActive }) =>
                isActive ? "font-medium text-black" : "text-gray-700 hover:text-black"
              }
            >
              Polls
            </NavLink>
          </li>

          {isAdmin && (
            <li>
              <NavLink
                to="/polls/new"
                onClick={() => closeMenu()}
                className={({ isActive }) =>
                  isActive ? "font-medium text-black" : "text-gray-700 hover:text-black"
                }
              >
                Crea sondaggio
              </NavLink>
            </li>
          )}

          {/* User + logout grouped for mobile */}
          <li className="mt-2 flex items-center justify-between">
            <span className="text-gray-700">{username}</span>
            <button
              type="button"
              onClick={() => closeMenu(logout)}
              className="rounded-lg border px-3 py-1.5 hover:bg-gray-50"
            >
              Logout
            </button>
          </li>
        </ul>
      </div>
    </nav>
  );
}
