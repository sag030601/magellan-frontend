import { useState, useEffect } from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import AdminTopbar from "../components/AdminTopbar";
import "../layouts/AdminLayout.css";

function AdminLayout() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);

  useEffect(() => {
    const onScroll = () => setShowScrollTop(window.scrollY > 300);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const scrollToTop = () => window.scrollTo({ top: 0, behavior: "smooth" });

  return (
    <div
      id="admin-wrapper"
      className={`admin-wrapper flex min-h-screen bg-gray-100 ${sidebarCollapsed ? "sidebar-collapsed" : ""}`}
    >
      {/* Sidebar - desktop always visible; mobile overlay when open */}
      <div
        className={`admin-sidebar-wrap ${mobileSidebarOpen ? "mobile-open" : ""}`}
        aria-hidden={!mobileSidebarOpen}
      >
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

      {/* Content wrapper */}
      <div id="content-wrapper" className="admin-content-wrapper flex flex-col flex-1 min-w-0">
        <AdminTopbar onMenuClick={() => setMobileSidebarOpen((o) => !o)} />

        <main id="content" className="admin-main flex-1 p-4 sm:p-6 lg:p-8">
          <div className="container-fluid mx-auto">
            <Outlet />
          </div>
        </main>

        <footer className="admin-footer bg-white border-t border-gray-200 py-3">
          <div className="container-fluid mx-auto text-center text-sm text-gray-500">
            Copyright &copy; Magellan Crewing Management LLP {new Date().getFullYear()}
          </div>
        </footer>
      </div>

      {/* Scroll to top */}
      <button
        type="button"
        onClick={scrollToTop}
        className={`admin-scroll-top fixed bottom-6 right-6 w-10 h-10 rounded-full bg-blue-600 text-white shadow-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all z-20 ${
          showScrollTop ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
        aria-label="Scroll to top"
      >
        <i className="fas fa-angle-up" />
      </button>
    </div>
  );
}

export default AdminLayout;
