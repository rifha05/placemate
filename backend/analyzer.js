// Rule-based "AI" analysis. Deterministic, free, no API keys needed.
// You can later swap these functions for calls to an LLM API.

const SKILLS = [
  ['Python', ['python']],
  ['Java', ['java']],
  ['JavaScript', ['javascript', 'js']],
  ['TypeScript', ['typescript']],
  ['C++', ['c++']],
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
  ['AWS', ['aws']],
  ['Machine Learning', ['machine learning']],
  ['Pandas', ['pandas']],
  ['NumPy', ['numpy']],
  ['Excel', ['excel']],
  ['Android', ['android']],
];

const esc = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const SKILL_RES = SKILLS.map(([name, aliases]) => [
  name,
  new RegExp(`(?<![a-z0-9+#])(?:${aliases.map(esc).join('|')})(?![a-z0-9+#])`, 'i'),
]);

function analyzeResume(text) {
  const lower = text.toLowerCase();
  const words = lower.split(/\s+/).filter(Boolean).length;
  const skills = SKILL_RES.filter(([, re]) => re.test(lower)).map(([name]) => name);

  const sections = {
    education: /\beducation\b/.test(lower),
    projects: /\bprojects?\b/.test(lower),
    experience: /\b(experience|internship|work history)\b/.test(lower),
    skills: /\bskills\b/.test(lower),
    certifications: /\b(certifications?|certificates?|courses?)\b/.test(lower),
  };
  const hasEmail = /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/.test(lower);
  const hasPhone = /\+?\d[\d\s\-()]{8,}\d/.test(text);
  const hasGithub = /github\.com|github/.test(lower);
  const hasLinkedin = /linkedin/.test(lower);
  const metrics = (text.match(/\d+\s?(%|\+|x\b|k\b)|\b\d{2,}\b/gi) || []).length;

  let score = 0;
  score += Math.round((Math.min(skills.length, 10) / 10) * 35);
  score += Object.values(sections).filter(Boolean).length * 5;
  score += (hasEmail ? 5 : 0) + (hasPhone ? 5 : 0);
  score += (hasGithub ? 5 : 0) + (hasLinkedin ? 5 : 0);
  score += metrics >= 3 ? 10 : metrics >= 1 ? 5 : 0;
  score += words >= 150 && words <= 900 ? 10 : words >= 80 && words <= 1200 ? 5 : 0;

  const suggestions = [];
  if (skills.length < 8) suggestions.push('Add a dedicated Skills section listing more technical skills (aim for 8+ relevant keywords).');
  if (!sections.projects) suggestions.push('Add a Projects section with 2–3 projects and the technologies you used.');
  if (!sections.experience) suggestions.push('Add internships, training or freelance work under an Experience section.');
  if (!sections.certifications) suggestions.push('Add relevant certifications or online courses.');
  if (!sections.education) suggestions.push('Add an Education section with your degree, college and year.');
  if (metrics < 3) suggestions.push('Add measurable results to projects (e.g. "reduced load time by 30%").');
  if (!hasGithub) suggestions.push('Link your GitHub profile so recruiters can see your code.');
  if (!hasLinkedin) suggestions.push('Add your LinkedIn profile URL.');
  if (!hasEmail || !hasPhone) suggestions.push('Make sure your email and phone number are clearly visible at the top.');
  if (words < 150) suggestions.push('Your resume looks very short — expand project and skill descriptions.');
  if (words > 900) suggestions.push('Your resume is long — keep it to one page of concise bullet points.');
  if (!skills.includes('SQL')) suggestions.push('Highlight SQL skills — they are asked in most fresher interviews.');
  if (suggestions.length === 0) suggestions.push('Great resume! Tailor keywords to each job description before applying.');

  return { atsScore: Math.min(score, 100), skills, suggestions: suggestions.slice(0, 8) };
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

function scoreAnswer(q, answer) {
  const lower = answer.toLowerCase();
  const words = lower.split(/\s+/).filter(Boolean).length;
  const hits = q.keywords.filter(k => lower.includes(k));
  const structure = ['for example', 'for instance', 'because', 'result', 'built', 'developed', 'used']
    .filter(k => lower.includes(k)).length;

  const lengthScore = Math.round(Math.min(words / 60, 1) * 40);
  const keywordScore = Math.round(Math.min(hits.length / q.need, 1) * 40);
  const structureScore = Math.min(structure, 2) * 10;
  const score = lengthScore + keywordScore + structureScore;

  const tips = [];
  if (words < 40) tips.push('Your answer is short — aim for 60+ words with a clear structure.');
  if (hits.length < q.need) tips.push(`Cover more key points on "${q.topic}" (e.g. ${q.keywords.slice(0, 4).join(', ')}).`);
  if (structure < 1) tips.push('Back your answer with a concrete example from a project or course.');

  const feedback = score >= 80 ? 'Excellent answer — clear, relevant and well supported.'
    : score >= 60 ? 'Good answer, with room to add detail.'
    : score >= 40 ? 'Decent start, but it needs more depth and examples.'
    : 'Needs work — expand your answer and cover the core concepts.';
  return { score, feedback, tips };
}

module.exports = { analyzeResume, scoreAnswer, QUESTIONS };
