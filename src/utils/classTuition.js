export function courseTuition(course) {
  // Read old group fees without changing any registration's agreed snapshot.
  const price = course?.price === undefined ? course?.pricing?.group : course.price;
  return Number.isFinite(price) && price >= 0 ? price : undefined;
}
export function classTuition(item) {
  return courseTuition(item?.course);
}
