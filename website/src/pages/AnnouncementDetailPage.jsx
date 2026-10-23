import { Link, useParams } from "react-router-dom";

import { useSite } from "../context/SiteContext";
import { itemImages } from "../utils/media";

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
  const photos = itemImages(item);
  return (
    <div className="site-wrap site-section">
      <Link to="/announcements">All announcements</Link>
      <h1>{item.title}</h1>
      {photos[0] ? <img src={photos[0]} alt="" className="detail-media" /> : null}
      <p className="letter">{item.body}</p>
      {photos.length > 1 ? (
        <div className="activity-photos">
          {photos.slice(1).map((url) => (
            <img key={url} src={url} alt="" />
          ))}
        </div>
      ) : null}
    </div>
  );
};

export default AnnouncementDetailPage;
