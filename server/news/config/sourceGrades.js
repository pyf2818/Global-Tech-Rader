import { SOURCE_GRADES, SOURCE_GRADE_MAP } from './constants.js';

// 获取信息源等级
export function getSourceGrade(sourceName) {
  return SOURCE_GRADE_MAP[sourceName] || 'D';
}

// 获取信息源等级信息
export function getSourceGradeInfo(sourceName) {
  const grade = getSourceGrade(sourceName);
  return SOURCE_GRADES[grade];
}

// 按等级排序信息源（S级优先）
export function sortSourcesByGrade(sources) {
  const gradeOrder = { 'S': 0, 'A': 1, 'B': 2, 'C': 3, 'D': 4 };
  return sources.sort((a, b) => {
    const gradeA = getSourceGrade(a.name);
    const gradeB = getSourceGrade(b.name);
    return gradeOrder[gradeA] - gradeOrder[gradeB];
  });
}
