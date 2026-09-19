import { Link } from "react-router-dom";

import { useSite } from "../context/SiteContext";

const HomePage = () => {
  const { site } = useSite();
  const home = site.pages?.home || {};
  const latest = (site.announcements || []).slice(0, 3);
  const photos = (site.gallery || []).slice(0, 6);
  const vc = site.pages?.vc || {};

  return (
    <div>
      <section className="site-hero" style={site.hero_image_url ? { backgroundImage: `linear-gradient(90deg, rgba(10,20,48,0.82), rgba(10,20,48,0.45)), url(${site.hero_image_url})` } : undefined}>
        <div className="site-wrap">
          <p className="eyebrow">{site.tagline}</p>
          <h1>{home.hero_title || site.site_name}</h1>
          <p className="lead">{home.hero_subtitle}</p>
          <div className="hero-actions">
            <Link className="btn-primary" to="/admissions">Admissions</Link>
            <Link className="btn-ghost" to="/programs">Explore programmes</Link>
            {site.show_login_button ? <a className="btn-ghost" href={site.login_path || "/login"}>{site.login_label || "Login"}</a> : null}
          </div>
        </div>
      </section>
      <section className="site-wrap site-section">
        <div className="card-grid">
          {(home.highlights || []).map((item) => (
            <article key={item.title} className="card">
              <h3>{item.title}</h3>
              <p>{item.text}</p>
            </article>
          ))}
        </div>
      </section>
      <section className="site-wrap site-section">
        <div className="section-head">
          <h2>Latest announcements</h2>
          <Link to="/announcements">View all</Link>
        </div>
        <div className="card-grid">
          {latest.map((item) => (
            <Link key={item.id} to={`/announcements/${item.id}`} className="card">
              <h3>{item.title}</h3>
              <p>{item.excerpt || item.body?.slice(0, 140)}</p>
            </Link>
          ))}
        </div>
      </section>
      {vc.body ? (
        <section className="site-wrap site-section vc-teaser">
          {vc.photo_url ? <img src={vc.photo_url} alt={vc.name} /> : null}
          <div>
            <p className="eyebrow">{vc.role}</p>
            <h2>{vc.title}</h2>
            <p>{vc.body.slice(0, 220)}…</p>
            <Link to="/vc">Read the full message</Link>
          </div>
        </section>
      ) : null}
      {photos.length ? (
        <section className="site-wrap site-section">
          <div className="section-head">
            <h2>Campus gallery</h2>
            <Link to="/gallery">Open gallery</Link>
          </div>
          <div className="gallery-grid">
            {photos.map((item) => (
              <img key={item.id} src={item.image_url} alt={item.title || item.album} />
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
};

export default HomePage;
