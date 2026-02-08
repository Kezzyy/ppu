export interface User {
    id: string;
    username: string;
    email: string;
    role: string | any; // Allow role object
    avatar_url?: string;
}

export interface AuthState {
    user: User | null;
    token: string | null;
    isAuthenticated: boolean;
    login: (token: string, user: User) => void;
    logout: () => void;
    updateUser: (user: Partial<User>) => void;
}
