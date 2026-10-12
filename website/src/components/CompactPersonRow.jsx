const CompactPersonRow = ({ photo, name, lines = [], stacked = false }) => {
  const details = (lines || []).filter(Boolean);
  return (
    <article className={stacked ? "person-row is-stacked" : "person-row"}>
      {photo ? <img src={photo} alt="" /> : <div className="person-row-fallback">{(name || "?").slice(0, 1)}</div>}
      <div className="person-row-copy">
        <strong>{name}</strong>
        {stacked
          ? details.map((line) => <p key={line}>{line}</p>)
          : details.length ? <p>{details.join(" · ")}</p> : null}
      </div>
    </article>
  );
};

export default CompactPersonRow;
