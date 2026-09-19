import { useState } from "react";
import { Link, NavLink, Outlet } from "react-router-dom";

import { useSite } from "../context/SiteContext";

const SiteLayout = () => {
  const { site, loading } = useSite();
  const [open, setOpen] = useState(false);
  const nav = site.nav || [];

  return (
    <div className="site-shell">
      <div className="site-topbar">
        <div className="site-wrap site-topbar-inner">
          <span>{[site.phone, site.email, site.address].filter(Boolean).join("  ·  ")}</span>
          <span className="site-top-socials">
            {site.facebook ? <a href={site.facebook}>Facebook</a> : null}
            {site.twitter ? <a href={site.twitter}>X</a> : null}
            {site.instagram ? <a href={site.instagram}>Instagram</a> : null}
            {site.youtube ? <a href={site.youtube}>YouTube</a> : null}
          </span>
        </div>
      </div>
      <header className="site-header">
        <div className="site-wrap site-header-inner">
          <Link to="/" className="site-brand" onClick={() => setOpen(false)}>
            {site.logo_url ? <img src={site.logo_url} alt={site.site_name} /> : <span className="brand-mark">{(site.site_name || "U").slice(0, 1)}</span>}
            <span>
              <strong>{site.site_name}</strong>
              {site.tagline ? <em>{site.tagline}</em> : null}
            </span>
          </Link>
          <button className="site-menu-btn" type="button" onClick={() => setOpen((v) => !v)} aria-label="Menu">
            {open ? "Close" : "Menu"}
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
            <strong>Visit</strong>
            {site.address ? <p>{site.address}</p> : null}
            {site.phone ? <p>{site.phone}</p> : null}
            {site.email ? <p>{site.email}</p> : null}
          </div>
          <div>
            <strong>Explore</strong>
            <div className="site-socials">
              {nav.slice(0, 6).map((item) => (
                <Link key={item.path} to={item.path}>{item.label}</Link>
              ))}
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default SiteLayout;
