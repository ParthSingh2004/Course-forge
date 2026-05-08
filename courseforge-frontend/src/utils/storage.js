import localforage from 'localforage';
import { v4 as uuidv4 } from 'uuid';

localforage.config({
  name: 'CourseForge',
  storeName: 'authoring_courses',
  description: 'Editable CourseForge authoring projects',
});

export async function createLocalCourse(authoringState) {
  const now = Date.now();
  const id = uuidv4();
  const course = {
    id,
    title: authoringState?.courseTitle?.trim() || 'Untitled Course',
    authoringState,
    createdAt: now,
    updatedAt: now,
  };

  await localforage.setItem(id, course);
  return course;
}

export async function saveCourseToBrowser(id, authoringState) {
  const now = Date.now();
  const existingCourse = id ? await localforage.getItem(id) : null;
  const course = {
    id: existingCourse?.id || id || uuidv4(),
    title: authoringState?.courseTitle?.trim() || 'Untitled Course',
    authoringState,
    createdAt: existingCourse?.createdAt || now,
    updatedAt: now,
  };

  await localforage.setItem(course.id, course);
  return course;
}

export async function getAllLocalCourses() {
  const courses = [];

  await localforage.iterate((course) => {
    if (course?.id && course?.authoringState) {
      courses.push(course);
    }
  });

  return courses.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
}

export async function deleteLocalCourse(id) {
  await localforage.removeItem(id);
}
