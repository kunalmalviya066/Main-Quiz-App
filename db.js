/*
  db.js
  Client-side "database" layer for Quiz App using localStorage.
  - Exposes a global object `DB` with async methods for CRUD and import/export.
  - Contains an editable `OWNER_SEED` section where the owner can insert initial subjects/topics/questions.

  Usage: include this file via <script src="db.js"></script> before other scripts.

  NOTE: This is a client-only app. Password-hashing uses the Web Crypto API (SHA-256).
*/

(function (global) {
  'use strict';

  const LS_KEY = 'quiz_app_db';
  const DEFAULT_ADMIN_USERNAME = 'admin';
  const DEFAULT_ADMIN_PASSWORD = 'admin123'; // change here for initial seed (it will be hashed on init)

  // -------------------- OWNER SEED (editable) --------------------
  // Put initial subjects / topics / questions here. This is a convenience so owner
  // can edit the seed values before first load. These values are applied only
  // if no existing localStorage DB is found.

  const OWNER_SEED = {
    meta: { version: '1.0', createdAt: Date.now() },
    settings: {
      // adminPasswordHash will be computed on first init. Do not put raw passwords here otherwise.
      adminUsername: DEFAULT_ADMIN_USERNAME,
      // lockout structure
      lockout: { attempts: 0, lockedUntil: null }
    },
    subjects: [
      { id: 'sub_math', name: 'Mathematics', createdAt: Date.now() },
      { id: 'sub_phy', name: 'Physics', createdAt: Date.now() },
      { id: 'sub_gen', name: 'General Knowledge', createdAt: Date.now() }
    ],
    topics: [
      { id: 'top_alg', subjectId: 'sub_math', name: 'Algebra', createdAt: Date.now() },
      { id: 'top_geo', subjectId: 'sub_math', name: 'Geometry', createdAt: Date.now() },
      { id: 'top_mech', subjectId: 'sub_phy', name: 'Mechanics', createdAt: Date.now() },
      { id: 'top_wld', subjectId: 'sub_gen', name: 'World Facts', createdAt: Date.now() }
    ],
    questions: [
      {
        id: 'q_math_1',
        subjectId: 'sub_math',
        topicId: 'top_alg',
        question: 'What is 2 + 2?',
        choices: ['1', '2', '3', '4'],
        answerIndex: 3,
        explanation: 'Basic addition: 2 + 2 = 4.',
        image: null,
        createdAt: Date.now()
      },
      {
        id: 'q_math_2',
        subjectId: 'sub_math',
        topicId: 'top_geo',
        question: 'What is the sum of interior angles of a triangle?',
        choices: ['180°', '90°', '360°', '270°'],
        answerIndex: 0,
        explanation: 'Sum of interior angles of any triangle = 180°.',
        image: null,
        createdAt: Date.now()
      },
      {
        id: 'q_phy_1',
        subjectId: 'sub_phy',
        topicId: 'top_mech',
        question: 'Which law explains inertia?',
        choices: ['Newtons First Law', 'Newton\'s Second Law', 'Law of Gravitation', 'Hooke\'s Law'],
        answerIndex: 0,
        explanation: 'Newton\'s First Law (law of inertia).',
        image: null,
        createdAt: Date.now()
      },
      {
        id: 'q_gen_1',
        subjectId: 'sub_gen',
        topicId: 'top_wld',
        question: 'Who wrote "Hamlet"?',
        choices: ['Charles Dickens', 'William Shakespeare', 'Leo Tolstoy', 'Mark Twain'],
        answerIndex: 1,
        explanation: 'William Shakespeare wrote Hamlet.',
        image: null,
        createdAt: Date.now()
      }
    ],
    userHistory: [],
    dailySeed: { date: null, questionIds: [] }
  };

  // -------------------- Helpers --------------------
  function uid(prefix = '') {
    return prefix + Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-4);
  }

  function now() { return Date.now(); }

  function deepClone(obj) {
    return JSON.parse(JSON.stringify(obj));
  }

  // Simple CSV parser for import (very permissive)
  function parseCSV(text) {
    const lines = text.split(/\r?\n/).filter(Boolean);
    if (!lines.length) return [];
    const headers = lines[0].split(',').map(h => h.trim());
    const rows = lines.slice(1).map(line => {
      // naive split: handle quoted commas
      const cells = line.match(/("[^"]*"|[^,]+)/g).map(c => c.replace(/^"|"$/g, '').trim());
      const obj = {};
      headers.forEach((h, i) => obj[h] = (cells[i] || '').trim());
      return obj;
    });
    return rows;
  }

  // -------------------- Crypto (SHA-256) --------------------
  async function sha256(text) {
    const enc = new TextEncoder();
    const data = enc.encode(text);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  // -------------------- Storage helpers --------------------
  function readRaw() {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch (e) {
      console.error('Failed to parse DB from localStorage', e);
      return null;
    }
  }

  function writeRaw(obj) {
    localStorage.setItem(LS_KEY, JSON.stringify(obj));
    // Dispatch a custom event so other parts of app can listen
    window.dispatchEvent(new CustomEvent('quiz_db_updated', { detail: { timestamp: Date.now() } }));
  }

  // -------------------- Initialization --------------------
  async function ensureInitialized() {
    let db = readRaw();
    if (!db) {
      // copy seed and apply hashed default password
      db = deepClone(OWNER_SEED);
      db.meta = db.meta || {};
      db.meta.createdAt = db.meta.createdAt || now();

      // Hash and store admin password hash in settings
      const pwdHash = await sha256(DEFAULT_ADMIN_PASSWORD);
      db.settings = db.settings || {};
      db.settings.adminPasswordHash = pwdHash;
      db.settings.adminUsername = db.settings.adminUsername || DEFAULT_ADMIN_USERNAME;
      db.settings.lockout = db.settings.lockout || { attempts: 0, lockedUntil: null };

      writeRaw(db);
    }
    return db;
  }

  // -------------------- DB API --------------------
  const API = {
    // initialize must be called before other async ops
    init: async function () {
      const db = await ensureInitialized();
      return deepClone(db);
    },

    getDB: function () {
      const db = readRaw();
      return deepClone(db);
    },

    saveDB: function (dbObj) {
      const toSave = deepClone(dbObj);
      // update meta timestamp
      toSave.meta = toSave.meta || {};
      toSave.meta.updatedAt = now();
      writeRaw(toSave);
    },

    // Settings
    getSettings: function () {
      const db = readRaw();
      return db ? deepClone(db.settings || {}) : null;
    },

    setSettings: function (newSettings) {
      const db = readRaw();
      if (!db) return;
      db.settings = Object.assign({}, db.settings || {}, newSettings);
      writeRaw(db);
    },

    // Admin password verify/update
    verifyAdminPassword: async function (plainText) {
      const db = readRaw();
      if (!db) return false;
      const hash = await sha256(plainText);
      return db.settings && db.settings.adminPasswordHash === hash;
    },

    setAdminPassword: async function (currentPlain, newPlain) {
      const ok = await API.verifyAdminPassword(currentPlain);
      if (!ok) throw new Error('Current password incorrect');
      const newHash = await sha256(newPlain);
      const db = readRaw();
      db.settings.adminPasswordHash = newHash;
      writeRaw(db);
      return true;
    },

    // lockout helpers (admin login attempts)
    registerFailedLoginAttempt: function () {
      const db = readRaw();
      if (!db) return;
      db.settings.lockout = db.settings.lockout || { attempts: 0, lockedUntil: null };
      db.settings.lockout.attempts = (db.settings.lockout.attempts || 0) + 1;
      if (db.settings.lockout.attempts >= 3) {
        // lock for 10 minutes
        db.settings.lockout.lockedUntil = Date.now() + (10 * 60 * 1000);
        db.settings.lockout.attempts = 0; // reset attempts after locking
      }
      writeRaw(db);
    },

    resetLockout: function () {
      const db = readRaw();
      if (!db) return;
      db.settings.lockout = { attempts: 0, lockedUntil: null };
      writeRaw(db);
    },

    isLockedOut: function () {
      const db = readRaw();
      if (!db || !db.settings || !db.settings.lockout) return false;
      const lu = db.settings.lockout.lockedUntil;
      if (!lu) return false;
      if (Date.now() > lu) {
        // expired
        db.settings.lockout.lockedUntil = null;
        writeRaw(db);
        return false;
      }
      return true;
    },

    // Subjects
    listSubjects: function () {
      const db = readRaw();
      return db ? deepClone(db.subjects || []) : [];
    },

    addSubject: function (name) {
      const db = readRaw();
      const id = uid('sub_');
      const subject = { id, name: (name || 'Untitled Subject'), createdAt: now() };
      db.subjects = db.subjects || [];
      db.subjects.push(subject);
      writeRaw(db);
      return deepClone(subject);
    },

    updateSubject: function (id, newName) {
      const db = readRaw();
      db.subjects = db.subjects || [];
      const s = db.subjects.find(x => x.id === id);
      if (!s) throw new Error('Subject not found');
      s.name = newName;
      writeRaw(db);
      return deepClone(s);
    },

    deleteSubject: function (id) {
      const db = readRaw();
      db.subjects = db.subjects || [];
      db.topics = db.topics || [];
      db.questions = db.questions || [];
      db.subjects = db.subjects.filter(s => s.id !== id);
      // cascade delete topics and questions
      const topicIdsToRemove = db.topics.filter(t => t.subjectId === id).map(t => t.id);
      db.topics = db.topics.filter(t => t.subjectId !== id);
      db.questions = db.questions.filter(q => q.subjectId !== id && !topicIdsToRemove.includes(q.topicId));
      writeRaw(db);
      return true;
    },

    // Topics
    listTopics: function (subjectId = null) {
      const db = readRaw();
      const topics = db ? deepClone(db.topics || []) : [];
      if (subjectId) return topics.filter(t => t.subjectId === subjectId);
      return topics;
    },

    addTopic: function (subjectId, name) {
      const db = readRaw();
      const id = uid('top_');
      const topic = { id, subjectId, name: (name || 'Untitled Topic'), createdAt: now() };
      db.topics = db.topics || [];
      db.topics.push(topic);
      writeRaw(db);
      return deepClone(topic);
    },

    updateTopic: function (id, newName) {
      const db = readRaw();
      db.topics = db.topics || [];
      const t = db.topics.find(x => x.id === id);
      if (!t) throw new Error('Topic not found');
      t.name = newName;
      writeRaw(db);
      return deepClone(t);
    },

    deleteTopic: function (id) {
      const db = readRaw();
      db.topics = db.topics || [];
      db.questions = db.questions || [];
      db.topics = db.topics.filter(t => t.id !== id);
      db.questions = db.questions.filter(q => q.topicId !== id);
      writeRaw(db);
      return true;
    },

    // Questions
    listQuestions: function (filters = {}) {
      const db = readRaw();
      if (!db) return [];
      let qs = deepClone(db.questions || []);
      if (filters.subjectId) qs = qs.filter(q => q.subjectId === filters.subjectId);
      if (filters.topicId) qs = qs.filter(q => q.topicId === filters.topicId);
      if (filters.ids && Array.isArray(filters.ids)) qs = qs.filter(q => filters.ids.includes(q.id));
      return qs;
    },

    addQuestion: function (payload) {
      const db = readRaw();
      db.questions = db.questions || [];
      const id = payload.id || uid('q_');
      const q = Object.assign({
        id,
        subjectId: payload.subjectId || null,
        topicId: payload.topicId || null,
        question: payload.question || 'Untitled question',
        choices: payload.choices || [],
        answerIndex: typeof payload.answerIndex === 'number' ? payload.answerIndex : 0,
        explanation: payload.explanation || '',
        image: payload.image || null,
        createdAt: now()
      }, {});
      db.questions.push(q);
      writeRaw(db);
      return deepClone(q);
    },

    updateQuestion: function (id, payload) {
      const db = readRaw();
      db.questions = db.questions || [];
      const q = db.questions.find(x => x.id === id);
      if (!q) throw new Error('Question not found');
      Object.assign(q, payload);
      writeRaw(db);
      return deepClone(q);
    },

    deleteQuestion: function (id) {
      const db = readRaw();
      db.questions = db.questions || [];
      db.questions = db.questions.filter(q => q.id !== id);
      writeRaw(db);
      return true;
    },

    // User History
    recordUserHistory: function (historyObj) {
      const db = readRaw();
      db.userHistory = db.userHistory || [];
      const h = Object.assign({ id: uid('hist_'), timestamp: now() }, historyObj);
      db.userHistory.push(h);
      writeRaw(db);
      return deepClone(h);
    },

    listUserHistory: function () {
      const db = readRaw();
      return db ? deepClone(db.userHistory || []) : [];
    },

    // Daily quiz logic (deterministic per-date random pick)
    generateDailySeedIfNeeded: function (questionCount = 10) {
      const db = readRaw();
      db.dailySeed = db.dailySeed || { date: null, questionIds: [] };
      const today = (new Date()).toISOString().slice(0, 10);
      if (db.dailySeed.date === today && db.dailySeed.questionIds && db.dailySeed.questionIds.length === questionCount) {
        return deepClone(db.dailySeed);
      }
      // build pool from all questions
      const pool = deepClone(db.questions || []);
      // deterministic shuffle using date seed
      const seed = today + (db.meta && db.meta.version ? ('|' + db.meta.version) : '');
      function seededShuffle(array, seedStr) {
        const arr = array.slice();
        let h = 2166136261 >>> 0;
        for (let i = 0; i < seedStr.length; i++) h = Math.imul(h ^ seedStr.charCodeAt(i), 16777619);
        for (let i = arr.length - 1; i > 0; i--) {
          h = Math.imul(h ^ i, 16777619);
          const j = Math.abs(h) % (i + 1);
          [arr[i], arr[j]] = [arr[j], arr[i]];
        }
        return arr;
      }
      const shuffled = seededShuffle(pool, seed);
      const selected = shuffled.slice(0, questionCount).map(q => q.id);
      db.dailySeed = { date: today, questionIds: selected };
      writeRaw(db);
      return deepClone(db.dailySeed);
    },

    getDailyQuestions: function (questionCount = 10) {
      const seed = API.generateDailySeedIfNeeded(questionCount);
      return API.listQuestions({ ids: seed.questionIds });
    },

    // Export / Import JSON
    exportJSON: function () {
      const db = readRaw();
      return JSON.stringify(db || {}, null, 2);
    },

    importJSON: function (jsonText, options = { overwrite: false }) {
      let parsed;
      try {
        parsed = JSON.parse(jsonText);
      } catch (e) {
        throw new Error('Invalid JSON');
      }
      if (options.overwrite) {
        writeRaw(parsed);
        return true;
      }
      // merge: append subjects/topics/questions that don't exist (by id)
      const db = readRaw() || {};
      db.subjects = db.subjects || [];
      db.topics = db.topics || [];
      db.questions = db.questions || [];
      // add subjects
      (parsed.subjects || []).forEach(s => {
        if (!db.subjects.find(x => x.id === s.id)) db.subjects.push(s);
      });
      (parsed.topics || []).forEach(t => {
        if (!db.topics.find(x => x.id === t.id)) db.topics.push(t);
      });
      (parsed.questions || []).forEach(q => {
        if (!db.questions.find(x => x.id === q.id)) db.questions.push(q);
      });
      writeRaw(db);
      return true;
    },

    // CSV import/export for questions
    importQuestionsFromCSV: function (csvText, options = { createMissingSubjects: true }) {
      const rows = parseCSV(csvText);
      const db = readRaw();
      db.subjects = db.subjects || [];
      db.topics = db.topics || [];
      db.questions = db.questions || [];

      rows.forEach(r => {
        // expected headers: subject,topic,question,choice1,choice2,choice3,choice4,answerIndex,explanation,image
        const subjName = r.subject || 'Default';
        let subj = db.subjects.find(s => s.name.toLowerCase() === subjName.toLowerCase());
        if (!subj && options.createMissingSubjects) {
          subj = { id: uid('sub_'), name: subjName, createdAt: now() };
          db.subjects.push(subj);
        }
        const topicName = r.topic || 'General';
        let topic = db.topics.find(t => t.name.toLowerCase() === topicName.toLowerCase() && t.subjectId === subj.id);
        if (!topic && options.createMissingSubjects) {
          topic = { id: uid('top_'), name: topicName, subjectId: subj.id, createdAt: now() };
          db.topics.push(topic);
        }
        const choices = [];
        for (let i = 1; i <= 8; i++) {
          const c = r['choice' + i] || r['choice' + i.toString()];
          if (c) choices.push(c);
        }
        // fallback to choice1..4
        if (!choices.length) {
          for (let i = 1; i <= 4; i++) if (r['choice' + i]) choices.push(r['choice' + i]);
        }
        const ansIdx = (r.answerIndex && !isNaN(Number(r.answerIndex))) ? Number(r.answerIndex) : 0;
        const q = {
          id: uid('q_'),
          subjectId: subj.id,
          topicId: topic.id,
          question: r.question || 'Untitled',
          choices: choices.length ? choices : ['True', 'False'],
          answerIndex: ansIdx,
          explanation: r.explanation || '',
          image: r.image || null,
          createdAt: now()
        };
        db.questions.push(q);
      });

      writeRaw(db);
      return true;
    },

    exportQuestionsToCSV: function (filters = {}) {
      const qs = API.listQuestions(filters);
      const headers = ['subject', 'topic', 'question', 'choices', 'answerIndex', 'explanation', 'image'];
      const db = readRaw();
      const lines = [headers.join(',')];
      qs.forEach(q => {
        const subj = (db.subjects || []).find(s => s.id === q.subjectId) || { name: '' };
        const topic = (db.topics || []).find(t => t.id === q.topicId) || { name: '' };
        const choices = q.choices.map(c => '"' + c.replace(/"/g, '""') + '"').join(';');
        const row = [subj.name, topic.name, '"' + q.question.replace(/"/g, '""') + '"', '"' + choices + '"', q.answerIndex, '"' + (q.explanation || '').replace(/"/g, '""') + '"', '"' + (q.image || '') + '"'];
        lines.push(row.join(','));
      });
      return lines.join('\n');
    },

    // Utility: full DB reset (dangerous)
    resetDBToSeed: async function () {
      const db = deepClone(OWNER_SEED);
      const pwdHash = await sha256(DEFAULT_ADMIN_PASSWORD);
      db.settings = db.settings || {};
      db.settings.adminPasswordHash = pwdHash;
      db.settings.lockout = { attempts: 0, lockedUntil: null };
      writeRaw(db);
      return true;
    },

    // Full DB clear (remove localStorage entry)
    clearDB: function () {
      localStorage.removeItem(LS_KEY);
      window.dispatchEvent(new CustomEvent('quiz_db_cleared', { detail: { timestamp: Date.now() } }));
    }
  };

  // Expose API
  global.DB = API;

  // Auto-init on load (so scripts can call DB.init() or DB.getDB())
  // Note: DB.init() must be awaited if you rely on hashed password being set first.

})(window);
