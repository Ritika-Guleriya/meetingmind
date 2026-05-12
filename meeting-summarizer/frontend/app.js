/**
 * Smart Meeting Summarizer - Frontend Application
 * Pure vanilla JavaScript (no frameworks)
 * Handles: Tabs, File Upload, API Calls, Results Display, localStorage History, Authentication
 */

// ===================================
// AUTHENTICATION SETUP
// ===================================

document.addEventListener('DOMContentLoaded', () => {
  const userInfo = authManager.getUserInfo();
  const userNameEl = document.getElementById('userName');
  const userEmailEl = document.getElementById('userEmailDisplay');
  const userMenuToggle = document.getElementById('userMenuToggle');
  const userDropdown = document.getElementById('userDropdown');
  const logoutBtn = document.getElementById('logoutBtn');

  if (userNameEl && userInfo.name) {
    userNameEl.textContent = userInfo.name.split(' ')[0]; // First name
  } else if (userNameEl && userInfo.email) {
    userNameEl.textContent = userInfo.email.split('@')[0]; // Email prefix
  } else if (userNameEl) {
    userNameEl.textContent = userInfo.isGuest ? 'Guest' : 'User';
  }

  if (userEmailEl) {
    userEmailEl.textContent = userInfo.email || (userInfo.isGuest ? 'Guest Mode' : 'user@example.com');
  }

  if (userMenuToggle) {
    userMenuToggle.addEventListener('click', () => {
      userDropdown?.classList.toggle('active');
    });
  }

  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      authManager.logout();
    });
  }

  // Close dropdown when clicking outside
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.user-menu') && userDropdown?.classList.contains('active')) {
      userDropdown.classList.remove('active');
    }
  });
});

// ===================================
// STATE MANAGEMENT
// ===================================

const state = {
  currentTab: 'paste-tab',
  selectedFile: null,
  currentResults: null,
  activeResultTab: 'summary-tab',
  history: [],
  maxHistoryItems: 10,
  selectedTemplate: 'general',
};

// ===================================
// DOM ELEMENT CACHING
// ===================================

const elements = {
  // Input
  tabButtons: document.querySelectorAll('.tab-button'),
  tabIndicator: document.querySelector('.tab-indicator'),
  transcriptTextarea: document.getElementById('transcriptTextarea'),
  fileUploadZone: document.getElementById('fileUploadZone'),
  fileInput: document.getElementById('fileInput'),
  fileName: document.getElementById('fileName'),

  // Buttons
  summarizeBtn: document.getElementById('summarizeBtn'),
  copyEmailBtn: document.getElementById('copyEmailBtn'),
  copySummaryBtn: document.getElementById('copySummaryBtn'),
  downloadTxtBtn: document.getElementById('downloadTxtBtn'),
  downloadPdfBtn: document.getElementById('downloadPdfBtn'),
  clearHistoryBtn: document.getElementById('clearHistoryBtn'),
  mobileHistoryToggle: document.getElementById('mobileHistoryToggle'),
  sidebarToggle: document.getElementById('sidebarToggle'),

  // Loading & Results
  loadingSpinner: document.getElementById('loadingSpinner'),
  resultsSection: document.getElementById('resultsSection'),

  // Results Tabs
  resultTabButtons: document.querySelectorAll('.result-tab-button'),
  resultTabIndicator: document.querySelector('.result-tab-indicator'),

  // Results Content
  summaryText: document.getElementById('summaryText'),
  actionItemsBody: document.getElementById('actionItemsBody'),
  decisionsList: document.getElementById('decisionsList'),
  topicsList: document.getElementById('topicsList'),
  emailDraft: document.getElementById('emailDraft'),
  copyFeedback: document.getElementById('copyFeedback'),

  // Sidebar
  historySidebar: document.getElementById('historySidebar'),
  historyList: document.getElementById('historyList'),
};

// ===================================
// INITIALIZATION
// ===================================

document.addEventListener('DOMContentLoaded', () => {
  initializeEventListeners();
  loadHistoryFromStorage();
  updateHistoryDisplay();
});

function initializeEventListeners() {
  // Input Tabs
  elements.tabButtons.forEach(button => {
    button.addEventListener('click', (e) => handleTabSwitch(e));
  });

  // File Upload
  elements.fileUploadZone.addEventListener('click', () => elements.fileInput.click());
  elements.fileUploadZone.addEventListener('dragover', handleDragOver);
  elements.fileUploadZone.addEventListener('dragleave', handleDragLeave);
  elements.fileUploadZone.addEventListener('drop', handleFileDrop);
  elements.fileInput.addEventListener('change', handleFileSelect);

  // Form Submission
  elements.summarizeBtn.addEventListener('click', handleSummarize);

  // Results Tabs
  elements.resultTabButtons.forEach(button => {
    button.addEventListener('click', (e) => handleResultTabSwitch(e));
  });

  // Export Actions
  elements.copyEmailBtn.addEventListener('click', copyEmailToClipboard);
  elements.copySummaryBtn.addEventListener('click', copySummaryToClipboard);
  elements.downloadTxtBtn.addEventListener('click', downloadAsTxt);
  elements.downloadPdfBtn.addEventListener('click', downloadAsPdf);

  // History
  elements.clearHistoryBtn.addEventListener('click', clearHistory);
  elements.mobileHistoryToggle.addEventListener('click', toggleSidebar);
  elements.sidebarToggle.addEventListener('click', closeSidebar);

  // Close sidebar when clicking history item
  document.addEventListener('click', (e) => {
    if (e.target.closest('.history-item')) {
      closeSidebar();
    }
  });
}

// ===================================
// INPUT TAB SWITCHING
// ===================================

function handleTabSwitch(e) {
  const button = e.target;
  const tabName = button.dataset.tab;

  // Update active button
  elements.tabButtons.forEach(btn => btn.classList.remove('active'));
  button.classList.add('active');

  // Update active tab content
  document.querySelectorAll('.tab-content').forEach(tab => {
    tab.classList.remove('active');
  });
  document.getElementById(tabName).classList.add('active');

  // Update tab indicator position
  updateTabIndicator(button);

  state.currentTab = tabName;
  state.selectedFile = null;
  elements.fileName.style.display = 'none';
}

function updateTabIndicator(button) {
  const rect = button.getBoundingClientRect();
  const parentRect = button.parentElement.getBoundingClientRect();

  elements.tabIndicator.style.left = (rect.left - parentRect.left) + 'px';
  elements.tabIndicator.style.width = rect.width + 'px';
}

// ===================================
// FILE UPLOAD HANDLING
// ===================================

function handleDragOver(e) {
  e.preventDefault();
  elements.fileUploadZone.classList.add('drag-over');
}

function handleDragLeave(e) {
  e.preventDefault();
  elements.fileUploadZone.classList.remove('drag-over');
}

function handleFileDrop(e) {
  e.preventDefault();
  elements.fileUploadZone.classList.remove('drag-over');

  const files = e.dataTransfer.files;
  if (files.length > 0) {
    const file = files[0];
    validateAndSelectFile(file);
  }
}

function handleFileSelect(e) {
  const files = e.target.files;
  if (files.length > 0) {
    validateAndSelectFile(files[0]);
  }
}

function validateAndSelectFile(file) {
  const validTypes = ['text/plain', 'application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
  const validExtensions = ['.txt', '.pdf', '.docx', '.mp3', '.mp4', '.wav', '.m4a', '.webm', '.ogg', '.flac'];

  const fileExtension = '.' + file.name.split('.').pop().toLowerCase();

  if (!validExtensions.includes(fileExtension)) {
    showError(`Invalid file type. Please upload TXT, PDF, DOCX, or audio/video files.`);
    return;
  }

  state.selectedFile = file;
  elements.fileName.textContent = `📄 ${file.name}`;
  elements.fileName.style.display = 'block';
}

// ===================================
// FORM SUBMISSION & API CALL
// ===================================

async function handleSummarize() {
  // Validate input
  let transcript = '';

  if (state.currentTab === 'paste-tab') {
    transcript = elements.transcriptTextarea.value.trim();
  } else if (state.selectedFile) {
    // File will be sent via FormData
  } else {
    showError('Please provide a transcript or upload a file.');
    return;
  }

  // Show loading state
  showLoadingState();

  const isMedia = state.selectedFile && isAudioOrVideo(state.selectedFile.name);
  elements.summarizeBtn.textContent = isMedia ? 'Transcribing & Analyzing...' : 'Analyzing...';

  try {
    const formData = new FormData();

    if (transcript) {
      formData.append('transcript_text', transcript);
    }

    if (state.selectedFile) {
      formData.append('file', state.selectedFile);
    }

    formData.append('template_id', state.selectedTemplate);
    // Call API with authentication
    const response = await authenticatedFetch('https://meeting-mind-rtmg.onrender.com/summarize', {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.detail || `HTTP Error: ${response.status}`);
    }

    const results = await response.json();
    state.currentResults = results;

    // Save to history
    saveToHistory(results);

    // Display results
    displayResults(results);

    // Show sentiment and tone analysis
    renderSentiment(results.sentiment);

    // Show speaker analytics
    renderSpeakerAnalytics(results.speaker_analytics);

    // Show detected language badge
    if (results.detected_language) {
      const badge = document.getElementById('language-badge');
      const badgeText = document.getElementById('language-badge-text');
      if (badge && badgeText) {
        badgeText.textContent = 'Detected language: ' + results.detected_language;
        badge.style.display = 'inline-flex';
      }
    }

    hideLoadingState();

  } catch (error) {
    hideLoadingState();
    showError(`Error: ${error.message}`);
  }
}

function showLoadingState() {
  elements.summarizeBtn.disabled = true;
  elements.loadingSpinner.style.display = 'flex';
  elements.resultsSection.style.display = 'none';

  // Hide download PDF report button
  const pdfBtn = document.getElementById('download-pdf-btn');
  if (pdfBtn) pdfBtn.style.display = 'none';

  // Hide new meeting results button row
  const newMeetingRow = document.getElementById('new-meeting-results-row');
  if (newMeetingRow) newMeetingRow.style.display = 'none';

  // Hide language badge
  const badge = document.getElementById('language-badge');
  if (badge) badge.style.display = 'none';

  // Hide sentiment section
  const sentimentSection = document.getElementById('sentiment-section');
  if (sentimentSection) sentimentSection.style.display = 'none';

  // Hide template results section
  const templateResults = document.getElementById('template-results');
  if (templateResults) templateResults.style.display = 'none';

  // Hide speaker analytics section
  const analyticsSection = document.getElementById('speaker-analytics-section');
  if (analyticsSection) analyticsSection.style.display = 'none';

  // Hide send email button
  const sendBtn = document.getElementById('send-email-btn');
  if (sendBtn) sendBtn.style.display = 'none';
}

function hideLoadingState() {
  elements.summarizeBtn.disabled = false;
  elements.summarizeBtn.textContent = 'Generate Summary';
  elements.loadingSpinner.style.display = 'none';
}

// ===================================
// RESULTS DISPLAY
// ===================================

function displayResults(results) {
  // Store data for PDF export
  window._lastSummaryData = results;

  // Display summary
  elements.summaryText.textContent = results.summary || 'No summary available.';

  // Display action items
  displayActionItems(results.action_items || []);

  // Display decisions
  displayDecisions(results.decisions || []);

  // Display key topics
  displayTopics(results.key_topics || []);

  // Display email draft
  elements.emailDraft.textContent = results.email_draft || 'No email draft available.';
  setupSendEmailButton(results.email_draft);

  // Show email section explicitly
  const emailSection = document.querySelector('.email-section');
  if (emailSection) emailSection.style.display = 'block';

  // Show results section
  elements.resultsSection.style.display = 'block';

  // Show export buttons row
  const exportButtons = document.querySelector('.export-buttons');
  if (exportButtons) exportButtons.style.display = 'flex';

  // Show download PDF report button
  const pdfBtn = document.getElementById('download-pdf-btn');
  if (pdfBtn) pdfBtn.style.display = 'inline-flex';

  // Show new meeting results button row
  const newMeetingRow = document.getElementById('new-meeting-results-row');
  if (newMeetingRow) newMeetingRow.style.display = 'flex';

  // Reset to summary tab
  switchResultTab('summary-tab');

  // Render template-specific results
  renderTemplateResults(results);

  // Scroll to results
  setTimeout(() => {
    elements.resultsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, 100);
}

function displayActionItems(items) {
  elements.actionItemsBody.innerHTML = '';

  if (items.length === 0) {
    elements.actionItemsBody.innerHTML = '<tr><td colspan="4" style="text-align: center; color: var(--text-secondary);">No action items</td></tr>';
    return;
  }

  items.forEach((item, index) => {
    const row = document.createElement('tr');
    row.innerHTML = `
            <td class="checkbox-col">
                <input type="checkbox" id="action-${index}">
            </td>
            <td>${escapeHtml(item.task)}</td>
            <td>${escapeHtml(item.owner)}</td>
            <td>${escapeHtml(item.deadline)}</td>
        `;
    elements.actionItemsBody.appendChild(row);
  });
}

function displayDecisions(decisions) {
  elements.decisionsList.innerHTML = '';

  if (decisions.length === 0) {
    elements.decisionsList.innerHTML = '<li style="color: var(--text-secondary);">No decisions made.</li>';
    return;
  }

  decisions.forEach((decision) => {
    const li = document.createElement('li');
    li.textContent = decision;
    elements.decisionsList.appendChild(li);
  });
}

function displayTopics(topics) {
  elements.topicsList.innerHTML = '';

  if (topics.length === 0) {
    elements.topicsList.innerHTML = '<p style="color: var(--text-secondary);">No topics identified.</p>';
    return;
  }

  topics.forEach((topic) => {
    const pill = document.createElement('div');
    pill.className = 'topic-pill';
    pill.textContent = topic;
    elements.topicsList.appendChild(pill);
  });
}

// ===================================
// RESULT TAB SWITCHING
// ===================================

function handleResultTabSwitch(e) {
  const button = e.target;
  const tabName = button.dataset.resultTab;
  switchResultTab(tabName);
}

function switchResultTab(tabName) {
  // Update active button
  elements.resultTabButtons.forEach(btn => btn.classList.remove('active'));
  document.querySelector(`[data-result-tab="${tabName}"]`)?.classList.add('active');

  // Update active tab content
  document.querySelectorAll('.result-tab-content').forEach(tab => {
    tab.classList.remove('active');
  });
  document.getElementById(tabName).classList.add('active');

  // Update tab indicator position
  const button = document.querySelector(`[data-result-tab="${tabName}"]`);
  if (button) {
    updateResultTabIndicator(button);
  }

  state.activeResultTab = tabName;
}

function updateResultTabIndicator(button) {
  const rect = button.getBoundingClientRect();
  const parentRect = button.parentElement.getBoundingClientRect();

  elements.resultTabIndicator.style.left = (rect.left - parentRect.left) + 'px';
  elements.resultTabIndicator.style.width = rect.width + 'px';
}

// ===================================
// CLIPBOARD & EXPORT FUNCTIONS
// ===================================

function copyEmailToClipboard() {
  const emailText = elements.emailDraft.textContent;
  navigator.clipboard.writeText(emailText).then(() => {
    showCopyFeedback(elements.copyEmailBtn);
  }).catch(err => {
    showError('Failed to copy email.');
  });
}

function copySummaryToClipboard() {
  if (!state.currentResults) return;

  let text = `MEETING SUMMARY\n`;
  text += `================\n\n`;
  text += `Summary:\n${state.currentResults.summary}\n\n`;
  text += `Key Topics:\n${state.currentResults.key_topics.join(', ')}\n\n`;
  text += `Decisions:\n${state.currentResults.decisions.join('\n')}\n\n`;
  text += `Action Items:\n`;
  state.currentResults.action_items.forEach(item => {
    text += `- ${item.task} (Owner: ${item.owner}, Deadline: ${item.deadline})\n`;
  });

  navigator.clipboard.writeText(text).then(() => {
    showCopyFeedback(elements.copySummaryBtn);
  }).catch(err => {
    showError('Failed to copy summary.');
  });
}

function downloadAsTxt() {
  if (!state.currentResults) return;

  let text = `MEETING SUMMARY\n`;
  text += `Generated: ${new Date().toLocaleString()}\n`;
  text += `${'='.repeat(50)}\n\n`;

  text += `SUMMARY:\n${'-'.repeat(30)}\n${state.currentResults.summary}\n\n`;

  text += `KEY TOPICS:\n${'-'.repeat(30)}\n`;
  state.currentResults.key_topics.forEach(topic => {
    text += `• ${topic}\n`;
  });
  text += '\n';

  text += `DECISIONS:\n${'-'.repeat(30)}\n`;
  if (state.currentResults.decisions.length === 0) {
    text += 'No decisions made.\n\n';
  } else {
    state.currentResults.decisions.forEach((decision, i) => {
      text += `${i + 1}. ${decision}\n`;
    });
    text += '\n';
  }

  text += `ACTION ITEMS:\n${'-'.repeat(30)}\n`;
  if (state.currentResults.action_items.length === 0) {
    text += 'No action items.\n\n';
  } else {
    state.currentResults.action_items.forEach(item => {
      text += `Task: ${item.task}\nOwner: ${item.owner}\nDeadline: ${item.deadline}\n\n`;
    });
  }

  text += `FOLLOW-UP EMAIL:\n${'-'.repeat(30)}\n${state.currentResults.email_draft}\n`;

  const blob = new Blob([text], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `meeting-summary-${Date.now()}.txt`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function downloadAsPdf() {
  window.print();
}

function showCopyFeedback(button) {
  elements.copyFeedback.style.display = 'inline-block';
  setTimeout(() => {
    elements.copyFeedback.style.display = 'none';
  }, 2000);
}

// ===================================
// HISTORY MANAGEMENT
// ===================================

function saveToHistory(results) {
  const historyItem = {
    id: Date.now(),
    timestamp: new Date(),
    summary: results.summary,
    action_items: results.action_items,
    decisions: results.decisions,
    key_topics: results.key_topics,
    email_draft: results.email_draft,
  };

  state.history.unshift(historyItem);

  // Keep only max items
  if (state.history.length > state.maxHistoryItems) {
    state.history.pop();
  }

  saveHistoryToStorage();
  updateHistoryDisplay();
}

function loadHistoryFromStorage() {
  try {
    const stored = localStorage.getItem('meetingmind_history');
    if (stored) {
      state.history = JSON.parse(stored).map(item => ({
        ...item,
        timestamp: new Date(item.timestamp),
      }));
    }
  } catch (error) {
    console.error('Error loading history:', error);
    state.history = [];
  }
}

function saveHistoryToStorage() {
  try {
    localStorage.setItem('meetingmind_history', JSON.stringify(state.history));
  } catch (error) {
    console.error('Error saving history:', error);
  }
}

function updateHistoryDisplay() {
  elements.historyList.innerHTML = '';

  if (state.history.length === 0) {
    elements.historyList.innerHTML = '<p class="empty-history">No summaries yet</p>';
    elements.clearHistoryBtn.style.display = 'none';
    return;
  }

  elements.clearHistoryBtn.style.display = 'block';

  state.history.forEach(item => {
    const historyElement = document.createElement('div');
    historyElement.className = 'history-item';

    const timeStr = item.timestamp.toLocaleString();
    const preview = item.summary.substring(0, 60) + (item.summary.length > 60 ? '...' : '');

    historyElement.innerHTML = `
            <div class="history-time">${timeStr}</div>
            <div class="history-preview">${escapeHtml(preview)}</div>
        `;

    historyElement.addEventListener('click', () => {
      displayResults({
        summary: item.summary,
        action_items: item.action_items,
        decisions: item.decisions,
        key_topics: item.key_topics,
        email_draft: item.email_draft,
      });
    });

    elements.historyList.appendChild(historyElement);
  });
}

function clearHistory() {
  if (confirm('Are you sure you want to clear all history?')) {
    state.history = [];
    saveHistoryToStorage();
    updateHistoryDisplay();
    elements.resultsSection.style.display = 'none';
  }
}

// ===================================
// SIDEBAR MANAGEMENT
// ===================================

function toggleSidebar() {
  elements.historySidebar.classList.toggle('open');
}

function closeSidebar() {
  elements.historySidebar.classList.remove('open');
}

// ===================================
// UTILITY FUNCTIONS
// ===================================

function showError(message) {
  alert(message);
}

function escapeHtml(text) {
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  };
  return text.replace(/[&<>"']/g, m => map[m]);
}

function isAudioOrVideo(filename) {
  const audioExts = ['mp3', 'mp4', 'wav', 'm4a', 'webm', 'ogg', 'flac'];
  const ext = filename.split('.').pop().toLowerCase();
  return audioExts.includes(ext);
}

function renderSentiment(sentiment) {
  if (!sentiment) return;

  const section = document.getElementById('sentiment-section');
  if (!section) return;

  // Overall sentiment
  const overallEl = document.getElementById('sentiment-overall');
  if (overallEl) {
    overallEl.textContent = sentiment.overall || 'Neutral';
    overallEl.className = 'sentiment-value ' + (sentiment.overall || 'Neutral').toLowerCase();
  }

  // Sentiment bar
  const bar = document.getElementById('sentiment-bar');
  if (bar) {
    const score = sentiment.score || 50;
    bar.style.width = score + '%';
  }

  // Score label
  const scoreLabel = document.getElementById('sentiment-score-label');
  if (scoreLabel) {
    scoreLabel.textContent = 'Score: ' + (sentiment.score || 50) + ' / 100';
  }

  // Tone
  const toneEl = document.getElementById('sentiment-tone');
  if (toneEl) {
    toneEl.textContent = sentiment.tone || '';
    toneEl.className = 'sentiment-value';
  }

  // Tone description
  const toneDesc = document.getElementById('sentiment-tone-desc');
  if (toneDesc) {
    toneDesc.textContent = sentiment.tone_description || '';
  }

  // Speaker sentiments
  const speakerContainer = document.getElementById('speaker-sentiments');
  if (speakerContainer && sentiment.speaker_sentiments && sentiment.speaker_sentiments.length > 0) {
    speakerContainer.innerHTML = sentiment.speaker_sentiments.map(s => {
      const cls = (s.sentiment || 'Neutral').toLowerCase();
      const icon = cls === 'positive' ? '▲' : cls === 'negative' ? '▼' : '●';
      return `<span class="speaker-badge ${cls}">${icon} ${s.speaker}: ${s.sentiment}</span>`;
    }).join('');
  } else if (speakerContainer) {
    speakerContainer.innerHTML = '';
  }

  section.style.display = 'block';
}

// === Template Selector Logic ===
document.querySelectorAll('.template-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.template-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    state.selectedTemplate = btn.dataset.template;
  });
});

// === Render template-specific results ===
function renderTemplateResults(data) {
  const section = document.getElementById('template-results');
  const content = document.getElementById('template-results-content');
  if (!section || !content) return;

  let html = '';

  // Standup
  if (data.standup_updates && data.standup_updates.length > 0) {
    html += data.standup_updates.map(u => `
      <div class="standup-card">
        <p class="standup-name">${u.speaker}</p>
        <p class="standup-row"><strong>Yesterday:</strong> ${u.yesterday || '—'}</p>
        <p class="standup-row"><strong>Today:</strong> ${u.today || '—'}</p>
        <p class="standup-row"><strong>Blockers:</strong> ${u.blockers || 'None'}</p>
      </div>
    `).join('');
  }

  // Client Call
  if (data.client_requirements) {
    html += renderListField('Client Requirements', data.client_requirements);
  }
  if (data.commitments_made) {
    html += renderListField('Commitments Made', data.commitments_made);
  }
  if (data.follow_up_tasks) {
    html += renderListField('Follow-up Tasks', data.follow_up_tasks);
  }
  if (data.client_sentiment) {
    html += `<div class="template-field">
      <p class="template-field-label">Client Sentiment</p>
      <p class="template-field-value">${data.client_sentiment}</p>
    </div>`;
  }

  // Interview
  if (data.candidate_strengths) {
    html += renderListField('Candidate Strengths', data.candidate_strengths);
  }
  if (data.candidate_weaknesses) {
    html += renderListField('Candidate Weaknesses', data.candidate_weaknesses);
  }
  if (data.key_answers) {
    html += renderListField('Key Answers', data.key_answers);
  }
  if (data.recommendation) {
    const recCls = data.recommendation.toLowerCase().replace(' ', '-');
    html += `<div class="template-field">
      <p class="template-field-label">Recommendation</p>
      <span class="recommendation-badge ${recCls}">${data.recommendation}</span>
    </div>`;
  }

  // Brainstorm
  if (data.ideas_generated) {
    html += renderListField('Ideas Generated', data.ideas_generated);
  }
  if (data.top_picks) {
    html += renderListField('Top Picks', data.top_picks);
  }
  if (data.rejected_ideas) {
    html += renderListField('Rejected Ideas', data.rejected_ideas);
  }
  if (data.next_steps) {
    html += renderListField('Next Steps', data.next_steps);
  }

  // One-on-One
  if (data.discussion_points) {
    html += renderListField('Discussion Points', data.discussion_points);
  }
  if (data.feedback_given) {
    html += renderListField('Feedback Given', data.feedback_given);
  }
  if (data.goals_set) {
    html += renderListField('Goals Set', data.goals_set);
  }
  if (data.concerns_raised) {
    html += renderListField('Concerns Raised', data.concerns_raised);
  }

  if (html) {
    content.innerHTML = html;
    section.style.display = 'block';
  } else {
    section.style.display = 'none';
  }
}

function renderListField(label, items) {
  if (!items || items.length === 0) return '';
  return `<div class="template-field">
    <p class="template-field-label">${label}</p>
    <ul class="template-field-list">
      ${items.map(i => `<li>${i}</li>`).join('')}
    </ul>
  </div>`;
}

// === Speaker Analytics Renderer ===
function renderSpeakerAnalytics(analytics) {
  const section = document.getElementById('speaker-analytics-section');
  if (!section) return;

  if (!analytics) {
    section.style.display = 'none';
    return;
  }

  // Show the section
  section.style.display = 'block';

  // Top stats
  const totalSpeakersEl = document.getElementById('analytics-total-speakers');
  const totalWordsEl = document.getElementById('analytics-total-words');
  const mostActiveEl = document.getElementById('analytics-most-active');
  const listEl = document.getElementById('analytics-speakers-list');
  const noSpeakersEl = document.getElementById('analytics-no-speakers');

  if (totalSpeakersEl) totalSpeakersEl.textContent = analytics.total_speakers || 0;
  if (totalWordsEl) totalWordsEl.textContent = (analytics.total_words || 0).toLocaleString();
  if (mostActiveEl) mostActiveEl.textContent = analytics.most_active || '—';

  // No speakers case
  if (!analytics.has_speakers || !analytics.speakers || analytics.speakers.length === 0) {
    if (listEl) listEl.innerHTML = '';
    if (noSpeakersEl) noSpeakersEl.style.display = 'block';
    return;
  }

  if (noSpeakersEl) noSpeakersEl.style.display = 'none';

  // Render each speaker row
  if (listEl) {
    listEl.innerHTML = analytics.speakers.map((s, idx) => {
      const isTop = idx === 0;
      const badge = isTop ? '<span class="most-active-badge">Top</span>' : '';
      return `
        <div class="speaker-row">
          <div class="speaker-row-header">
            <div class="speaker-row-name">${s.name} ${badge}</div>
            <div class="speaker-row-pct">${s.talk_percentage}%</div>
          </div>
          <div class="speaker-bar-track">
            <div class="speaker-bar-fill" style="width: ${s.talk_percentage}%"></div>
          </div>
          <div class="speaker-row-stats">
            <span class="speaker-stat-pill"><strong>${s.word_count}</strong> words</span>
            <span class="speaker-stat-pill"><strong>${s.lines_spoken}</strong> lines</span>
            <span class="speaker-stat-pill"><strong>${s.questions_asked}</strong> questions</span>
            <span class="speaker-stat-pill"><strong>${s.contributions}</strong> contributions</span>
          </div>
        </div>
      `;
    }).join('');
  }
}

function setupSendEmailButton(emailDraft) {
  const btn = document.getElementById('send-email-btn');
  if (!btn || !emailDraft) return;

  // Parse subject and body from the email draft
  // Email draft format starts with "Subject: ..." on first line
  const lines = emailDraft.split('\n');
  let subject = 'Meeting Follow-up';
  let body = emailDraft;

  if (lines[0] && lines[0].toLowerCase().startsWith('subject:')) {
    subject = lines[0].replace(/^subject:\s*/i, '').trim();
    // Body is everything after the first line (skip blank line if present)
    body = lines.slice(1).join('\n').trim();
  }

  // Build mailto link
  const mailtoLink = 'https://mail.google.com/mail/?view=cm&fs=1&su=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(body);

  // Set button behavior
  btn.onclick = function () {
    window.open(mailtoLink, '_blank');
  };

  // Show the button
  btn.style.display = 'inline-flex';
}

// ─── STATS PAGE ───────────────────────────────────────────────

function getHistory() {
  // Use the same localStorage key that the existing history sidebar already uses
  try {
    const raw = localStorage.getItem('meetingmind_history');
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

function computeStats(history) {
  const total = history.length;

  // Total and average action items
  let totalActions = 0;
  history.forEach(h => {
    if (h.action_items && Array.isArray(h.action_items)) {
      totalActions += h.action_items.length;
    }
  });
  const avgActions = total > 0 ? (totalActions / total).toFixed(1) : 0;

  // Sentiment breakdown
  const sentimentCounts = { Positive: 0, Neutral: 0, Negative: 0 };
  history.forEach(h => {
    if (h.sentiment && h.sentiment.overall) {
      const s = h.sentiment.overall;
      if (sentimentCounts[s] !== undefined) sentimentCounts[s]++;
      else sentimentCounts['Neutral']++;
    } else {
      sentimentCounts['Neutral']++;
    }
  });

  // Most common topics
  const topicCount = {};
  history.forEach(h => {
    if (h.key_topics && Array.isArray(h.key_topics)) {
      h.key_topics.forEach(t => {
        const key = t.toLowerCase().trim();
        topicCount[key] = (topicCount[key] || 0) + 1;
      });
    }
  });
  const topTopics = Object.entries(topicCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  // Most active day of week
  const dayCounts = [0, 0, 0, 0, 0, 0, 0];
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  history.forEach(h => {
    if (h.timestamp) {
      const d = new Date(h.timestamp);
      if (!isNaN(d)) dayCounts[d.getDay()]++;
    }
  });
  const maxDayIdx = dayCounts.indexOf(Math.max(...dayCounts));
  const mostActiveDay = total > 0 ? dayNames[maxDayIdx] : '—';

  // Streak calculation
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const meetingDays = new Set();
  history.forEach(h => {
    if (h.timestamp) {
      const d = new Date(h.timestamp);
      d.setHours(0, 0, 0, 0);
      meetingDays.add(d.getTime());
    }
  });
  let streak = 0;
  let checkDay = new Date(today);
  while (meetingDays.has(checkDay.getTime())) {
    streak++;
    checkDay.setDate(checkDay.getDate() - 1);
  }

  // Activity heatmap data (last 84 days = 12 weeks)
  const activityMap = {};
  history.forEach(h => {
    if (h.timestamp) {
      const d = new Date(h.timestamp);
      d.setHours(0, 0, 0, 0);
      const key = d.getTime();
      activityMap[key] = (activityMap[key] || 0) + 1;
    }
  });

  return { total, totalActions, avgActions, sentimentCounts, topTopics, mostActiveDay, streak, activityMap };
}

function renderStats() {
  const history = getHistory();
  const statsPage = document.getElementById('stats-page');
  const emptyState = document.getElementById('stats-empty');

  if (history.length === 0) {
    // Show empty state, hide all stat sections
    if (emptyState) emptyState.style.display = 'block';
    document.querySelectorAll('.stats-cards-row, .stats-section-card').forEach(el => el.style.display = 'none');
    return;
  }

  if (emptyState) emptyState.style.display = 'none';
  document.querySelectorAll('.stats-cards-row, .stats-section-card').forEach(el => el.style.display = '');

  const s = computeStats(history);

  // Top stat cards
  document.getElementById('stat-total-meetings').textContent = s.total;
  document.getElementById('stat-total-actions').textContent = s.totalActions;
  document.getElementById('stat-avg-actions').textContent = s.avgActions;
  document.getElementById('stat-streak').textContent = s.streak;
  document.getElementById('stat-active-day').textContent = s.mostActiveDay;

  // Sentiment breakdown bars
  const sentimentContainer = document.getElementById('sentiment-breakdown');
  if (sentimentContainer) {
    const total = s.total || 1;
    sentimentContainer.innerHTML = ['Positive', 'Neutral', 'Negative'].map(label => {
      const count = s.sentimentCounts[label] || 0;
      const pct = Math.round((count / total) * 100);
      return `
        <div class="sentiment-bar-row">
          <span class="sentiment-bar-label">${label}</span>
          <div class="sentiment-bar-outer">
            <div class="sentiment-bar-inner ${label.toLowerCase()}" style="width:${pct}%"></div>
          </div>
          <span class="sentiment-bar-count">${count}</span>
        </div>`;
    }).join('');
  }

  // Most common topics bar chart
  const topicsContainer = document.getElementById('common-topics-chart');
  if (topicsContainer) {
    if (s.topTopics.length === 0) {
      topicsContainer.innerHTML = '<p style="color:rgba(255,255,255,0.4);font-size:13px;">No topics data yet</p>';
    } else {
      const maxCount = s.topTopics[0][1] || 1;
      topicsContainer.innerHTML = s.topTopics.map(([topic, count]) => {
        const pct = Math.round((count / maxCount) * 100);
        const label = topic.charAt(0).toUpperCase() + topic.slice(1);
        return `
          <div class="topic-bar-row">
            <span class="topic-bar-label" title="${label}">${label}</span>
            <div class="topic-bar-outer">
              <div class="topic-bar-inner" style="width:${pct}%"></div>
            </div>
            <span class="topic-bar-count">${count}</span>
          </div>`;
      }).join('');
    }
  }

  // Activity heatmap — last 84 days
  const heatmapContainer = document.getElementById('activity-heatmap');
  if (heatmapContainer) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    // Start from 83 days ago, aligned to Sunday
    const startDay = new Date(today);
    startDay.setDate(startDay.getDate() - 83);
    // Align to previous Sunday
    startDay.setDate(startDay.getDate() - startDay.getDay());

    let html = '';
    let currentDate = new Date(startDay);
    while (currentDate <= today) {
      html += '<div class="heatmap-week">';
      for (let d = 0; d < 7; d++) {
        const key = currentDate.getTime();
        const count = s.activityMap[key] || 0;
        const level = count === 0 ? 'lv0' : count === 1 ? 'lv1' : count === 2 ? 'lv2' : 'lv3';
        const dateStr = currentDate.toLocaleDateString();
        const isFuture = currentDate > today;
        html += `<div class="heatmap-cell ${isFuture ? 'lv0' : level}" title="${isFuture ? '' : dateStr + ': ' + count + ' meeting(s)'}"></div>`;
        currentDate.setDate(currentDate.getDate() + 1);
      }
      html += '</div>';
    }
    heatmapContainer.innerHTML = html;
  }
}

// Toggle between main page and stats page
function showStatsPage() {
  const mainContent = document.getElementById('main-content');
  const statsPage = document.getElementById('stats-page');
  const inputSection = document.querySelector('.input-section');
  const resultsSection = document.getElementById('resultsSection');
  const historySidebar = document.getElementById('historySidebar');

  if (mainContent) mainContent.style.display = 'none';
  if (inputSection) inputSection.style.display = 'none';
  if (resultsSection) resultsSection.style.display = 'none';
  if (historySidebar) historySidebar.style.display = 'none';

  if (statsPage) {
    statsPage.style.display = 'block';
    renderStats();
  }
}

function hideStatsPage() {
  const mainContent = document.getElementById('main-content');
  const statsPage = document.getElementById('stats-page');
  const inputSection = document.querySelector('.input-section');
  const resultsSection = document.getElementById('resultsSection');
  const historySidebar = document.getElementById('historySidebar');

  if (statsPage) statsPage.style.display = 'none';
  if (mainContent) mainContent.style.display = '';
  if (inputSection) inputSection.style.display = '';
  if (resultsSection) resultsSection.style.display = '';
  if (historySidebar) historySidebar.style.display = '';
}

// Event listeners
const statsNavBtn = document.getElementById('stats-nav-btn');
if (statsNavBtn) statsNavBtn.addEventListener('click', showStatsPage);

const statsBackBtn = document.getElementById('stats-back-btn');
if (statsBackBtn) statsBackBtn.addEventListener('click', hideStatsPage);

// ─── PDF REPORT EXPORT ────────────────────────────────────────

// Store the latest summary data for PDF generation
// This variable gets populated whenever a new summary is rendered
window._lastSummaryData = null;

function buildPDFReport(data) {
  if (!data) return '';

  const now = new Date();
  const dateStr = now.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  const lang = data.detected_language || 'English';

  // Helper to safely get text
  const safe = (val) => val || '—';

  // ── HEADER ──
  let html = `
  <div class="pdf-page">
    <div class="pdf-header">
      <p class="pdf-logo">✦ MeetingMind</p>
      <p class="pdf-meta">Generated on ${dateStr} at ${timeStr} &nbsp;|&nbsp; Language: ${lang}</p>
      <p class="pdf-meeting-title">Meeting Summary Report</p>
    </div>`;

  // ── EXECUTIVE SUMMARY ──
  html += `
    <div class="pdf-section">
      <p class="pdf-section-title">Executive Summary</p>
      <div class="pdf-section-body">${safe(data.summary)}</div>
    </div>`;

  // ── SENTIMENT & TONE ──
  if (data.sentiment) {
    const s = data.sentiment;
    const sentClass = (s.overall || 'neutral').toLowerCase();
    const score = s.score || 50;
    html += `
    <div class="pdf-section">
      <p class="pdf-section-title">Sentiment & Tone Analysis</p>
      <div class="pdf-sentiment-row">
        <div class="pdf-sentiment-item">
          <p class="pdf-sentiment-label">Overall Sentiment</p>
          <p class="pdf-sentiment-value ${sentClass}">${safe(s.overall)}</p>
          <div class="pdf-score-bar-track">
            <div class="pdf-score-bar-fill" style="width:${score}%"></div>
          </div>
          <p style="font-size:9pt;color:#888;margin:0;">Score: ${score} / 100</p>
        </div>
        <div class="pdf-sentiment-item">
          <p class="pdf-sentiment-label">Meeting Tone</p>
          <p class="pdf-sentiment-value">${safe(s.tone)}</p>
          <p style="font-size:10pt;color:#555;margin:4px 0 0;">${safe(s.tone_description)}</p>
        </div>
      </div>
    </div>`;

    // Speaker sentiments
    if (s.speaker_sentiments && s.speaker_sentiments.length > 0) {
      html += `
      <div class="pdf-section">
        <p class="pdf-section-title">Speaker Analysis</p>
        <div class="pdf-speaker-row">
          ${s.speaker_sentiments.map(sp => {
        const cls = (sp.sentiment || 'neutral').toLowerCase();
        const icon = cls === 'positive' ? '▲' : cls === 'negative' ? '▼' : '●';
        return `<span class="pdf-speaker-badge ${cls}">${icon} ${sp.speaker}: ${sp.sentiment}</span>`;
      }).join('')}
        </div>
      </div>`;
    }
  }

  // ── ACTION ITEMS ──
  if (data.action_items && data.action_items.length > 0) {
    html += `
    <div class="pdf-section">
      <p class="pdf-section-title">Action Items</p>
      <table class="pdf-table">
        <thead>
          <tr>
            <th>#</th>
            <th>Task</th>
            <th>Owner</th>
            <th>Deadline</th>
          </tr>
        </thead>
        <tbody>
          ${data.action_items.map((item, i) => `
          <tr>
            <td>${i + 1}</td>
            <td>${safe(item.task)}</td>
            <td>${safe(item.owner)}</td>
            <td>${safe(item.deadline)}</td>
          </tr>`).join('')}
        </tbody>
      </table>
    </div>`;
  }

  // ── KEY DECISIONS ──
  if (data.decisions && data.decisions.length > 0) {
    html += `
    <div class="pdf-section">
      <p class="pdf-section-title">Key Decisions</p>
      <div class="pdf-section-body">
        ${data.decisions.map((d, i) => `
        <div class="pdf-decision-item">
          <span class="pdf-decision-num">${i + 1}.</span>
          <span>${d}</span>
        </div>`).join('')}
      </div>
    </div>`;
  }

  // ── KEY TOPICS ──
  if (data.key_topics && data.key_topics.length > 0) {
    html += `
    <div class="pdf-section">
      <p class="pdf-section-title">Key Topics</p>
      <div class="pdf-topics-row">
        ${data.key_topics.map(t => `<span class="pdf-topic-chip">${t}</span>`).join('')}
      </div>
    </div>`;
  }

  // ── TEMPLATE INSIGHTS ──
  // Check for standup fields
  if (data.standup_breakdown || data.speaker_updates) {
    const updates = data.standup_breakdown || data.speaker_updates;
    if (Array.isArray(updates) && updates.length > 0) {
      html += `
      <div class="pdf-section break-before">
        <p class="pdf-section-title">Template Insights — Standup Breakdown</p>
        <table class="pdf-table">
          <thead>
            <tr><th>Speaker</th><th>Yesterday</th><th>Today</th><th>Blockers</th></tr>
          </thead>
          <tbody>
            ${updates.map(u => `
            <tr>
              <td><strong>${safe(u.speaker || u.name)}</strong></td>
              <td>${safe(u.yesterday || u.completed)}</td>
              <td>${safe(u.today || u.planned)}</td>
              <td>${safe(u.blockers || u.blocked || '—')}</td>
            </tr>`).join('')}
          </tbody>
        </table>
      </div>`;
    }
  }

  // Check for sales call fields
  if (data.pain_points || data.objections || data.deal_status) {
    html += `
    <div class="pdf-section">
      <p class="pdf-section-title">Template Insights — Sales Call</p>
      <div class="pdf-section-body">`;
    if (data.pain_points) html += `<p><strong>Pain Points:</strong> ${data.pain_points}</p>`;
    if (data.objections) html += `<p><strong>Objections:</strong> ${data.objections}</p>`;
    if (data.deal_status) html += `<p><strong>Deal Status:</strong> ${data.deal_status}</p>`;
    html += `</div></div>`;
  }

  // ── EMAIL DRAFT ──
  if (data.email_draft) {
    html += `
    <div class="pdf-section break-before">
      <p class="pdf-section-title">Follow-up Email Draft</p>
      <div class="pdf-email-box">${data.email_draft.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</div>
    </div>`;
  }

  // ── FOOTER ──
  html += `
    <div class="pdf-footer">
      <span>Generated by MeetingMind — AI-Powered Meeting Summarizer</span>
      <span>${dateStr}, ${timeStr}</span>
    </div>

  </div>`;

  return html;
}

function downloadPDFReport() {
  const data = window._lastSummaryData;
  if (!data) {
    alert('Please generate a summary first.');
    return;
  }

  const container = document.getElementById('pdf-report-content');
  if (!container) return;

  // Build and inject the report HTML
  container.innerHTML = buildPDFReport(data);

  // Trigger print dialog
  setTimeout(() => {
    window.print();
  }, 100);
}

// Wire up the button
const downloadPdfBtn = document.getElementById('download-pdf-btn');
if (downloadPdfBtn) {
  downloadPdfBtn.addEventListener('click', downloadPDFReport);
}

// ─── NEW MEETING RESET ────────────────────────────────────────

function resetToNewMeeting() {
  // 1. Clear textarea
  const textarea = document.querySelector('textarea');
  if (textarea) textarea.value = '';

  // 2. Clear file upload — reset the drag and drop zone
  const fileInput = document.querySelector('input[type="file"]');
  if (fileInput) fileInput.value = '';

  // Find and reset the filename display text in the upload zone
  const fileNameDisplay = document.getElementById('fileName') ||
    document.querySelector('.file-name') ||
    document.querySelector('.upload-filename');
  if (fileNameDisplay) fileNameDisplay.textContent = '';

  // Reset drag-and-drop zone appearance
  const dropZone = document.getElementById('fileUploadZone') ||
    document.querySelector('.drop-zone') ||
    document.querySelector('.upload-zone');
  if (dropZone) dropZone.classList.remove('dragover', 'has-file', 'active');

  // Clear the current file reference
  if (typeof state !== 'undefined') {
    state.selectedFile = null;
  }

  // 3. Hide results section
  const resultsSection = document.getElementById('resultsSection') ||
    document.querySelector('.results-section') ||
    document.getElementById('results');
  if (resultsSection) resultsSection.style.display = 'none';

  // 4. Hide export buttons
  const exportRow = document.querySelector('.export-buttons') ||
    document.querySelector('.export-row') ||
    document.getElementById('export-buttons');
  if (exportRow) exportRow.style.display = 'none';

  // 5. Hide email draft section
  const emailSection = document.querySelector('.email-section') ||
    document.getElementById('email-section') ||
    document.querySelector('.email-draft-section');
  if (emailSection) emailSection.style.display = 'none';

  // 6. Hide individual buttons that appear only after summary
  const pdfBtn = document.getElementById('download-pdf-btn');
  if (pdfBtn) pdfBtn.style.display = 'none';

  const sendEmailBtn = document.getElementById('send-email-btn');
  if (sendEmailBtn) sendEmailBtn.style.display = 'none';

  const copyBtn = document.getElementById('copy-summary-btn') ||
    document.querySelector('.copy-summary-btn');
  if (copyBtn) copyBtn.style.display = 'none';

  // 7. Hide sentiment section
  const sentimentSection = document.getElementById('sentiment-section');
  if (sentimentSection) sentimentSection.style.display = 'none';

  // 8. Hide speaker analytics section
  const analyticsSection = document.getElementById('speaker-analytics-section');
  if (analyticsSection) analyticsSection.style.display = 'none';

  // 9. Hide template results section
  const templateResults = document.getElementById('template-results');
  if (templateResults) templateResults.style.display = 'none';

  // 10. Hide language badge
  const langBadge = document.getElementById('language-badge');
  if (langBadge) langBadge.style.display = 'none';

  // 11. Hide the new meeting results row itself
  const newMeetingRow = document.getElementById('new-meeting-results-row');
  if (newMeetingRow) newMeetingRow.style.display = 'none';

  // 12. Clear stored summary data
  window._lastSummaryData = null;

  // 13. Switch back to Paste Text tab
  // Find the paste text tab button and simulate a click on it
  const pasteTab = document.querySelector('[data-tab="paste-tab"]') ||
    document.querySelector('[data-tab="paste"]') ||
    document.querySelector('.tab-button:first-child');
  if (pasteTab) pasteTab.click();

  // 14. Scroll smoothly back to the top of the page
  window.scrollTo({ top: 0, behavior: 'smooth' });

  // 15. Focus the textarea so user can start typing immediately
  setTimeout(() => {
    if (textarea) textarea.focus();
  }, 300);
}

// Wire up both New Meeting buttons
const newMeetingBtnNav = document.getElementById('new-meeting-btn-nav');
if (newMeetingBtnNav) newMeetingBtnNav.addEventListener('click', resetToNewMeeting);

const newMeetingBtnResults = document.getElementById('new-meeting-btn-results');
if (newMeetingBtnResults) newMeetingBtnResults.addEventListener('click', resetToNewMeeting);
