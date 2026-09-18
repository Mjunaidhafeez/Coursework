export const MAX_UPLOAD_BYTES = 25 * 1024 * 1024;

export const oversizedFileNames = (files = []) =>
  files.filter((file) => Number(file?.size || 0) > MAX_UPLOAD_BYTES).map((file) => file.name);

export const rejectOversizedFiles = (files = []) => {
  const list = Array.from(files || []);
  const rejected = oversizedFileNames(list);
  return {
    files: list.filter((file) => Number(file?.size || 0) <= MAX_UPLOAD_BYTES),
    rejected,
  };
};
