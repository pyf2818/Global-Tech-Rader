import { CATEGORIES, MODES, DEFAULT_SOURCES, SOURCE_GRADES } from '../server/news/config/constants.js';
import { getSourceGrade, getSourceGradeInfo } from '../server/news/config/sourceGrades.js';

export default function handler(req, res) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify({
    categories: CATEGORIES,
    modes: MODES,
    sources: DEFAULT_SOURCES.map(({ name, url, region, defaultCategory }) => {
      const gradeInfo = getSourceGradeInfo(name);
      return {
        name,
        url,
        region,
        defaultCategory,
        grade: getSourceGrade(name),
        gradeInfo: {
          label: gradeInfo.label,
          description: gradeInfo.description,
          color: gradeInfo.color,
          icon: gradeInfo.icon,
          weight: gradeInfo.weight
        }
      };
    }),
    sourceGrades: SOURCE_GRADES
  }));
}
