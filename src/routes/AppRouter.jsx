import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { roleHome } from '../utils/staff-navigation';
import ProtectedRoute from './ProtectedRoute';
import RoleRoute from './RoleRoute';
import AppShell from '../layouts/AppShell';

import Landing from '../pages/public/Landing';
import Terms from '../pages/public/Terms';
import NotFound from '../pages/public/NotFound';
import Pricing from '../pages/public/Pricing';
import Login from '../pages/auth/Login';
import Register from '../pages/auth/Register';
import VerifyOtp from '../pages/auth/VerifyOtp';
import ForgotPassword from '../pages/auth/ForgotPassword';
import ResetPassword from '../pages/auth/ResetPassword';
import Account from '../pages/account/Account';
import Profile from '../pages/account/Profile';
import ManagerHome from '../pages/home/ManagerHome';
import CoachHome from '../pages/home/CoachHome';
import ReceptionHome from '../pages/home/ReceptionHome';
import MemberHome from '../pages/home/MemberHome';
import MemberList from '../pages/members/MemberList';
import MemberEdit from '../pages/members/MemberEdit';
import FrontDesk from '../pages/members/FrontDesk';
import StaffAccounts from '../pages/members/StaffAccounts';
import ResourceList from '../pages/workspace/ResourceList';
import ResourceEdit from '../pages/workspace/ResourceEdit';
import ClassDetail from '../pages/classes/ClassDetail';
import ExploreClasses from '../pages/classes/ExploreClasses';
import Enroll from '../pages/classes/Enroll';
import RegistrationDetail from '../pages/classes/RegistrationDetail';
import CoachStudents from '../pages/coach/CoachStudents';
import Homeworks from '../pages/coach/Homeworks';
import Feedbacks from '../pages/coach/Feedbacks';
import AttendanceToday from '../pages/coach/AttendanceToday';
import RollCall from '../pages/coach/RollCall';
import Payments from '../pages/payments/Payments';
import PaymentEdit from '../pages/payments/PaymentEdit';
import PaymentReceipt from '../pages/payments/PaymentReceipt';
import PaymentResult from '../pages/payments/PaymentResult';
import Notifications from '../pages/notifications/Notifications';
import NotificationCompose from '../pages/notifications/NotificationCompose';
import Support from '../pages/support/Support';
import ScheduleImport from '../pages/schedules/ScheduleImport';
import SessionDetail from '../pages/schedules/SessionDetail';
import Operations from '../pages/operations/Operations';
import Reports from '../pages/manager/Reports';
import Packages from '../pages/manager/Packages';
import Staff from '../pages/manager/Staff';
import CatalogImport from '../pages/manager/CatalogImport';
import MemberPass from '../pages/checkin/MemberPass';
import CheckInDesk from '../pages/checkin/CheckInDesk';

function DashboardRedirect() {
  const { user } = useAuth();
  return <Navigate to={roleHome(user.role)} replace />;
}

const STAFF = ['CENTER_MANAGER', 'RECEPTIONIST'];

export default function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public */}
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/verify-otp" element={<VerifyOtp />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/terms" element={<Terms />} />

        {/* Signed in */}
        <Route element={<ProtectedRoute />}>
          <Route path="/dashboard" element={<DashboardRedirect />} />
          <Route element={<AppShell />}>
            <Route path="/account" element={<Account />} />
            <Route path="/operations" element={<Operations />} />
            <Route path="/pricing" element={<Pricing />} />
            <Route path="/workspace/:resource" element={<ResourceList />} />
            <Route path="/workspace/:resource/edit" element={<ResourceEdit />} />
            <Route path="/class-detail" element={<ClassDetail />} />
            <Route path="/enroll" element={<Enroll />} />
            <Route path="/registration-detail" element={<RegistrationDetail />} />
            <Route path="/payments" element={<Payments />} />
            <Route path="/payment-edit" element={<PaymentEdit />} />
            <Route path="/payment-receipt" element={<PaymentReceipt />} />
            <Route path="/payment-result" element={<PaymentResult />} />
            <Route path="/session" element={<SessionDetail />} />
            <Route path="/notifications" element={<Notifications />} />
            <Route path="/notification-compose" element={<NotificationCompose />} />
            <Route path="/support" element={<Support />} />
            <Route path="/homeworks" element={<Homeworks />} />
            <Route path="/feedbacks" element={<Feedbacks />} />
            <Route path="/profile" element={<Profile />} />

            <Route element={<RoleRoute roles={['MEMBER']} />}>
              <Route path="/member" element={<MemberHome />} />
              <Route path="/explore" element={<ExploreClasses />} />
              <Route path="/checkin" element={<MemberPass />} />
            </Route>
            <Route element={<RoleRoute roles={['CENTER_MANAGER']} />}>
              <Route path="/manager" element={<ManagerHome />} />
              <Route path="/staff-accounts" element={<StaffAccounts />} />
              <Route path="/schedule-import" element={<ScheduleImport />} />
              <Route path="/reports" element={<Reports />} />
              <Route path="/packages" element={<Packages />} />
              <Route path="/staff" element={<Staff />} />
              <Route path="/catalog-import" element={<CatalogImport />} />
            </Route>
            <Route element={<RoleRoute roles={['COACH']} />}>
              <Route path="/coach" element={<CoachHome />} />
              <Route path="/coach-students" element={<CoachStudents />} />
              <Route path="/attendance" element={<AttendanceToday />} />
              <Route path="/attendance/session" element={<RollCall />} />
            </Route>
            <Route element={<RoleRoute roles={['RECEPTIONIST']} />}>
              <Route path="/reception" element={<ReceptionHome />} />
            </Route>
            <Route element={<RoleRoute roles={[...STAFF, 'COACH']} />}>
              <Route path="/members" element={<MemberList />} />
            </Route>
            <Route element={<RoleRoute roles={STAFF} />}>
              <Route path="/members/edit" element={<MemberEdit />} />
              <Route path="/members/front-desk" element={<FrontDesk />} />
              <Route path="/checkin-desk" element={<CheckInDesk />} />
            </Route>
          </Route>
        </Route>

        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
}
