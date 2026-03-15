import { NavLink, Outlet } from "react-router";

export function Layout() {
  return (
    <>
      <nav className="navbar">
        <NavLink to="/" className="navbar-brand">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2L2 7l10 5 10-5-10-5z" />
            <path d="M2 17l10 5 10-5" />
            <path d="M2 12l10 5 10-5" />
          </svg>
          Skill Manager
        </NavLink>

        <ul className="navbar-nav">
          <li>
            <NavLink to="/skills" className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="7" height="7" />
                <rect x="14" y="3" width="7" height="7" />
                <rect x="3" y="14" width="7" height="7" />
                <rect x="14" y="14" width="7" height="7" />
              </svg>
              Skills
            </NavLink>
          </li>
          <li>
            <NavLink to="/marketplace" className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 7h18" />
                <path d="M5 7V5a2 2 0 0 1 2-2h2" />
                <path d="M19 7V5a2 2 0 0 0-2-2h-2" />
                <path d="M6 7v11a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V7" />
                <path d="M9 12h6" />
                <path d="M12 9v6" />
              </svg>
              Marketplace
            </NavLink>
          </li>
          <li>
            <NavLink to="/create" className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 20h9" />
                <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
              </svg>
              Create
            </NavLink>
          </li>
          <li>
            <NavLink to="/generate" className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M15 4V2" /><path d="M15 16v-2" /><path d="M8 9h2" /><path d="M20 9h2" />
                <path d="M17.8 11.8 20 14" /><path d="M15 7a2 2 0 1 0 0-4 2 2 0 0 0 0 4z" />
                <path d="M17.8 6.2 20 4" />
                <path d="m3 21 9-9" /><path d="M12.2 6.2 10 4" />
              </svg>
              AI Generate
            </NavLink>
          </li>
        </ul>
      </nav>

      <main className="main-content" role="main">
        <Outlet />
      </main>

      <footer className="footer">
        <p>© 2026 Skill Manager — Built with Tauri by CodingAfternoon</p>
      </footer>
    </>
  );
}
