/**
 * state.js — 전역 상태 단일 출처
 */

const STATE = {
  level: 'beginner',
  topic: 'Daily Life',
  sessionStarted: false,
  isLoading: false,
  history: [],
  stats: { words:0, corrections:0, turns:0, lastScore:null },
  corrections: [],
  /** vocab item: { word, meaning, meaning_korean } */
  vocab: [],
  /** 세션 카운터 (새 대화 시작 시 증가) */
  sessionId: 1,
};
