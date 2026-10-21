import { createRoot } from 'react-dom/client';
import { validateCourse } from 'quiz-engine';
import { App } from './App.tsx';
import { course, registry } from './engine.ts';
import './styles.css';

/** In development the course is validated on load, so a content mistake shows up in the console
 *  rather than silently rendering wrong. `npm run check` is the real gate; this is the fast one. */
if (import.meta.env.DEV) {
  const issues = validateCourse(course, registry);
  if (issues.length > 0) {
    console.error(`${course.id}: ${issues.length} content issue(s)`);
    for (const issue of issues) console.error(`  ${issue.path}  ${issue.message}`);
  }
}

createRoot(document.querySelector('#root')!).render(<App />);
