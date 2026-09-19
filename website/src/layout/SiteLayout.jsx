import { useState } from "react";
import { Link, NavLink, Outlet } from "react-router-dom";

import { useSite } from "../context/SiteContext";

const SiteLayout = () => {
  const { site, loading } = useSite();
  const [open, setOpen] = useState(false);
  const nav = site.nav || [];

  return (
    <div className="site-shell">
      <header className="site-header">
        <div className="site-wrap site-header-inner">
          <Link to="/" className="site-brand" onClick={() => setOpen(false)}>
            {site.logo_url ? <img src={site.logo_url} alt={site.site_name} /> : null}
            <span>
              <strong>{site.site_name}</strong>
              {site.tagline ? <em>{site.tagline}</em> : null}
            </span>
          </Link>
          <button className="site-menu-btn" type="button" onClick={() => setOpen((v) => !v)} aria-label="Menu">
            Menu
          </button>
          <nav className={`site-nav ${open ? "is-open" : ""}`}>
            {nav.map((item) => (
              <NavLink key={item.path} to={item.path} end={item.path === "/"} onClick={() => setOpen(false)}>
                {item.label}
              </NavLink>
            ))}
            {site.show_login_button ? (
              <a className="site-login" href={site.login_path || "/login"}>
                {site.login_label || "Login"}
              </a>
            ) : null}
          </nav>
        </div>
      </header>
      <main className="site-main">{loading ? <div className="site-wrap site-loading">Loading…</div> : <Outlet />}</main>
      <footer className="site-footer">
        <div className="site-wrap site-footer-grid">
          <div>
            <strong>{site.site_name}</strong>
            <p>{site.footer_text}</p>
          </div>
          <div>
            {site.address ? <p>{site.address}</p> : null}
            {site.phone ? <p>{site.phone}</p> : null}
            {site.email ? <p>{site.email}</p> : null}
          </div>
          <div className="site-socials">
            {site.facebook ? <a href={site.facebook}>Facebook</a> : null}
            {site.twitter ? <a href={site.twitter}>Twitter</a> : null}
            {site.instagram ? <a href={site.instagram}>Instagram</a> : null}
            {site.youtube ? <a href={site.youtube}>YouTube</a> : null}
          </div>
        </div>
      </footer>
    </div>
  );
};

export default SiteLayout;
