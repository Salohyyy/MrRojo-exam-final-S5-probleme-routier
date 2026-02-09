import { ref, computed, onMounted } from 'vue';
import { authService } from '../services/auth.service';
import { useNotifications } from './useNotifications';
import type { User } from 'firebase/auth';

// État partagé entre tous les composants (singleton)
const currentUser = ref<User | null>(null);
const isLoading = ref(true);
let isInitialized = false;

export function useAuth() {
  const isAuthenticated = computed(() => currentUser.value !== null);
  const { startListening, stopListening } = useNotifications();

  // Initialiser une seule fois
  if (!isInitialized) {
    authService.onAuthStateChanged((user) => {
      currentUser.value = user;
      isLoading.value = false;

      // Démarrer l'écoute des notifications si l'utilisateur est connecté
      if (user) {
        startListening(user.uid);
      }
    });
    isInitialized = true;
  }

  async function login(email: string, password: string) {
    try {
      const user = await authService.login(email, password);
      currentUser.value = user;

      // Démarrer l'écoute en temps réel des signalements
      startListening(user.uid);

      return { success: true, user };
    } catch (error: any) {
      console.error('Login error:', error);
      return { success: false, error: error.message };
    }
  }

  async function logout() {
    try {
      // Arrêter l'écoute des notifications AVANT le logout
      stopListening();

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
