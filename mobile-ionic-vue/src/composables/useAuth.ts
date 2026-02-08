import { ref, computed, onMounted } from 'vue';
import { authService } from '../services/auth.service';
import type { User } from 'firebase/auth';

// État partagé entre tous les composants (singleton)
const currentUser = ref<User | null>(null);
const isLoading = ref(true);
let isInitialized = false;

export function useAuth() {
  const isAuthenticated = computed(() => currentUser.value !== null);

  // Initialiser une seule fois
  if (!isInitialized) {
    authService.onAuthStateChanged((user) => {
      currentUser.value = user;
      isLoading.value = false;
    });
    isInitialized = true;
  }

  async function login(email: string, password: string) {
    try {
      const user = await authService.login(email, password);
      currentUser.value = user;
      return { success: true, user };
    } catch (error: any) {
      console.error('Login error:', error);
      return { success: false, error: error.message };
    }
  }

  async function logout() {
    try {
      await authService.logout();
      currentUser.value = null;
      return { success: true };
    } catch (error: any) {
      console.error('Logout error:', error);
      return { success: false, error: error.message };
    }
  }

  return {
    currentUser,
    isAuthenticated,
    isLoading,
    login,
    logout
  };
}
