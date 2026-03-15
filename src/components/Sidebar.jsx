import { useState } from "react";
import { Link, useLocation } from "react-router-dom";

function Sidebar({ collapsed, onToggle }) {
  const location = useLocation();
  const [candidatesOpen, setCandidatesOpen] = useState(true);
  const [reportsOpen, setReportsOpen] = useState(false);
  const [masterDataOpen, setMasterDataOpen] = useState(false);

  const navLink = (to, label, icon) => {
    const active = location.pathname === to || (to !== "/admin" && location.pathname.startsWith(to));
    return (
      <Link
        to={to}
        className={`flex items-center gap-2 px-3 py-2 text-sm rounded-md transition-colors ${
          active ? "bg-white/20 text-white font-medium" : "text-white/90 hover:bg-white/10"
        }`}
      >
        {icon && <span className="w-5 text-center">{icon}</span>}
        <span>{label}</span>
      </Link>
    );
  };

  return (
    <aside
      id="sidebar"
      className={`bg-gradient-to-b from-[#4e73df] to-[#224abe] text-white flex flex-col min-h-screen shadow-xl transition-all duration-300 ${
        collapsed ? "w-20" : "w-64"
      }`}
    >
      {/* Logo */}
      <div className="p-4 border-b border-white/10">
        <Link to="/admin/candidates" className="flex items-center justify-center gap-2">
          <img
            src="/img/Magellan_Logo-removebg-preview.png"
            alt="Magellan"
            className={`object-contain ${collapsed ? "h-10 w-10" : "h-12"}`}
            onError={(e) => { e.target.style.display = "none"; }}
          />
          {!collapsed && <span className="font-bold text-lg">Magellan</span>}
        </Link>
      </div>

      {/* Candidates section */}
      <div className="flex-1 py-4 overflow-y-auto">
        <div className="px-2 space-y-1">
          <button
            type="button"
            onClick={() => setCandidatesOpen(!candidatesOpen)}
            className="flex items-center justify-between w-full px-3 py-2 text-sm font-medium text-white rounded-md hover:bg-white/10 transition-colors"
          >
            <span className="flex items-center gap-2">
              <i className="fas fa-user-friends w-5 text-center" />
              {!collapsed && <span>Candidates</span>}
            </span>
            {!collapsed && (
              <i className={`fas fa-chevron-${candidatesOpen ? "down" : "right"} text-xs`} />
            )}
          </button>
          {candidatesOpen && !collapsed && (
            <div className="ml-4 mt-1 space-y-0.5 border-l border-white/20 pl-3">
              {navLink("/admin/candidates", "Candidates", "👥")}
              {navLink("/admin/add-candidate", "Add Candidates", "➕")}
              {navLink("/admin/owner", "Owner/Principal", "🏢")}
              {navLink("/admin/vessel", "Vessels", "🚢")}
              <button
                type="button"
                onClick={() => setReportsOpen(!reportsOpen)}
                className="flex items-center justify-between w-full px-3 py-2 text-sm text-white/90 rounded-md hover:bg-white/10"
              >
                <span>Reports</span>
                <i className={`fas fa-chevron-${reportsOpen ? "down" : "right"} text-xs`} />
              </button>
              {reportsOpen && (
                <div className="ml-2 mt-0.5 space-y-0.5">
                  {navLink("/admin/report", "Sign ON/OFF report", "")}
                  {navLink("/admin/document-report", "Documents report", "")}
                </div>
              )}
              {navLink("#", "Wages", "💰")}
              {navLink("#", "Forms", "📋")}
              {navLink("#", "Contract", "📄")}
              {navLink("#", "BirthDay", "🎂")}
              {navLink("#", "BroadCast Ads.", "📢")}
            </div>
          )}
        </div>

        {/* Master Data (admin) */}
        <div className="px-2 mt-4">
          <button
            type="button"
            onClick={() => setMasterDataOpen(!masterDataOpen)}
            className="flex items-center justify-between w-full px-3 py-2 text-sm font-medium text-white rounded-md hover:bg-white/10 transition-colors"
          >
            <span className="flex items-center gap-2">
              <i className="fas fa-th-list w-5 text-center" />
              {!collapsed && <span>Master Data</span>}
            </span>
            {!collapsed && (
              <i className={`fas fa-chevron-${masterDataOpen ? "down" : "right"} text-xs`} />
            )}
          </button>
          {masterDataOpen && !collapsed && (
            <div className="ml-4 mt-1 space-y-0.5 border-l border-white/20 pl-3">
              {navLink("/admin/state", "State", "")}
              {navLink("/admin/city", "City", "")}
              {navLink("/admin/availability-status", "Availability Status", "")}
              {navLink("/admin/seafarers-document-type", "Seafarers Document Type", "")}
              {navLink("/admin/pre-medical-document-type", "Pre-Medical Document Type", "")}
              {navLink("/admin/travel-document-type", "Travel Document Type", "")}
              {navLink("/admin/signoff-document-type", "Signoff Document Type", "")}
              {navLink("/admin/global-lookups", "Global Lookups", "")}
            </div>
          )}
        </div>
      </div>

      {/* Sidebar Toggle */}
      <div className="p-2 border-t border-white/10">
        <button
          type="button"
          onClick={onToggle}
          className="w-full flex items-center justify-center py-2 rounded-md hover:bg-white/10 transition-colors"
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          <i className={`fas fa-chevron-${collapsed ? "right" : "left"}`} />
        </button>
      </div>
    </aside>
  );
}

export default Sidebar;
