const supabase = require('./supabase');

/**
 * Determines if a user is a finalist based on:
 * - Diploma students: finalist at year 3
 * - Degree students: finalist at year 4 (except Engineering SE = year 5)
 * - Manual is_finalist flag overrides auto-detection
 */
function isFinalist(user) {
  // Manual override takes precedence
  if (user.is_finalist === true) return true;

  const year = user.year_of_study || 0;
  const courseType = user.course_type || 'degree';
  const prefix = (user.school_prefix || '').toUpperCase();

  if (courseType === 'diploma') {
    return year >= 3;
  }
  // Degree: Engineering (SE) = 5 years, all others = 4 years
  if (prefix === 'SE') {
    return year >= 5;
  }
  return year >= 4;
}

/**
 * Determines the maximum year of study for a course type
 */
function maxYearOfStudy(courseType, schoolPrefix) {
  if (courseType === 'diploma') return 3;
  if ((schoolPrefix || '').toUpperCase() === 'SE') return 5;
  return 4;
}

/**
 * Checks if a user is a first-year student
 */
function isFirstYear(user) {
  return (user.year_of_study || 0) <= 1;
}

/**
 * Determines gender constraint for a position based on the current Chairperson's gender.
 * Art. 12.9.B: If Chair is male → 1st VP female, 2nd VP male
 *              If Chair is female → 1st VP male, 2nd VP female
 * The position's gender_constraint field stores the base constraint.
 * This function resolves the actual required gender based on chair gender.
 */
async function resolveGenderConstraint(position, cycleId) {
  // Only applies to VP positions
  const slug = (position.slug || '').toLowerCase();
  if (!slug.includes('vice-chairperson') && !slug.includes('vice-chair')) {
    return position.gender_constraint || null;
  }

  // Get the cycle to find chairperson gender
  if (cycleId) {
    const { data: cycle } = await supabase
      .from('nomination_cycles')
      .select('chairperson_gender')
      .eq('id', cycleId)
      .single();

    if (cycle?.chairperson_gender) {
      const chairGender = cycle.chairperson_gender;
      // 1st VP: opposite of chair
      if (slug.includes('1st') || slug.includes('first')) {
        return chairGender === 'male' ? 'female' : 'male';
      }
      // 2nd VP: same as chair
      if (slug.includes('2nd') || slug.includes('second')) {
        return chairGender === 'male' ? 'male' : 'female';
      }
    }
  }

  return position.gender_constraint || null;
}

/**
 * Main eligibility check function
 * Checks all 8 constitutional criteria for EC nomination eligibility
 */
async function checkEligibility(user, position, cycleId = null) {
  const checks = [];

  // 1. Full membership (Art. 8.2.I)
  checks.push({
    key: 'full_membership',
    label: 'Full Membership',
    passed: user.membership_type === 'full',
    message: user.membership_type === 'full'
      ? 'Is a full member'
      : 'Must be a full member (Art. 8.2.I)',
  });

  // 2. Completed one academic year — not a first-year (Art. 12.4.b)
  const firstYear = isFirstYear(user);
  checks.push({
    key: 'not_first_year',
    label: 'Completed One Academic Year',
    passed: !firstYear,
    message: !firstYear
      ? 'Has completed at least one academic year'
      : 'First-year students are not eligible (Art. 12.4.b)',
  });

  // 3. Not a finalist (Art. 12.4.b) — finalists serve in NC, not EC
  const finalist = isFinalist(user);
  checks.push({
    key: 'not_finalist',
    label: 'Not a Finalist',
    passed: !finalist,
    message: !finalist
      ? 'Not a finalist'
      : `Finalists serve in the Nomination College, not the EC (Art. 12.4.b). ${user.course_type === 'diploma' ? 'Diploma Year 3' : 'Year 4+ (or Year 5 for Engineering)'} students are finalists.`,
  });

  // 4. Clear disciplinary record (Art. 8.5)
  checks.push({
    key: 'disciplinary',
    label: 'Clear Disciplinary Record',
    passed: user.disciplinary_status === 'clear',
    message: user.disciplinary_status === 'clear'
      ? 'Clear disciplinary record'
      : 'Has an active disciplinary flag (Art. 8.5)',
  });

  // 5. No SGC executive post (Art. 11)
  checks.push({
    key: 'no_sgc',
    label: 'No SGC Executive Post',
    passed: !user.sgc_executive_role,
    message: !user.sgc_executive_role
      ? 'No SGC executive conflict'
      : 'Holds an SGC executive post — must resign first (Art. 11)',
  });

  // 6. Term limit (Art. 12.5)
  const { count } = await supabase
    .from('appointments')
    .select('*', { count: 'exact', head: true })
    .eq('position_id', position.id)
    .eq('user_id', user.id);
  const maxTerms = position.chair_max_one_term ? 1 : (position.max_terms || 2);
  checks.push({
    key: 'term_limit',
    label: 'Within Term Limit',
    passed: (count || 0) < maxTerms,
    message: (count || 0) < maxTerms
      ? `Has served ${count || 0} of ${maxTerms} allowed term${maxTerms !== 1 ? 's' : ''}`
      : `Has reached the maximum term limit of ${maxTerms} (Art. 12.5)`,
  });

  // 7. Gender requirement — resolved dynamically based on chair gender (Art. 12.9.B)
  const requiredGender = await resolveGenderConstraint(position, cycleId);
  const genderOk = !requiredGender || user.gender === requiredGender;
  checks.push({
    key: 'gender',
    label: 'Gender Requirement',
    passed: genderOk,
    message: genderOk
      ? 'Meets gender requirement'
      : `This position requires a ${requiredGender} candidate (Art. 12.9.B — based on current Chairperson's gender)`,
  });

  // 8. Faith declaration signed (Art. 8.2.I)
  checks.push({
    key: 'faith_declaration',
    label: 'Faith Declaration Signed',
    passed: !!user.faith_declaration_signed,
    message: user.faith_declaration_signed
      ? 'Faith declaration signed'
      : 'Must sign the faith declaration (Art. 8.2.I)',
  });

  const eligible = checks.every(c => c.passed);
  return {
    eligible,
    checks,
    summary: eligible
      ? 'All eligibility requirements met.'
      : 'Does not meet one or more eligibility requirements.',
  };
}

/**
 * Check if a user can SUBMIT RECOMMENDATIONS (nominate others)
 * Art. 8.3.I.b: Full members can nominate EXCEPT first-years
 * Art. 8.3.II: Special members CANNOT nominate
 * Art. 8.3.III: Associate members CANNOT nominate
 */
function canNominate(user) {
  // Must be full member
  if (user.membership_type !== 'full') {
    return { allowed: false, reason: 'Only full members may submit recommendations (Art. 8.3.I)' };
  }
  // First-years cannot nominate
  if (isFirstYear(user)) {
    return { allowed: false, reason: 'First-year students cannot participate in nominations (Art. 8.3.I.b)' };
  }
  // NC members, admins, secretaries cannot nominate
  const blockedRoles = ['nc_member', 'ec_admin', 'super_admin', 'cu_secretary'];
  if (blockedRoles.includes(user.role)) {
    return { allowed: false, reason: 'NC members and administrators cannot submit recommendations' };
  }
  return { allowed: true, reason: 'Eligible to submit recommendations' };
}

module.exports = { checkEligibility, isFinalist, isFirstYear, canNominate, resolveGenderConstraint, maxYearOfStudy };