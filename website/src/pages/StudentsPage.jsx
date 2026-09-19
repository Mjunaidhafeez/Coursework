import { useMemo, useState } from "react";

import PageBanner from "../components/PageBanner";
import { useSite } from "../context/SiteContext";

const StudentsPage = () => {
  const { site } = useSite();
  const page = site.pages?.students || {};
  const rows = site.students || [];
  const semesters = useMemo(() => ["All", ...new Set(rows.map((item) => item.semester).filter(Boolean))], [rows]);
  const classes = useMemo(() => ["All", ...new Set(rows.map((item) => item.class_name).filter(Boolean))], [rows]);
  const [semester, setSemester] = useState("All");
  const [className, setClassName] = useState("All");
  const visible = rows.filter((item) => (semester === "All" || item.semester === semester) && (className === "All" || item.class_name === className));

  return (
    <div>
      <PageBanner kicker="Directory" title={page.title || "Students"} intro={page.intro} image={page.background_url} />
      <div className="site-wrap site-section">
        <div className="album-row">
          {semesters.map((name) => (
            <button key={name} type="button" className={semester === name ? "chip is-on" : "chip"} onClick={() => setSemester(name)}>
              {name === "All" ? "All semesters" : name}
            </button>
          ))}
        </div>
        <div className="album-row">
          {classes.map((name) => (
            <button key={name} type="button" className={className === name ? "chip is-on" : "chip"} onClick={() => setClassName(name)}>
              {name === "All" ? "All classes" : name}
            </button>
          ))}
        </div>
        <p className="meta">{visible.length} student{visible.length === 1 ? "" : "s"}</p>
        <div className="people-grid">
          {visible.map((item) => (
            <article key={item.id} className="person-card">
              {item.photo_url ? <img src={item.photo_url} alt={item.name} /> : <div className="person-fallback">{item.name.slice(0, 1)}</div>}
              <h3>{item.name}</h3>
              <p className="meta">Roll {item.roll_no}</p>
              <p className="degrees">{[item.semester, item.class_name].filter(Boolean).join(" · ")}</p>
              {item.note ? <p>{item.note}</p> : null}
            </article>
          ))}
        </div>
      </div>
    </div>
  );
};

export default StudentsPage;
