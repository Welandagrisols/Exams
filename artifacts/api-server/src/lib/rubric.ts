export type RubricGrade = "EE2" | "EE1" | "ME2" | "ME1" | "AE2" | "AE1" | "BE2" | "BE1";

export function getRubricGrade(marks: number, maxMarks: number): RubricGrade {
  const pct = (marks / maxMarks) * 100;
  if (pct >= 86) return "EE2";
  if (pct >= 70) return "EE1";
  if (pct >= 55) return "ME2";
  if (pct >= 40) return "ME1";
  if (pct >= 25) return "AE2";
  if (pct >= 10) return "AE1";
  if (pct >= 5) return "BE2";
  return "BE1";
}

export function getRubricPoints(grade: RubricGrade): number {
  switch (grade) {
    case "EE2": return 4.0;
    case "EE1": return 3.5;
    case "ME2": return 3.0;
    case "ME1": return 2.5;
    case "AE2": return 2.0;
    case "AE1": return 1.5;
    case "BE2": return 1.0;
    case "BE1": return 0.5;
  }
}

export function getOverallGrade(avgPoints: number): RubricGrade {
  if (avgPoints >= 3.75) return "EE2";
  if (avgPoints >= 3.25) return "EE1";
  if (avgPoints >= 2.75) return "ME2";
  if (avgPoints >= 2.25) return "ME1";
  if (avgPoints >= 1.75) return "AE2";
  if (avgPoints >= 1.25) return "AE1";
  if (avgPoints >= 0.75) return "BE2";
  return "BE1";
}

export type RubricDistribution = {
  EE2: number; EE1: number; ME2: number; ME1: number;
  AE2: number; AE1: number; BE2: number; BE1: number;
};

export function emptyDistribution(): RubricDistribution {
  return { EE2: 0, EE1: 0, ME2: 0, ME1: 0, AE2: 0, AE1: 0, BE2: 0, BE1: 0 };
}
