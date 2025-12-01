import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { GoogleOAuthProvider } from '@react-oauth/google';
import HomeNew from './components/HomeNew';
import StudentViewNew from './components/StudentView/StudentViewNew';
import InchargeLoginNew from './components/InchargeView/InchargeLoginNew';
import SemesterSetup from './components/InchargeView/SemesterSetup';
import CourseManagementNew from './components/InchargeView/CourseManagementNew';
import MasterTimetableBuilderNew from './components/InchargeView/MasterTimetableBuilderNew';
import CRManagementNew from './components/InchargeView/CRManagementNew';
import ExamTimetableBuilder from './components/InchargeView/ExamTimetableBuilder';
import CRLoginNew from './components/CRView/CRLoginNew';
import CRTimetableBuilderNew from './components/CRView/CRTimetableBuilderNew';

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';

function App() {
  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<HomeNew />} />
          <Route path="/student" element={<StudentViewNew />} />
          <Route path="/incharge/login" element={<InchargeLoginNew />} />
          <Route path="/incharge/setup" element={<SemesterSetup />} />
          <Route path="/incharge/courses" element={<CourseManagementNew />} />
          <Route path="/incharge/timetable" element={<MasterTimetableBuilderNew />} />
          <Route path="/incharge/master-timetable" element={<MasterTimetableBuilderNew />} />
          <Route path="/incharge/manage-cr" element={<CRManagementNew />} />
          <Route path="/incharge/exam-timetable" element={<ExamTimetableBuilder />} />
          <Route path="/cr/login" element={<CRLoginNew />} />
          <Route path="/cr/timetable" element={<CRTimetableBuilderNew />} />
        </Routes>
      </BrowserRouter>
    </GoogleOAuthProvider>
  );
}

export default App;
