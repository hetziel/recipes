import { ref, readonly } from 'vue'
import {
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut,
    onAuthStateChanged,
    type User
} from 'firebase/auth'
import { doc, getDoc, setDoc } from 'firebase/firestore'
import { auth, db } from '../firebase.config'
import type { UserProfile } from '../types/auth'

const currentUser = ref<User | null>(null)
const userProfile = ref<UserProfile | null>(null)
const isLoading = ref(true)

async function fetchUserProfile(uid: string) {
    try {
        const docRef = doc(db, 'users', uid)
        const docSnap = await getDoc(docRef)
        if (docSnap.exists()) {
            userProfile.value = docSnap.data() as UserProfile
        } else {
            console.warn('No such user profile! Creating a default one...')
            const defaultProfile: UserProfile = {
                uid: uid,
                email: currentUser.value?.email || '',
                fullName: 'Usuario Sin Nombre',
                phone: '',
                role: 'user',
                createdAt: new Date().toISOString()
            }
            await setDoc(docRef, defaultProfile)
            userProfile.value = defaultProfile
        }
    } catch (error) {
        console.error('Error fetching user profile:', error)
        userProfile.value = null
    }
}

// Initialize Auth Observer ONCE at module level
onAuthStateChanged(auth, async (user) => {
    console.log('Auth state changed:', user?.email || 'Logged out')
    isLoading.value = true
    try {
        currentUser.value = user
        if (user) {
            await fetchUserProfile(user.uid)
        } else {
            userProfile.value = null
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
                role: 'user', // Default role
                createdAt: new Date().toISOString()
            }

            await setDoc(doc(db, 'users', user.uid), profile)
            userProfile.value = profile
            return { user, error: null }
        } catch (error: any) {
            return { user: null, error: error.message }
        }
    }

    async function login(email: string, password: string) {
        try {
            const userCredential = await signInWithEmailAndPassword(auth, email, password)
            await fetchUserProfile(userCredential.user.uid)
            return { user: userCredential.user, error: null }
        } catch (error: any) {
            return { user: null, error: error.message }
        }
    }

    async function logout() {
        try {
            await signOut(auth)
            userProfile.value = null
            currentUser.value = null
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
