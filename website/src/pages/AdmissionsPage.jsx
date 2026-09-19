import { useSite } from "../context/SiteContext";

const AdmissionsPage = () => {
  const { site } = useSite();
  const admissions = site.pages?.admissions || {};
  return (
    <div className="site-wrap site-section">
      <p className="eyebrow">Join us</p>
      <h1>{admissions.title || "Admissions"}</h1>
      <p className="lead">{admissions.intro}</p>
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
  );
};

export default AdmissionsPage;
