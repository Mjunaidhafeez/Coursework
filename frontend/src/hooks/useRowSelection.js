import { useMemo, useState } from "react";

const rowId = (id) => {
  const numeric = Number(id);
  return Number.isNaN(numeric) ? id : numeric;
};

const useRowSelection = () => {
  const [selected, setSelected] = useState(() => new Set());
  const selectedIds = useMemo(() => Array.from(selected), [selected]);

  const isSelected = (id) => selected.has(rowId(id));

  const toggle = (id) => {
    const key = rowId(id);
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const toggleAll = (ids = []) => {
    const keys = ids.map(rowId);
    setSelected((prev) => {
      const next = new Set(prev);
      const pageAllSelected = keys.length > 0 && keys.every((id) => next.has(id));
      if (pageAllSelected) keys.forEach((id) => next.delete(id));
      else keys.forEach((id) => next.add(id));
      return next;
    });
  };

  const clear = () => setSelected(new Set());

  const allChecked = (ids = []) => ids.length > 0 && ids.every((id) => selected.has(rowId(id)));

  return { selectedIds, isSelected, toggle, toggleAll, allChecked, clear, count: selectedIds.length };
};

export default useRowSelection;
