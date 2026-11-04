import { AcademicClass, AcademicSubject } from '@/types';

export type SeniorStream = 'science' | 'arts' | 'commercial' | 'all';

/**
 * Determine the stream of a Senior Secondary class arm:
 * - Arm A: Science
 * - Arm B: Arts
 * - Arm C: Commercial
 * - Arms D-F: Defaults to Science or general core stream
 */
export function getSeniorStreamForClass(cls?: AcademicClass | null): SeniorStream {
  if (!cls) return 'all';
  if (cls.stage !== 'senior_secondary') return 'all';

  const nameUpper = (cls.name || '').toUpperCase();
  const armUpper = (cls.arm || '').toUpperCase();

  if (nameUpper.includes('ARM A') || armUpper === 'ARM A' || nameUpper.includes('SCIENCE')) {
    return 'science';
  }
  if (nameUpper.includes('ARM B') || armUpper === 'ARM B' || nameUpper.includes('ARTS')) {
    return 'arts';
  }
  if (nameUpper.includes('ARM C') || armUpper === 'ARM C' || nameUpper.includes('COMMERCIAL')) {
    return 'commercial';
  }

  // Arms D, E, F: Overflow arms default to primary stream (Science) or common stream
  return 'science';
}

/**
 * Filters subjects based on educational stage and senior secondary stream specialization.
 * - Non-Senior stages return all subjects mapped to that stage.
 * - Senior Secondary stages filter to:
 *   * Core subjects (English, Mathematics, Digital Tech, Civic, etc.) + Vocational trade
 *   * Stream electives:
 *     - Science: Physics, Chemistry, Biology, Further Maths, Agric
 *     - Arts: Government, Literature-in-English, CRS/IS, History
 *     - Commercial: Financial Accounting, Commerce, Economics, Marketing
 */
export function filterSubjectsForClassAndStream(
  subjects: AcademicSubject[],
  cls?: AcademicClass | null
): AcademicSubject[] {
  if (!cls) return subjects;

  // Filter to stage first
  const stageSubjects = subjects.filter((s) => s.stages.includes(cls.stage));

  if (cls.stage !== 'senior_secondary') {
    return stageSubjects;
  }

  const stream = getSeniorStreamForClass(cls);

  return stageSubjects.filter((subject) => {
    const category = subject.category || 'general';
    const subName = subject.name.toLowerCase();

    // Core subjects and general vocational subjects apply across all senior streams
    if (category === 'core' || category === 'vocational' || category === 'general') {
      return true;
    }

    if (stream === 'science') {
      // Core + Science electives (Physics, Chemistry, Biology, Agricultural Science, Further Maths)
      if (category === 'science') return true;
      if (
        subName.includes('physics') ||
        subName.includes('chemistry') ||
        subName.includes('biology') ||
        subName.includes('further') ||
        subName.includes('agric')
      ) {
        return true;
      }
      return false;
    }

    if (stream === 'arts') {
      // Core + Arts electives (Government, Literature-in-English, CRS/IS, History)
      if (category === 'arts') return true;
      if (
        subName.includes('government') ||
        subName.includes('literature') ||
        subName.includes('religious') ||
        subName.includes('crs') ||
        subName.includes('is') ||
        subName.includes('history')
      ) {
        return true;
      }
      return false;
    }

    if (stream === 'commercial') {
      // Core + Commercial electives (Financial Accounting, Commerce, Economics, Marketing)
      if (category === 'commercial') return true;
      if (
        subName.includes('accounting') ||
        subName.includes('commerce') ||
        subName.includes('economics') ||
        subName.includes('marketing')
      ) {
        return true;
      }
      return false;
    }

    return true;
  });
}
