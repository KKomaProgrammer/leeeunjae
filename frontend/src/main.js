import html2canvas from 'html2canvas';
import { applicationServerKey, sameApplicationServerKey } from './push.js';
import './styles.css';
import { apiUrl } from './api.js';

const $ = (selector) => document.querySelector(selector);

const elements = {
  loginView: $('#loginView'),
  boardView: $('#boardView'),
  loginForm: $('#loginForm'),
  loginButton: $('#loginButton'),
  loginStatus: $('#loginStatus'),
  studentId: $('#studentId'),
  password: $('#password'),
  logoutButton: $('#logoutButton'),
  boardModeButton: $('#boardModeButton'),
  readingModeButton: $('#readingModeButton'),
  writingModeButton: $('#writingModeButton'),
  searchForm: $('#searchForm'),
  searchButton: $('#searchButton'),
  notifyButton: $('#notifyButton'),
  searchStatus: $('#searchStatus'),
  notifyStatus: $('#notifyStatus'),
  teacherSelect: $('#teacherSelect'),
  keywordLabel: $('#keywordLabel'),
  keywordInput: $('#keywordInput'),
  nthInput: $('#nthInput'),
  readingForm: $('#readingForm'),
  readingRoundInput: $('#readingRoundInput'),
  readingAttemptSelect: $('#readingAttemptSelect'),
  readingSearchButton: $('#readingSearchButton'),
  readingNotifyButton: $('#readingNotifyButton'),
  readingStatus: $('#readingStatus'),
  writingPanel: $('#writingPanel'),
  writingNotifyButton: $('#writingNotifyButton'),
  writingStatus: $('#writingStatus'),
  watchSection: $('#watchSection'),
  watchCount: $('#watchCount'),
  watchList: $('#watchList'),
  watchEmpty: $('#watchEmpty'),
  watchStatus: $('#watchStatus'),
  noticeSection: $('#noticeSection'),
  noticeCount: $('#noticeCount'),
  noticeList: $('#noticeList'),
  allPostsSection: $('#allPostsSection'),
  allPostCount: $('#allPostCount'),
  allPostList: $('#allPostList'),
  resultSection: $('#resultSection'),
  resultTeacher: $('#resultTeacher'),
  resultTitle: $('#resultTitle'),
  resultMeta: $('#resultMeta'),
  imageLoading: $('#imageLoading'),
  imageFrame: $('#imageFrame'),
  resultImage: $('#resultImage'),
  imageStatus: $('#imageStatus'),
  downloadImageButton: $('#downloadImageButton'),
  shareImageButton: $('#shareImageButton'),
  otherMatches: $('#otherMatches'),
  attachmentSection: $('#attachmentSection'),
  attachmentList: $('#attachmentList'),
  selectAllAttachments: $('#selectAllAttachments'),
  downloadAttachmentsButton: $('#downloadAttachmentsButton'),
  attachmentStatus: $('#attachmentStatus'),
  toast: $('#toast'),
  captureHost: $('#captureHost'),
  consentModal: $('#consentModal'),
  consentCloseButton: $('#consentCloseButton'),
  consentCancelButton: $('#consentCancelButton'),
  consentConfirmButton: $('#consentConfirmButton'),
  consentTitle: $('#consentTitle'),
  consentSummary: $('#consentSummary'),
  consentStatus: $('#consentStatus'),
  privacyConsent: $('#privacyConsent'),
  pushDelivery: $('#pushDelivery'),
  mmsDelivery: $('#mmsDelivery'),
  mmsFields: $('#mmsFields'),
  mmsPhone: $('#mmsPhone'),
  mmsCodeRow: $('#mmsCodeRow'),
  mmsCode: $('#mmsCode'),
  mmsCodeRequestButton: $('#mmsCodeRequestButton'),
  mmsCodeConfirmButton: $('#mmsCodeConfirmButton'),
  mmsVerificationStatus: $('#mmsVerificationStatus'),
  iosNote: $('#iosNote'),
};

const state = {
  credentials: null,
  teachers: [],
  current: null,
  imageBlob: null,
  imageUrl: '',
  captureVersion: 0,
  toastTimer: 0,
  mode: 'board',
  gradeLabel: '',
  notices: [],
  noticeVersion: 0,
  downloadSequence: 0,
  notificationWatches: [],
  pendingWatch: null,
  pendingNotificationAction: '',
  mmsAvailable: false,
  mmsChallengeId: '',
  mmsVerified: false,
  mmsMaskedPhone: '',
};

const MMS_CONSENT_VERSION = '2026-09-08-infobip-text-v5';
const MMS_CLIENT_STORAGE_KEY = 'leeeunjae-mms-client-v1';

const captureCss = `
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; background: #fff; color: #222; }
  body { width: 1240px; padding: 24px; font-family: Arial, "Malgun Gothic", "Apple SD Gothic Neo", sans-serif; font-size: 14px; }
  #capture { width: 1192px; overflow: visible; background: #fff; }
  table { border-collapse: collapse; max-width: none; color: #222; }
  #capture > table { width: 100% !important; }
  td, th { line-height: 1.5; vertical-align: middle; }
  .tblContentBorderColor { border: 1px solid #d5d5d5; background: #dcdcdc; }
  .tblContentBorderColor td, .tblContentBorderColor th { border: 1px solid #d9d9d9; padding: 8px; }
  .HeaderStyle, .tblHeaderBG { font-weight: 700; background: #f5f6f8 !important; }
  img { max-width: 100%; }
  p { margin: 0 0 10px; }
  a { color: inherit; text-decoration: none; }
`;

function setStatus(element, message = '', error = false) {
  element.textContent = message;
  element.classList.toggle('error', Boolean(error));
}

function showToast(message) {
  window.clearTimeout(state.toastTimer);
  elements.toast.textContent = message;
  elements.toast.classList.add('show');
  state.toastTimer = window.setTimeout(() => elements.toast.classList.remove('show'), 2800);
}

function setBusy(button, busy, label, busyLabel) {
  button.disabled = busy;
  button.textContent = busy ? busyLabel : label;
}

async function apiRequest(body) {
  const response = await fetch(apiUrl('/api/board'), {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ ...state.credentials, ...body }),
  });
  let payload;
  try {
    payload = await response.json();
  } catch {
    throw new Error(`서버 응답을 읽지 못했습니다. (${response.status})`);
  }
  if (!response.ok || !payload.ok) throw new Error(payload.message || `요청에 실패했습니다. (${response.status})`);
  return payload;
}

async function notifyRequest(body = null) {
  const response = await fetch(apiUrl('/api/notify'), body ? {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ ...body, mmsClientToken: mmsClientToken() }),
  } : undefined);
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload.ok === false) throw new Error(payload.message || `알림 요청에 실패했습니다. (${response.status})`);
  return payload;
}

function mmsClientToken() {
  let token = localStorage.getItem(MMS_CLIENT_STORAGE_KEY) || '';
  if (!/^[A-Za-z0-9_-]{20,180}$/.test(token)) {
    token = `${crypto.randomUUID().replace(/-/g, '')}${crypto.randomUUID().replace(/-/g, '')}`;
    localStorage.setItem(MMS_CLIENT_STORAGE_KEY, token);
  }
  return token;
}

async function mmsRequest(body) {
  const response = await fetch(apiUrl('/api/mms'), {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ ...body, clientToken: mmsClientToken() }),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload.ok === false) throw new Error(payload.message || `문자 인증 요청에 실패했습니다. (${response.status})`);
  return payload;
}

function selectedTeacher() {
  return state.teachers.find((teacher) => teacher.url === elements.teacherSelect.value) || null;
}

function activeBoardWatch() {
  const teacher = selectedTeacher();
  const keyword = elements.keywordInput.value.trim();
  return state.notificationWatches.find((watch) =>
    watch.type === 'board' && watch.teacherUrl === teacher?.url && watch.keyword === keyword,
  ) || null;
}

function activeEvaluationWatch(type) {
  return state.notificationWatches.find((watch) => watch.type === type) || null;
}

function updateNotifyButtons() {
  const boardActive = Boolean(activeBoardWatch());
  elements.notifyButton.textContent = boardActive ? '알림 해제' : '새 글 알림';
  elements.notifyButton.classList.toggle('active', boardActive);
  for (const [type, button] of [['reading', elements.readingNotifyButton], ['writing', elements.writingNotifyButton]]) {
    const active = Boolean(activeEvaluationWatch(type));
    button.textContent = active ? '알림 해제' : '모든 평가 알림';
    button.classList.toggle('active', active);
  }
}

function updateSearchLabels() {
  const teacher = selectedTeacher();
  const listening = Boolean(teacher?.isListening);
  elements.keywordLabel.textContent = listening ? '게시물 검색' : '반 이름';
  elements.keywordInput.placeholder = listening ? '교재명 입력 · 비우면 전체' : '반 이름 · 비우면 전체';
  updateNotifyButtons();
}

function statusElementForWatch(type) {
  return type === 'reading' ? elements.readingStatus : type === 'writing' ? elements.writingStatus : elements.notifyStatus;
}

function openConsentModal(type = 'board') {
  const teacher = selectedTeacher();
  const keyword = elements.keywordInput.value.trim();
  if (type === 'board' && !teacher?.url) {
    setStatus(elements.notifyStatus, '선생님 게시판을 선택해 주세요.', true);
    return;
  }
  if (type === 'board' && !keyword) {
    setStatus(elements.notifyStatus, '알림을 받을 검색어를 입력해 주세요.', true);
    elements.keywordInput.focus();
    return;
  }
  state.pendingWatch = { type, teacher, keyword };
  const label = type === 'reading' ? '낭독 평가 완료' : type === 'writing' ? '작문 평가 완료' : `${teacher.name} · ${keyword}`;
  elements.consentTitle.textContent = type === 'board' ? '새 게시물 알림' : '평가 완료 알림';
  elements.consentSummary.textContent = label;
  elements.privacyConsent.checked = false;
  elements.pushDelivery.checked = true;
  elements.mmsDelivery.checked = false;
  state.mmsChallengeId = '';
  state.mmsVerified = false;
  state.mmsMaskedPhone = '';
  elements.mmsPhone.value = '';
  elements.mmsCode.value = '';
  elements.mmsCodeRow.hidden = true;
  setStatus(elements.mmsVerificationStatus, '');
  updateDeliveryPanel();
  setStatus(elements.consentStatus, '');
  elements.consentModal.hidden = false;
  document.body.classList.add('modal-open');
  requestAnimationFrame(() => {
    elements.consentModal.classList.add('open');
    elements.privacyConsent.focus();
  });
}

function selectedDeliveryChannel() {
  return elements.mmsDelivery.checked ? 'mms' : 'push';
}

async function loadMmsVerificationStatus() {
  if (!state.mmsAvailable) {
    state.mmsVerified = false;
    setStatus(elements.mmsVerificationStatus, 'MMS 발송 서버 설정이 아직 완료되지 않았습니다.', true);
    return;
  }
  try {
    const payload = await mmsRequest({ action: 'status' });
    state.mmsVerified = Boolean(payload.verified);
    state.mmsMaskedPhone = payload.phone || '';
    setStatus(
      elements.mmsVerificationStatus,
      state.mmsVerified ? `${state.mmsMaskedPhone} 인증 완료` : '문자 수신 번호 인증이 필요합니다.',
    );
  } catch (error) {
    state.mmsVerified = false;
    setStatus(elements.mmsVerificationStatus, error instanceof Error ? error.message : '문자 인증 상태를 확인하지 못했습니다.', true);
  }
}

function updateDeliveryPanel() {
  const mms = selectedDeliveryChannel() === 'mms';
  elements.mmsFields.hidden = !mms;
  elements.iosNote.hidden = mms;
  elements.consentConfirmButton.textContent = mms ? '동의하고 문자 등록' : '동의하고 등록';
  if (mms) loadMmsVerificationStatus();
}

async function requestMmsCode() {
  if (!elements.privacyConsent.checked) {
    setStatus(elements.mmsVerificationStatus, '먼저 개인정보 저장 및 이용 동의에 체크해 주세요.', true);
    return;
  }
  setBusy(elements.mmsCodeRequestButton, true, '인증번호 받기', '전송 중');
  setStatus(elements.mmsVerificationStatus, 'WEB 발신 인증 문자를 보내는 중입니다.');
  try {
    const payload = await mmsRequest({
      action: 'request-code',
      phone: elements.mmsPhone.value,
      consent: true,
      consentVersion: MMS_CONSENT_VERSION,
    });
    state.mmsChallengeId = payload.challengeId;
    state.mmsVerified = false;
    elements.mmsCodeRow.hidden = false;
    elements.mmsCode.value = '';
    const receipt = payload.requestId ? ` · 접수번호 ${payload.requestId}` : '';
    setStatus(elements.mmsVerificationStatus, `${payload.phone} 인증문자가 발송되었습니다. 도착한 인증번호를 5분 이내에 입력해 주세요.`);
    elements.mmsCode.focus();
  } catch (error) {
    setStatus(elements.mmsVerificationStatus, error instanceof Error ? error.message : '인증번호를 보내지 못했습니다.', true);
  } finally {
    setBusy(elements.mmsCodeRequestButton, false, '인증번호 받기', '전송 중');
  }
}

async function confirmMmsCode() {
  if (!state.mmsChallengeId) {
    setStatus(elements.mmsVerificationStatus, '인증번호를 먼저 받아 주세요.', true);
    return;
  }
  setBusy(elements.mmsCodeConfirmButton, true, '인증 확인', '확인 중');
  try {
    const payload = await mmsRequest({
      action: 'confirm-code',
      challengeId: state.mmsChallengeId,
      code: elements.mmsCode.value,
    });
    state.mmsVerified = true;
    state.mmsMaskedPhone = payload.phone || '';
    elements.mmsCodeRow.hidden = true;
    setStatus(elements.mmsVerificationStatus, `${state.mmsMaskedPhone} 인증 완료`);
  } catch (error) {
    state.mmsVerified = false;
    setStatus(elements.mmsVerificationStatus, error instanceof Error ? error.message : '인증번호를 확인하지 못했습니다.', true);
  } finally {
    setBusy(elements.mmsCodeConfirmButton, false, '인증 확인', '확인 중');
  }
}

function closeConsentModal() {
  elements.consentModal.classList.remove('open');
  document.body.classList.remove('modal-open');
  window.setTimeout(() => {
    elements.consentModal.hidden = true;
  }, 190);
}

async function pushSubscription(publicKey) {
  if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) {
    throw new Error('이 브라우저에서는 푸시 알림을 지원하지 않습니다.');
  }
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') throw new Error('기기 알림 권한을 허용해 주세요.');
  const registration = await navigator.serviceWorker.register('/sw.js', { updateViaCache: 'none' });
  await registration.update().catch(() => {});
  const readyRegistration = await navigator.serviceWorker.ready;
  let subscription = await readyRegistration.pushManager.getSubscription();
  let previousSubscription = null;
  if (subscription && !sameApplicationServerKey(subscription, publicKey)) {
    previousSubscription = subscription.toJSON();
    const removed = await subscription.unsubscribe();
    if (!removed) throw new Error('이전 푸시 구독을 갱신하지 못했습니다. 브라우저 알림 권한을 다시 확인해 주세요.');
    subscription = null;
  }
  subscription ||= await readyRegistration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: applicationServerKey(publicKey),
  });
  return { subscription, previousSubscription };
}

async function currentPushSubscription() {
  if (!('serviceWorker' in navigator)) return null;
  const registration = await navigator.serviceWorker.getRegistration('/');
  return registration?.pushManager?.getSubscription() || null;
}

function watchDisplay(watch) {
  const delivery = watch.delivery === 'mms' ? '문자(MMS)' : '브라우저 알림';
  if (watch.type === 'reading') return ['낭독 평가', `${delivery} · 평가가 완료될 때마다`];
  if (watch.type === 'writing') return ['작문 평가', `${delivery} · 평가가 완료될 때마다`];
  return [`${watch.keyword} 게시물`, `${delivery} · ${watch.teacher}`];
}

function renderNotificationWatches() {
  elements.watchList.replaceChildren();
  elements.watchCount.textContent = String(state.notificationWatches.length);
  elements.watchEmpty.hidden = state.notificationWatches.length > 0;
  elements.watchSection.hidden = false;
  for (const watch of state.notificationWatches) {
    const row = document.createElement('div');
    row.className = 'watch-item';
    const copy = document.createElement('div');
    const [titleText, metaText] = watchDisplay(watch);
    const title = document.createElement('strong');
    title.textContent = titleText;
    const meta = document.createElement('span');
    meta.textContent = watch.error ? `${metaText} · 전송 오류: ${watch.error}` : metaText;
    meta.classList.toggle('watch-error', Boolean(watch.error));
    copy.append(title, meta);
    const remove = document.createElement('button');
    remove.type = 'button';
    remove.className = 'text-button watch-remove';
    remove.textContent = '해제';
    remove.addEventListener('click', () => removeNotification(watch, remove));
    row.append(copy, remove);
    elements.watchList.append(row);
  }
  updateNotifyButtons();
}

async function loadNotificationWatches() {
  setStatus(elements.watchStatus, '');
  let subscription = await currentPushSubscription();
  try {
    const config = await notifyRequest();
    state.mmsAvailable = Boolean(config.mmsAvailable);
    if (subscription && config.available && config.publicKey && !sameApplicationServerKey(subscription, config.publicKey)) {
      const push = await pushSubscription(config.publicKey);
      if (push.previousSubscription) {
        await notifyRequest({
          action: 'replace-subscription',
          previousSubscription: push.previousSubscription,
          subscription: push.subscription.toJSON(),
        });
      }
      subscription = push.subscription;
    }
    let payload = await notifyRequest({
      action: 'list',
      ...(subscription ? { subscription: subscription.toJSON() } : {}),
    });
    if (!subscription && config.available && config.publicKey &&
        (payload.watches || []).some((watch) => watch.delivery === 'mms')) {
      try {
        const push = await pushSubscription(config.publicKey);
        subscription = push.subscription;
        payload = await notifyRequest({ action: 'list', subscription: subscription.toJSON() });
      } catch {
        setStatus(elements.watchStatus, '문자 장애 안내를 받으려면 기기 알림 권한을 허용해 주세요.', true);
      }
    }
    state.notificationWatches = payload.watches || [];
    renderNotificationWatches();
  } catch (error) {
    state.notificationWatches = [];
    renderNotificationWatches();
    setStatus(elements.watchStatus, error instanceof Error ? error.message : '등록한 알림을 불러오지 못했습니다.', true);
  }
}

async function registerNotification() {
  if (!elements.privacyConsent.checked) {
    setStatus(elements.consentStatus, '개인정보 저장 및 이용 동의를 확인해 주세요.', true);
    return;
  }
  const pending = state.pendingWatch;
  if (!pending) return;
  const deliveryChannel = selectedDeliveryChannel();
  const buttonLabel = deliveryChannel === 'mms' ? '동의하고 문자 등록' : '동의하고 등록';
  if (deliveryChannel === 'mms' && !state.mmsVerified) {
    setStatus(elements.consentStatus, '문자 수신 번호 인증을 먼저 완료해 주세요.', true);
    return;
  }
  setBusy(elements.consentConfirmButton, true, buttonLabel, '등록 중');
  setStatus(elements.consentStatus, deliveryChannel === 'mms' ? '문자 알림과 장애 안내를 연결하는 중입니다.' : '기기 알림을 연결하는 중입니다.');
  try {
    const config = await notifyRequest();
    if (!config.available || !config.publicKey) throw new Error('푸시 알림 서버 설정이 완료되지 않았습니다.');
    const push = await pushSubscription(config.publicKey);
    if (push.previousSubscription) {
      await notifyRequest({
        action: 'replace-subscription',
        previousSubscription: push.previousSubscription,
        subscription: push.subscription.toJSON(),
      });
    }
    const subscription = push.subscription.toJSON();
    const payload = await notifyRequest({
      action: 'subscribe',
      ...state.credentials,
      watchType: pending.type,
      teacherUrl: pending.teacher?.url || '',
      teacherName: pending.teacher?.name || '',
      keyword: pending.keyword || '',
      deliveryChannel,
      subscription,
      consent: true,
      consentVersion: deliveryChannel === 'mms' ? MMS_CONSENT_VERSION : '2026-08-21',
    });
    await loadNotificationWatches();
    setStatus(statusElementForWatch(pending.type), payload.message || '알림을 등록했습니다.');
    showToast('알림을 등록했습니다.');
    closeConsentModal();
  } catch (error) {
    setStatus(elements.consentStatus, error instanceof Error ? error.message : '알림을 등록하지 못했습니다.', true);
  } finally {
    setBusy(elements.consentConfirmButton, false, buttonLabel, '등록 중');
  }
}

async function removeNotification(watch, button = null) {
  const subscription = await currentPushSubscription();
  if (button) setBusy(button, true, '해제', '해제 중');
  try {
    await notifyRequest({
      action: 'unsubscribe',
      watchId: watch.id,
      ...(subscription ? { subscription: subscription.toJSON() } : {}),
    });
    state.notificationWatches = state.notificationWatches.filter((candidate) => candidate.id !== watch.id);
    renderNotificationWatches();
    setStatus(statusElementForWatch(watch.type), '알림을 해제했습니다.');
  } catch (error) {
    setStatus(statusElementForWatch(watch.type), error instanceof Error ? error.message : '알림을 해제하지 못했습니다.', true);
  } finally {
    if (button) setBusy(button, false, '해제', '해제 중');
    updateNotifyButtons();
  }
}

function setMode(mode) {
  state.mode = ['reading', 'writing'].includes(mode) ? mode : 'board';
  const reading = state.mode === 'reading';
  const writing = state.mode === 'writing';
  const board = state.mode === 'board';
  elements.searchForm.hidden = !board;
  elements.readingForm.hidden = !reading;
  elements.writingPanel.hidden = !writing;
  elements.boardModeButton.classList.toggle('active', board);
  elements.readingModeButton.classList.toggle('active', reading);
  elements.writingModeButton.classList.toggle('active', writing);
  elements.boardModeButton.setAttribute('aria-selected', String(board));
  elements.readingModeButton.setAttribute('aria-selected', String(reading));
  elements.writingModeButton.setAttribute('aria-selected', String(writing));
  elements.resultSection.hidden = true;
  elements.allPostsSection.hidden = true;
  elements.noticeSection.hidden = !board || state.notices.length === 0;
  clearImage();
  if (reading) elements.readingRoundInput.focus();
  else if (writing) elements.writingNotifyButton.focus();
  else elements.teacherSelect.focus();
}

function renderTeachers(teachers) {
  elements.teacherSelect.replaceChildren();
  for (const teacher of teachers) {
    const option = document.createElement('option');
    option.value = teacher.url || '';
    option.textContent = teacher.available === false ? `${teacher.name} (불러오기 불가)` : teacher.name;
    option.disabled = teacher.available === false;
    elements.teacherSelect.append(option);
  }
  const firstAvailable = teachers.find((teacher) => teacher.available !== false);
  if (firstAvailable) elements.teacherSelect.value = firstAvailable.url;
  updateSearchLabels();
}

function renderNotices(notices) {
  state.notices = notices;
  elements.noticeList.replaceChildren();
  elements.noticeCount.textContent = String(notices.length);
  elements.noticeSection.hidden = state.mode !== 'board' || notices.length === 0;
  for (const notice of notices) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'notice-card';
    button.dataset.url = notice.url;

    const title = document.createElement('span');
    title.className = 'notice-title';
    title.textContent = notice.title;

    const meta = document.createElement('span');
    meta.className = 'notice-meta';
    meta.textContent = [notice.teacher, notice.date].filter(Boolean).join(' · ');

    button.append(title, meta);
    button.addEventListener('click', () => loadDetail(notice.url));
    elements.noticeList.append(button);
  }
}

function renderAllPosts(posts) {
  elements.allPostList.replaceChildren();
  elements.allPostCount.textContent = String(posts.length);
  elements.allPostsSection.hidden = posts.length === 0;
  for (const post of posts) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'notice-card';

    const title = document.createElement('span');
    title.className = 'notice-title';
    title.textContent = post.title;

    const meta = document.createElement('span');
    meta.className = 'notice-meta';
    meta.textContent = [post.notice ? '공지' : '', post.author, post.date].filter(Boolean).join(' · ');

    button.append(title, meta);
    button.addEventListener('click', () => loadDetail(post.url));
    elements.allPostList.append(button);
  }
}

async function loadTeacherNotices() {
  const teacher = selectedTeacher();
  const version = ++state.noticeVersion;
  renderNotices([]);
  if (!teacher?.url) return;
  try {
    const payload = await apiRequest({ action: 'notices', teacherUrl: teacher.url });
    if (version !== state.noticeVersion || elements.teacherSelect.value !== teacher.url) return;
    renderNotices(payload.notices || []);
  } catch {
    if (version === state.noticeVersion) renderNotices([]);
  }
}

function clearImage() {
  state.captureVersion += 1;
  state.imageBlob = null;
  if (state.imageUrl) URL.revokeObjectURL(state.imageUrl);
  state.imageUrl = '';
  elements.resultImage.removeAttribute('src');
  elements.imageFrame.hidden = true;
  elements.downloadImageButton.disabled = true;
  elements.shareImageButton.disabled = true;
  elements.captureHost.replaceChildren();
}

function safeBaseName(value) {
  return String(value || '게시물')
    .replace(/[\\/:*?"<>|\u0000-\u001f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 100) || '게시물';
}

function imageFileName() {
  return `${safeBaseName(state.current?.post?.title)}.png`;
}

function waitForFrame(frame) {
  return new Promise((resolve, reject) => {
    const timeout = window.setTimeout(() => reject(new Error('표 화면을 준비하지 못했습니다.')), 12000);
    frame.addEventListener('load', () => {
      window.clearTimeout(timeout);
      resolve();
    }, { once: true });
  });
}

async function makeImage(contentHtml) {
  clearImage();
  const version = state.captureVersion;
  elements.imageLoading.hidden = false;
  setStatus(elements.imageStatus, '');

  const frame = document.createElement('iframe');
  frame.title = '이미지 변환용 화면';
  frame.setAttribute('tabindex', '-1');
  frame.srcdoc = `<!doctype html><html lang="ko"><head><meta charset="utf-8"><style>${captureCss}</style></head><body><main id="capture">${contentHtml}</main></body></html>`;
  elements.captureHost.append(frame);

  try {
    await waitForFrame(frame);
    const frameDocument = frame.contentDocument;
    if (!frameDocument) throw new Error('표 화면을 열지 못했습니다.');
    await frameDocument.fonts?.ready;
    await Promise.all(
      [...frameDocument.images].map((image) => image.complete
        ? Promise.resolve()
        : new Promise((resolve) => {
            image.addEventListener('load', resolve, { once: true });
            image.addEventListener('error', resolve, { once: true });
          })),
    );

    const target = frameDocument.querySelector('#capture');
    if (!target) throw new Error('이미지로 만들 화면을 찾지 못했습니다.');
    const width = Math.max(1240, target.scrollWidth);
    const height = Math.max(120, target.scrollHeight);
    frame.style.width = `${width + 48}px`;
    frame.style.height = `${height + 48}px`;
    const maxPixels = 44_000_000;
    const scale = Math.max(1, Math.min(2, Math.sqrt(maxPixels / Math.max(1, width * height))));
    const canvas = await html2canvas(target, {
      backgroundColor: '#ffffff',
      logging: false,
      scale,
      useCORS: true,
      windowWidth: width,
      windowHeight: height,
      scrollX: 0,
      scrollY: 0,
    });
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
    if (!(blob instanceof Blob) || version !== state.captureVersion) return;
    state.imageBlob = blob;
    state.imageUrl = URL.createObjectURL(blob);
    elements.resultImage.src = state.imageUrl;
    elements.imageFrame.hidden = false;
    elements.downloadImageButton.disabled = false;
    elements.shareImageButton.disabled = false;
    setStatus(elements.imageStatus, '');
  } catch (error) {
    if (version === state.captureVersion) {
      setStatus(elements.imageStatus, error instanceof Error ? error.message : '이미지를 만들지 못했습니다.', true);
    }
  } finally {
    if (version === state.captureVersion) elements.imageLoading.hidden = true;
    frame.remove();
  }
}

function formatBytes(value) {
  const bytes = Number(value);
  if (!Number.isFinite(bytes) || bytes <= 0) return '';
  const units = ['B', 'KB', 'MB', 'GB'];
  let number = bytes;
  let unit = 0;
  while (number >= 1024 && unit < units.length - 1) {
    number /= 1024;
    unit += 1;
  }
  return `${number >= 10 || unit === 0 ? number.toFixed(0) : number.toFixed(1)} ${units[unit]}`;
}

function renderAttachments(attachments) {
  elements.attachmentList.replaceChildren();
  elements.selectAllAttachments.checked = false;
  elements.attachmentSection.hidden = attachments.length === 0;
  setStatus(elements.attachmentStatus, '');
  attachments.forEach((attachment, index) => {
    const row = document.createElement('div');
    row.className = 'attachment-item';

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.className = 'attachment-check';
    checkbox.value = String(index);
    checkbox.setAttribute('aria-label', `${attachment.name} 선택`);

    const name = document.createElement('span');
    name.className = 'attachment-name';
    name.textContent = attachment.name;

    const size = document.createElement('span');
    size.className = 'attachment-size';
    size.textContent = formatBytes(attachment.size);

    const download = document.createElement('button');
    download.type = 'button';
    download.className = 'attachment-download';
    download.textContent = '다운로드';
    download.addEventListener('click', () => submitAttachmentDownload(index));

    row.append(checkbox, name, size, download);
    elements.attachmentList.append(row);
  });
}

function renderOtherMatches(matches, selectedUrl) {
  elements.otherMatches.replaceChildren();
  const others = matches.filter((post) => post.url !== selectedUrl).slice(0, 12);
  elements.otherMatches.hidden = others.length === 0;
  for (const post of others) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'match-chip';
    button.textContent = post.title;
    button.title = post.title;
    button.addEventListener('click', () => loadDetail(post.url));
    elements.otherMatches.append(button);
  }
}

async function renderResult(payload) {
  state.current = payload;
  elements.resultSection.hidden = false;
  elements.resultTeacher.textContent = payload.teacher || '게시판';
  elements.resultTitle.textContent = payload.post.title;
  elements.resultMeta.textContent = [payload.post.date, payload.post.author].filter(Boolean).join(' · ');
  renderAttachments(payload.attachments || []);
  renderOtherMatches(payload.matches || [], payload.post.url);
  elements.resultSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
  await makeImage(payload.pageHtml || payload.tableHtml);
}

async function loadDetail(url) {
  elements.allPostsSection.hidden = true;
  setBusy(elements.searchButton, true, '가져오기', '불러오는 중');
  setStatus(elements.searchStatus, '게시물을 불러오는 중입니다.');
  try {
    const payload = await apiRequest({ action: 'detail', detailUrl: url });
    setStatus(elements.searchStatus, '');
    await renderResult(payload);
  } catch (error) {
    setStatus(elements.searchStatus, error instanceof Error ? error.message : '게시물을 불러오지 못했습니다.', true);
  } finally {
    setBusy(elements.searchButton, false, '가져오기', '불러오는 중');
  }
}

elements.loginForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  state.credentials = {
    studentId: elements.studentId.value.trim(),
    password: elements.password.value,
  };
  setBusy(elements.loginButton, true, '게시판 불러오기', '로그인 중');
  setStatus(elements.loginStatus, '로그인하고 게시판을 확인하는 중입니다.');
  try {
    const payload = await apiRequest({ action: 'bootstrap' });
    state.teachers = payload.teachers || [];
    state.gradeLabel = payload.gradeLabel || '';
    renderTeachers(state.teachers);
    const teacher = selectedTeacher();
    if (teacher?.url === payload.noticeTeacherUrl) renderNotices(payload.notices || []);
    else await loadTeacherNotices();
    elements.loginView.hidden = true;
    elements.boardView.hidden = false;
    elements.logoutButton.hidden = false;
    elements.password.value = '';
    setMode('board');
    await loadNotificationWatches();
    setStatus(elements.loginStatus, '');
  } catch (error) {
    state.credentials = null;
    setStatus(elements.loginStatus, error instanceof Error ? error.message : '로그인하지 못했습니다.', true);
  } finally {
    setBusy(elements.loginButton, false, '게시판 불러오기', '로그인 중');
  }
});

elements.readingForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  setBusy(elements.readingSearchButton, true, '결과 가져오기', '불러오는 중');
  setStatus(elements.readingStatus, '낭독 결과를 찾는 중입니다.');
  try {
    const payload = await apiRequest({
      action: 'reading',
      round: Number(elements.readingRoundInput.value),
      attempt: elements.readingAttemptSelect.value,
    });
    setStatus(elements.readingStatus, '');
    await renderResult(payload);
  } catch (error) {
    setStatus(elements.readingStatus, error instanceof Error ? error.message : '낭독 결과를 불러오지 못했습니다.', true);
  } finally {
    setBusy(elements.readingSearchButton, false, '결과 가져오기', '불러오는 중');
  }
});

elements.boardModeButton.addEventListener('click', () => setMode('board'));
elements.readingModeButton.addEventListener('click', () => setMode('reading'));
elements.writingModeButton.addEventListener('click', () => setMode('writing'));

elements.searchForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const teacher = selectedTeacher();
  if (!teacher?.url) {
    setStatus(elements.searchStatus, '선생님 게시판을 선택해 주세요.', true);
    return;
  }
  setBusy(elements.searchButton, true, '가져오기', '찾는 중');
  setStatus(elements.searchStatus, '게시물을 찾는 중입니다.');
  elements.allPostsSection.hidden = true;
  try {
    const payload = await apiRequest({
      action: 'search',
      teacherUrl: teacher.url,
      keyword: elements.keywordInput.value.trim(),
      nth: Number(elements.nthInput.value || 1),
    });
    if (payload.browse) {
      elements.resultSection.hidden = true;
      clearImage();
      renderAllPosts(payload.posts || []);
      setStatus(elements.searchStatus, payload.posts?.length ? '' : '게시물이 없습니다.');
      return;
    }
    setStatus(elements.searchStatus, '');
    await renderResult(payload);
  } catch (error) {
    setStatus(elements.searchStatus, error instanceof Error ? error.message : '게시물을 찾지 못했습니다.', true);
  } finally {
    setBusy(elements.searchButton, false, '가져오기', '찾는 중');
  }
});

elements.teacherSelect.addEventListener('change', () => {
  updateSearchLabels();
  elements.allPostsSection.hidden = true;
  elements.resultSection.hidden = true;
  clearImage();
  loadTeacherNotices();
});

elements.keywordInput.addEventListener('input', updateNotifyButtons);
elements.notifyButton.addEventListener('click', () => {
  const active = activeBoardWatch();
  if (active) removeNotification(active, elements.notifyButton);
  else openConsentModal('board');
});
elements.readingNotifyButton.addEventListener('click', () => {
  const active = activeEvaluationWatch('reading');
  if (active) removeNotification(active, elements.readingNotifyButton);
  else openConsentModal('reading');
});
elements.writingNotifyButton.addEventListener('click', () => {
  const active = activeEvaluationWatch('writing');
  if (active) removeNotification(active, elements.writingNotifyButton);
  else openConsentModal('writing');
});
elements.consentCloseButton.addEventListener('click', closeConsentModal);
elements.consentCancelButton.addEventListener('click', closeConsentModal);
elements.consentModal.querySelector('[data-close-consent]').addEventListener('click', closeConsentModal);
elements.consentConfirmButton.addEventListener('click', registerNotification);
elements.pushDelivery.addEventListener('change', updateDeliveryPanel);
elements.mmsDelivery.addEventListener('change', updateDeliveryPanel);
elements.mmsCodeRequestButton.addEventListener('click', requestMmsCode);
elements.mmsCodeConfirmButton.addEventListener('click', confirmMmsCode);
elements.mmsPhone.addEventListener('input', () => {
  const digits = elements.mmsPhone.value.replace(/\D/g, '').slice(0, 11);
  elements.mmsPhone.value = digits.length > 7
    ? `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`
    : digits.length > 3 ? `${digits.slice(0, 3)}-${digits.slice(3)}` : digits;
  state.mmsVerified = false;
});
elements.mmsCode.addEventListener('input', () => {
  elements.mmsCode.value = elements.mmsCode.value.replace(/\D/g, '').slice(0, 4);
});
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && !elements.consentModal.hidden) closeConsentModal();
});

elements.logoutButton.addEventListener('click', () => {
  state.credentials = null;
  state.teachers = [];
  state.current = null;
  state.notices = [];
  state.notificationWatches = [];
  state.noticeVersion += 1;
  clearImage();
  elements.boardView.hidden = true;
  elements.resultSection.hidden = true;
  elements.noticeSection.hidden = true;
  elements.allPostsSection.hidden = true;
  elements.watchSection.hidden = true;
  elements.logoutButton.hidden = true;
  elements.loginView.hidden = false;
  elements.studentId.focus();
});

function downloadCurrentImage() {
  if (!state.imageUrl) return;
  const anchor = document.createElement('a');
  anchor.href = state.imageUrl;
  anchor.download = imageFileName();
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
}

async function shareCurrentImage(fromNotification = false) {
  if (!state.imageBlob) return;
  const file = new File([state.imageBlob], imageFileName(), { type: 'image/png' });
  if (!navigator.share || (navigator.canShare && !navigator.canShare({ files: [file] }))) {
    showToast('이 기기에서는 이미지 파일 공유를 지원하지 않습니다.');
    return;
  }
  try {
    await navigator.share({
      title: state.current?.post?.title || '게시물',
      text: state.current?.post?.title || '',
      files: [file],
    });
  } catch (error) {
    if (error?.name !== 'AbortError') {
      showToast(fromNotification ? '공유 버튼을 눌러 공유 창을 열어 주세요.' : '공유 창을 열지 못했습니다.');
      if (fromNotification) elements.shareImageButton.focus();
    }
  }
}

elements.downloadImageButton.addEventListener('click', downloadCurrentImage);
elements.shareImageButton.addEventListener('click', () => shareCurrentImage(false));

elements.selectAllAttachments.addEventListener('change', () => {
  elements.attachmentList.querySelectorAll('.attachment-check').forEach((checkbox) => {
    checkbox.checked = elements.selectAllAttachments.checked;
  });
});

function appendHiddenField(form, name, value) {
  const input = document.createElement('input');
  input.type = 'hidden';
  input.name = name;
  input.value = String(value ?? '');
  form.append(input);
}

function submitAttachmentDownload(index) {
  state.downloadSequence += 1;
  const sequence = state.downloadSequence;
  const frameName = `attachment-download-${Date.now()}-${sequence}`;
  const frame = document.createElement('iframe');
  frame.name = frameName;
  frame.hidden = true;

  const form = document.createElement('form');
  form.method = 'post';
  form.action = apiUrl('/api/download');
  form.target = frameName;
  form.hidden = true;
  appendHiddenField(form, 'studentId', state.credentials.studentId);
  appendHiddenField(form, 'password', state.credentials.password);
  appendHiddenField(form, 'detailUrl', state.current.post.url);
  appendHiddenField(form, 'index', index);
  document.body.append(frame, form);
  form.submit();
  form.remove();
  window.setTimeout(() => {
    frame.remove();
  }, 120000);
}

elements.downloadAttachmentsButton.addEventListener('click', () => {
  const selected = [...elements.attachmentList.querySelectorAll('.attachment-check:checked')]
    .map((checkbox) => Number(checkbox.value));
  if (!selected.length) {
    setStatus(elements.attachmentStatus, '다운로드할 파일을 선택해 주세요.', true);
    return;
  }
  setStatus(elements.attachmentStatus, `${selected.length}개 파일 다운로드를 시작했습니다.`);
  selected.forEach((index, sequence) => {
    window.setTimeout(() => submitAttachmentDownload(index), sequence * 180);
  });
});

async function openNotificationResult() {
  const params = new URLSearchParams(location.search);
  const id = params.get('notification');
  const token = params.get('token');
  const action = params.get('notificationAction');
  if (!id || !token) return;
  try {
    const response = await fetch(apiUrl(`/api/notification?id=${encodeURIComponent(id)}&token=${encodeURIComponent(token)}`));
    const payload = await response.json();
    if (!response.ok || !payload.ok) throw new Error(payload.message || '알림 결과를 찾지 못했습니다.');
    document.body.classList.add('notification-result');
    elements.loginView.hidden = true;
    elements.boardView.hidden = false;
    elements.logoutButton.hidden = true;
    setMode(['reading', 'writing'].includes(payload.type) ? payload.type : 'board');
    await renderResult(payload);
    if (action === 'download') downloadCurrentImage();
    if (action === 'share') await shareCurrentImage(true);
  } catch (error) {
    showToast(error instanceof Error ? error.message : '알림 결과를 불러오지 못했습니다.');
  }
}

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js', { updateViaCache: 'none' })
    .then((registration) => registration.update())
    .catch(() => {});
}
openNotificationResult();

