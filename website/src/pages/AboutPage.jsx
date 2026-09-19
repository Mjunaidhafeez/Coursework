import { useSite } from "../context/SiteContext";

const AboutPage = () => {
  const { site } = useSite();
  const about = site.pages?.about || {};
  return (
    <div className="site-wrap site-section">
      <p className="eyebrow">About</p>
      <h1>{about.title || "About"}</h1>
      <p className="lead">{about.mission}</p>
      <p>{about.history}</p>
      <div className="card-grid">
        {(about.stats || []).map((item) => (
          <article key={item.label} className="card">
            <h3>{item.value}</h3>
            <p>{item.label}</p>
          </article>
        ))}
      </div>
    </div>
  );
};

export default AboutPage;
