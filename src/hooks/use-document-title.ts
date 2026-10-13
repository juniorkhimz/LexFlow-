import { useEffect } from "react";

// Per-page <title> — closes a real gap (index.html only ever set one
// static title for the whole app). Cheap and worth doing even for an
// authenticated app: browser tab switching, bookmarks, and history all
// read this.
export function useDocumentTitle(title: string) {
  useEffect(() => {
    const previous = document.title;
    document.title = `${title} · LexFlow`;
    return () => {
      document.title = previous;
    };
  }, [title]);
}
