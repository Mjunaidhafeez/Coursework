import { useMemo, useState } from "react";

const useRowSelection = () => {
  const [selected, setSelected] = useState(() => new Set());
  const selectedIds = useMemo(() => Array.from(selected), [selected]);

  const isSelected = (id) => selected.has(id);

  const toggle = (id) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = (ids = []) => {
    setSelected((prev) => {
      if (ids.length && ids.every((id) => prev.has(id))) return new Set();
      return new Set(ids);
    });
  };

  const clear = () => setSelected(new Set());

  const allChecked = (ids = []) => ids.length > 0 && ids.every((id) => selected.has(id));

  return { selectedIds, isSelected, toggle, toggleAll, allChecked, clear, count: selectedIds.length };
};

export default useRowSelection;
