import { useSite } from "../context/SiteContext";

const ProgramsPage = () => {
  const { site } = useSite();
  const programs = site.pages?.programs || {};
  return (
    <div className="site-wrap site-section">
      <p className="eyebrow">Academics</p>
      <h1>{programs.title || "Programmes"}</h1>
      <p className="lead">{programs.intro}</p>
      <div className="card-grid">
        {(programs.items || []).map((item) => (
          <article key={item.name} className="card">
            <h3>{item.name}</h3>
            <p>{item.summary}</p>
          </article>
        ))}
      </div>
    </div>
  );
};

export default ProgramsPage;
