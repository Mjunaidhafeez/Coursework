import { useMemo, useState } from "react";

import DirectoryFilters, { matchesFilters } from "../components/DirectoryFilters";
import PageBanner from "../components/PageBanner";
import { useSite } from "../context/SiteContext";
import { sortByName } from "../utils/sortPeople";

const FILTERS = [
  { key: "department", allLabel: "All departments" },
  { key: "subjects", allLabel: "All subjects" },
  { key: "semesters", allLabel: "All semesters" },
];

const emptyFilters = Object.fromEntries(FILTERS.map((item) => [item.key, "All"]));

const TeachersPage = () => {
  const { site } = useSite();
  const page = site.pages?.teachers || {};
  const rows = site.teachers || [];
  const [filters, setFilters] = useState(emptyFilters);
  const visible = useMemo(
    () => sortByName(rows.filter((item) => matchesFilters(item, filters))),
    [rows, filters]
  );

  return (
    <div>
      <PageBanner kicker="Faculty" title={page.title || "Faculty"} intro={page.intro} image={page.background_url} />
      <div className="site-wrap site-section">
        <DirectoryFilters
          rows={rows}
          fields={FILTERS}
          values={filters}
          onChange={(key, value) => setFilters((prev) => ({ ...prev, [key]: value }))}
          onReset={() => setFilters(emptyFilters)}
        />
        <p className="meta">{visible.length} teacher{visible.length === 1 ? "" : "s"}</p>
        <div className="people-grid">
          {visible.map((item) => (
            <article key={item.id} className="person-card">
              {item.photo_url ? <img src={item.photo_url} alt={item.name} /> : <div className="person-fallback">{item.name.slice(0, 1)}</div>}
              <h3>{item.name}</h3>
              <p className="meta">{[item.designation, item.department].filter(Boolean).join(" · ")}</p>
              {item.subjects?.length ? <p className="degrees">{item.subjects.join(" · ")}</p> : null}
              {item.semesters?.length ? <p className="meta">{item.semesters.join(" · ")}</p> : null}
              {item.degrees ? <p className="degrees">{item.degrees}</p> : null}
              {item.bio ? <p>{item.bio}</p> : null}
            </article>
          ))}
        </div>
      </div>
    </div>
  );
};

export default TeachersPage;
