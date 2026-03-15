import { useState } from "react";
import { Link } from "react-router-dom";

function AdminTopbar({ onMenuClick }) {
  const [searchQuery, setSearchQuery] = useState("");
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [searchDropdownOpen, setSearchDropdownOpen] = useState(false);

  const user = { name: "User", email: "user@example.com" };

  return (
    <nav className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-30">
      <div className="flex items-center justify-between h-16 px-4">
        {/* Sidebar toggle (mobile) */}
        <button
          type="button"
          onClick={onMenuClick}
          className="md:hidden p-2 rounded-lg text-gray-600 hover:bg-gray-100"
          aria-label="Toggle menu"
        >
          <i className="fas fa-bars" />
        </button>

        {/* Search + Company name */}
        <div className="flex-1 flex items-center gap-4 max-w-3xl">
          <div className="hidden sm:flex flex-1 max-w-md">
            <div className="relative w-full">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search for..."
                className="w-full pl-4 pr-10 py-2 text-sm border border-gray-200 rounded-lg bg-gray-50 focus:bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition"
                aria-label="Search"
              />
              <button
                type="button"
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-gray-500 hover:text-blue-600"
              >
                <i className="fas fa-search text-sm" />
              </button>
            </div>
          </div>
          <div className="text-primary font-semibold text-sm sm:text-base whitespace-nowrap">
            MAGELLAN CREWING MANAGEMENT LLP
          </div>
        </div>

        {/* User dropdown */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setUserDropdownOpen(!userDropdownOpen)}
            className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-100 transition-colors"
            aria-expanded={userDropdownOpen}
            aria-haspopup="true"
          >
            <span className="hidden md:inline text-gray-700 text-sm font-medium">
              {user.name}
            </span>
            <img
              src="https://www.gravatar.com/avatar/?d=mp"
              alt=""
              className="w-8 h-8 rounded-full border-2 border-gray-200"
            />
            <i className="fas fa-chevron-down text-gray-500 text-xs" />
          </button>
          {userDropdownOpen && (
            <>
              <div
                className="fixed inset-0 z-10"
                aria-hidden="true"
                onClick={() => setUserDropdownOpen(false)}
              />
              <div className="absolute right-0 mt-1 w-56 py-1 bg-white rounded-lg shadow-lg border border-gray-100 z-20">
                <div className="px-4 py-2 border-b border-gray-100">
                  <p className="text-sm font-medium text-gray-900">{user.name}</p>
                  <p className="text-xs text-gray-500 truncate">{user.email}</p>
                </div>
                <Link
                  to="/admin/settings"
                  className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                  onClick={() => setUserDropdownOpen(false)}
                >
                  <i className="fas fa-cog text-gray-400 w-4" />
                  Settings
                </Link>
                <Link
                  to="/admin/users"
                  className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                  onClick={() => setUserDropdownOpen(false)}
                >
                  <i className="fas fa-list text-gray-400 w-4" />
                  Manage Users
                </Link>
                <div className="border-t border-gray-100" />
                <Link
                  to="/"
                  className="flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                  onClick={() => setUserDropdownOpen(false)}
                >
                  <i className="fas fa-sign-out-alt text-gray-400 w-4" />
                  Logout
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}

export default AdminTopbar;
