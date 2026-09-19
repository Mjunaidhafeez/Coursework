import { Link } from "react-router-dom";

import { useSite } from "../context/SiteContext";

const AnnouncementsPage = () => {
  const { site } = useSite();
  return (
    <div className="site-wrap site-section">
      <p className="eyebrow">News</p>
      <h1>Announcements</h1>
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
  );
};

export default AnnouncementsPage;
