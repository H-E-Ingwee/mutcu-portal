const supabase = require('./supabase');

async function checkEligibility(user, position) {
  const checks = [];

  // 1. Full membership
  checks.push({ key: 'full_membership', label: 'Full Membership', passed: user.membership_type === 'full', message: user.membership_type === 'full' ? 'Is a full member' : 'Must be a full member' });

  // 2. Completed one academic year
  checks.push({ key: 'not_first_year', label: 'Completed One Academic Year', passed: (user.year_of_study || 0) >= 2, message: (user.year_of_study || 0) >= 2 ? 'Has completed at least one academic year' : 'First-year students are not eligible' });

  // 3. Not a finalist
  checks.push({ key: 'not_finalist', label: 'Not a Finalist', passed: !user.is_finalist, message: !user.is_finalist ? 'Not a finalist' : 'Finalists serve in the Nomination College' });

  // 4. Clear disciplinary record
  checks.push({ key: 'disciplinary', label: 'Clear Disciplinary Record', passed: user.disciplinary_status === 'clear', message: user.disciplinary_status === 'clear' ? 'Clear disciplinary record' : 'Has a disciplinary flag' });

  // 5. No SGC executive post
  checks.push({ key: 'no_sgc', label: 'No SGC Executive Post', passed: !user.sgc_executive_role, message: !user.sgc_executive_role ? 'No SGC executive conflict' : 'Holds an SGC executive post' });

  // 6. Term limit
  const { count } = await supabase.from('appointments').select('*', { count: 'exact', head: true }).eq('position_id', position.id).eq('user_id', user.id);
  const maxTerms = position.chair_max_one_term ? 1 : (position.max_terms || 2);
  checks.push({ key: 'term_limit', label: 'Within Term Limit', passed: (count || 0) < maxTerms, message: (count || 0) < maxTerms ? `Has served ${count || 0} of ${maxTerms} allowed terms` : 'Has reached the maximum term limit' });

  // 7. Gender constraint
  const genderOk = !position.gender_constraint || user.gender === position.gender_constraint;
  checks.push({ key: 'gender', label: 'Gender Requirement', passed: genderOk, message: genderOk ? 'Meets gender requirement' : 'Does not meet gender requirement for this position' });

  // 8. Faith declaration
  checks.push({ key: 'faith_declaration', label: 'Faith Declaration Signed', passed: !!user.faith_declaration_signed, message: user.faith_declaration_signed ? 'Faith declaration signed' : 'Must sign the faith declaration' });

  const eligible = checks.every(c => c.passed);
  return { eligible, checks, summary: eligible ? 'All eligibility requirements met.' : 'Does not meet one or more eligibility requirements.' };
}

module.exports = { checkEligibility };
