import { useCallback, useEffect, useState } from "react";

const usePaginatedQuery = ({ queryFn, dependencies = [] }) => {
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [loading, setLoading] = useState(false);

  const loadData = useCallback(
    async ({ searchValue = search, pageValue = page, pageSizeValue = pageSize } = {}) => {
      setLoading(true);
      try {
        const result = await queryFn({ search: searchValue, page: pageValue, pageSize: pageSizeValue });
        setRows(result.results || []);
        setTotal(result.count || 0);
      } finally {
        setLoading(false);
      }
    },
    [queryFn, search, page, pageSize]
  );

  useEffect(() => {
    loadData({ searchValue: "", pageValue: 1, pageSizeValue: pageSize });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, dependencies);

  const runSearch = () => {
    setPage(1);
    return loadData({ searchValue: search, pageValue: 1 });
  };

  const resetSearch = () => {
    setSearch("");
    setPage(1);
    return loadData({ searchValue: "", pageValue: 1 });
  };

  const changePage = (newPage) => {
    setPage(newPage);
    return loadData({ pageValue: newPage });
  };

  const changePageSize = (newSize) => {
    setPageSize(newSize);
    setPage(1);
    return loadData({ pageValue: 1, pageSizeValue: newSize });
  };

  return {
    rows,
    total,
    search,
    setSearch,
    page,
    pageSize,
    loading,
    loadData,
    runSearch,
    resetSearch,
    changePage,
    changePageSize,
    setRows,
    setTotal,
  };
};

export default usePaginatedQuery;
