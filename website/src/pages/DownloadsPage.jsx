import PageBanner from "../components/PageBanner";
import { useSite } from "../context/SiteContext";

const DownloadsPage = () => {
  const { site } = useSite();
  const page = site.pages?.downloads || {};
  return (
    <div>
      <PageBanner kicker="Resources" title={page.title || "Downloads"} intro={page.intro} image={page.background_url} />
      <div className="site-wrap site-section">
        <div className="card-grid">
          {(site.downloads || []).map((item) => (
            <article key={item.id} className="card">
              <h3>{item.title}</h3>
              <p>{item.description}</p>
              <a className="btn-primary" href={item.file_url} target="_blank" rel="noreferrer">
                Download {item.original_name || "file"}
              </a>
            </article>
          ))}
        </div>
      </div>
    </div>
  );
};

export default DownloadsPage;
