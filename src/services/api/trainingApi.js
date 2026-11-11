import { workoutPlanApi, workoutResultApi, coachApi, classApi } from "./resources.js";
import { ApiError } from "../../api/apiClient.js";
export const trainingPlanService = {
  async listPlans(coachId) { if (!coachId) throw new ApiError("Coach profile is missing."); return (await workoutPlanApi.list()).filter((p) => p.coachId === coachId); },
  async getFormOptions(coachId) { const [roster, classes] = await Promise.all([coachApi.myStudents(), classApi.list()]); return { members: [...new Map(roster.map(row => [row.memberId, row.member])).values()], classes: classes.filter((c) => c.coachId === coachId) }; },
  createPlan(input) {
    if (Boolean(input.memberId) === Boolean(input.classId)) throw new ApiError("Chọn kế hoạch cá nhân hoặc kế hoạch chung cho lớp, không chọn cả hai.", { status: 400 });
    return workoutPlanApi.create({ ...input, memberId: input.memberId || null, classId: input.classId || null, source: "COACH" });
  },
};
export const trainingResultService = {
  async listForMember(memberId) { if (!memberId) throw new ApiError("Member profile is missing. Please contact reception."); return (await workoutResultApi.list()).filter((r) => r.memberId === memberId); },
  createResult: (input) => workoutResultApi.create(input),
};
