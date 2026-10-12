const localeSort = { numeric: true, sensitivity: "base" };

export const sortByNameRoll = (rows = []) =>
  [...rows].sort((a, b) => {
    const roll = String(a.roll_no || a.student_id || "").localeCompare(String(b.roll_no || b.student_id || ""), undefined, localeSort);
    if (roll) return roll;
    return String(a.name || "").localeCompare(String(b.name || ""), undefined, localeSort);
  });

export const sortByName = (rows = []) =>
  [...rows].sort((a, b) => String(a.name || "").localeCompare(String(b.name || ""), undefined, localeSort));
