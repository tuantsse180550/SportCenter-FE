import test from 'node:test';
import assert from 'node:assert/strict';
import { buildClassSchedulePlan, checkClassSchedulePlan, classScheduleFingerprint } from '../src/components/manager/classSchedulePlan.js';
import { saveClassSchedulePlan } from '../src/services/api/classScheduleImport.js';
import { mapImportResult } from '../src/components/manager/scheduleImportLogic.js';
const context = () => ({ classItem: { id: 'class', courseId: 'course', coachId: 'coach' }, rooms: [{ id: 'room', status: 'ACTIVE' }], lessons: [], sessions: [], paths: [{ id: 'path', courseId: 'course' }], templates: [1, 2, 3].map(order => ({ id: 'template-' + order, classId: null, learningPathId: 'path', title: 'Topic ' + order, description: 'Content ' + order, order })) });
const form = () => ({ startDate: '2026-11-02', endDate: '2026-11-09', weekdays: [1, 3], startTime: '18:00', endTime: '19:00', roomId: 'room', learningPathId: 'path' });
const copied = ctx => ctx.templates.map(item => ({ ...item, id: 'copy-' + item.order, classId: 'class' }));
test('ten lessons use the first ten of thirteen weekday slots in a month', () => {
 const c=context(); c.templates=Array.from({length:10},(_,index)=>({...c.templates[0],id:'template-'+(index+1),order:index+1,title:'Lesson '+(index+1)}));
 const p=buildClassSchedulePlan({...form(),startDate:'2026-11-01',endDate:'2026-11-30',weekdays:[1,3,5]},c);
 assert.deepEqual(p.rows.map(row=>row.date),['2026-11-02','2026-11-04','2026-11-06','2026-11-09','2026-11-11','2026-11-13','2026-11-16','2026-11-18','2026-11-20','2026-11-23']);
 assert.deepEqual(p.rows.map(row=>row.lessonOrder),[1,2,3,4,5,6,7,8,9,10]);
 assert.equal(p.newLessonCount,10); assert.ok(checkClassSchedulePlan(p,c).every(row=>!row.issues.length));
 assert.throws(()=>buildClassSchedulePlan({...form(),startDate:'2026-11-01',endDate:'2026-11-20',weekdays:[1,3,5]},c),/9.*10/);
});
test('a long date range does not add sessions after the curriculum is complete', () => {
 const c=context(); c.templates.pop();
 const p=buildClassSchedulePlan({...form(),endDate:'2040-11-01',weekdays:[0,1,2,3,4,5,6]},c);
 assert.deepEqual(p.rows.map(row=>row.date),['2026-11-02','2026-11-03']);
});
test('only remaining class lessons are scheduled and a fully scheduled class is rejected', () => {
 const c=context(); c.lessons=copied(c); c.sessions=[{classId:'class',lessonId:'copy-1',status:'SCHEDULED'}];
 const p=buildClassSchedulePlan({...form(),endDate:'2026-11-30'},c);
 assert.deepEqual(p.rows.map(row=>row.lessonId),['copy-2','copy-3']); assert.equal(p.newLessonCount,0);
 c.sessions=c.lessons.map(lesson=>({classId:'class',lessonId:lesson.id,status:'COMPLETED'}));
 assert.throws(()=>buildClassSchedulePlan(form(),c),/Không có buổi mới/);
});
test('the import limit still blocks curricula requiring more than one thousand sessions', () => {
 const c=context();c.templates=Array.from({length:1001},(_,index)=>({...c.templates[0],id:'t-'+index,order:index+1}));
 assert.throws(()=>buildClassSchedulePlan({...form(),endDate:'2040-11-01',weekdays:[0,1,2,3,4,5,6]},c),/1\.000/);
});
test('weekly dates receive complete curriculum in order', () => {
 const ctx = context(); ctx.templates.push({ id: 'foreign', learningPathId: 'other' }); const plan = buildClassSchedulePlan(form(), ctx);
 assert.deepEqual(plan.rows.map(r => r.date), ['2026-11-02', '2026-11-04', '2026-11-09']);
 assert.deepEqual(plan.rows.map(r => r.lessonTitle), ['Topic 1', 'Topic 2', 'Topic 3']); assert.equal(plan.newLessonCount, 3);
 assert.ok(plan.rows.every(r => r.description.startsWith('Content'))); assert.ok(checkClassSchedulePlan(plan, ctx).every(r => !r.issues.length));
});
test('invalid dates, time, room and weekdays block scheduling', () => {
 for (const patch of [{ startDate: '2026-02-30' }, { endDate: '2026-11-01' }, { weekdays: [] }, { weekdays: [9] }, { endTime: '17:00' }, { startTime: '25:00' }, { roomId: 'unknown' }]) assert.throws(() => buildClassSchedulePlan({ ...form(), ...patch }, context()));
});
test('missing/incomplete curriculum, wrong course and insufficient dates block scheduling', () => {
 for (const setup of [c => { c.templates=[]; }, c => { c.templates[0].description=''; }, c => { c.paths[0].courseId='other'; }, c => { c.templates.push({...c.templates[0], id:'extra'}); }]) { const c=context();setup(c);assert.throws(() => buildClassSchedulePlan(form(),c)); }
 assert.throws(() => buildClassSchedulePlan({...form(),endDate:'2026-11-04'},context()),/2.*3/);
});
test('class content is preserved; only unscheduled lessons are reused', () => {
 const c=context(); c.lessons=copied(c); c.lessons[1].title='Class customization'; c.sessions=[{classId:'class',lessonId:'copy-1',status:'COMPLETED'}];
 const p=buildClassSchedulePlan({...form(),endDate:'2026-11-04'},c); assert.equal(p.newLessonCount,0); assert.equal(p.rows[0].lessonTitle,'Class customization');
 c.templates[1].description='Changed shared template'; assert.equal(buildClassSchedulePlan({...form(),endDate:'2026-11-04'},c).rows[0].description,'Content 2');
 c.sessions[0].status='CANCELLED'; assert.equal(buildClassSchedulePlan(form(),c).rows[0].lessonId,'copy-1');
 c.lessons[0].learningPathId='other'; assert.throws(()=>buildClassSchedulePlan(form(),c));
});
test('one request saves both curriculum and schedules with the preview snapshot', async () => {
 const c=context(); let writes=0;
 const apis={scheduleApi:{generateClass:async body=>{writes++;assert.equal(body.classId,'class');assert.equal(body.learningPathId,'path');assert.equal(body.courseId,'course');assert.equal(body.coachId,'coach');assert.equal(body.newCurriculum,true);assert.deepEqual(body.expectedLessons,c.templates.map(({id,title,description,order})=>({id,title,description,order})));assert.deepEqual(body.rows.map(r=>r.lessonOrder),[1,2,3]);assert.ok(body.rows.every(r=>r.date&&r.startTime&&r.endTime&&r.roomId&&!r.lessonId));return {successCount:3};}}};
 assert.deepEqual(await saveClassSchedulePlan(buildClassSchedulePlan(form(),c),c,apis),{successCount:3});assert.equal(writes,1);
});
test('changed content invalidates preview; existing class content is sent without copying again', async () => {
 const c=context(),p=buildClassSchedulePlan(form(),c);c.templates[0].description='Changed';assert.notEqual(classScheduleFingerprint(p),classScheduleFingerprint(buildClassSchedulePlan(form(),c)));
 c.lessons=copied(c);c.lessons[0].description='Class-specific content';
 await saveClassSchedulePlan(buildClassSchedulePlan(form(),c),c,{scheduleApi:{generateClass:async body=>{assert.equal(body.newCurriculum,false);assert.equal(body.expectedLessons[0].id,'copy-1');assert.equal(body.expectedLessons[0].description,'Class-specific content');}}});
});
test('room conflicts and per-row partial retry mapping remain enforced', () => {
 const c=context(),p=buildClassSchedulePlan(form(),c);c.sessions.push({date:'2026-11-02',startTime:'18:30',endTime:'20:00',roomId:'room',status:'SCHEDULED'});assert.ok(checkClassSchedulePlan(p,c)[0].issues.length);
 const outcomes=mapImportResult({totalRows:2,successCount:1,errorCount:1,importedSchedules:[{row:2,scheduleId:'saved'}],errors:[{row:3,message:'failure'}]},p.rows.slice(0,2));assert.equal(outcomes.get('2026-11-02').outcome,'success');assert.equal(outcomes.get('2026-11-04').outcome,'error');
});
