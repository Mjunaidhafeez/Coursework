import PageBanner from "../components/PageBanner";
import { useSite } from "../context/SiteContext";

const SimpleCardsPage = ({ pageKey, kicker }) => {
  const { site } = useSite();
  const page = site.pages?.[pageKey] || {};
  return (
    <div>
      <PageBanner kicker={kicker} title={page.title} intro={page.intro} image={page.background_url} />
      <div className="site-wrap site-section">
        <div className="card-grid">
          {(page.items || []).map((item) => (
            <article key={item.title} className="card">
              <h3>{item.title}</h3>
              <p>{item.text}</p>
            </article>
          ))}
        </div>
      </div>
    </div>
  );
};

export default SimpleCardsPage;
