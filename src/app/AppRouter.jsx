import { ManagerRoomsPage } from "../pages/manager/ManagerRoomsPage.jsx";
import { ManagerSchedulesPage } from "../pages/manager/ManagerSchedulesPage.jsx";
import { MemberAttendancePage } from "../pages/member/MemberAttendancePage.jsx";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { CoachLayout } from "../layouts/CoachLayout.jsx";
import { ManagerLayout } from "../layouts/ManagerLayout.jsx";
import { MemberLayout } from "../layouts/MemberLayout.jsx";
import { PublicLayout } from "../layouts/PublicLayout.jsx";
import { ReceptionistLayout } from "../layouts/ReceptionistLayout.jsx";
import { CoachChangeRequestsPage } from "../pages/coach/CoachChangeRequestsPage.jsx";
import { CoachSchedulePage } from "../pages/coach/CoachSchedulePage.jsx";
import { CoachSessionDetailPage } from "../pages/coach/CoachSessionDetailPage.jsx";
import { CoachTrainingPlansPage } from "../pages/coach/CoachTrainingPlansPage.jsx";
import { ManagerAuditLogPage } from "../pages/manager/ManagerAuditLogPage.jsx";
import { ManagerClassDetailPage } from "../pages/manager/ManagerClassDetailPage.jsx";
import { ManagerClassesPage } from "../pages/manager/ManagerClassesPage.jsx";
import { ManagerCoachRequestsPage } from "../pages/manager/ManagerCoachRequestsPage.jsx";
import { ManagerDashboardPage } from "../pages/manager/ManagerDashboardPage.jsx";
import { ManagerMembersPage } from "../pages/manager/ManagerMembersPage.jsx";
import { ManagerPackagesPage } from "../pages/manager/ManagerPackagesPage.jsx";
import { ManagerReportsPage } from "../pages/manager/ManagerReportsPage.jsx";
import { ManagerRolesPage } from "../pages/manager/ManagerRolesPage.jsx";
import { MemberAccountPage } from "../pages/member/MemberAccountPage.jsx";
import { MemberAIPage } from "../pages/member/MemberAIPage.jsx";
import { MemberClassDetailPage } from "../pages/member/MemberClassDetailPage.jsx";
import { MemberClassesPage } from "../pages/member/MemberClassesPage.jsx";
import { MemberHomePage } from "../pages/member/MemberHomePage.jsx";
import { MemberMembershipPage } from "../pages/member/MemberMembershipPage.jsx";
import { MemberResultsPage } from "../pages/member/MemberResultsPage.jsx";
import { MemberSchedulePage } from "../pages/member/MemberSchedulePage.jsx";
import { ForgotPasswordPage } from "../pages/public/ForgotPasswordPage.jsx";
import { LandingPage } from "../pages/public/LandingPage.jsx";
import { LoginPage } from "../pages/public/LoginPage.jsx";
import { PricingPage } from "../pages/public/PricingPage.jsx";
import { PublicClassesPage } from "../pages/public/PublicClassesPage.jsx";
import { RegisterPage } from "../pages/public/RegisterPage.jsx";
import { ReceptionistInvoicesPage } from "../pages/receptionist/ReceptionistInvoicesPage.jsx";
import { ReceptionistMemberDetailPage } from "../pages/receptionist/ReceptionistMemberDetailPage.jsx";
import { ReceptionistMembersPage } from "../pages/receptionist/ReceptionistMembersPage.jsx";
import { ReceptionistNewMemberPage } from "../pages/receptionist/ReceptionistNewMemberPage.jsx";
import { ReceptionistPaymentsPage } from "../pages/receptionist/ReceptionistPaymentsPage.jsx";
import { AppProvider } from "../store/AppProvider.jsx";
import { RoleGuard } from "./RoleGuard.jsx";

export function AppRouter() {
  return <BrowserRouter><AppProvider><Routes>
    <Route element={<PublicLayout />}>
      <Route index element={<LandingPage />} />
      <Route path="classes" element={<PublicClassesPage />} />
      <Route path="pricing" element={<PricingPage />} />
      <Route path="login" element={<LoginPage />} />
      <Route path="register" element={<RegisterPage />} />
      <Route path="forgot-password" element={<ForgotPasswordPage />} />
    </Route>

    <Route path="manager" element={<RoleGuard role="CENTER_MANAGER" />}>
      <Route element={<ManagerLayout />}>
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<ManagerDashboardPage />} />
        <Route path="rooms" element={<ManagerRoomsPage />} /><Route path="rooms/:roomId" element={<ManagerRoomsPage />} /><Route path="schedules" element={<ManagerSchedulesPage />} />
        <Route path="classes" element={<ManagerClassesPage />} />
        <Route path="classes/:classId" element={<ManagerClassDetailPage />} />
        <Route path="members" element={<ManagerMembersPage />} />
        <Route path="packages" element={<ManagerPackagesPage />} />
        <Route path="coach-requests" element={<ManagerCoachRequestsPage />} />
        <Route path="reports" element={<ManagerReportsPage />} />
        <Route path="roles" element={<ManagerRolesPage />} />
        <Route path="audit-log" element={<ManagerAuditLogPage />} />
      </Route>
    </Route>

    <Route path="coach" element={<RoleGuard role="COACH" />}>
      <Route element={<CoachLayout />}>
        <Route index element={<Navigate to="schedule" replace />} />
        <Route path="schedule" element={<CoachSchedulePage />} />
        <Route path="sessions/:sessionId" element={<CoachSessionDetailPage />} />
        <Route path="training-plans" element={<CoachTrainingPlansPage />} />
        <Route path="change-requests" element={<CoachChangeRequestsPage />} />
      </Route>
    </Route>

    <Route path="member" element={<RoleGuard role="MEMBER" />}>
      <Route element={<MemberLayout />}>
        <Route index element={<Navigate to="home" replace />} />
        <Route path="home" element={<MemberHomePage />} />
        <Route path="classes" element={<MemberClassesPage />} />
        <Route path="classes/:classId" element={<MemberClassDetailPage />} />
        <Route path="attendance" element={<MemberAttendancePage />} />
        <Route path="schedule" element={<MemberSchedulePage />} />
        <Route path="membership" element={<MemberMembershipPage />} />
        <Route path="results" element={<MemberResultsPage />} />
        <Route path="ai" element={<MemberAIPage />} />
        <Route path="account" element={<MemberAccountPage />} />
      </Route>
    </Route>

    <Route path="receptionist" element={<RoleGuard role="RECEPTIONIST" />}>
      <Route element={<ReceptionistLayout />}>
        <Route index element={<Navigate to="members" replace />} />
        <Route path="members" element={<ReceptionistMembersPage />} />
        <Route path="members/new" element={<ReceptionistNewMemberPage />} />
        <Route path="members/:memberId" element={<ReceptionistMemberDetailPage />} />
        <Route path="payments" element={<ReceptionistPaymentsPage />} />
        <Route path="invoices" element={<ReceptionistInvoicesPage />} />
      </Route>
    </Route>

    <Route path="*" element={<Navigate to="/" replace />} />
  </Routes></AppProvider></BrowserRouter>;
}
