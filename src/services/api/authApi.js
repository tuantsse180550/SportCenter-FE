import { apiClient } from "../../api/apiClient.js";
import { session } from "../../api/session.js";
import { stateService } from "../../api/apiEvents.js";
import { memberApi, memberProfileApi, coachApi } from "./resources.js";
import { createAuthService } from "./createAuthService.js";

export const authService = createAuthService({
  request: apiClient,
  tokenStore: session,
  listMembers: () => memberApi.list(),
  getMyProfile: () => memberProfileApi.get(),
  listCoaches: () => coachApi.list(),
  invalidate: () => stateService.invalidate(),
});
