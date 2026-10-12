const CompactPersonRow = ({ photo, name, lines = [] }) => {
  const detail = (lines || []).filter(Boolean).join(" · ");
  return (
    <article className="person-row">
      {photo ? <img src={photo} alt="" /> : <div className="person-row-fallback">{(name || "?").slice(0, 1)}</div>}
      <div className="person-row-copy">
        <strong>{name}</strong>
        {detail ? <p>{detail}</p> : null}
      </div>
    </article>
  );
};

export default CompactPersonRow;
