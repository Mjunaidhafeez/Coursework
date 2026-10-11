import { useMemo, useState } from "react";

import DirectoryFilters, { matchesFilters } from "../components/DirectoryFilters";
import PageBanner from "../components/PageBanner";
import { useSite } from "../context/SiteContext";

const FILTERS = [
  { key: "department", allLabel: "All departments" },
  { key: "semester", allLabel: "All semesters" },
  { key: "class_name", allLabel: "All classes" },
  { key: "section", allLabel: "All sections" },
  { key: "subjects", allLabel: "All subjects" },
  { key: "groups", allLabel: "All groups" },
];

const emptyFilters = Object.fromEntries(FILTERS.map((item) => [item.key, "All"]));

const StudentsPage = () => {
  const { site } = useSite();
  const page = site.pages?.students || {};
  const rows = site.students || [];
  const groups = site.groups || [];
  const [filters, setFilters] = useState(emptyFilters);
  const visible = useMemo(() => rows.filter((item) => matchesFilters(item, filters)), [rows, filters]);
  const visibleGroups = useMemo(
    () => groups.filter((item) => filters.groups === "All" || item.name === filters.groups),
    [groups, filters.groups]
  );

  return (
    <div>
      <PageBanner kicker="Directory" title={page.title || "Students"} intro={page.intro} image={page.background_url} />
      <div className="site-wrap site-section">
        <DirectoryFilters
          rows={rows}
          fields={FILTERS}
          values={filters}
          onChange={(key, value) => setFilters((prev) => ({ ...prev, [key]: value }))}
        />
        <p className="meta">{visible.length} student{visible.length === 1 ? "" : "s"}</p>
        <div className="people-grid">
          {visible.map((item) => (
            <article key={item.id} className="person-card">
              {item.photo_url ? <img src={item.photo_url} alt={item.name} /> : <div className="person-fallback">{item.name.slice(0, 1)}</div>}
              <h3>{item.name}</h3>
              <p className="meta">Roll {item.roll_no || "-"}</p>
              <p className="degrees">{[item.department, item.semester, item.class_name, item.section].filter(Boolean).join(" · ")}</p>
              {item.subjects?.length ? <p className="meta">{item.subjects.join(" · ")}</p> : null}
              {item.groups?.length ? <p className="meta">Groups: {item.groups.join(", ")}</p> : null}
              {item.note ? <p>{item.note}</p> : null}
            </article>
          ))}
        </div>
        {visibleGroups.length ? (
          <>
            <h2 className="section-title">Student groups</h2>
            <div className="people-grid">
              {visibleGroups.map((group) => (
                <article key={group.id} className="person-card">
                  <h3>{group.name}</h3>
                  <p className="meta">{[group.department, group.semester, group.course].filter(Boolean).join(" · ")}</p>
                  <p className="degrees">{(group.members || []).map((member) => member.name).join(", ")}</p>
                </article>
              ))}
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
};

export default StudentsPage;
