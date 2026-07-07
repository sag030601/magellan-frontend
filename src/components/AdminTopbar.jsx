import { useState, useRef, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import magellanLogo from "../assets/Magellan_Logo-removebg-preview.png";

function AdminTopbar({ onMenuClick }) {
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const { user, logout } = useAuth();
  const { dark, toggle } = useTheme();
  const navigate = useNavigate();
  const dropdownRef = useRef(null);

  useEffect(() => {
    if (!userDropdownOpen) return;
    const close = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setUserDropdownOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [userDropdownOpen]);

  const handleLogout = () => {
    setUserDropdownOpen(false);
    logout();
    navigate("/login", { replace: true });
  };

  return (
    <nav
      className="sticky top-0 z-30 border-b transition-colors"
      style={{
        background: dark ? "var(--bg-secondary)" : "var(--bg-topbar)",
        borderColor: "var(--border-primary)",
        boxShadow: "var(--shadow-sm)",
      }}
    >
      <div className="flex items-center justify-between h-16 px-4 sm:px-6">
        <button
          type="button"
          onClick={onMenuClick}
          className="md:hidden p-2 rounded-lg transition-colors"
          style={{ color: "var(--text-secondary)" }}
          aria-label="Toggle menu"
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M3 5h14M3 10h14M3 15h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </button>

        <div className="flex-1 flex items-center gap-4 min-w-0">
          <Link to="/admin" className="topbar-logo-wrap shrink-0">
            <img
              src={magellanLogo}
              alt="Magellan Crewing Management LLP"
              className="topbar-logo"
            />
          </Link>
        </div>

        <div className="flex items-center gap-2">
          {/* Dark mode toggle */}
          <button
            type="button"
            onClick={toggle}
            className="p-2 rounded-lg transition-colors"
            style={{
              color: "var(--text-secondary)",
              background: dark ? "var(--bg-tertiary)" : "transparent",
            }}
            aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
            title={dark ? "Light mode" : "Dark mode"}
          >
            {dark ? (
              <svg width="18" height="18" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" clipRule="evenodd" />
              </svg>
            ) : (
              <svg width="18" height="18" viewBox="0 0 20 20" fill="currentColor">
                <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
              </svg>
            )}
          </button>

          {/* User dropdown */}
          <div className="relative" ref={dropdownRef}>
            <button
              type="button"
              onClick={() => setUserDropdownOpen(!userDropdownOpen)}
              className="flex items-center gap-2 p-2 rounded-lg transition-colors"
              style={{ color: "var(--text-primary)" }}
            >
              <span className="hidden md:inline text-sm font-medium">
                {user?.name || "User"}
              </span>
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white"
                style={{ background: "var(--marine-600)" }}
              >
                {(user?.name || "U").charAt(0).toUpperCase()}
              </div>
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style={{ color: "var(--text-tertiary)" }}>
                <path d="M3 5l3 3 3-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            {userDropdownOpen && (
              <div
                className="absolute right-0 mt-1 w-56 py-1 rounded-lg z-20"
                style={{
                  background: "var(--bg-card)",
                  border: "1px solid var(--border-primary)",
                  boxShadow: "var(--shadow-lg)",
                }}
              >
                <div className="px-4 py-2" style={{ borderBottom: "1px solid var(--border-primary)" }}>
                  <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>{user?.name || "User"}</p>
                  <p className="text-xs truncate" style={{ color: "var(--text-tertiary)" }}>{user?.email || ""}</p>
                </div>
                <Link
                  to="/admin/users"
                  className="flex items-center gap-2 px-4 py-2 text-sm transition-colors"
                  style={{ color: "var(--text-secondary)" }}
                  onClick={() => setUserDropdownOpen(false)}
                >
                  <svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor" style={{ opacity: 0.5 }}>
                    <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
                  </svg>
                  Manage Users
                </Link>
                <div style={{ borderTop: "1px solid var(--border-primary)" }} />
                <button
                  type="button"
                  onClick={handleLogout}
                  className="flex items-center gap-2 w-full px-4 py-2 text-sm"
                  style={{ color: "var(--danger)", background: "transparent", border: "none" }}
                >
                  <svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor" style={{ opacity: 0.5 }}>
                    <path fillRule="evenodd" d="M3 3a1 1 0 00-1 1v12a1 1 0 001 1h12a1 1 0 001-1V4a1 1 0 00-1-1H3zm4.293 4.293a1 1 0 011.414 0L10 8.586l1.293-1.293a1 1 0 111.414 1.414L11.414 10l1.293 1.293a1 1 0 01-1.414 1.414L10 11.414l-1.293 1.293a1 1 0 01-1.414-1.414L8.586 10 7.293 8.707a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}

export default AdminTopbar;
