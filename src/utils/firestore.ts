import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  query, 
  orderBy, 
  deleteDoc,
  serverTimestamp 
} from 'firebase/firestore';
import { auth, db } from '../firebase';
import { JournalSession, ThreadTrackingState, MoodCorrelationReport, PersonalGoal, CustomFolder, VisionCard } from '../types';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

/**
 * Strict Undefined-Stripping Utility
 * Deeply removes all undefined keys to prevent Firestore SDK validation errors
 */
export function sanitizePayload<T>(obj: T): T {
  return JSON.parse(
    JSON.stringify(obj, (key, value) => {
      if (value === undefined) {
        return null;
      }
      return value;
    })
  );
}

/**
 * Saves or updates a journal reflection session for the authenticated user
 * Stored isolated under /users/{userId}/interactions/{sessionId}
 */
export async function saveJournalSession(userId: string, session: JournalSession): Promise<void> {
  if (!userId) throw new Error('User ID is required to persist journal entry.');
  
  const sanitized = sanitizePayload({
    ...session,
    userId,
    updatedAt: new Date().toISOString(),
    _serverTimestamp: serverTimestamp(),
  });

  const sessionPath = `users/${userId}/interactions/${session.id}`;
  try {
    const sessionRef = doc(db, 'users', userId, 'interactions', session.id);
    await setDoc(sessionRef, sanitized, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, sessionPath);
  }
}

/**
 * Fetches all reflection sessions for a specific user, ordered by updatedAt desc
 */
export async function fetchUserSessions(userId: string): Promise<JournalSession[]> {
  if (!userId) return [];
  
  const collectionPath = `users/${userId}/interactions`;
  try {
    const userInteractionsRef = collection(db, 'users', userId, 'interactions');
    let snapshot;
    try {
      const q = query(userInteractionsRef, orderBy('updatedAt', 'desc'));
      snapshot = await getDocs(q);
    } catch (orderErr) {
      console.warn('Could not query with orderBy(updatedAt), falling back to base collection query:', orderErr);
      snapshot = await getDocs(userInteractionsRef);
    }
    
    const sessions: JournalSession[] = [];
    snapshot.forEach((docSnap) => {
      const data = docSnap.data();
      sessions.push({
        id: docSnap.id,
        userId: data.userId || userId,
        title: data.title || 'Untitled Reflection',
        createdAt: data.createdAt || new Date().toISOString(),
        updatedAt: data.updatedAt || new Date().toISOString(),
        messages: Array.isArray(data.messages) ? data.messages : [],
        mood: data.mood || undefined,
        tags: Array.isArray(data.tags) ? data.tags : [],
        summary: data.summary || undefined,
        keyInsights: Array.isArray(data.keyInsights) ? data.keyInsights : undefined,
        sentiment: data.sentiment || undefined,
        actionItems: Array.isArray(data.actionItems) ? data.actionItems : undefined,
        structuredTasks: Array.isArray(data.structuredTasks) ? data.structuredTasks : undefined,
        isArchived: Boolean(data.isArchived),
        isStarred: Boolean(data.isStarred),
        mediaRating: data.mediaRating,
        mediaAuthorDirector: data.mediaAuthorDirector,
        mediaStatus: data.mediaStatus,
        projectMilestone: data.projectMilestone,
        studyTopic: data.studyTopic,
      });
    });
    // In-memory sort fallback ensures newest reflections are first even if unindexed
    sessions.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    return sessions;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, collectionPath);
  }
}

/**
 * Deletes a reflection session
 */
export async function deleteJournalSession(userId: string, sessionId: string): Promise<void> {
  if (!userId || !sessionId) return;
  const sessionPath = `users/${userId}/interactions/${sessionId}`;
  try {
    const sessionRef = doc(db, 'users', userId, 'interactions', sessionId);
    await deleteDoc(sessionRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, sessionPath);
  }
}

/**
 * Saves user theme preferences to Firestore
 */
export async function saveUserTheme(userId: string, theme: any): Promise<void> {
  if (!userId) return;
  try {
    const themeRef = doc(db, 'users', userId, 'settings', 'theme');
    await setDoc(themeRef, sanitizePayload(theme), { merge: true });
  } catch (err) {
    console.warn('Could not save theme to Firestore:', err);
  }
}

/**
 * Fetches user theme preferences from Firestore
 */
export async function fetchUserTheme(userId: string): Promise<any | null> {
  if (!userId) return null;
  try {
    const themeRef = doc(db, 'users', userId, 'settings', 'theme');
    const snap = await getDoc(themeRef);
    if (snap.exists()) {
      return snap.data();
    }
  } catch (err) {
    console.warn('Could not fetch theme from Firestore:', err);
  }
  return null;
}

/**
 * Persists user's thread continuation tracking state (dismissed, continued, resolved)
 * Stored under /users/{userId}/settings/unfinished_threads
 */
export async function saveThreadTrackingState(
  userId: string, 
  stateOrThreadId: ThreadTrackingState | string, 
  status?: 'dismissed' | 'continued' | 'resolved'
): Promise<void> {
  if (!userId) return;
  try {
    const threadTrackingRef = doc(db, 'users', userId, 'settings', 'unfinished_threads');
    
    if (typeof stateOrThreadId === 'string' && status) {
      // Single thread update
      const existing = await fetchThreadTrackingState(userId) || {
        dismissedThreadIds: [],
        continuedThreadIds: [],
        resolvedThreadIds: [],
      };
      
      const threadId = stateOrThreadId;
      const dismissed = new Set(existing.dismissedThreadIds || []);
      const continued = new Set(existing.continuedThreadIds || []);
      const resolved = new Set(existing.resolvedThreadIds || []);

      if (status === 'dismissed') dismissed.add(threadId);
      if (status === 'continued') continued.add(threadId);
      if (status === 'resolved') resolved.add(threadId);

      await setDoc(threadTrackingRef, sanitizePayload({
        dismissedThreadIds: Array.from(dismissed),
        continuedThreadIds: Array.from(continued),
        resolvedThreadIds: Array.from(resolved),
        [threadId]: { status, updatedAt: new Date().toISOString() },
        lastCheckedAt: new Date().toISOString(),
      }), { merge: true });
    } else {
      const state = stateOrThreadId as ThreadTrackingState;
      await setDoc(threadTrackingRef, sanitizePayload({
        ...state,
        lastCheckedAt: new Date().toISOString(),
      }), { merge: true });
    }
  } catch (err) {
    console.warn('Could not save thread tracking state to Firestore:', err);
  }
}

/**
 * Fetches user's thread continuation tracking state from Firestore
 */
export async function fetchThreadTrackingState(userId: string): Promise<(ThreadTrackingState & Record<string, any>) | null> {
  if (!userId) return null;
  try {
    const threadTrackingRef = doc(db, 'users', userId, 'settings', 'unfinished_threads');
    const snap = await getDoc(threadTrackingRef);
    if (snap.exists()) {
      const data = snap.data();
      return {
        ...data,
        dismissedThreadIds: Array.isArray(data.dismissedThreadIds) ? data.dismissedThreadIds : [],
        continuedThreadIds: Array.isArray(data.continuedThreadIds) ? data.continuedThreadIds : [],
        resolvedThreadIds: Array.isArray(data.resolvedThreadIds) ? data.resolvedThreadIds : [],
        lastCheckedAt: data.lastCheckedAt || undefined,
      };
    }
  } catch (err) {
    console.warn('Could not fetch thread tracking state from Firestore:', err);
  }
  return null;
}

/**
 * Persists user's Mood + Context Correlation Report
 */
export async function saveMoodCorrelationReport(userId: string, report: MoodCorrelationReport): Promise<void> {
  if (!userId || !report) return;
  try {
    const reportRef = doc(db, 'users', userId, 'settings', 'mood_correlations');
    await setDoc(reportRef, sanitizePayload({
      ...report,
      savedAt: new Date().toISOString(),
    }), { merge: true });
  } catch (err) {
    console.warn('Could not save mood correlation report to Firestore:', err);
  }
}

/**
 * Fetches user's Mood + Context Correlation Report
 */
export async function fetchMoodCorrelationReport(userId: string): Promise<MoodCorrelationReport | null> {
  if (!userId) return null;
  try {
    const reportRef = doc(db, 'users', userId, 'settings', 'mood_correlations');
    const snap = await getDoc(reportRef);
    if (snap.exists()) {
      return snap.data() as MoodCorrelationReport;
    }
  } catch (err) {
    console.warn('Could not fetch mood correlation report from Firestore:', err);
  }
  return null;
}

export interface DailyMoodRecord {
  mood: 'Happy' | 'Calm' | 'Neutral' | 'Low';
  date: string;
  timestamp: string;
}

/**
 * Saves a daily mood check-in to Firestore under /users/{userId}/settings/daily_moods
 */
export async function saveDailyMood(
  userId: string, 
  date: string, 
  mood: 'Happy' | 'Calm' | 'Neutral' | 'Low'
): Promise<void> {
  if (!userId || !date) return;
  try {
    const moodsRef = doc(db, 'users', userId, 'settings', 'daily_moods');
    await setDoc(moodsRef, sanitizePayload({
      [date]: {
        mood,
        date,
        timestamp: new Date().toISOString(),
      }
    }), { merge: true });
  } catch (err) {
    console.warn('Could not save daily mood to Firestore:', err);
  }
}

/**
 * Fetches all daily mood check-ins for a user
 */
export async function fetchDailyMoods(userId: string): Promise<Record<string, DailyMoodRecord>> {
  if (!userId) return {};
  try {
    const moodsRef = doc(db, 'users', userId, 'settings', 'daily_moods');
    const snap = await getDoc(moodsRef);
    if (snap.exists()) {
      return snap.data() as Record<string, DailyMoodRecord>;
    }
  } catch (err) {
    console.warn('Could not fetch daily moods from Firestore:', err);
  }
  return {};
}

/**
 * Fetches all personal goals for a user
 */
export async function fetchPersonalGoals(userId: string): Promise<PersonalGoal[]> {
  if (!userId) return [];
  try {
    const goalsRef = collection(db, 'users', userId, 'goals');
    const q = query(goalsRef, orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);
    const goals: PersonalGoal[] = [];
    snapshot.forEach((docSnap) => {
      goals.push(docSnap.data() as PersonalGoal);
    });
    return goals;
  } catch (err) {
    console.warn('Could not fetch goals from Firestore:', err);
    return [];
  }
}

/**
 * Saves or updates a personal goal
 */
export async function savePersonalGoal(userId: string, goal: PersonalGoal): Promise<void> {
  if (!userId || !goal || !goal.id) return;
  const goalPath = `users/${userId}/goals/${goal.id}`;
  try {
    const goalRef = doc(db, 'users', userId, 'goals', goal.id);
    await setDoc(goalRef, sanitizePayload({
      ...goal,
      userId,
      updatedAt: new Date().toISOString(),
    }), { merge: true });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, goalPath);
  }
}

/**
 * Deletes a personal goal
 */
export async function deletePersonalGoal(userId: string, goalId: string): Promise<void> {
  if (!userId || !goalId) return;
  const goalPath = `users/${userId}/goals/${goalId}`;
  try {
    const goalRef = doc(db, 'users', userId, 'goals', goalId);
    await deleteDoc(goalRef);
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, goalPath);
  }
}

/**
 * Persists user's custom dashboard folders/cards
 */
export async function saveCustomFolders(userId: string, folders: CustomFolder[]): Promise<void> {
  if (!userId) return;
  try {
    const foldersRef = doc(db, 'users', userId, 'settings', 'custom_folders');
    await setDoc(foldersRef, sanitizePayload({
      folders,
      updatedAt: new Date().toISOString(),
    }), { merge: true });
  } catch (err) {
    console.warn('Could not save custom folders to Firestore:', err);
  }
}

/**
 * Fetches user's custom dashboard folders/cards
 */
export async function fetchCustomFolders(userId: string): Promise<CustomFolder[]> {
  if (!userId) return [];
  try {
    const foldersRef = doc(db, 'users', userId, 'settings', 'custom_folders');
    const snap = await getDoc(foldersRef);
    if (snap.exists() && Array.isArray(snap.data()?.folders)) {
      return snap.data().folders as CustomFolder[];
    }
  } catch (err) {
    console.warn('Could not fetch custom folders from Firestore:', err);
  }
  return [];
}

/**
 * Fetches all vision cards for a user
 * Stored isolated under /users/{userId}/vision_cards/{cardId}
 */
export async function fetchVisionCards(userId: string): Promise<VisionCard[]> {
  if (!userId) return [];
  try {
    const visionRef = collection(db, 'users', userId, 'vision_cards');
    let snapshot;
    try {
      const q = query(visionRef, orderBy('createdAt', 'desc'));
      snapshot = await getDocs(q);
    } catch (orderErr) {
      console.warn('Could not fetch vision cards with orderBy(createdAt), falling back to base collection:', orderErr);
      snapshot = await getDocs(visionRef);
    }
    const cards: VisionCard[] = [];
    snapshot.forEach((docSnap) => {
      cards.push(docSnap.data() as VisionCard);
    });
    cards.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return cards;
  } catch (err) {
    console.warn('Could not fetch vision cards from Firestore:', err);
    return [];
  }
}

/**
 * Saves or updates a vision card
 */
export async function saveVisionCard(userId: string, card: VisionCard): Promise<void> {
  if (!userId || !card || !card.id) return;
  const cardPath = `users/${userId}/vision_cards/${card.id}`;
  try {
    const cardRef = doc(db, 'users', userId, 'vision_cards', card.id);
    await setDoc(cardRef, sanitizePayload({
      ...card,
      userId,
      updatedAt: new Date().toISOString(),
    }), { merge: true });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, cardPath);
  }
}

/**
 * Deletes a vision card
 */
export async function deleteVisionCard(userId: string, cardId: string): Promise<void> {
  if (!userId || !cardId) return;
  const cardPath = `users/${userId}/vision_cards/${cardId}`;
  try {
    const cardRef = doc(db, 'users', userId, 'vision_cards', cardId);
    await deleteDoc(cardRef);
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, cardPath);
  }
}


