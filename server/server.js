import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/auth.js';
import courseRoutes from './routes/courses.js';
import timetableRoutes from './routes/timetable.js';
import crRoutes from './routes/cr.js';
import studentRoutes from './routes/student.js';
import semesterRoutes from './routes/semester.js';
import autogenerateRoutes from './routes/autogenerate.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// CORS configuration
app.use(cors({
  origin: [
    'http://localhost:5173',
    'https://timetable-cse.vercel.app',
    /\.vercel\.app$/
  ],
  credentials: true
}));
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/courses', courseRoutes);
app.use('/api/timetable', timetableRoutes);
app.use('/api/cr', crRoutes);
app.use('/api/student', studentRoutes);
app.use('/api/semester', semesterRoutes);
app.use('/api/autogenerate', autogenerateRoutes);

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
