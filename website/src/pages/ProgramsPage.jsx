import PageBanner from "../components/PageBanner";
import { useSite } from "../context/SiteContext";

const ProgramsPage = () => {
  const { site } = useSite();
  const programs = site.pages?.programs || {};
  return (
    <div>
      <PageBanner kicker="Academics" title={programs.title || "Programmes"} intro={programs.intro} image={programs.background_url} />
      <div className="site-wrap site-section">
        <div className="card-grid">
          {(programs.items || []).map((item) => (
            <article key={item.name} className="card">
              <h3>{item.name}</h3>
              <p>{item.summary}</p>
            </article>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ProgramsPage;
