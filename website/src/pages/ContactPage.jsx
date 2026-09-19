import { useState } from "react";

import api from "../api";
import PageBanner from "../components/PageBanner";
import { useSite } from "../context/SiteContext";

const ContactPage = () => {
  const { site } = useSite();
  const page = site.pages?.contact || {};
  const [form, setForm] = useState({ name: "", email: "", phone: "", subject: "", message: "" });
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");

  const submit = async (event) => {
    event.preventDefault();
    setStatus("");
    setError("");
    try {
      const { data } = await api.post("/website/contact/", form);
      setStatus(data.detail || "Sent.");
      setForm({ name: "", email: "", phone: "", subject: "", message: "" });
    } catch (err) {
      setError(err?.response?.data?.detail || "Could not send the enquiry.");
    }
  };

  return (
    <div>
      <PageBanner kicker="Office" title={page.title || "Contact"} intro={page.intro} image={page.background_url} />
      <div className="site-wrap site-section contact-grid">
        <form className="card contact-form" onSubmit={submit}>
          <input required placeholder="Full name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <input required type="email" placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          <input placeholder="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          <input placeholder="Subject" value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} />
          <textarea required rows={5} placeholder="Your enquiry" value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} />
          <button className="btn-primary" type="submit">Send enquiry</button>
          {status ? <p className="form-ok">{status}</p> : null}
          {error ? <p className="form-err">{error}</p> : null}
        </form>
        <aside className="card">
          <h3>{site.site_name}</h3>
          {site.address ? <p>{site.address}</p> : null}
          {site.phone ? <p>{site.phone}</p> : null}
          {site.email ? <p>{site.email}</p> : null}
          <p>The office receives this enquiry in Messages and by email, and can reply to you directly.</p>
        </aside>
      </div>
    </div>
  );
};

export default ContactPage;
