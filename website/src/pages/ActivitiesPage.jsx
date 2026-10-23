import { useMemo, useState } from "react";

import PageBanner from "../components/PageBanner";
import { useSite } from "../context/SiteContext";
import { itemImages } from "../utils/media";

const ActivitiesPage = () => {
  const { site } = useSite();
  const page = site.pages?.activities || {};
  const rows = site.activities || [];
  const semesters = useMemo(() => ["All", ...new Set(rows.map((item) => item.semester).filter(Boolean))], [rows]);
  const [semester, setSemester] = useState("All");
  const [openId, setOpenId] = useState(rows[0]?.id || null);
  const visible = rows.filter((item) => semester === "All" || item.semester === semester);

  return (
    <div>
      <PageBanner kicker="Campus diary" title={page.title || "Activities"} intro={page.intro} image={page.background_url} />
      <div className="site-wrap site-section">
        <div className="album-row">
          {semesters.map((name) => (
            <button key={name} type="button" className={semester === name ? "chip is-on" : "chip"} onClick={() => setSemester(name)}>
              {name === "All" ? "All posts" : name}
            </button>
          ))}
        </div>
        {visible.length ? (
          <div className="activity-list">
            {visible.map((item) => {
              const photos = itemImages(item);
              return (
                <article key={item.id} className="activity-card" onClick={() => setOpenId(item.id)}>
                  {photos[0] ? <img src={photos[0]} alt="" /> : null}
                  <div>
                    <p className="meta">
                      {item.posted_on}
                      {[item.semester, item.class_name].filter(Boolean).length ? ` · ${[item.semester, item.class_name].filter(Boolean).join(" · ")}` : ""}
                    </p>
                    <h3>{item.title}</h3>
                    <p className={openId === item.id ? "letter" : ""}>
                      {openId === item.id ? item.body : `${(item.body || "").slice(0, 180)}${(item.body || "").length > 180 ? "…" : ""}`}
                    </p>
                    {photos.length > 1 ? (
                      <div className="activity-photos">
                        {photos.map((url) => (
                          <img key={url} src={url} alt="" />
                        ))}
                      </div>
                    ) : null}
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <p className="empty-note">Activities will appear here once they are published from Website settings.</p>
        )}
      </div>
    </div>
  );
};

export default ActivitiesPage;
