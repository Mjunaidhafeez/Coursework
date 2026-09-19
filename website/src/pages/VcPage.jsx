import { useSite } from "../context/SiteContext";

const VcPage = () => {
  const { site } = useSite();
  const vc = site.pages?.vc || {};
  return (
    <div className="site-wrap site-section vc-page">
      {vc.photo_url ? <img src={vc.photo_url} alt={vc.name} /> : null}
      <div>
        <p className="eyebrow">{vc.role}</p>
        <h1>{vc.title}</h1>
        <h3>{vc.name}</h3>
        <p className="letter">{vc.body}</p>
      </div>
    </div>
  );
};

export default VcPage;
