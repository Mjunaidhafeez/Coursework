import { useMemo, useState } from "react";

import PageBanner from "../components/PageBanner";
import { useSite } from "../context/SiteContext";

const GalleryPage = () => {
  const { site } = useSite();
  const page = site.pages?.gallery || {};
  const items = site.gallery || [];
  const albums = useMemo(() => ["All", ...new Set(items.map((item) => item.album || "Campus"))], [items]);
  const [album, setAlbum] = useState("All");
  const visible = album === "All" ? items : items.filter((item) => item.album === album);

  return (
    <div>
      <PageBanner kicker="Campus" title={page.title || "Gallery"} intro={page.intro} image={page.background_url} />
      <div className="site-wrap site-section">
        <div className="album-row">
          {albums.map((name) => (
            <button key={name} type="button" className={album === name ? "chip is-on" : "chip"} onClick={() => setAlbum(name)}>
              {name}
            </button>
          ))}
        </div>
        <div className="gallery-grid">
          {visible.map((item) => (
            <figure key={item.id}>
              <img src={item.image_url} alt={item.title || item.album} />
              {item.title ? <figcaption>{item.title}</figcaption> : null}
            </figure>
          ))}
        </div>
      </div>
    </div>
  );
};

export default GalleryPage;
