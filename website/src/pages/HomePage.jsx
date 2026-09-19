import { Link } from "react-router-dom";

import { useSite } from "../context/SiteContext";

const HomePage = () => {
  const { site } = useSite();
  const home = site.pages?.home || {};
  const latest = (site.announcements || []).slice(0, 3);
  const photos = (site.gallery || []).slice(0, 6);
  const faculty = (site.teachers || []).slice(0, 3);
  const vc = site.pages?.vc || {};
  const flags = site.page_flags || {};

  return (
    <div>
      <section
        className="site-hero"
        style={
          site.hero_image_url || home.background_url
            ? { backgroundImage: `linear-gradient(105deg, rgba(8,16,36,0.88) 8%, rgba(8,16,36,0.42)), url(${site.hero_image_url || home.background_url})` }
            : undefined
        }
      >
        <div className="site-wrap">
          <p className="eyebrow">{site.tagline}</p>
          <h1>{home.hero_title || site.site_name}</h1>
          <p className="lead">{home.hero_subtitle}</p>
          <div className="hero-actions">
            {flags.admissions !== false ? <Link className="btn-primary" to="/admissions">Admissions</Link> : null}
            {flags.programs !== false ? <Link className="btn-ghost" to="/programs">Explore programmes</Link> : null}
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
      {flags.announcements !== false && latest.length ? (
        <section className="site-wrap site-section">
          <div className="section-head">
            <h2>Latest announcements</h2>
            <Link to="/announcements">View all</Link>
          </div>
          <div className="card-grid">
            {latest.map((item) => (
              <Link key={item.id} to={`/announcements/${item.id}`} className="card">
                {item.image_url ? <img src={item.image_url} alt="" className="card-media" /> : null}
                <h3>{item.title}</h3>
                <p>{item.excerpt || item.body?.slice(0, 140)}</p>
              </Link>
            ))}
          </div>
        </section>
      ) : null}
      {flags.teachers !== false && faculty.length ? (
        <section className="site-wrap site-section">
          <div className="section-head">
            <h2>Faculty highlights</h2>
            <Link to="/teachers">Meet the faculty</Link>
          </div>
          <div className="people-grid">
            {faculty.map((item) => (
              <article key={item.id} className="person-card">
                {item.photo_url ? <img src={item.photo_url} alt={item.name} /> : <div className="person-fallback">{item.name.slice(0, 1)}</div>}
                <h3>{item.name}</h3>
                <p className="meta">{item.designation}</p>
                <p>{item.degrees}</p>
              </article>
            ))}
          </div>
        </section>
      ) : null}
      {flags.vc !== false && vc.body ? (
        <section className="site-wrap site-section vc-teaser">
          {vc.photo_url ? <img src={vc.photo_url} alt={vc.name} /> : null}
          <div>
            <p className="eyebrow">{vc.role}</p>
            <h2>{vc.title}</h2>
            <p>{vc.body.slice(0, 240)}…</p>
            <Link to="/vc">Read the full message</Link>
          </div>
        </section>
      ) : null}
      {flags.gallery !== false && photos.length ? (
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
