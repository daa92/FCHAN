const { sendEmail } = require('../services/email');

const FEEDBACK_EMAIL = 'bagnawe.gnoga@ictuniversity.edu.cm';

const sendFeedback = async (req, res) => {
  try {
    const { subject, message, category } = req.body;
    const user = req.user;

    if (!message || !message.trim()) {
      return res.status(400).json({ success: false, message: 'Message is required.' });
    }

    const fullSubject = `[${category || 'General'}] ${subject || 'Feedback from ' + user.name}`;

    const sent = await sendEmail(
      FEEDBACK_EMAIL,
      'feedback',
      user.name,
      user.email,
      fullSubject,
      message.trim()
    );

    if (sent) {
      return res.status(200).json({ success: true, message: 'Feedback sent. Thank you!' });
    } else {
      return res.status(500).json({ success: false, message: 'Could not send feedback. Please try again.' });
    }
  } catch (err) {
    console.error('SendFeedback error:', err.message);
    return res.status(500).json({ success: false, message: 'Internal server error.' });
  }
};

module.exports = { sendFeedback };
