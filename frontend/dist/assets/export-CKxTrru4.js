import{t as r,j as l}from"./index-Djk7W8lv.js";const b=r(l.jsx("path",{d:"M20 2H8c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2m-8.5 7.5c0 .83-.67 1.5-1.5 1.5H9v1.25c0 .41-.34.75-.75.75s-.75-.34-.75-.75V8c0-.55.45-1 1-1H10c.83 0 1.5.67 1.5 1.5zm5 2c0 .83-.67 1.5-1.5 1.5h-2c-.28 0-.5-.22-.5-.5v-5c0-.28.22-.5.5-.5h2c.83 0 1.5.67 1.5 1.5zm4-3.75c0 .41-.34.75-.75.75H19v1h.75c.41 0 .75.34.75.75s-.34.75-.75.75H19v1.25c0 .41-.34.75-.75.75s-.75-.34-.75-.75V8c0-.55.45-1 1-1h1.25c.41 0 .75.34.75.75M9 9.5h1v-1H9zM3 6c-.55 0-1 .45-1 1v13c0 1.1.9 2 2 2h13c.55 0 1-.45 1-1s-.45-1-1-1H5c-.55 0-1-.45-1-1V7c0-.55-.45-1-1-1m11 5.5h1v-3h-1z"}),"PictureAsPdfRounded"),h=e=>String(e||"export").toLowerCase().replace(/[^a-z0-9-_]+/g,"-"),s=e=>`"${String(e??"").replace(/"/g,'""')}"`,p=(e,c,n)=>{const a=new Blob([c],{type:n}),o=URL.createObjectURL(a),t=document.createElement("a");t.href=o,t.download=e,document.body.appendChild(t),t.click(),document.body.removeChild(t),URL.revokeObjectURL(o)},f=({filePrefix:e,headers:c,rows:n})=>{const a=[c.map(s).join(","),...n.map(o=>o.map(s).join(","))];p(`${h(e)}.csv`,a.join(`
`),"text/csv;charset=utf-8")},v=({title:e,headers:c,rows:n})=>{const a=c.map(d=>`<th>${d}</th>`).join(""),o=n.map(d=>`<tr>${d.map(i=>`<td>${String(i??"-")}</td>`).join("")}</tr>`).join(""),t=window.open("","_blank","width=1200,height=820");t&&(t.document.write(`
    <html>
      <head>
        <title>${e}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 14px; }
          h2 { margin: 0 0 12px; }
          table { width: 100%; border-collapse: collapse; font-size: 12px; }
          th, td { border: 1px solid #cbd5e1; padding: 6px; text-align: left; vertical-align: top; white-space: pre-line; }
          th { background: #eff6ff; }
        </style>
      </head>
      <body>
        <h2>${e}</h2>
        <table>
          <thead><tr>${a}</tr></thead>
          <tbody>${o}</tbody>
        </table>
      </body>
    </html>
  `),t.document.close(),t.focus(),t.print())};export{b as P,p as a,s as c,f as d,h as f,v as p};
