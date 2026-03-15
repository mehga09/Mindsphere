import { Router } from 'express';
import { 
    startCourse, 
    getActiveCourse, 
    getAllCourses, 
    generateTodayPlan, 
    recordDailyPerformance, 
    pauseCourse, 
    resumeCourse, 
    completeCourse,
    toggleCourseTask,
    deleteCourse
} from '../controllers/coursePlan.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

router.use(authenticate);

router.post('/start', startCourse);
router.get('/active', getActiveCourse);
router.get('/all', getAllCourses);
router.get('/today', generateTodayPlan);
router.post('/performance', recordDailyPerformance);
router.patch('/:id/pause', pauseCourse);
router.patch('/:id/resume', resumeCourse);
router.patch('/:id/complete', completeCourse);
router.patch('/tasks/:taskId/toggle', toggleCourseTask);
router.delete('/:id', deleteCourse);

export default router;
