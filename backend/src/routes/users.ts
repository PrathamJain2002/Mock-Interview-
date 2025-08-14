import express from 'express';
import { Request, Response } from 'express';
import User from '../models/User';

const router = express.Router();

// POST /api/users/save-interview - Save interview results for a user
router.post('/save-interview', async (req: Request, res: Response) => {
  try {
    const {
      name,
      mobileNumber,
      email,
      overallScore,
      technicalScore,
      behavioralScore,
      communicationScore,
      jobTitle,
      company,
      strengths,
      weaknesses,
      suggestions,
      questions,
      answers
    } = req.body;

    // Validate required fields
    if (!name || !mobileNumber || !overallScore || !jobTitle || !company) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: name, mobileNumber, overallScore, jobTitle, company'
      });
    }

    // Create new user interview record
    const userInterview = new User({
      name,
      mobileNumber,
      email,
      overallScore,
      technicalScore,
      behavioralScore,
      communicationScore,
      jobTitle,
      company,
      strengths: strengths || [],
      weaknesses: weaknesses || [],
      suggestions: suggestions || [],
      questions: questions || [],
      answers: answers || []
    });

    await userInterview.save();

    console.log('✅ Interview results saved for user:', name);

    return res.status(201).json({
      success: true,
      message: 'Interview results saved successfully',
      userId: userInterview._id
    });

  } catch (error) {
    console.error('❌ Error saving interview results:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to save interview results'
    });
  }
});

// GET /api/users/interviews/:mobileNumber - Get all interviews for a user by mobile number
router.get('/interviews/:mobileNumber', async (req: Request, res: Response) => {
  try {
    const { mobileNumber } = req.params;

    const interviews = await User.find({ mobileNumber })
      .sort({ interviewDate: -1 })
      .select('-__v');

    if (interviews.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'No interviews found for this mobile number'
      });
    }

    return res.json({
      success: true,
      interviews,
      totalInterviews: interviews.length
    });

  } catch (error) {
    console.error('❌ Error fetching interviews:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch interviews'
    });
  }
});

// GET /api/users/interview/:id - Get specific interview by ID
router.get('/interview/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const interview = await User.findById(id).select('-__v');

    if (!interview) {
      return res.status(404).json({
        success: false,
        error: 'Interview not found'
      });
    }

    return res.json({
      success: true,
      interview
    });

  } catch (error) {
    console.error('❌ Error fetching interview:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch interview'
    });
  }
});

// GET /api/users/stats - Get overall statistics
router.get('/stats', async (req: Request, res: Response) => {
  try {
    const totalInterviews = await User.countDocuments();
    const averageOverallScore = await User.aggregate([
      { $group: { _id: null, avgScore: { $avg: '$overallScore' } } }
    ]);

    const topPerformers = await User.find()
      .sort({ overallScore: -1 })
      .limit(5)
      .select('name overallScore jobTitle company');

    const recentInterviews = await User.find()
      .sort({ interviewDate: -1 })
      .limit(10)
      .select('name overallScore jobTitle company interviewDate');

    return res.json({
      success: true,
      stats: {
        totalInterviews,
        averageOverallScore: averageOverallScore[0]?.avgScore || 0,
        topPerformers,
        recentInterviews
      }
    });

  } catch (error) {
    console.error('❌ Error fetching stats:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch statistics'
    });
  }
});

export default router;
