import PageBanner from "../components/PageBanner";
import { useSite } from "../context/SiteContext";

const AlumniPage = () => {
  const { site } = useSite();
  const page = site.pages?.alumni || {};
  return (
    <div>
      <PageBanner kicker="Network" title={page.title || "Alumni"} intro={page.intro} image={page.background_url} />
      <div className="site-wrap site-section">
        <div className="people-grid">
          {(site.alumni || []).map((item) => (
            <article key={item.id} className="person-card">
              {item.photo_url ? <img src={item.photo_url} alt={item.name} /> : <div className="person-fallback">{item.name.slice(0, 1)}</div>}
              <h3>{item.name}</h3>
              <p className="meta">{[item.program, item.batch].filter(Boolean).join(" · ")}</p>
              {item.current_role ? <p className="degrees">{item.current_role}</p> : null}
              {item.story ? <p>{item.story}</p> : null}
            </article>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AlumniPage;
