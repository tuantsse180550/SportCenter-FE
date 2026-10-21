const contracts = {
  authService: ["getCurrentUser", "hasToken", "restore", "login", "loginWithGoogle", "logout", "registerMember"],
  classService: ["listClasses", "getClassDetail", "getFormOptions", "createClass", "updateClass", "assignCoach", "registerMember"],
  coachService: ["listCoaches"],
  memberService: ["listMembers", "getMemberDetail", "getMyProfile", "createMyProfile", "createMember", "updateProfile"],
  scheduleService: ["getCoachSessions", "getMemberSchedule", "getSessionDetail", "getCoachScheduleSummary"],
  attendanceService: ["saveAttendance"],
  trainingPlanService: ["listPlans", "getFormOptions", "createPlan"],
  trainingResultService: ["listForMember", "createResult"],
  paymentService: ["listPayments", "listPendingRegistrations", "getRegistrationPayment", "recordPayment", "createPayment", "updatePayment", "simulatePayment"],
  reportService: ["getDashboard", "getReports", "getAuditLog"],
  stateService: ["subscribe", "getSnapshot", "invalidate"],
};
export function createServiceRegistry(implementations) {
  const registry = {};
  for (const [name, methods] of Object.entries(contracts)) {
    for (const method of methods) if (typeof implementations[name]?.[method] !== "function") throw new Error("Missing service method: " + name + "." + method);
    registry[name] = implementations[name];
  }
  return Object.freeze(registry);
}
