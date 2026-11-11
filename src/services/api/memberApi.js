import { memberApi, memberProfileApi, registrationApi, paymentApi, classApi } from "./resources.js";
import { authService } from "./authApi.js";
import { scheduleService } from "./scheduleApi.js";
import { trainingResultService } from "./trainingApi.js";
import { ApiError } from "../../api/apiClient.js";
export const memberService = {
  async listMembers(filters = {}) { const [members, registrations, classes] = await Promise.all([memberApi.list(), registrationApi.list(), classApi.list()]); return members.map((m) => ({ ...m, registeredClasses: registrations.filter((r) => r.memberId === m.id && r.status !== "CANCELLED").map((r) => classes.find((c) => c.id === r.classId)).filter(Boolean) })).filter((m) => (!filters.query || [m.fullName, m.account?.email, m.phone, m.id].join(" ").toLowerCase().includes(filters.query.toLowerCase())) && (!filters.level || m.level === filters.level)); },
  async getMyProfile() {
    try { return await memberProfileApi.get(); }
    catch (error) { if (error.status === 404 && error.code !== "INVALID_RESPONSE") return null; throw error; }
  },
  async getMemberDetail(id) {
    if (!id) return null;
    const current = authService.getCurrentUser();
    const self = current?.role === "MEMBER" && current.memberId === id;
    if (current?.role === "MEMBER" && !self) throw new ApiError("You cannot access another member's profile.", { status: 403 });
    const member = self ? await this.getMyProfile() : (await memberApi.list()).find((m) => m.id === id);
    if (!member) return null;
    if (self) {
      const [schedule, results] = await Promise.all([scheduleService.getMemberSchedule(id), trainingResultService.listForMember(id)]);
      // Unknown registration/payment history must not look like an empty history.
      return { ...member, schedule, results, registrations: null, payments: null };
    }
    // Updated BE explicitly rejects Receptionist reads of workout results.
    const [registrations, payments, schedule, results] = await Promise.all([registrationApi.list(), paymentApi.list(), scheduleService.getMemberSchedule(id), current?.role === "RECEPTIONIST" ? Promise.resolve(null) : trainingResultService.listForMember(id)]);
    return { ...member, registrations: registrations.filter((r) => r.memberId === id), payments: payments.filter((p) => p.memberId === id), schedule, results };
  },
  // Backend requires a pre-existing MEMBER User; no implicit account/payment creation.
  createMember: (input) => memberApi.create(input),
  createMyProfile: (input) => memberProfileApi.create(input),
  async updateProfile(id, input) {
    const current = authService.getCurrentUser();
    if (current?.role === "MEMBER") {
      if (current.memberId && current.memberId !== id) {
        throw new ApiError("You cannot access another member's profile.", { status: 403 });
      }
      return memberProfileApi.update(input);
    }
    return memberApi.update(id, input);
  },
};
