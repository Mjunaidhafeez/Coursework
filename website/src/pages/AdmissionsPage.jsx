import PageBanner from "../components/PageBanner";
import { useSite } from "../context/SiteContext";

const AdmissionsPage = () => {
  const { site } = useSite();
  const admissions = site.pages?.admissions || {};
  return (
    <div>
      <PageBanner kicker="Join us" title={admissions.title || "Admissions"} intro={admissions.intro} image={admissions.background_url} />
      <div className="site-wrap site-section">
        <div className="card-grid">
          {(admissions.steps || []).map((item) => (
            <article key={item.title} className="card">
              <h3>{item.title}</h3>
              <p>{item.text}</p>
            </article>
          ))}
        </div>
        {admissions.requirements ? (
          <section className="card" style={{ marginTop: 24 }}>
            <h3>Requirements</h3>
            <p>{admissions.requirements}</p>
          </section>
        ) : null}
      </div>
    </div>
  );
};

export default AdmissionsPage;
