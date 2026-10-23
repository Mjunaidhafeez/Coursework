import{m as i,j as h}from"./index-Dkh30Suu.js";const x=i(h.jsx("path",{d:"M20 2H8c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2m-8.5 7.5c0 .83-.67 1.5-1.5 1.5H9v1.25c0 .41-.34.75-.75.75s-.75-.34-.75-.75V8c0-.55.45-1 1-1H10c.83 0 1.5.67 1.5 1.5zm5 2c0 .83-.67 1.5-1.5 1.5h-2c-.28 0-.5-.22-.5-.5v-5c0-.28.22-.5.5-.5h2c.83 0 1.5.67 1.5 1.5zm4-3.75c0 .41-.34.75-.75.75H19v1h.75c.41 0 .75.34.75.75s-.34.75-.75.75H19v1.25c0 .41-.34.75-.75.75s-.75-.34-.75-.75V8c0-.55.45-1 1-1h1.25c.41 0 .75.34.75.75M9 9.5h1v-1H9zM3 6c-.55 0-1 .45-1 1v13c0 1.1.9 2 2 2h13c.55 0 1-.45 1-1s-.45-1-1-1H5c-.55 0-1-.45-1-1V7c0-.55-.45-1-1-1m11 5.5h1v-3h-1z"}),"PictureAsPdfRounded"),l=e=>String(e||"export").toLowerCase().replace(/[^a-z0-9-_]+/g,"-"),s=e=>`"${String(e??"").replace(/"/g,'""')}"`,f=(e,c,t)=>{const n=new Blob([c],{type:t}),a=URL.createObjectURL(n),o=document.createElement("a");o.href=a,o.download=e,document.body.appendChild(o),o.click(),document.body.removeChild(o),URL.revokeObjectURL(a)},m=({filePrefix:e,title:c,subtitle:t,headers:n,rows:a})=>{const o=[];c&&o.push(s(c)),t&&o.push(s(t)),(c||t)&&o.push(""),o.push(n.map(s).join(",")),a.forEach(d=>o.push(d.map(s).join(","))),f(`${l(e)}.csv`,o.join(`
`),"text/csv;charset=utf-8")},v=({kind:e,filePrefix:c,title:t,subtitle:n,headers:a,rows:o})=>{if(e==="pdf"){b({title:t,subtitle:n,headers:a,rows:o});return}m({filePrefix:c,title:t,subtitle:n,headers:a,rows:o})},b=({title:e,headers:c,rows:t,subtitle:n})=>{const a=c.map(r=>`<th>${r}</th>`).join(""),o=t.map(r=>`<tr>${r.map(p=>`<td>${String(p??"-")}</td>`).join("")}</tr>`).join(""),d=window.open("","_blank","width=1200,height=820");d&&(d.document.write(`
    <html>
      <head>
        <title>${e||"Export"}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 14px; }
          h2 { margin: 0 0 8px; }
          .meta { margin: 0 0 12px; color: #334155; font-size: 12px; }
          table { width: 100%; border-collapse: collapse; font-size: 12px; }
          th, td { border: 1px solid #cbd5e1; padding: 6px; text-align: left; vertical-align: top; white-space: pre-line; }
          th { background: #eff6ff; }
        </style>
      </head>
      <body>
        ${e?`<h2>${e}</h2>`:""}
        ${n?`<p class="meta">${n}</p>`:""}
        <table>
          <thead><tr>${a}</tr></thead>
          <tbody>${o}</tbody>
        </table>
      </body>
    </html>
  `),d.document.close(),d.focus(),d.print())};export{x as P,v as e};
