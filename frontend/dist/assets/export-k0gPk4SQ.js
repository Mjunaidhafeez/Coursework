const s=o=>String(o||"export").toLowerCase().replace(/[^a-z0-9-_]+/g,"-"),p=o=>`"${String(o??"").replace(/"/g,'""')}"`,l=(o,n,t)=>{const a=new Blob([n],{type:t}),d=URL.createObjectURL(a),e=document.createElement("a");e.href=d,e.download=o,document.body.appendChild(e),e.click(),document.body.removeChild(e),URL.revokeObjectURL(d)},h=({filePrefix:o,title:n,subtitle:t,headers:a,rows:d})=>{const e=[];n&&e.push(p(n)),t&&e.push(p(t)),(n||t)&&e.push(""),e.push(a.map(p).join(",")),d.forEach(c=>e.push(c.map(p).join(","))),l(`${s(o)}.csv`,e.join(`
`),"text/csv;charset=utf-8")},b=({kind:o,filePrefix:n,title:t,subtitle:a,headers:d,rows:e})=>{if(o==="pdf"){f({title:t,subtitle:a,headers:d,rows:e});return}h({filePrefix:n,title:t,subtitle:a,headers:d,rows:e})},f=({title:o,headers:n,rows:t,subtitle:a})=>{const d=n.map(r=>`<th>${r}</th>`).join(""),e=t.map(r=>`<tr>${r.map(i=>`<td>${String(i??"-")}</td>`).join("")}</tr>`).join(""),c=window.open("","_blank","width=1200,height=820");c&&(c.document.write(`
    <html>
      <head>
        <title>${o||"Export"}</title>
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
        ${o?`<h2>${o}</h2>`:""}
        ${a?`<p class="meta">${a}</p>`:""}
        <table>
          <thead><tr>${d}</tr></thead>
          <tbody>${e}</tbody>
        </table>
      </body>
    </html>
  `),c.document.close(),c.focus(),c.print())};export{b as e};
