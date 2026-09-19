import PageBanner from "../components/PageBanner";
import { useSite } from "../context/SiteContext";

const VcPage = () => {
  const { site } = useSite();
  const vc = site.pages?.vc || {};
  return (
    <div>
      <PageBanner kicker={vc.role} title={vc.title} image={vc.background_url} />
      <div className="site-wrap site-section vc-page">
        {vc.photo_url ? <img src={vc.photo_url} alt={vc.name} /> : null}
        <div>
          <h3>{vc.name}</h3>
          <p className="letter">{vc.body}</p>
        </div>
      </div>
    </div>
  );
};

export default VcPage;
