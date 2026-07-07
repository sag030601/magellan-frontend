import { useState, useEffect } from "react";
import { Outlet, useLocation } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import AdminTopbar from "../components/AdminTopbar";
import "../layouts/AdminLayout.css";

function AdminLayout() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const location = useLocation();

  useEffect(() => { setMobileSidebarOpen(false); }, [location.pathname]);

  useEffect(() => {
    const onScroll = () => setShowScrollTop(window.scrollY > 300);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const scrollToTop = () => window.scrollTo({ top: 0, behavior: "smooth" });

  return (
    <div
      id="admin-wrapper"
      className={`admin-wrapper flex min-h-screen ${sidebarCollapsed ? "sidebar-collapsed" : ""}`}
      style={{ background: "var(--bg-secondary)" }}
    >
      <div className={`admin-sidebar-wrap ${mobileSidebarOpen ? "mobile-open" : ""}`}>
        <Sidebar
          collapsed={sidebarCollapsed}
          onToggle={() => setSidebarCollapsed((c) => !c)}
        />
      </div>
      {mobileSidebarOpen && (
        <div
          className="admin-sidebar-overlay"
          onClick={() => setMobileSidebarOpen(false)}
          onKeyDown={(e) => e.key === "Escape" && setMobileSidebarOpen(false)}
          role="button"
          tabIndex={0}
          aria-label="Close menu"
        />
      )}

      <div id="content-wrapper" className="admin-content-wrapper flex flex-col flex-1 min-w-0">
        <AdminTopbar onMenuClick={() => setMobileSidebarOpen((o) => !o)} />

        <main id="content" className="admin-main flex-1 p-4 sm:p-6 lg:p-8">
          <div className="container-fluid mx-auto">
            <Outlet />
          </div>
        </main>

        <footer
          className="admin-footer py-3"
          style={{
            background: "var(--bg-primary)",
            borderTop: "1px solid var(--border-primary)",
          }}
        >
          <div className="container-fluid mx-auto text-center text-sm" style={{ color: "var(--text-tertiary)" }}>
            Copyright &copy; Magellan Crewing Management LLP {new Date().getFullYear()}
          </div>
        </footer>
      </div>

      <button
        type="button"
        onClick={scrollToTop}
        className={`admin-scroll-top fixed bottom-6 right-6 w-10 h-10 rounded-full text-white shadow-lg focus:outline-none transition-all z-20 ${
          showScrollTop ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
        style={{ background: "var(--accent)" }}
        aria-label="Scroll to top"
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="mx-auto">
          <path d="M8 12V4M4 8l4-4 4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
    </div>
  );
}

export default AdminLayout;
