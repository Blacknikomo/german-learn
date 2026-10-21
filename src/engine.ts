/**
 * This app's engine instance: which types it understands, where progress lives, which course.
 *
 * Everything domain-specific about German is here, in the app. The engine is given a normalizer
 * and a course and knows nothing else.
 */
import {
  choice, cloze, note, openProgress, seededRandom, systemClock, TypeRegistry,
  type Course, type Storage,
} from 'quiz-engine';
import { germanNormalizer } from './normalize.ts';
import courseData from './content/wortbildung.course.json';

export const course = courseData as unknown as Course;

/** `cloze` is registered with this course's spelling rules rather than the engine's defaults; the
 *  rest are built in. */
export const registry: TypeRegistry = new TypeRegistry()
  .register(choice)
  .register(cloze({ normalize: germanNormalizer }))
  .register(note);

/** The storage port over `localStorage`, guarded: a private window, blocked site data or a full
 *  quota must degrade to "nothing stored" rather than break a session. */
const browserStorage: Storage = {
  get: key => { try { return localStorage.getItem(key); } catch { return null; } },
  set: (key, value) => { try { localStorage.setItem(key, value); } catch { /* ignore */ } },
  remove: key => { try { localStorage.removeItem(key); } catch { /* ignore */ } },
};

export const progress = openProgress({
  key: 'de',
  storage: browserStorage,
  clock: systemClock,
  random: seededRandom(`de-${new Date().toISOString().slice(0, 10)}`),
  // No transport yet: progress stays on this device until the sync backend is deployed.
});
