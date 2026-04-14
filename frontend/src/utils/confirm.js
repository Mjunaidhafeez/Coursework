export const confirmAction = (message) => window.confirm(message);

export const confirmDelete = (entityLabel = "record") =>
  confirmAction(`Are you sure you want to delete this ${entityLabel}?`);
