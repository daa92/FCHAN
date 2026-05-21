/**
 * FCHAN Feedback Modal
 * Include this script in any page to get the feedback modal.
 * Requires Auth object and showToast to be present.
 */
(function () {
  function injectFeedbackModal() {
    if (document.getElementById('feedbackModal')) return;

    const el = document.createElement('div');
    el.innerHTML = `
      <div class="modal-overlay" id="feedbackModal">
        <div class="modal" style="max-width:480px;">
          <div class="modal-header">
            <h3>Send Feedback</h3>
            <button class="modal-close" onclick="closeFeedbackModal()">
              <i data-lucide="x"></i>
            </button>
          </div>
          <p style="font-size:13px;color:var(--text-muted);margin-bottom:16px;">
            Your message goes directly to the FCHAN team at
            <strong>bagnawe.gnoga@ictuniversity.edu.cm</strong>. We read everything.
          </p>
          <div class="form-group">
            <label class="form-label">Category</label>
            <select class="form-control" id="fbCategory">
              <option value="Bug Report">Bug Report</option>
              <option value="Feature Request">Feature Request</option>
              <option value="General Feedback" selected>General Feedback</option>
              <option value="Complaint">Complaint</option>
              <option value="Compliment">Compliment</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Subject</label>
            <input type="text" class="form-control" id="fbSubject" placeholder="Brief summary…">
          </div>
          <div class="form-group">
            <label class="form-label">Message *</label>
            <textarea class="form-control" id="fbMessage" rows="5"
                      placeholder="Describe your feedback in detail…"></textarea>
          </div>
          <div style="display:flex;gap:12px;justify-content:flex-end;margin-top:20px;">
            <button class="btn btn-outline" onclick="closeFeedbackModal()">Cancel</button>
            <button class="btn btn-primary" id="fbSubmitBtn" onclick="submitFeedback()">
              <i data-lucide="send" style="width:14px;height:14px;"></i>
              Send Feedback
            </button>
          </div>
        </div>
      </div>`;
    document.body.appendChild(el);
    if (typeof lucide !== 'undefined') lucide.createIcons();
  }

  window.openFeedbackModal = function () {
    injectFeedbackModal();
    const modal = document.getElementById('feedbackModal');
    if (modal) {
      document.getElementById('fbMessage').value  = '';
      document.getElementById('fbSubject').value  = '';
      document.getElementById('fbCategory').value = 'General Feedback';
      modal.classList.add('open');
      if (typeof lucide !== 'undefined') lucide.createIcons();
    }
  };

  window.closeFeedbackModal = function () {
    const modal = document.getElementById('feedbackModal');
    if (modal) modal.classList.remove('open');
  };

  window.submitFeedback = async function () {
    const message  = document.getElementById('fbMessage').value.trim();
    const subject  = document.getElementById('fbSubject').value.trim();
    const category = document.getElementById('fbCategory').value;

    if (!message) {
      if (typeof showToast === 'function') showToast('Please write a message before sending', 'error');
      return;
    }

    const btn = document.getElementById('fbSubmitBtn');
    btn.disabled    = true;
    btn.textContent = 'Sending…';

    try {
      const data = await Auth.request('/feedback', {
        method: 'POST',
        body: JSON.stringify({ subject, message, category })
      });

      btn.disabled    = false;
      btn.innerHTML   = '<i data-lucide="send" style="width:14px;height:14px;"></i> Send Feedback';
      if (typeof lucide !== 'undefined') lucide.createIcons();

      if (data && data.success) {
        if (typeof showToast === 'function') showToast('Feedback sent! Thank you.', 'success');
        window.closeFeedbackModal();
      } else {
        if (typeof showToast === 'function') showToast(data ? data.message : 'Error sending feedback', 'error');
      }
    } catch (e) {
      btn.disabled    = false;
      btn.textContent = 'Send Feedback';
      if (typeof showToast === 'function') showToast('Network error — please try again', 'error');
    }
  };
})();
