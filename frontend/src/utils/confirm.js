export const confirmAction = (message) => window.confirm(message);

export const confirmDelete = (entityLabel = "record") =>
  confirmAction(`Are you sure you want to delete this ${entityLabel}?`);

export const confirmBulkDelete = (count, entityLabel = "records") =>
  confirmAction(`Delete ${count} selected ${entityLabel}?`);

export const confirmPermanentDelete = (entityLabel = "record", count = 1) =>
  confirmAction(
    count > 1
      ? `Permanently delete ${count} selected ${entityLabel}? This cannot be undone.`
      : `Permanently delete this ${entityLabel}? This cannot be undone.`
  );
