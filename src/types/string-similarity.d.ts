declare module 'string-similarity' {
  export interface BestMatch {
    target: string;
    rating: number;
  }
  export interface BestMatchResult {
    bestMatch: BestMatch;
    ratings: { target: string; rating: number }[];
  }
  export function compareStrings(s1: string, s2: string): number;
  export function findBestMatch(mainString: string, targetStrings: string[]): BestMatchResult;
  const _default: {
    compareStrings: typeof compareStrings;
    findBestMatch: typeof findBestMatch;
  };
  export default _default;
}