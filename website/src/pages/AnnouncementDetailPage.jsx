import { Link, useParams } from "react-router-dom";

import { useSite } from "../context/SiteContext";

const AnnouncementDetailPage = () => {
  const { id } = useParams();
  const { site } = useSite();
  const item = (site.announcements || []).find((row) => String(row.id) === String(id));
  if (!item) {
    return (
      <div className="site-wrap site-section">
        <p>Announcement not found.</p>
        <Link to="/announcements">Back</Link>
      </div>
    );
  }
  return (
    <div className="site-wrap site-section">
      <Link to="/announcements">All announcements</Link>
      <h1>{item.title}</h1>
      {item.image_url ? <img src={item.image_url} alt="" className="detail-media" /> : null}
      <p className="letter">{item.body}</p>
    </div>
  );
};

export default AnnouncementDetailPage;
