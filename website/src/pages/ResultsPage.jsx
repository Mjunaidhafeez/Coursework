import PageBanner from "../components/PageBanner";
import { useSite } from "../context/SiteContext";

const ResultsPage = () => {
  const { site } = useSite();
  const page = site.pages?.results || {};
  return (
    <div>
      <PageBanner kicker="Achievement" title={page.title || "Results"} intro={page.intro} image={page.background_url} />
      <div className="site-wrap site-section">
        <div className="result-grid">
          {(site.results || []).map((item) => (
            <article key={item.id} className="result-card">
              {item.photo_url ? <img src={item.photo_url} alt={item.student_name} /> : <div className="person-fallback">{item.student_name.slice(0, 1)}</div>}
              <div>
                <h3>{item.student_name}</h3>
                <p className="meta">Roll {item.roll_no}{item.program ? ` · ${item.program}` : ""}{item.year ? ` · ${item.year}` : ""}</p>
                <p className="result-score">{[item.grade, item.marks].filter(Boolean).join(" · ")}</p>
                {item.teacher_names ? <p><strong>Faculty:</strong> {item.teacher_names}</p> : null}
                {item.degrees ? <p><strong>Degrees:</strong> {item.degrees}</p> : null}
              </div>
            </article>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ResultsPage;
