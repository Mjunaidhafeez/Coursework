import{t as r,j as l}from"./index-nkbeIcOT.js";const u=r(l.jsx("path",{d:"M20 2H8c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2m-8.5 7.5c0 .83-.67 1.5-1.5 1.5H9v1.25c0 .41-.34.75-.75.75s-.75-.34-.75-.75V8c0-.55.45-1 1-1H10c.83 0 1.5.67 1.5 1.5zm5 2c0 .83-.67 1.5-1.5 1.5h-2c-.28 0-.5-.22-.5-.5v-5c0-.28.22-.5.5-.5h2c.83 0 1.5.67 1.5 1.5zm4-3.75c0 .41-.34.75-.75.75H19v1h.75c.41 0 .75.34.75.75s-.34.75-.75.75H19v1.25c0 .41-.34.75-.75.75s-.75-.34-.75-.75V8c0-.55.45-1 1-1h1.25c.41 0 .75.34.75.75M9 9.5h1v-1H9zM3 6c-.55 0-1 .45-1 1v13c0 1.1.9 2 2 2h13c.55 0 1-.45 1-1s-.45-1-1-1H5c-.55 0-1-.45-1-1V7c0-.55-.45-1-1-1m11 5.5h1v-3h-1z"}),"PictureAsPdfRounded"),p=t=>String(t||"export").toLowerCase().replace(/[^a-z0-9-_]+/g,"-"),s=t=>`"${String(t??"").replace(/"/g,'""')}"`,h=(t,n,a)=>{const c=new Blob([n],{type:a}),o=URL.createObjectURL(c),e=document.createElement("a");e.href=o,e.download=t,document.body.appendChild(e),e.click(),document.body.removeChild(e),URL.revokeObjectURL(o)},m=({filePrefix:t,headers:n,rows:a})=>{const c=[n.map(s).join(","),...a.map(o=>o.map(s).join(","))];h(`${p(t)}.csv`,c.join(`
`),"text/csv;charset=utf-8")},v=({kind:t,filePrefix:n,title:a,headers:c,rows:o})=>{if(t==="pdf"){b({title:a,headers:c,rows:o});return}m({filePrefix:n,headers:c,rows:o})},b=({title:t,headers:n,rows:a})=>{const c=n.map(d=>`<th>${d}</th>`).join(""),o=a.map(d=>`<tr>${d.map(i=>`<td>${String(i??"-")}</td>`).join("")}</tr>`).join(""),e=window.open("","_blank","width=1200,height=820");e&&(e.document.write(`
    <html>
      <head>
        <title>${t}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 14px; }
          h2 { margin: 0 0 12px; }
          table { width: 100%; border-collapse: collapse; font-size: 12px; }
          th, td { border: 1px solid #cbd5e1; padding: 6px; text-align: left; vertical-align: top; white-space: pre-line; }
          th { background: #eff6ff; }
        </style>
      </head>
      <body>
        <h2>${t}</h2>
        <table>
          <thead><tr>${c}</tr></thead>
          <tbody>${o}</tbody>
        </table>
      </body>
    </html>
  `),e.document.close(),e.focus(),e.print())};export{u as P,h as a,s as c,m as d,v as e,p as f,b as p};
