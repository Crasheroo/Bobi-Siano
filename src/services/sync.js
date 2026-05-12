import { doc, getDoc, setDoc } from 'firebase/firestore'
import { db } from './firebase.js'

const SKIP_KEYS = new Set(['user', 'syncing'])

export function extractSyncData(state) {
  const result = {}
  for (const [key, value] of Object.entries(state)) {
    if (!SKIP_KEYS.has(key) && typeof value !== 'function') {
      result[key] = value
    }
  }
  return result
}

export async function downloadUserData(uid) {
  const snap = await getDoc(doc(db, 'users', uid))
  return snap.exists() ? snap.data() : null
}

export async function uploadUserData(uid, data) {
  await setDoc(doc(db, 'users', uid), data)
}
