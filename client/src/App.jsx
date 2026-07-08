import { Routes, Route } from 'react-router-dom';
import StudentFlow from './pages/student/StudentFlow.jsx';
import CheckStatus from './pages/student/CheckStatus.jsx';
import AdminLogin from './pages/admin/AdminLogin.jsx';
import AdminDashboard from './pages/admin/AdminDashboard.jsx';
import StaffLogin from './pages/staff/StaffLogin.jsx';
import StaffDashboard from './pages/staff/StaffDashboard.jsx';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<StudentFlow />} />
      <Route path="/status" element={<CheckStatus />} />
      <Route path="/status/:id" element={<CheckStatus />} />
      <Route path="/admin/login" element={<AdminLogin />} />
      <Route path="/admin" element={<AdminDashboard />} />
      <Route path="/staff/login" element={<StaffLogin />} />
      <Route path="/staff" element={<StaffDashboard />} />
    </Routes>
  );
}
