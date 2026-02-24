import { ref, readonly } from 'vue'
import {
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut,
    onAuthStateChanged,
    type User
} from 'firebase/auth'
import { doc, setDoc, onSnapshot } from 'firebase/firestore'
import type { Unsubscribe } from 'firebase/firestore'
import { auth, db } from '../firebase.config'
import type { UserProfile } from '../types/auth'

const currentUser = ref<User | null>(null)
const userProfile = ref<UserProfile | null>(null)
const isLoading = ref(true)

let profileUnsubscribe: Unsubscribe | null = null

function subscribeToUserProfile(uid: string) {
    if (profileUnsubscribe) profileUnsubscribe()

    const docRef = doc(db, 'users', uid)
    profileUnsubscribe = onSnapshot(docRef, (docSnap) => {
        if (docSnap.exists()) {
            userProfile.value = docSnap.data() as UserProfile
        } else {
            // Create default profile if it doesn't exist
            // Note: ideally check if we are already creating it to avoid loop
            const defaultProfile: UserProfile = {
                uid: uid,
                email: currentUser.value?.email || '',
                fullName: 'Usuario Sin Nombre',
                phone: '',
                role: 'user',
                createdAt: new Date().toISOString()
            }
            // We set it but don't await because onSnapshot will fire again
            setDoc(docRef, defaultProfile).catch(err => console.error("Error creating default profile", err))
        }
    }, (error) => {
        console.error('Error in user profile snapshot:', error)
    })
}

// Initialize Auth Observer ONCE at module level
onAuthStateChanged(auth, async (user) => {
    console.log('Auth state changed:', user?.email || 'Logged out')
    isLoading.value = true
    try {
        currentUser.value = user
        if (user) {
            subscribeToUserProfile(user.uid)
        } else {
            userProfile.value = null
            if (profileUnsubscribe) {
                profileUnsubscribe()
                profileUnsubscribe = null
            }
        }
    } catch (e) {
        console.error('Error in auth observer:', e)
    } finally {
        isLoading.value = false
    }
})

// Singleton state to be shared across the app
export function useAuth() {
    // Helper to wait until isLoading is false
    async function untilReady() {
        if (!isLoading.value) return
        return new Promise((resolve) => {
            const check = setInterval(() => {
                if (!isLoading.value) {
                    clearInterval(check)
                    resolve(true)
                }
            }, 100)
        })
    }

    async function register(email: string, password: string, extraData: { fullName: string, phone: string }) {
        try {
            const userCredential = await createUserWithEmailAndPassword(auth, email, password)
            const user = userCredential.user

            const profile: UserProfile = {
                uid: user.uid,
                email: user.email || '',
                fullName: extraData.fullName,
                phone: extraData.phone,
                role: 'client', // Default role for new signups
                createdAt: new Date().toISOString()
            }

            await setDoc(doc(db, 'users', user.uid), profile)
            // No need to set userProfile.value manually, observer will pick it up
            return { user, error: null }
        } catch (error: any) {
            return { user: null, error: error.message }
        }
    }

    async function login(email: string, password: string) {
        try {
            const userCredential = await signInWithEmailAndPassword(auth, email, password)
            // Observer handles profile fetching
            return { user: userCredential.user, error: null }
        } catch (error: any) {
            return { user: null, error: error.message }
        }
    }

    async function logout() {
        try {
            await signOut(auth)
            // Observer handles state cleanup
        } catch (error) {
            console.error('Error signing out:', error)
        }
    }

    return {
        currentUser: readonly(currentUser),
        userProfile: readonly(userProfile),
        isLoading: readonly(isLoading),
        register,
        login,
        logout,
        untilReady,
        isAdmin: () => userProfile.value?.role === 'admin',
        isUser: () => userProfile.value?.role === 'user'
    }
}
