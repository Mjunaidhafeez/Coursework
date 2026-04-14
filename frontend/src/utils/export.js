export const fileSafe = (value) => String(value || "export").toLowerCase().replace(/[^a-z0-9-_]+/g, "-");

export const csvSafe = (value) => `"${String(value ?? "").replace(/"/g, '""')}"`;

export const downloadTextFile = (fileName, content, mimeType) => {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
};

export const downloadCsvFile = ({ filePrefix, headers, rows }) => {
  const lines = [
    headers.map(csvSafe).join(","),
    ...rows.map((row) => row.map(csvSafe).join(",")),
  ];
  downloadTextFile(`${fileSafe(filePrefix)}.csv`, lines.join("\n"), "text/csv;charset=utf-8");
};

export const printTablePdf = ({ title, headers, rows }) => {
  const headerRow = headers.map((header) => `<th>${header}</th>`).join("");
  const bodyRows = rows
    .map((row) => `<tr>${row.map((cell) => `<td>${String(cell ?? "-")}</td>`).join("")}</tr>`)
    .join("");
  const pop = window.open("", "_blank", "width=1200,height=820");
  if (!pop) return;
  pop.document.write(`
    <html>
      <head>
        <title>${title}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 14px; }
          h2 { margin: 0 0 12px; }
          table { width: 100%; border-collapse: collapse; font-size: 12px; }
          th, td { border: 1px solid #cbd5e1; padding: 6px; text-align: left; vertical-align: top; white-space: pre-line; }
          th { background: #eff6ff; }
        </style>
      </head>
      <body>
        <h2>${title}</h2>
        <table>
          <thead><tr>${headerRow}</tr></thead>
          <tbody>${bodyRows}</tbody>
        </table>
      </body>
    </html>
  `);
  pop.document.close();
  pop.focus();
  pop.print();
};
