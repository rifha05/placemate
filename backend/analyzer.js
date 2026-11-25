// Resume and interview analysis for PlaceMate.
// Skill extraction covers multiple job sectors; matching is keyword-based,
// so results are useful guidance rather than a guarantee of job suitability.

const SKILLS = [
  // IT and software
  ['Python', ['python']],
  ['Java', ['java']],
  ['JavaScript', ['javascript']],
  ['TypeScript', ['typescript']],
  ['C++', ['c++']],
  ['C#', ['c#', 'c sharp']],
  ['PHP', ['php']],
  ['SQL', ['sql', 'mysql', 'postgresql', 'sqlite']],
  ['MongoDB', ['mongodb']],
  ['HTML', ['html', 'html5']],
  ['CSS', ['css', 'css3']],
  ['React', ['react', 'react.js', 'reactjs']],
  ['Node.js', ['node.js', 'nodejs']],
  ['Express', ['express', 'express.js']],
  ['Django', ['django']],
  ['Flask', ['flask']],
  ['Git', ['git', 'github']],
  ['DSA', ['dsa', 'data structures', 'algorithms']],
  ['OOP', ['oop', 'object oriented', 'object-oriented']],
  ['REST APIs', ['rest api', 'restful', 'rest apis']],
  ['Linux', ['linux']],
  ['Docker', ['docker']],
  ['AWS', ['aws', 'amazon web services']],
  ['Machine Learning', ['machine learning', 'ml']],
  ['Artificial Intelligence', ['artificial intelligence']],
  ['Pandas', ['pandas']],
  ['NumPy', ['numpy']],
  ['Power BI', ['power bi']],
  ['Tableau', ['tableau']],
  ['Data Analysis', ['data analysis', 'data analytics']],
  ['Data Visualization', ['data visualization', 'data visualisation']],
  ['Statistics', ['statistics', 'statistical analysis']],
  ['Android', ['android']],
  ['Figma', ['figma']],
  ['UI/UX Design', ['ui/ux', 'ux design', 'ui design']],

  // Accounting, finance and banking
  ['Accounting', ['accounting', 'accountancy']],
  ['Bookkeeping', ['bookkeeping', 'book keeping']],
  ['Tally', ['tally', 'tally erp', 'tally prime']],
  ['GST', ['gst', 'goods and services tax']],
  ['Taxation', ['taxation', 'tax preparation', 'income tax']],
  ['Financial Analysis', ['financial analysis', 'financial modelling', 'financial modeling']],
  ['Financial Reporting', ['financial reporting', 'financial statements']],
  ['Auditing', ['auditing', 'audit procedures']],
  ['Payroll', ['payroll', 'salary processing']],
  ['Accounts Payable', ['accounts payable', 'account payable']],
  ['Accounts Receivable', ['accounts receivable', 'account receivable']],
  ['Bank Reconciliation', ['bank reconciliation', 'bank statement reconciliation']],
  ['Budgeting', ['budgeting', 'budget preparation']],
  ['Banking', ['banking', 'bank operations']],
  ['SAP', ['sap', 'sap fico']],

  // Sales, marketing and customer-facing roles
  ['Sales', ['sales', 'business development']],
  ['Marketing', ['marketing']],
  ['Digital Marketing', ['digital marketing']],
  ['SEO', ['seo', 'search engine optimization', 'search engine optimisation']],
  ['SEM', ['sem', 'search engine marketing']],
  ['Social Media Marketing', ['social media marketing', 'social media management']],
  ['Content Marketing', ['content marketing']],
  ['Content Writing', ['content writing', 'copywriting', 'copy writing']],
  ['Google Ads', ['google ads', 'google adwords']],
  ['Google Analytics', ['google analytics', 'ga4']],
  ['CRM', ['crm', 'customer relationship management']],
  ['Lead Generation', ['lead generation', 'lead gen']],
  ['Market Research', ['market research']],
  ['Negotiation', ['negotiation', 'negotiating']],
  ['Customer Service', ['customer service', 'customer support', 'client servicing']],
  ['Retail Operations', ['retail operations', 'retail sales']],

  // Human resources and administration
  ['Human Resources', ['human resources', 'human resource', 'hr management', 'hr']],
  ['Recruitment', ['recruitment', 'recruiting']],
  ['Talent Acquisition', ['talent acquisition']],
  ['Employee Relations', ['employee relations']],
  ['Administration', ['administration', 'administrative support', 'office administration']],
  ['Data Entry', ['data entry', 'data processing']],
  ['MS Office', ['ms office', 'microsoft office']],
  ['Microsoft Word', ['microsoft word', 'ms word']],
  ['Microsoft Excel', ['microsoft excel', 'ms excel', 'excel']],
  ['PowerPoint', ['powerpoint', 'power point', 'ms powerpoint']],
  ['Documentation', ['documentation', 'document control']],
  ['Scheduling', ['scheduling', 'calendar management']],

  // Healthcare and life sciences
  ['Nursing', ['nursing', 'nurse']],
  ['Patient Care', ['patient care', 'patient handling']],
  ['First Aid', ['first aid']],
  ['CPR', ['cpr', 'cardiopulmonary resuscitation']],
  ['BLS', ['bls', 'basic life support']],
  ['Medical Coding', ['medical coding', 'medical billing']],
  ['Phlebotomy', ['phlebotomy', 'blood collection']],
  ['Pharmacy', ['pharmacy', 'pharmaceutical dispensing']],
  ['Pharmacology', ['pharmacology']],
  ['Clinical Research', ['clinical research', 'clinical trials']],
  ['Laboratory Techniques', ['laboratory techniques', 'lab techniques', 'sample testing']],
  ['Healthcare', ['healthcare', 'health care']],

  // Education and training
  ['Teaching', ['teaching', 'teacher']],
  ['Lesson Planning', ['lesson planning', 'lesson plan']],
  ['Classroom Management', ['classroom management']],
  ['Curriculum Development', ['curriculum development', 'curriculum design']],
  ['Tutoring', ['tutoring', 'tutor']],
  ['Training', ['training', 'training delivery']],
  ['Instructional Design', ['instructional design', 'e-learning content']],
  ['Academic Writing', ['academic writing']],

  // Hospitality, travel and events
  ['Hospitality', ['hospitality']],
  ['Hotel Management', ['hotel management']],
  ['Front Office', ['front office', 'front desk']],
  ['Housekeeping', ['housekeeping']],
  ['Food Safety', ['food safety', 'food hygiene']],
  ['Food and Beverage', ['food and beverage', 'f&b service', 'food beverage']],
  ['Event Management', ['event management', 'event planning']],
  ['Travel Operations', ['travel operations', 'tour operations', 'travel management']],

  // Engineering, construction and operations
  ['AutoCAD', ['autocad', 'auto cad']],
  ['SolidWorks', ['solidworks', 'solid works']],
  ['Revit', ['revit']],
  ['MATLAB', ['matlab']],
  ['PLC', ['plc', 'programmable logic controller']],
  ['CNC', ['cnc', 'computer numerical control']],
  ['Civil Engineering', ['civil engineering']],
  ['Mechanical Engineering', ['mechanical engineering']],
  ['Electrical Engineering', ['electrical engineering']],
  ['Quality Control', ['quality control', 'qc']],
  ['Quality Assurance', ['quality assurance', 'qa']],
  ['Project Management', ['project management', 'project coordination']],
  ['Safety Management', ['safety management', 'workplace safety']],
  ['Supply Chain', ['supply chain', 'supply chain management']],
  ['Logistics', ['logistics', 'freight coordination']],
  ['Procurement', ['procurement', 'purchasing']],
  ['Inventory Management', ['inventory management', 'stock management']],
  ['Warehouse Operations', ['warehouse operations', 'warehouse management']],

  // Design and media
  ['Graphic Design', ['graphic design']],
  ['Adobe Photoshop', ['adobe photoshop', 'photoshop']],
  ['Adobe Illustrator', ['adobe illustrator', 'illustrator']],
  ['Video Editing', ['video editing', 'video production']],
  ['Photography', ['photography']],

  // Transferable workplace skills
  ['Communication', ['communication', 'verbal communication', 'written communication']],
  ['Teamwork', ['teamwork', 'team work', 'collaboration']],
  ['Leadership', ['leadership', 'team leadership']],
  ['Problem Solving', ['problem solving', 'problem-solving']],
  ['Time Management', ['time management']],
  ['Adaptability', ['adaptability', 'flexibility']],
];

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

const SKILL_RES = SKILLS.map(([name, aliases]) => {
  const alternatives = aliases
    .slice()
    .sort((a, b) => b.length - a.length)
    .map(escapeRegExp)
    .join('|');
  return [
    name,
    new RegExp(`(^|[^a-z0-9+#])(?:${alternatives})(?=$|[^a-z0-9+#])`, 'i')
  ];
});

function extractSkills(text) {
  const source = String(text || '');
  const found = SKILL_RES
    .filter(([, regex]) => regex.test(source))
    .map(([name]) => name);

  // Prefer specific phrases so one phrase is not counted twice.
  const suppress = {
    'Digital Marketing': ['Marketing'],
    'Social Media Marketing': ['Marketing'],
    'Content Marketing': ['Marketing'],
    'Microsoft Excel': ['Excel'],
    'Hotel Management': ['Hospitality']
  };
  const suppressed = new Set();
  found.forEach(name => (suppress[name] || []).forEach(parent => suppressed.add(parent)));
  return found.filter(name => !suppressed.has(name));
}

function analyzeResume(text) {
  const source = String(text || '');
  const lower = source.toLowerCase();
  const words = lower.split(/\s+/).filter(Boolean).length;
  const skills = extractSkills(source);

  const sections = {
    education: /\beducation\b/.test(lower),
    projects: /\bprojects?\b/.test(lower),
    experience: /\b(experience|internship|work history)\b/.test(lower),
    skills: /\bskills?\b/.test(lower),
    certifications: /\b(certifications?|certificates?|courses?)\b/.test(lower),
  };
  const hasEmail = /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/.test(lower);
  const hasPhone = /\+?\d[\d\s\-()]{8,}\d/.test(source);
  const hasGithub = /github\.com|github/.test(lower);
  const hasLinkedin = /linkedin/.test(lower);
  const metrics = (source.match(/\d+\s?(%|\+|x\b|k\b)|\b\d{2,}\b/gi) || []).length;

  let score = 0;
  score += Math.round((Math.min(skills.length, 10) / 10) * 35);
  score += Object.values(sections).filter(Boolean).length * 5;
  score += (hasEmail ? 5 : 0) + (hasPhone ? 5 : 0);
  score += (hasGithub ? 5 : 0) + (hasLinkedin ? 5 : 0);
  score += metrics >= 3 ? 10 : metrics >= 1 ? 5 : 0;
  score += words >= 150 && words <= 900 ? 10 : words >= 80 && words <= 1200 ? 5 : 0;

  const suggestions = [];
  if (skills.length < 8) {
    suggestions.push('Add a dedicated Skills section with relevant technical, business or professional skills.');
  }
  if (!sections.projects) suggestions.push('Add a Projects section with 2–3 projects and the tools or methods you used.');
  if (!sections.experience) suggestions.push('Add internships, training, volunteering or relevant work experience.');
  if (!sections.certifications) suggestions.push('Add relevant certifications, licences or professional courses.');
  if (!sections.education) suggestions.push('Add an Education section with your qualification, institution and year.');
  if (metrics < 3) suggestions.push('Add measurable results where possible, such as targets achieved, time saved or customers supported.');
  if (!hasGithub && skills.some(skill => ['Python', 'Java', 'JavaScript', 'C++', 'C#', 'PHP', 'Git'].includes(skill))) {
    suggestions.push('Consider linking a GitHub or portfolio profile if your work includes software or technical projects.');
  }
  if (!hasLinkedin) suggestions.push('Add your LinkedIn profile URL if you use LinkedIn professionally.');
  if (!hasEmail || !hasPhone) suggestions.push('Make sure your email address and phone number are clearly visible.');
  if (words < 150) suggestions.push('Your resume looks short; expand relevant experience, projects and achievements.');
  if (words > 900) suggestions.push('Your resume is long; focus on relevant information and concise bullet points.');
  if (suggestions.length === 0) suggestions.push('Good work. Tailor your resume keywords and achievements to each opportunity.');

  return {
    atsScore: Math.min(score, 100),
    skills,
    suggestions: suggestions.slice(0, 8)
  };
}

const QUESTIONS = [
  { topic: 'Self introduction', text: 'Tell me about yourself and why you want to become a Python developer.',
    keywords: ['python', 'project', 'student', 'learn', 'skills', 'developer', 'interest'], need: 3 },
  { topic: 'Python basics', text: 'Explain the difference between a list and a tuple in Python.',
    keywords: ['mutable', 'immutable', 'list', 'tuple', 'memory', 'faster', 'index'], need: 3 },
  { topic: 'SQL joins', text: 'What is the difference between an INNER JOIN and a LEFT JOIN? Give an example.',
    keywords: ['inner', 'left', 'null', 'match', 'rows', 'both tables', 'all rows'], need: 3 },
  { topic: 'Project discussion', text: 'Describe a project you built. What was your role and what challenges did you face?',
    keywords: ['project', 'challenge', 'solved', 'team', 'github', 'used', 'result', 'learned'], need: 3 },
  { topic: 'HR / motivation', text: 'Where do you see yourself in five years, and why should we hire you?',
    keywords: ['learn', 'grow', 'team', 'skills', 'contribute', 'company', 'goal'], need: 3 },
];

function scoreAnswer(question, answer) {
  const lower = String(answer || '').toLowerCase();
  const words = lower.split(/\s+/).filter(Boolean).length;
  const hits = question.keywords.filter(keyword => lower.includes(keyword));
  const structure = ['for example', 'for instance', 'because', 'result', 'built', 'developed', 'used']
    .filter(keyword => lower.includes(keyword)).length;

  const lengthScore = Math.round(Math.min(words / 60, 1) * 40);
  const keywordScore = Math.round(Math.min(hits.length / question.need, 1) * 40);
  const structureScore = Math.min(structure, 2) * 10;
  const score = lengthScore + keywordScore + structureScore;

  const tips = [];
  if (words < 40) tips.push('Your answer is short — aim for 60+ words with a clear structure.');
  if (hits.length < question.need) {
    tips.push(`Cover more key points on "${question.topic}" (e.g. ${question.keywords.slice(0, 4).join(', ')}).`);
  }
  if (structure < 1) tips.push('Back your answer with a concrete example from a project, course or work experience.');

  const feedback = score >= 80 ? 'Excellent answer — clear, relevant and well supported.'
    : score >= 60 ? 'Good answer, with room to add detail.'
    : score >= 40 ? 'Decent start, but it needs more depth and examples.'
    : 'Needs work — expand your answer and cover the core concepts.';

  return { score, feedback, tips };
}
function extractJobSkills(description) {
  return extractSkills(description);
}

function calculateJobMatch(requiredSkills, resumeSkills) {
  const required = [...new Set(
    (requiredSkills || []).map(skill => String(skill).toLowerCase())
  )];

  const have = new Set(
    (resumeSkills || []).map(skill => String(skill).toLowerCase())
  );

  if (required.length === 0) {
    return {
      match: null,
      matchedSkills: [],
      missing: []
    };
  }

  const matchedSkills = required.filter(skill => have.has(skill));
  const missing = required.filter(skill => !have.has(skill));

  return {
    match: Math.round((matchedSkills.length / required.length) * 100),
    matchedSkills,
    missing
  };
}
module.exports = {
  analyzeResume,
  extractSkills,
  extractJobSkills,
  calculateJobMatch,
  scoreAnswer,
  QUESTIONS,
  SKILL_NAMES: SKILLS.map(([name]) => name)
};
