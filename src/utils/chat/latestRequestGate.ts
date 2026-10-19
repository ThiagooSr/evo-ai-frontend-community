/**
 * "Last request issued wins" for async loads that replace the same state.
 * Without it the last response to ARRIVE wins: an older unfiltered list load
 * landing after the filtered one silently replaced the filtered list.
 */
export interface LatestRequestGate {
  /** Marks a new request as the latest and returns its token. */
  begin: () => number;
  /** Token of the latest request, without starting a new one (for follow-ups). */
  current: () => number;
  /** True while no newer request has begun since `token`. */
  isLatest: (token: number) => boolean;
}

export const createLatestRequestGate = (): LatestRequestGate => {
  let latest = 0;
  return {
    begin: () => {
      latest += 1;
      return latest;
    },
    current: () => latest,
    isLatest: token => token === latest,
  };
};
