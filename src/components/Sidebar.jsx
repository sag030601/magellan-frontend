import { useState, useCallback } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

function Sidebar({ collapsed, onToggle }) {
  const location = useLocation();
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const [candidatesOpen, setCandidatesOpen] = useState(true);
  const [reportsOpen, setReportsOpen] = useState(false);
  const [masterDataOpen, setMasterDataOpen] = useState(false);

  const isActive = useCallback(
    (to) => location.pathname === to || (to !== "/admin" && location.pathname.startsWith(to)),
    [location.pathname],
  );

  const navLink = (to, label) => {
    if (to === "#") {
      return (
        <span
          className="flex items-center gap-2 px-3 py-1.5 text-[13px] rounded-md text-white/40 cursor-default select-none"
          title="Coming soon"
        >
          <span>{label}</span>
        </span>
      );
    }
    const active = isActive(to);
    return (
      <Link
        to={to}
        className={`flex items-start gap-2 px-3 py-2 text-[12px] rounded-lg transition-colors ${
          active ? "bg-white/15 text-white font-semibold" : "text-white/80 hover:bg-white/10 hover:text-white"
        }`}
        style={{ margin: "1px 0" }}
      >
        <span style={{ whiteSpace: "normal", lineHeight: 1.2, wordBreak: "break-word" }}>{label}</span>
      </Link>
    );
  };

  const SectionToggle = ({ open, onClick, label, icon }) => (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center justify-between w-full px-3 py-2 text-[13px] font-semibold text-white/90 rounded-lg hover:bg-white/10 transition-colors"
      style={{ margin: "2px 0" }}
    >
      <span className="flex items-center gap-2">
        {icon}
        {!collapsed && <span>{label}</span>}
      </span>
      {!collapsed && (
        <svg
          width="12" height="12" viewBox="0 0 12 12" fill="none"
          className={`transition-transform ${open ? "rotate-90" : ""}`}
        >
          <path d="M4.5 2.5L8 6l-3.5 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
    </button>
  );

  return (
    <aside
      id="sidebar"
      className={`flex flex-col h-full min-h-0 transition-all duration-300 ${collapsed ? "w-20" : "w-64"}`}
      style={{ background: "var(--bg-sidebar)" }}
    >
      <div className="sidebar-nav-scroll flex-1 min-h-0 overflow-y-auto overflow-x-hidden py-4 px-2">
        <div className="space-y-1.5">
          <SectionToggle
            open={candidatesOpen}
            onClick={() => setCandidatesOpen(!candidatesOpen)}
            label="Candidates"
            icon={
              <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor" className="opacity-70">
                <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
              </svg>
            }
          />
          {candidatesOpen && !collapsed && (
            <div
              className="ml-2 mt-1 space-y-1 pl-3 pr-2 py-2 rounded-lg"
              style={{
                borderLeft: "1px solid rgba(255,255,255,0.12)",
                background: "rgba(255,255,255,0.035)",
                boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.03)",
              }}
            >
              {navLink("/admin", "Candidates")}
              {navLink("/admin/add-candidate", "Add Candidates")}
              {navLink("/admin/owner", "Owner / Principal")}
              {navLink("/admin/vessel", "Vessels")}

              <SectionToggle
                open={reportsOpen}
                onClick={() => setReportsOpen(!reportsOpen)}
                label="Reports"
                icon={
                  <svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor" className="opacity-60">
                    <path fillRule="evenodd" d="M6 2a2 2 0 00-2 2v12a2 2 0 002 2h8a2 2 0 002-2V7.414A2 2 0 0015.414 6L12 2.586A2 2 0 0010.586 2H6zm2 10a1 1 0 10-2 0v3a1 1 0 102 0v-3zm2-3a1 1 0 011 1v5a1 1 0 11-2 0v-5a1 1 0 011-1zm4-1a1 1 0 10-2 0v7a1 1 0 102 0V8z" clipRule="evenodd" />
                  </svg>
                }
              />
              {reportsOpen && (
                <div className="ml-2 space-y-1 py-1 pr-1">
                  {navLink("/admin/report", "Sign ON/OFF Report")}
                  {navLink("/admin/document-report", "Documents Report")}
                </div>
              )}

              {navLink("#", "Wages")}
              {navLink("#", "Forms")}
              {navLink("#", "Contract")}
              {navLink("#", "Birthday")}
              {navLink("#", "Broadcast Ads")}
            </div>
          )}
        </div>

        <div className="mt-4">
          {!collapsed && (
            <div className="px-1 mb-2">
              {navLink("/admin/activity-log", "Activity Log")}
            </div>
          )}
        {isAdmin && (
          <>
          <SectionToggle
            open={masterDataOpen}
            onClick={() => setMasterDataOpen(!masterDataOpen)}
            label="Master Data"
            icon={
              <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor" className="opacity-70">
                <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
              </svg>
            }
          />
          {masterDataOpen && !collapsed && (
            <div
              className="ml-2 mt-1 space-y-1 pl-3 pr-2 py-2 rounded-lg"
              style={{
                borderLeft: "1px solid rgba(255,255,255,0.12)",
                background: "rgba(255,255,255,0.035)",
                boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.03)",
              }}
            >
              {navLink("/admin/users", "User Management")}
              {navLink("/admin/country", "Country")}
              {navLink("/admin/global-lookups", "Global Lookups")}
              {navLink("/admin/state", "State")}
              {navLink("/admin/city", "City")}
              {navLink("/admin/availability-status", "Availability Status")}
              {navLink("/admin/seafarers-document-type", "Seafarers Document Type")}
              {navLink("/admin/pre-medical-document-type", "Pre-Medical Document Type")}
              {navLink("/admin/travel-document-type", "Travel Document Type")}
              {navLink("/admin/signoff-document-type", "Signoff Document Type")}
            </div>
          )}
          </>
        )}
        </div>
      </div>

      <div className="sidebar-footer flex-shrink-0 p-2" style={{ borderTop: "1px solid rgba(255,255,255,0.08)" }}>
        <button
          type="button"
          onClick={onToggle}
          className="w-full flex items-center justify-center py-2 rounded-md hover:bg-white/10 transition-colors text-white/70"
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path
              d={collapsed ? "M6 4l4 4-4 4" : "M10 4l-4 4 4 4"}
              stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
            />
          </svg>
        </button>
      </div>
    </aside>
  );
}

export default Sidebar;
