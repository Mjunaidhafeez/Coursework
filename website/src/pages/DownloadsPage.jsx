import { useSite } from "../context/SiteContext";

const DownloadsPage = () => {
  const { site } = useSite();
  return (
    <div className="site-wrap site-section">
      <p className="eyebrow">Resources</p>
      <h1>Downloads</h1>
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
  );
};

export default DownloadsPage;
