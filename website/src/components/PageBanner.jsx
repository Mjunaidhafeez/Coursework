const PageBanner = ({ kicker, title, intro, image }) => (
  <section
    className="page-banner"
    style={image ? { backgroundImage: `linear-gradient(100deg, rgba(8,16,36,0.88), rgba(8,16,36,0.45)), url(${image})` } : undefined}
  >
    <div className="site-wrap">
      {kicker ? <p className="eyebrow">{kicker}</p> : null}
      <h1>{title}</h1>
      {intro ? <p className="lead">{intro}</p> : null}
    </div>
  </section>
);

export default PageBanner;
