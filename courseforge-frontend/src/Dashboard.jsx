import { useEffect, useState } from 'react';
import { BookOpen, FolderOpen, Plus, Trash2 } from 'lucide-react';
import { deleteLocalCourse, getAllLocalCourses } from './utils/storage';

function formatCourseDate(timestamp) {
  if (!timestamp) return 'Unknown date';

  return new Intl.DateTimeFormat(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(timestamp));
}

function Dashboard({ onCreateNew, onOpenCourse }) {
  const [courses, setCourses] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let isMounted = true;

    async function loadCourses() {
      try {
        const savedCourses = await getAllLocalCourses();
        if (isMounted) {
          setCourses(savedCourses);
          setError('');
        }
      } catch {
        if (isMounted) {
          setError('Could not load saved courses from this browser.');
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadCourses();

    return () => {
      isMounted = false;
    };
  }, []);

  const handleDelete = async (courseId) => {
    await deleteLocalCourse(courseId);
    setCourses((prevCourses) => prevCourses.filter((course) => course.id !== courseId));
  };

  return (
    <main className="min-h-screen bg-stone-50 text-stone-950">
      <section className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-5 py-8 sm:px-8 lg:px-10">
        <div className="flex flex-col gap-5 border-b border-stone-200 pb-7 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-900 text-white">
                <BookOpen className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-semibold uppercase tracking-wide text-red-900">CourseForge</p>
                <h1 className="text-3xl font-bold tracking-normal text-stone-950">Dashboard</h1>
              </div>
            </div>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-stone-600">
              Open and manage editable course authoring projects saved in this browser.
            </p>
          </div>

          <button
            type="button"
            onClick={onCreateNew}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-red-900 px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-red-800 focus:outline-none focus:ring-2 focus:ring-red-900 focus:ring-offset-2"
          >
            <Plus className="h-4 w-4" />
            Create New Course
          </button>
        </div>

        {error && (
          <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            {error}
          </div>
        )}

        {isLoading ? (
          <div className="rounded-md border border-stone-200 bg-white px-5 py-8 text-sm text-stone-600">
            Loading saved courses...
          </div>
        ) : courses.length === 0 ? (
          <div className="rounded-md border border-dashed border-stone-300 bg-white px-5 py-12 text-center">
            <h2 className="text-lg font-semibold text-stone-950">No courses yet</h2>
            <p className="mt-2 text-sm text-stone-600">
              Create a course to start authoring. Saved courses will appear here.
            </p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {courses.map((course) => (
              <article
                key={course.id}
                className="flex min-h-44 flex-col justify-between rounded-md border border-stone-200 bg-white p-5 shadow-sm"
              >
                <div>
                  <h2 className="line-clamp-2 text-lg font-semibold text-stone-950">
                    {course.title || 'Untitled Course'}
                  </h2>
                  <p className="mt-2 text-sm text-stone-500">
                    Last edited {formatCourseDate(course.updatedAt)}
                  </p>
                </div>

                <div className="mt-6 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => onOpenCourse(course)}
                    className="inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-md border border-red-900 bg-red-900 px-3 text-sm font-semibold text-white transition hover:bg-red-800"
                  >
                    <FolderOpen className="h-4 w-4" />
                    Open
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(course.id)}
                    className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-stone-300 bg-white px-3 text-sm font-semibold text-stone-700 transition hover:border-red-200 hover:bg-red-50 hover:text-red-800"
                  >
                    <Trash2 className="h-4 w-4" />
                    Delete
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}

export default Dashboard;
