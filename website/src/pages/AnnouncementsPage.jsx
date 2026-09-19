import { Link } from "react-router-dom";

import PageBanner from "../components/PageBanner";
import { useSite } from "../context/SiteContext";

const AnnouncementsPage = () => {
  const { site } = useSite();
  const page = site.pages?.announcements || {};
  return (
    <div>
      <PageBanner kicker="News" title={page.title || "Announcements"} intro={page.intro} image={page.background_url} />
      <div className="site-wrap site-section">
        <div className="card-grid">
          {(site.announcements || []).map((item) => (
            <Link key={item.id} to={`/announcements/${item.id}`} className="card">
              {item.image_url ? <img src={item.image_url} alt="" className="card-media" /> : null}
              <h3>{item.title}</h3>
              <p>{item.excerpt || item.body?.slice(0, 160)}</p>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AnnouncementsPage;
