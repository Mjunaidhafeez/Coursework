import PageBanner from "../components/PageBanner";
import { useSite } from "../context/SiteContext";

const AboutPage = () => {
  const { site } = useSite();
  const about = site.pages?.about || {};
  const counts = site.counts || {};
  const stats = [
    { label: "Programmes", value: counts.programmes ?? 0 },
    { label: "Students", value: counts.students ?? 0 },
    { label: "Faculty", value: counts.faculty ?? 0 },
  ];
  return (
    <div>
      <PageBanner kicker="About" title={about.title || "About"} intro={about.mission} image={about.background_url} />
      <div className="site-wrap site-section">
        <p className="prose">{about.history}</p>
        <div className="card-grid" style={{ marginTop: 28 }}>
          {stats.map((item) => (
            <article key={item.label} className="card stat-card">
              <h3>{item.value}</h3>
              <p>{item.label}</p>
            </article>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AboutPage;
