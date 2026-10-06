// Loads the syllabus data files and renders each section of the page.
// Each section renders independently, so one failed file doesn't blank the rest.

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const DAY_MS = 24 * 60 * 60 * 1000;

const loadJson = async (path) => {
  const response = await fetch(path);
  if (!response.ok) {
    throw new Error(`${path}: ${response.status} ${response.statusText}`);
  }
  return response.json();
};

// Parse "2026-01-15" as a local date (new Date("2026-01-15") would be UTC).
const parseIsoDate = (value) => {
  if (typeof value !== 'string' || !ISO_DATE.test(value)) return null;
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day);
};

// "2026-01-15" -> "Thu, Jan 15". Non-ISO values (e.g. TODO placeholders) pass through.
const formatDate = (value) => {
  const date = parseIsoDate(value);
  if (!date) return value ?? '';
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
};

// Small DOM helper: el('p', { className: 'x' }, 'text', childNode)
const el = (tag, props = {}, ...children) => {
  const node = document.createElement(tag);
  Object.assign(node, props);
  for (const child of children) {
    if (child === null || child === undefined) continue;
    node.append(child instanceof Node ? child : String(child));
  }
  return node;
};

const container = (name) => document.querySelector(`[data-render="${name}"]`);

const showError = (name, error) => {
  console.error(`Could not render ${name}:`, error);
  const target = container(name);
  target.replaceChildren(
    el('p', { className: 'load-error', role: 'alert' },
      'This section could not be loaded. ',
      el('a', { href: 'assets/syllabus.pdf' }, 'Download the printable syllabus (PDF)'),
      '.')
  );
};

const definitionList = (pairs) => {
  const dl = el('dl');
  for (const [term, value] of pairs) {
    dl.append(el('dt', {}, term), el('dd', {}, value));
  }
  return dl;
};

const asText = (value) => (Array.isArray(value) ? value.join('; ') : value ?? '');

const emailLink = (email) =>
  email && email.includes('@')
    ? el('a', { href: `mailto:${email}` }, email)
    : el('span', {}, email ?? '');

// ---------- Overview ----------
const renderOverview = (course) => {
  document.title = `${course.title} – Syllabus`;
  document.getElementById('course-title').textContent = course.title;
  document.getElementById('course-code').textContent = `${course.code} · ${course.term}`;

  const meetings = el('ul');
  for (const meeting of course.meetings ?? []) {
    meetings.append(el('li', {}, `${meeting.days}, ${meeting.time} — ${meeting.location}`));
  }

  const outcomes = course.outcomes ?? [];
  const goals = outcomes.length
    ? el('ul', {}, ...outcomes.map((item) => el('li', {}, item)))
    : el('p', { className: 'todo-note' }, 'TODO: Learning goals to be added.');

  container('overview').replaceChildren(
    el('p', {}, course.description),
    el('h3', {}, 'Meeting times'),
    meetings,
    el('h3', {}, 'Learning goals'),
    goals
  );
};

// ---------- Instructor ----------
const renderInstructor = (course) => {
  const { instructor } = course;
  document.getElementById('header-instructor').textContent = instructor.name;
  const headerEmail = document.getElementById('header-email');
  headerEmail.textContent = instructor.email;
  headerEmail.href = `mailto:${instructor.email}`;

  const hours = el('ul');
  for (const slot of course.officeHours ?? []) {
    hours.append(el('li', {}, `${slot.days}, ${slot.time} — ${slot.location}`));
  }

  container('instructor').replaceChildren(
    definitionList([
      ['Name', instructor.name],
      ['Email', emailLink(instructor.email)],
      ['Office', instructor.office],
    ]),
    el('h3', {}, 'Office hours'),
    hours
  );
};

// ---------- Schedule ----------
// The current week is the entry whose date is within the 7 days up to today.
const findCurrentWeek = (entries, today = new Date()) => {
  const now = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  return entries.find((entry) => {
    const start = parseIsoDate(entry.date);
    return start && now >= start && now - start < 7 * DAY_MS;
  });
};

const renderSchedule = (entries) => {
  const current = findCurrentWeek(entries);
  const headers = ['Week', 'Date', 'Topic', 'Readings', 'Due'];

  const rows = entries.map((entry) => {
    const weekCell = el('th', { scope: 'row' }, `Week ${entry.week}`);
    const row = el('tr', {}, weekCell,
      el('td', {}, formatDate(entry.date)),
      el('td', {}, entry.topic),
      el('td', {}, asText(entry.readings)),
      el('td', {}, asText(entry.due)));
    if (entry === current) {
      row.className = 'current-week';
      row.setAttribute('aria-current', 'date');
      weekCell.append(el('span', { className: 'current-label' }, '(this week)'));
    }
    return row;
  });

  const table = el('table', {},
    el('thead', {}, el('tr', {}, ...headers.map((h) => el('th', { scope: 'col' }, h)))),
    el('tbody', {}, ...rows));

  const scroll = el('div', { className: 'table-scroll', tabIndex: 0 }, table);
  scroll.setAttribute('role', 'region');
  scroll.setAttribute('aria-label', 'Weekly schedule (scrolls sideways)');

  container('schedule').replaceChildren(
    current
      ? el('p', {}, `This week is Week ${current.week}. It is highlighted below.`)
      : el('p', {}, 'The current week is highlighted when the course is in session.'),
    scroll
  );
};

// ---------- Assignments ----------
const checkWeights = (assignments) => {
  const weights = assignments.map((a) => a.weight);
  if (weights.some((w) => typeof w !== 'number')) {
    console.warn('assignments.json: some grading weights are missing (TODO).');
    return null;
  }
  const total = weights.reduce((sum, w) => sum + w, 0);
  if (total !== 100) {
    console.warn(`assignments.json: grading weights sum to ${total}%, not 100%.`);
  }
  return total;
};

const renderAssignments = (data) => {
  const assignments = data.assignments ?? [];
  const total = checkWeights(assignments);
  const formatWeight = (w) => (typeof w === 'number' ? `${w}%` : w ?? '');

  const rows = assignments.map((a) => el('tr', {},
    el('th', { scope: 'row' }, a.name),
    el('td', {}, formatDate(a.due)),
    el('td', {}, formatWeight(a.weight)),
    el('td', {}, a.description ?? '')));

  const totalRow = el('tr', { className: 'grade-total' },
    el('th', { scope: 'row' }, 'Total'),
    el('td'),
    el('td', {}, total === null ? 'TODO' : `${total}%`),
    el('td'));

  const table = el('table', {},
    el('thead', {}, el('tr', {},
      ...['Assignment', 'Due', 'Weight', 'Details'].map((h) => el('th', { scope: 'col' }, h)))),
    el('tbody', {}, ...rows, totalRow));

  const scroll = el('div', { className: 'table-scroll', tabIndex: 0 }, table);
  scroll.setAttribute('role', 'region');
  scroll.setAttribute('aria-label', 'Assignments and weights (scrolls sideways)');

  const scale = el('ul', {}, ...(data.gradingScale ?? []).map((g) => el('li', {}, `${g.grade}: ${g.range}`)));

  container('assignments').replaceChildren(
    scroll,
    el('h3', {}, 'Grading scale'),
    scale
  );
};

// ---------- Policies ----------
const renderPolicies = (data) => {
  const parts = (data.policies ?? []).flatMap((policy) => [
    el('h3', {}, policy.title),
    el('p', {}, policy.text),
  ]);
  container('policies').replaceChildren(...parts);
};

// ---------- Boot ----------
const renderSection = async (name, dataPromise, render) => {
  try {
    render(await dataPromise);
  } catch (error) {
    showError(name, error);
  }
};

const init = () => {
  // course.json feeds two sections; load it once.
  const course = loadJson('data/course.json');
  course.catch(() => {}); // handled per section below

  renderSection('overview', course, renderOverview);
  renderSection('instructor', course, renderInstructor);
  renderSection('schedule', loadJson('data/schedule.json'), (d) => renderSchedule(d.weeks ?? []));
  renderSection('assignments', loadJson('data/assignments.json'), renderAssignments);
  renderSection('policies', loadJson('data/policies.json'), renderPolicies);
};

init();
