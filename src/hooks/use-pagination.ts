import { useState } from "react";

export const PAGE_SIZE = 20;

// Supabase range() is inclusive on both ends: page 0 -> [0, 19], page 1 -> [20, 39].
export function usePagination() {
  const [page, setPage] = useState(0);
  const from = page * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;
  return { page, setPage, from, to, pageSize: PAGE_SIZE };
}
