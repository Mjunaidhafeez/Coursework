import { useEffect, useMemo, useState } from "react";

import CompactPersonRow from "../components/CompactPersonRow";
import DirectoryFilters, { matchesFilters } from "../components/DirectoryFilters";
import DirectoryPager from "../components/DirectoryPager";
import PageBanner from "../components/PageBanner";
import { useSite } from "../context/SiteContext";
import { pageCountFor, slicePage } from "../utils/paginate";
import { sortByName, sortByNameRoll } from "../utils/sortPeople";

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
  const [studentPage, setStudentPage] = useState(1);
  const visible = useMemo(
    () => sortByNameRoll(rows.filter((item) => matchesFilters(item, filters))),
    [rows, filters]
  );
  const visibleGroups = useMemo(
    () =>
      sortByName(groups.filter((item) => filters.groups === "All" || item.name === filters.groups)).map((group) => ({
        ...group,
        members: sortByNameRoll(group.members || []),
      })),
    [groups, filters.groups]
  );
  const studentPages = pageCountFor(visible.length);
  const pagedStudents = slicePage(visible, studentPage);

  useEffect(() => {
    setStudentPage(1);
  }, [filters]);

  return (
    <div>
      <PageBanner kicker="Directory" title={page.title || "Students"} intro={page.intro} image={page.background_url} />
      <div className="site-wrap site-section">
        <DirectoryFilters
          rows={rows}
          fields={FILTERS}
          values={filters}
          onChange={(key, value) => setFilters((prev) => ({ ...prev, [key]: value }))}
          onReset={() => setFilters(emptyFilters)}
        />
        <p className="meta">{visible.length} student{visible.length === 1 ? "" : "s"}</p>
        <div className="people-grid people-grid-compact">
          {pagedStudents.map((item) => (
            <CompactPersonRow
              key={item.id}
              photo={item.photo_url}
              name={item.name}
              lines={[item.roll_no, item.semester, item.department]}
            />
          ))}
        </div>
        <DirectoryPager page={Math.min(studentPage, studentPages)} pageCount={studentPages} onChange={setStudentPage} />
        {visibleGroups.length ? (
          <>
            <h2 className="section-title">Student groups</h2>
            <div className="people-grid people-grid-compact">
              {visibleGroups.map((group) => (
                <article key={group.id} className="group-card">
                  <h3>{group.name}</h3>
                  {(group.members || []).map((member) => (
                    <CompactPersonRow
                      key={`${group.id}-${member.roll_no || member.name}`}
                      photo={member.photo_url}
                      name={member.name}
                      lines={[member.roll_no]}
                    />
                  ))}
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
