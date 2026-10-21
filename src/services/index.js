import { createServiceRegistry } from "./interfaces/createServiceRegistry.js";
import * as implementations from "./api/index.js";
export const { authService, classService, coachService, memberService, scheduleService, attendanceService, trainingPlanService, trainingResultService, paymentService, reportService, stateService } = createServiceRegistry(implementations);
export { ROLES, roleHomePath, roleLabels } from "../types/roles.js";
export { formatters } from "../utils/formatters.js";
