// The page ErrorBoundary is keyed by URL so a crashed page does not keep its
// fallback after navigating away. Conversations is the exception: the list and
// every open conversation (/conversations/:id) are one page, and remounting it
// on each click reset the chat state — active filters included — and raced an
// unfiltered list load against the filtered one.
const CONVERSATIONS_PATH = /^\/conversations(\/|$)/;

export const errorBoundaryKey = (pathname: string): string =>
  CONVERSATIONS_PATH.test(pathname) ? '/conversations' : pathname;
