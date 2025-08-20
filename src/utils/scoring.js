const db = require('./db');
const logger = require('./logger');

// Constants for scoring algorithm
const SCORE_WEIGHTS = {
  VOTE_WEIGHT: 1.0,          // Base weight for each vote
  UPVOTE_MULTIPLIER: 1.0,    // Multiplier for upvotes
  DOWNVOTE_MULTIPLIER: -1.5, // Multiplier for downvotes
  AUTHOR_REPUTATION: 0.2,    // Weight for author's reputation
  TIME_DECAY: 0.01,          // How much score decays per day
  BASE_SCORE: 1.0,           // Base score for all questions
  VIEW_WEIGHT: 0.001,        // Weight for view count
  ANSWER_WEIGHT: 0.5,        // Weight for correct answers
  INCORRECT_WEIGHT: -0.2,    // Weight for incorrect answers
};

// Calculate question score based on votes, time, and other factors
const calculateQuestionScore = async (questionId) => {
  try {
    // Get question data
    const question = await db.get(
      `SELECT 
         q.*, 
         u.reputation as author_reputation,
         (SELECT COUNT(*) FROM votes v WHERE v.question_id = q.id AND v.vote_type = 'up') as upvotes,
         (SELECT COUNT(*) FROM votes v WHERE v.question_id = q.id AND v.vote_type = 'down') as downvotes,
         (SELECT COUNT(*) FROM question_attempts qa WHERE qa.question_id = q.id) as total_attempts,
         (SELECT COUNT(*) FROM question_attempts qa WHERE qa.question_id = q.id AND qa.is_correct = 1) as correct_attempts,
         (SELECT COUNT(*) FROM question_views qv WHERE qv.question_id = q.id) as view_count,
         (SELECT COUNT(*) FROM comments c WHERE c.question_id = q.id) as comment_count
       FROM questions q
       LEFT JOIN users u ON q.created_by = u.id
       WHERE q.id = ?`,
      [questionId]
    );

    if (!question) {
      throw new Error('Question not found');
    }

    // Calculate time decay (in days)
    const postedAt = new Date(question.created_at);
    const daysOld = (new Date() - postedAt) / (1000 * 60 * 60 * 24);
    
    // Calculate vote score
    const voteScore = (question.upvotes * SCORE_WEIGHTS.UPVOTE_MULTIPLIER) + 
                     (question.downvotes * SCORE_WEIGHTS.DOWNVOTE_MULTIPLIER);

    // Calculate accuracy score (if there are attempts)
    let accuracyScore = 0;
    if (question.total_attempts > 0) {
      const accuracy = question.correct_attempts / question.total_attempts;
      accuracyScore = (accuracy * SCORE_WEIGHTS.ANSWER_WEIGHT) + 
                     ((1 - accuracy) * SCORE_WEIGHTS.INCORRECT_WEIGHT);
    }

    // Calculate final score with time decay
    const rawScore = SCORE_WEIGHTS.BASE_SCORE +
                    (voteScore * SCORE_WEIGHTS.VOTE_WEIGHT) +
                    (question.author_reputation * SCORE_WEIGHTS.AUTHOR_REPUTATION) +
                    (question.view_count * SCORE_WEIGHTS.VIEW_WEIGHT) +
                    accuracyScore;

    // Apply time decay (logarithmic decay)
    const timeDecay = Math.log10(daysOld + 1) * SCORE_WEIGHTS.TIME_DECAY;
    const finalScore = Math.max(0, rawScore - timeDecay);

    // Update question score in database
    await db.run(
      'UPDATE questions SET score = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [finalScore, questionId]
    );

    logger.info(`Updated score for question ${questionId}: ${finalScore.toFixed(2)}`);
    return finalScore;
  } catch (error) {
    logger.error(`Error calculating score for question ${questionId}: ${error.message}`);
    throw error;
  }
};

// Update user reputation based on question scores
const updateUserReputation = async (userId) => {
  try {
    // Get all questions by user with their scores
    const questions = await db.all(
      `SELECT id, score FROM questions 
       WHERE created_by = ? AND status = 'active'`,
      [userId]
    );

    if (questions.length === 0) return;

    // Calculate average score
    const totalScore = questions.reduce((sum, q) => sum + (q.score || 0), 0);
    const avgScore = totalScore / questions.length;

    // Calculate reputation (0-100 scale)
    let reputation = Math.min(100, Math.max(0, Math.round(avgScore * 10)));

    // Update user reputation
    await db.run(
      'UPDATE users SET reputation = ? WHERE id = ?',
      [reputation, userId]
    );

    logger.info(`Updated reputation for user ${userId}: ${reputation}`);
    return reputation;
  } catch (error) {
    logger.error(`Error updating reputation for user ${userId}: ${error.message}`);
    throw error;
  }
};

// Process all active questions to update their scores
const updateAllQuestionScores = async () => {
  try {
    logger.info('Starting batch update of question scores');
    
    // Get all active question IDs
    const questions = await db.all(
      'SELECT id FROM questions WHERE status = ?',
      ['active']
    );

    // Process each question
    for (const question of questions) {
      try {
        await calculateQuestionScore(question.id);
      } catch (error) {
        logger.error(`Error processing question ${question.id}: ${error.message}`);
      }
    }

    logger.info(`Completed batch update of ${questions.length} question scores`);
  } catch (error) {
    logger.error(`Error in batch score update: ${error.message}`);
    throw error;
  }
};

// Schedule periodic score updates (every 6 hours)
const scheduleScoreUpdates = () => {
  const SIX_HOURS = 6 * 60 * 60 * 1000;
  
  // Initial update
  updateAllQuestionScores().catch(err => 
    logger.error('Error in initial score update:', err)
  );
  
  // Schedule periodic updates
  setInterval(() => {
    updateAllQuestionScores().catch(err =>
      logger.error('Error in scheduled score update:', err)
    );
  }, SIX_HOURS);
};

module.exports = {
  calculateQuestionScore,
  updateUserReputation,
  updateAllQuestionScores,
  scheduleScoreUpdates,
  SCORE_WEIGHTS // Export for testing
};
