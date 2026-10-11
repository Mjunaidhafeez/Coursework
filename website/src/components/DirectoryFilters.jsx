const unique = (rows, key) => [
  "All",
  ...new Set(
    rows.flatMap((item) => {
      const value = item[key];
      return Array.isArray(value) ? value : [value];
    }).filter(Boolean)
  ),
];

const ChipRow = ({ values, selected, onSelect, allLabel }) => (
  <div className="album-row">
    {values.map((name) => (
      <button key={name} type="button" className={selected === name ? "chip is-on" : "chip"} onClick={() => onSelect(name)}>
        {name === "All" ? allLabel : name}
      </button>
    ))}
  </div>
);

const DirectoryFilters = ({ rows, fields, values, onChange }) => (
  <>
    {fields.map((field) => (
      <ChipRow
        key={field.key}
        values={unique(rows, field.key)}
        selected={values[field.key] || "All"}
        onSelect={(name) => onChange(field.key, name)}
        allLabel={field.allLabel}
      />
    ))}
  </>
);

export const matchesFilters = (item, values) =>
  Object.entries(values).every(([key, selected]) => {
    if (!selected || selected === "All") return true;
    const value = item[key];
    return Array.isArray(value) ? value.includes(selected) : value === selected;
  });

export default DirectoryFilters;
