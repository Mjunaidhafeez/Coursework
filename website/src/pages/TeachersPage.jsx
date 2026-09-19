import PageBanner from "../components/PageBanner";
import { useSite } from "../context/SiteContext";

const TeachersPage = () => {
  const { site } = useSite();
  const page = site.pages?.teachers || {};
  return (
    <div>
      <PageBanner kicker="Faculty" title={page.title || "Faculty"} intro={page.intro} image={page.background_url} />
      <div className="site-wrap site-section">
        <div className="people-grid">
          {(site.teachers || []).map((item) => (
            <article key={item.id} className="person-card">
              {item.photo_url ? <img src={item.photo_url} alt={item.name} /> : <div className="person-fallback">{item.name.slice(0, 1)}</div>}
              <h3>{item.name}</h3>
              <p className="meta">{[item.designation, item.department].filter(Boolean).join(" · ")}</p>
              {item.degrees ? <p className="degrees">{item.degrees}</p> : null}
              {item.bio ? <p>{item.bio}</p> : null}
            </article>
          ))}
        </div>
      </div>
    </div>
  );
};

export default TeachersPage;
