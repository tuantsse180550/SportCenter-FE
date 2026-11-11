// Test-only HTTP fixture. No application imports this module.
export function createBackendFixture(saved, onChange = () => {}) {
  const ids = { member: "111111111111111111111111", coach: "222222222222222222222222", class: "333333333333333333333333", subject: "444444444444444444444444", course: "555555555555555555555555", lesson: "666666666666666666666666", schedule: "777777777777777777777777", plan: "888888888888888888888888" };
  const roles = ["CENTER_MANAGER", "COACH", "MEMBER", "RECEPTIONIST"];
  const users = roles.map((role, i) => ({ id: String(i + 1).repeat(24), role, email: role.toLowerCase() + "@test.invalid", status: "ACTIVE" }));
  const member = { _id: ids.member, userId: users[2].id, fullName: "Test Member", phone: "0900000000", goal: "Strength", level: "BEGINNER" };
  const coach = { _id: ids.coach, userId: users[1].id, fullName: "Test Coach", phone: "0900000001" };
  const subject = { _id: ids.subject, name: "Strength" };
  const course = { _id: ids.course, name: "Foundation", description: "Training course", price: 100000, status: "ACTIVE" };
  const cls = { _id: ids.class, name: "Test Class", subjectId: subject, courseId: course, coachId: coach };
  const lesson = { _id: ids.lesson, title: "First lesson", order: 1, learningPathId: ids.course };
  const state = saved || { members: [member], coaches: [coach], classes: [cls], subjects: [subject], courses: [course], learningPaths: [], schedules: [{ _id: ids.schedule, classId: cls, lessonId: lesson, date: "2026-10-10T00:00:00.000Z", startTime: "18:00", endTime: "19:00", status: "SCHEDULED" }], registrations: [], payments: [], attendances: [], plans: [{ _id: ids.plan, coachId: coach, memberId: member, classId: cls, goal: "Build strength", level: "BEGINNER", plan: "Squats", source: "COACH", status: "APPROVED" }], results: [], logs: [], counter: 100 };
  const calls = [];
  state.rooms ||= [];
  const options = { mockPaymentsEnabled: false, errors: {} };
  const id = (v) => typeof v === "string" ? v : v?._id || v?.id;
  const next = () => (++state.counter).toString(16).padStart(24, "0");
  const reply = (data, status = 200, message) => new Response(JSON.stringify({ success: status < 400, data, ...(message ? { message } : {}) }), { status, headers: { "Content-Type": "application/json" } });
  const enrichReg = (r) => ({ ...r, memberId: state.members.find((m) => id(m) === id(r.memberId)) || r.memberId, classId: state.classes.find((c) => id(c) === id(r.classId)) || r.classId });
  async function network(url, init = {}) {
    const route = new URL(url).pathname; const method = init.method || "GET"; const body = init.body ? JSON.parse(init.body) : undefined;
    calls.push({ route, method, body, headers: init.headers });
    if (options.errors[route]) return reply(null, options.errors[route], "Injected API error");
    if (route === "/api/auth/login") { const user = users.find((u) => u.email === body.email); return user && body.password === "test-password" ? reply({ token: "test-token-" + user.role, user }) : reply(null, 401, "Invalid email or password"); }
    if (route === "/api/auth/register") return reply({ id: next(), email: body.email, role: body.role, status: "ACTIVE" }, 201);
    const token = new Headers(init.headers).get("authorization")?.replace("Bearer test-token-", "");
    const user = users.find((u) => u.role === token);
    if (!user) return reply(null, 401, "Authentication required");
    if (route === "/api/auth/me") return reply(user);
    if (route === "/api/reports/summary" && method === "GET") {
      if (user.role !== "CENTER_MANAGER") return reply(null, 403, "Access denied");
      const distribution = rows => rows.reduce((all, row) => ({ ...all, [row.status]: (all[row.status] || 0) + 1 }), {});
      const successful = state.payments.filter(row => row.status === "SUCCESS");
      return reply({ totals: { registeredAccounts: state.members.length, activeAccounts: state.members.length, members: state.members.length, classes: state.classes.length, courses: state.courses.length, coaches: state.coaches.length }, registrations: distribution(state.registrations), paymentStatuses: distribution(state.payments), revenue: { amount: successful.reduce((sum,row)=>sum+row.amount,0), count: successful.length, byMonth: [], byClass: [], byCourse: [] } });
    }
    if (route === "/api/class-registrations" && method === "GET" && user.role === "COACH") return reply(null, 403, "Access denied");
    if (route === "/api/coaches/my-students" && method === "GET") {
      if (user.role !== "COACH") return reply(null, 403, "Access denied");
      const ownCoach = state.coaches.find(c => id(c.userId) === user.id);
      const classIds = state.classes.filter(c => id(c.coachId) === id(ownCoach)).map(id);
      return reply(state.registrations.filter(r => r.status === "CONFIRMED" && classIds.includes(id(r.classId)))
        .map(enrichReg).filter(r => r.memberId).map(r => ({member:r.memberId,class:r.classId,registeredAt:r.registeredAt})));
    }
    if (route === "/api/lessons" && method === "GET") return reply([lesson]);
    if (route === "/api/learning-paths" && method === "GET") return reply([{ _id: ids.course, courseId: course, name: "Test learning path" }]);
    if (route.startsWith("/api/rooms")) {
      if (method !== "GET" && user.role !== "CENTER_MANAGER") return reply(null, 403, "Access denied");
      const roomId = route.split("/")[3];
      const current = state.rooms.find(r => id(r) === roomId);
      if (method === "GET") return roomId ? current ? reply(current) : reply(null, 404, "Room not found") : reply(state.rooms);
      if (method === "POST" || method === "PUT") {
        if (body.capacity !== undefined && (!Number.isInteger(body.capacity) || body.capacity < 1)) return reply(null, 400, "capacity must be a positive integer");
        if (state.rooms.some(r => r.roomNumber === body.roomNumber && id(r) !== roomId)) return reply(null, 409, "Room number already exists");
        if (method === "PUT" && !current) return reply(null, 404, "Room not found");
        const row = current || { _id: next() }; Object.assign(row, body);
        if (!current) state.rooms.push(row); onChange(state); return reply(row, current ? 200 : 201);
      }
      if (method === "DELETE") {
        if (state.schedules.some(s => id(s.roomId) === roomId)) return reply(null, 409, "Cannot delete a room linked to schedules. Set its status to INACTIVE instead when allowed.");
        state.rooms = state.rooms.filter(r => id(r) !== roomId); onChange(state); return reply(undefined);
      }
    }
    if (route.startsWith("/api/schedules") && ["POST", "PUT"].includes(method)) {
      if (user.role !== "CENTER_MANAGER") return reply(null, 403, "Access denied");
      const room = state.rooms.find(r => id(r) === body.roomId);
      if (!room || room.status !== "ACTIVE") return reply(null, 400, "The selected room is not active");
      const scheduleId = route.split("/")[3];
      if (body.status !== "CANCELLED" && state.schedules.some(s => id(s) !== scheduleId && id(s.roomId) === body.roomId && s.date.slice(0, 10) === body.date.slice(0, 10) && s.status !== "CANCELLED" && s.startTime < body.endTime && s.endTime > body.startTime)) return reply(null, 409, "This room already has a schedule during the selected time");
      const existing = state.schedules.find(s => id(s) === scheduleId);
      const row = existing || { _id: next() };
      Object.assign(row, body, { roomId: room, classId: state.classes.find(c => id(c) === body.classId), lessonId: lesson, date: body.date.slice(0, 10) + "T00:00:00.000Z" });
      if (!existing) state.schedules.push(row); onChange(state); return reply(row, existing ? 200 : 201);
    }
    if (route === "/api/attendances/my" && method === "GET") {
      if (user.role !== "MEMBER") return reply(null, 403, "Access denied");
      const own = state.members.find(m => id(m.userId) === user.id);
      if (!own) return reply(null, 404, "Member profile not found");
      return reply(state.attendances.filter(a => id(a.memberId) === id(own)).map(a => ({ ...a, classId: state.classes.find(c => id(c) === id(a.classId)), lessonId: lesson })));
    }
    if (route === "/api/schedules/coach/my" && method === "GET") {
      if (user.role !== "COACH") return reply(null, 403, "Access denied");
      return reply(state.schedules.filter(s => id(s.classId?.coachId) === ids.coach));
    }
    if (route.startsWith("/api/attendances/schedule/") && method === "GET") {
      if (user.role !== "COACH") return reply(null, 403, "Access denied");
      const schedule = state.schedules.find(s => id(s) === route.split("/").pop());
      if (!schedule) return reply(null, 404, "Schedule not found");
      if (id(schedule.classId?.coachId) !== ids.coach) return reply(null, 403, "You are not assigned to this class");
      const date = new Date(schedule.date); date.setUTCHours(0, 0, 0, 0);
      return reply(state.attendances.filter(a => id(a.classId) === id(schedule.classId) && id(a.lessonId) === id(schedule.lessonId) && new Date(a.date).getTime() === date.getTime()));
    }
    if (route === "/api/attendances/coach" && method === "POST") {
      if (user.role !== "COACH") return reply(null, 403, "Access denied");
      const schedule = state.schedules.find(s => id(s) === body.scheduleId);
      if (!schedule) return reply(null, 404, "Schedule not found");
      if (id(schedule.classId?.coachId) !== ids.coach) return reply(null, 403, "You are not assigned to this class");
      if (!state.registrations.some(r => id(r.classId) === id(schedule.classId) && id(r.memberId) === body.memberId && r.status === "CONFIRMED")) return reply(null, 400, "Member is not confirmed for this class");
      if (!["PRESENT", "ABSENT"].includes(body.status)) return reply(null, 400, "status must be PRESENT or ABSENT");
      const date = new Date(schedule.date); date.setUTCHours(0, 0, 0, 0);
      if (state.attendances.some(a => id(a.memberId) === body.memberId && id(a.classId) === id(schedule.classId) && id(a.lessonId) === id(schedule.lessonId) && new Date(a.date).getTime() === date.getTime())) return reply(null, 409, "Attendance already recorded");
      const row = { _id: next(), memberId: body.memberId, classId: id(schedule.classId), lessonId: id(schedule.lessonId), date: date.toISOString(), status: body.status };
      state.attendances.push(row); onChange(state); return reply(row, 201);
    }
    if (method === "POST" && /^\/api\/payments\/[^/]+\/vnpay$/.test(route)) {
      if (user.role !== "MEMBER") return reply(null, 403, "Access denied");
      const payment = state.payments.find(p => id(p) === route.split("/")[3]);
      if (!payment) return reply(null, 404, "Payment not found");
      const reg = state.registrations.find(r => id(r) === id(payment.classRegistrationId));
      if (id(reg?.memberId) !== ids.member) return reply(null, 403, "You cannot access this payment");
      if (payment.paymentMethod !== "ONLINE" || payment.status !== "PENDING") return reply(null, 400, "Only pending ONLINE payments can be paid");
      return reply({ paymentId: id(payment), amount: payment.amount, paymentUrl: "https://sandbox.vnpayment.vn/paymentv2/vpcpay.html?fixture=1" });
    }
    if (route.startsWith("/api/attendances") && method !== "GET" && !["CENTER_MANAGER", "COACH", "RECEPTIONIST"].includes(user.role)) return reply(null, 403, "Access denied");
    if (route === "/api/members/me") {
      if (user.role !== "MEMBER") return reply(null, 403, "Access denied");
      const profile = state.members.find(m => id(m.userId) === user.id);
      if (method === "GET") return profile ? reply(profile) : reply(null, 404, "Member profile not found. Please create your profile.");
      if (method === "POST") {
        if (profile) return reply(null, 409, "Member profile already exists");
        const row = { _id: next(), userId: user.id, ...body }; state.members.push(row); onChange(state); return reply(row, 201);
      }
      if (method === "PUT") {
        if (!profile) return reply(null, 404, "Member profile not found. Please create your profile first.");
        Object.assign(profile, body); onChange(state); return reply(profile);
      }
    }
    if (route === "/api/schedules/my" && method === "GET") {
      if (user.role !== "MEMBER") return reply(null, 403, "Access denied");
      const profile = state.members.find(m => id(m.userId) === user.id);
      if (!profile) return reply(null, 404, "Member profile not found");
      const classes = state.registrations.filter(r => id(r.memberId) === id(profile) && r.status === "CONFIRMED").map(r => id(r.classId));
      return reply(state.schedules.filter(s => classes.includes(id(s.classId))));
    }
    if (method === "GET") {
      const lists = { "/api/members": state.members, "/api/coaches": state.coaches, "/api/classes": state.classes, "/api/subjects": state.subjects, "/api/courses": state.courses, "/api/schedules": state.schedules, "/api/class-registrations": state.registrations.map(enrichReg), "/api/payments": state.payments.map((p) => ({ ...p, classRegistrationId: enrichReg(state.registrations.find((r) => id(r) === id(p.classRegistrationId))) })), "/api/attendances": state.attendances, "/api/workout-plans": state.plans, "/api/workout-results": state.results.map((r) => ({ ...r, workoutPlanId: state.plans.find((p) => id(p) === id(r.workoutPlanId)) })), "/api/activity-logs": state.logs };
      if (route in lists) return reply(lists[route]);
    }
    if (method === "POST" && route === "/api/class-registrations") {
      if (state.registrations.some((r) => id(r.classId) === body.classId && id(r.memberId) === body.memberId)) return reply(null, 409, "Member is already registered for this class");
      const row = { _id: next(), ...body, status: "PENDING_PAYMENT" }; state.registrations.push(row); onChange(state); return reply(row, 201);
    }
    if ((method === "POST" && route === "/api/payments") || (method === "PUT" && route.startsWith("/api/payments/"))) {
      const row = method === "POST" ? { _id: next(), ...body, amount: 100000, status: "PENDING", paymentDate: null } : state.payments.find((p) => id(p) === route.split("/").pop());
      if (!row) return reply(null, 404, "Payment not found");
      if (method === "PUT") {
        if (body.status !== undefined || body.paymentDate !== undefined) return reply(null, 400, "Payment status and paymentDate cannot be changed through this endpoint");
        if (body.amount !== undefined) return reply(null, 400, "Payment amount cannot be changed. It is determined by Course.price.");
        if (row.status !== "PENDING") return reply(null, 400, "Only pending payments can be updated");
        Object.assign(row, body);
      } else state.payments.push(row);
      onChange(state); return reply(row, method === "POST" ? 201 : 200);
    }
    if (method === "POST" && /^\/api\/payments\/[^/]+\/simulate$/.test(route)) {
      if (user.role !== "MEMBER" || !options.mockPaymentsEnabled) return reply(null, 403, "Mock payment mode is disabled or access denied");
      const row = state.payments.find(p => id(p) === route.split("/")[3]);
      if (!row) return reply(null, 404, "Payment not found");
      const reg = state.registrations.find(r => id(r) === id(row.classRegistrationId));
      const member = state.members.find(m => id(m.userId) === user.id);
      if (!member || id(reg?.memberId) !== id(member)) return reply(null, 403, "You cannot access this payment");
      if (row.status !== "PENDING" || !["SUCCESS", "FAILED"].includes(body.status)) return reply(null, 400, "Only pending payments can be simulated");
      row.status = body.status;
      if (body.status === "SUCCESS") { row.paymentDate = new Date().toISOString(); reg.status = "CONFIRMED"; }
      onChange(state); return reply({ paymentId: id(row), paymentStatus: row.status, registrationStatus: reg.status });
    }
    if (method === "POST" && route === "/api/members") { const row = { _id: next(), ...body }; state.members.push(row); onChange(state); return reply(row, 201); }
    if ((method === "POST" && route === "/api/attendances") || (method === "PUT" && route.startsWith("/api/attendances/"))) {
      if (!["memberId", "classId", "lessonId", "date", "status"].every(key => body?.[key])) return reply(null, 400, "memberId, classId, lessonId, date and status are required");
      if (!["PRESENT", "ABSENT"].includes(body.status)) return reply(null, 400, "status must be PRESENT or ABSENT");
      if (Number.isNaN(new Date(body.date).getTime())) return reply(null, 400, "Invalid date");
      const row = method === "POST" ? { _id: next(), ...body, createdAt: new Date().toISOString() } : state.attendances.find(a => id(a) === route.split("/").pop());
      if (!row) return reply(null, 404, "Attendance not found");
      if (state.attendances.some(a => id(a) !== id(row) && id(a.memberId) === body.memberId && id(a.classId) === body.classId && id(a.lessonId) === body.lessonId && new Date(a.date).getTime() === new Date(body.date).getTime())) return reply(null, 409, "Attendance already recorded for this member, class, lesson and date");
      Object.assign(row, body, { updatedAt: new Date().toISOString() }); if (method === "POST") state.attendances.push(row); onChange(state); return reply(row, method === "POST" ? 201 : 200);
    }
    if (method === "DELETE" && route.startsWith("/api/attendances/")) {
      const index = state.attendances.findIndex(a => id(a) === route.split("/").pop());
      if (index < 0) return reply(null, 404, "Attendance not found");
      state.attendances.splice(index, 1); onChange(state); return reply(undefined, 200, "Attendance deleted successfully");
    }
    if (method === "POST" && route === "/api/workout-results") { const row = { _id: next(), ...body, createdAt: new Date().toISOString() }; state.results.push(row); onChange(state); return reply(row, 201); }
    if (method === "POST" && route === "/api/workout-plans") { if (Boolean(body.memberId) === Boolean(body.classId)) return reply(null, 400, "Provide either memberId or classId, not both"); const row = { _id: next(), ...body }; state.plans.push(row); onChange(state); return reply(row, 201); }
    if (method === "POST" && route === "/api/classes") { const row = { _id: next(), ...body }; state.classes.push(row); onChange(state); return reply(row, 201); }
    if (method === "PUT" && route.startsWith("/api/classes/")) {
      if (user.role !== "CENTER_MANAGER") return reply(null, 403, "Access denied");
      const row = state.classes.find(c => id(c) === route.split("/").pop());
      if (!row) return reply(null, 404, "Class not found");
      Object.assign(row, body); onChange(state); return reply(row);
    }
    if (route === "/api/learning-paths" && method === "GET") return reply(state.learningPaths || []);
    if (route === "/api/learning-paths" && method === "POST") {
      if (user.role !== "CENTER_MANAGER") return reply(null, 403, "Access denied");
      const row = { _id: next(), ...body }; (state.learningPaths ||= []).push(row); return reply(row, 201);
    }
    return reply(null, 404, "Unexpected test request: " + method + " " + route);
  }
  return { ids, users, state, calls, options, fetch: network };
}
