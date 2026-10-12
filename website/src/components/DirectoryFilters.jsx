const unique = (rows, key) =>
  [
    ...new Set(
      rows.flatMap((item) => {
        const value = item[key];
        return Array.isArray(value) ? value : [value];
      }).filter(Boolean)
    ),
  ].sort((a, b) => String(a).localeCompare(String(b), undefined, { numeric: true, sensitivity: "base" }));

const fieldLabel = (allLabel) => String(allLabel || "").replace(/^All\s+/i, "");

const DirectoryFilters = ({ rows, fields, values, onChange, onReset }) => {
  const active = fields.some((field) => values[field.key] && values[field.key] !== "All");
  return (
    <div className="filter-bar">
      <p className="filter-bar-label">Filter</p>
      <div className="filter-bar-fields">
        {fields.map((field) => (
          <label key={field.key} className="filter-field">
            <span>{fieldLabel(field.allLabel)}</span>
            <select
              title={values[field.key] && values[field.key] !== "All" ? values[field.key] : field.allLabel}
              value={values[field.key] || "All"}
              onChange={(e) => onChange(field.key, e.target.value)}
            >
              <option value="All">{field.allLabel}</option>
              {unique(rows, field.key).map((name) => (
                <option key={name} value={name}>{name}</option>
              ))}
            </select>
          </label>
        ))}
        {active && onReset ? (
          <button type="button" className="filter-reset" onClick={onReset}>
            Clear
          </button>
        ) : null}
      </div>
    </div>
  );
};

export const matchesFilters = (item, values) =>
  Object.entries(values).every(([key, selected]) => {
    if (!selected || selected === "All") return true;
    const value = item[key];
    return Array.isArray(value) ? value.includes(selected) : value === selected;
  });

export default DirectoryFilters;
