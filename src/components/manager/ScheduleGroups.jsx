import { useState } from "react";
import { Badge, Button, Card, EmptyState, SelectField } from "../common/UI.jsx";
import { groupSchedules } from "./scheduleGroups.js";
import "./schedule-groups.css";

const statusLabels = { SCHEDULED: "Đã xếp lịch", COMPLETED: "Đã hoàn thành", CANCELLED: "Đã hủy" };

export function ScheduleGroups({ sessions, classes, onEdit, onDelete }) {
  const [subjectId, setSubjectId] = useState("");
  const [courseId, setCourseId] = useState("");
  const groups = groupSchedules(sessions, classes);
  const activeSubjectId = groups.some(subject => subject.id === subjectId) ? subjectId : "";
  const courses = groups.find(subject => subject.id === activeSubjectId)?.courses || [];
  const activeCourseId = courses.some(course => course.id === courseId) ? courseId : "";
  const visible = groups.filter(subject => !activeSubjectId || subject.id === activeSubjectId)
    .map(subject => ({ ...subject, courses: subject.courses.filter(course => !activeCourseId || course.id === activeCourseId) }))
    .filter(subject => subject.courses.length);
  const count = visible.reduce((sum, subject) => sum + subject.courses.reduce((n, course) => n + course.sessions.length, 0), 0);
  return <div className="manager-schedule-groups">
    <Card className="manager-schedule-filters">
      <SelectField label="Bộ môn" value={activeSubjectId} onChange={value => { setSubjectId(value); setCourseId(""); }}>
        <option value="">Tất cả bộ môn</option>{groups.map(subject => <option key={subject.id} value={subject.id}>{subject.name}</option>)}
      </SelectField>
      <SelectField label="Khóa học" disabled={!activeSubjectId} value={activeCourseId} onChange={setCourseId}>
        <option value="">{subjectId ? "Tất cả khóa học của bộ môn" : "Chọn bộ môn trước"}</option>
        {courses.map(course => <option key={course.id} value={course.id}>{course.name}</option>)}
      </SelectField>
      <Button variant="secondary" disabled={!subjectId && !courseId} onClick={() => { setSubjectId(""); setCourseId(""); }}>Xóa bộ lọc</Button>
    </Card>
    <p role="status">{count} buổi học · {visible.length} bộ môn</p>
    {visible.length ? visible.map(subject => <section key={subject.id} className="manager-schedule-subject" aria-label={subject.name}>
      <h2>{subject.name} <span>· {subject.courses.length} khóa học</span></h2>
      {subject.courses.map(course => <Card key={course.id} className="manager-schedule-course">
        <div className="manager-schedule-course-heading"><h3>{course.name}</h3><span>{course.sessions.length} buổi học</span></div>
        <div className="stack-list">{course.sessions.map(session => <div key={session.id}>
          <div>
            <strong>{session.classItem?.name || "Chưa có thông tin lớp"}</strong>
            <p>{session.date} · {session.startTime}–{session.endTime}</p>
            <p>{session.lesson?.title || "Chưa có thông tin bài học"}</p>
            {session.lesson?.description && <p className="manager-schedule-description">{session.lesson.description}</p>}
            <p>Huấn luyện viên: {session.classItem?.coach?.name || session.coach?.name || "Chưa có thông tin"}</p>
            <p>Phòng: {session.room ? session.room.roomNumber + " · " + session.room.name : "Chưa có thông tin"}</p>
            <Badge>{statusLabels[session.status] || session.status}</Badge>
          </div>
          <div className="delete-actions"><Button variant="secondary" onClick={() => onEdit(session)}>Sửa lịch</Button>{onDelete && <Button variant="danger" onClick={() => onDelete(session)}>Xóa lịch</Button>}</div>
        </div>)}</div>
      </Card>)}
    </section>) : <Card><EmptyState title={sessions.length ? "Không có lịch học phù hợp" : "Chưa có lịch học"} /></Card>}
  </div>;
}
