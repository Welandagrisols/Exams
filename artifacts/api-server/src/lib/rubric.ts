export type RubricGrade = "EE2" | "EE1" | "ME2" | "ME1" | "AE2" | "AE1" | "BE2" | "BE1";

export type RubricThresholds = {
  ee2: number; ee1: number; me2: number; me1: number;
  ae2: number; ae1: number; be2: number;
};

export const DEFAULT_THRESHOLDS: RubricThresholds = {
  ee2: 86, ee1: 70, me2: 55, me1: 40, ae2: 25, ae1: 10, be2: 5,
};

export function thresholdsFromSchool(school: {
  rubricEe2?: number | null; rubricEe1?: number | null;
  rubricMe2?: number | null; rubricMe1?: number | null;
  rubricAe2?: number | null; rubricAe1?: number | null;
  rubricBe2?: number | null;
} | undefined | null): RubricThresholds {
  if (!school) return DEFAULT_THRESHOLDS;
  return {
    ee2: school.rubricEe2 ?? DEFAULT_THRESHOLDS.ee2,
    ee1: school.rubricEe1 ?? DEFAULT_THRESHOLDS.ee1,
    me2: school.rubricMe2 ?? DEFAULT_THRESHOLDS.me2,
    me1: school.rubricMe1 ?? DEFAULT_THRESHOLDS.me1,
    ae2: school.rubricAe2 ?? DEFAULT_THRESHOLDS.ae2,
    ae1: school.rubricAe1 ?? DEFAULT_THRESHOLDS.ae1,
    be2: school.rubricBe2 ?? DEFAULT_THRESHOLDS.be2,
  };
}

export function getRubricGrade(marks: number, maxMarks: number, t: RubricThresholds = DEFAULT_THRESHOLDS): RubricGrade {
  if (maxMarks <= 0) return "BE1";
  const pct = (marks / maxMarks) * 100;
  if (pct >= t.ee2) return "EE2";
  if (pct >= t.ee1) return "EE1";
  if (pct >= t.me2) return "ME2";
  if (pct >= t.me1) return "ME1";
  if (pct >= t.ae2) return "AE2";
  if (pct >= t.ae1) return "AE1";
  if (pct >= t.be2) return "BE2";
  return "BE1";
}

export function getRubricPoints(grade: RubricGrade): number {
  switch (grade) {
    case "EE2": return 8;
    case "EE1": return 7;
    case "ME2": return 6;
    case "ME1": return 5;
    case "AE2": return 4;
    case "AE1": return 3;
    case "BE2": return 2;
    case "BE1": return 1;
  }
}

export function getOverallGrade(avgPoints: number): RubricGrade {
  if (avgPoints >= 7.5) return "EE2";
  if (avgPoints >= 6.5) return "EE1";
  if (avgPoints >= 5.5) return "ME2";
  if (avgPoints >= 4.5) return "ME1";
  if (avgPoints >= 3.5) return "AE2";
  if (avgPoints >= 2.5) return "AE1";
  if (avgPoints >= 1.5) return "BE2";
  return "BE1";
}

export type RubricDistribution = {
  EE2: number; EE1: number; ME2: number; ME1: number;
  AE2: number; AE1: number; BE2: number; BE1: number;
};

export function emptyDistribution(): RubricDistribution {
  return { EE2: 0, EE1: 0, ME2: 0, ME1: 0, AE2: 0, AE1: 0, BE2: 0, BE1: 0 };
}
