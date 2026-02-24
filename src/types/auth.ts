export interface UserProfile {
    uid: string;
    fullName: string;
    email: string;
    phone: string;
    role: 'admin' | 'user' | 'client';
    createdAt: string;
}
