<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button default-href="/home"></ion-back-button>
        </ion-buttons>
        <ion-title>Se connecter</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content :fullscreen="true" class="ion-padding">
      <div class="login-container">
        <div class="logo">
          <ion-icon :icon="personCircleOutline" size="large"></ion-icon>
          <h1>Bienvenue</h1>
          <p>Connectez-vous pour signaler des problèmes routiers</p>
        </div>

        <form @submit.prevent="handleLogin">
          <ion-item>
            <ion-label position="stacked">Email</ion-label>
            <ion-input
              v-model="email"
              type="email"
              placeholder="admin@gmail.com"
              
              required
            ></ion-input>
          </ion-item>

          <ion-item>
            <ion-label position="stacked">Mot de passe</ion-label>
            <ion-input
              v-model="password"
              type="password"
              placeholder="test123"
              required
            ></ion-input>
          </ion-item>

          <ion-button
            expand="block"
            type="submit"
            :disabled="isLoading || !email || !password"
            class="login-button"
          >
            <ion-spinner v-if="isLoading" name="crescent"></ion-spinner>
            <span v-else>Se connecter</span>
          </ion-button>

          <ion-text v-if="errorMessage" color="danger" class="error-message">
            <p>{{ errorMessage }}</p>
          </ion-text>
        </form>
      </div>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonItem,
  IonLabel,
  IonInput,
  IonButton,
  IonText,
  IonSpinner,
  IonButtons,
  IonBackButton,
  IonIcon,
  alertController
} from '@ionic/vue';
import { personCircleOutline } from 'ionicons/icons';
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useAuth } from '../composables/useAuth';

const router = useRouter();
const { login } = useAuth();

const email = ref('');
const password = ref('');
const errorMessage = ref('');
const isLoading = ref(false);

async function handleLogin() {
  errorMessage.value = '';
  isLoading.value = true;

  try {
    const result = await login(email.value, password.value);
    
    if (result.success) {
      const alert = await alertController.create({
        header: 'Connexion réussie',
        message: 'Vous pouvez maintenant signaler des problèmes routiers !',
        buttons: ['OK']
      });
      await alert.present();
      await alert.onDidDismiss();
      router.push('/home');
    } else {
      errorMessage.value = 'Email ou mot de passe incorrect';
    }
  } catch (error) {
    errorMessage.value = 'Une erreur est survenue. Veuillez réessayer.';
  } finally {
    isLoading.value = false;
  }
}
</script>+

<style scoped>
.login-container {
  max-width: 480px;
  margin: 0 auto;
  padding: 32px 24px;
}

.logo {
  text-align: center;
  margin-bottom: 48px;
}

.logo ion-icon {
  font-size: 96px;
  color: #FF385C;
  display: block;
  margin: 0 auto 24px;
}

.logo h1 {
  margin: 0 0 12px;
  font-size: 32px;
  font-weight: 700;
  color: #222222;
  letter-spacing: -0.5px;
}

.logo p {
  color: #767676;
  font-size: 16px;
  margin: 0;
  line-height: 1.5;
}

form {
  margin-top: 32px;
}

ion-item {
  --padding-start: 0;
  --inner-padding-end: 0;
  --background: transparent;
  margin-bottom: 24px;
}

ion-label {
  font-size: 15px;
  font-weight: 600;
  color: #222222 !important;
  margin-bottom: 8px;
}

ion-input {
  --background: #FFFFFF;
  --padding-start: 16px;
  --padding-end: 16px;
  border: 1px solid #EBEBEB;
  border-radius: 8px;
  font-size: 16px;
  color: #222222;
  height: 52px;
  transition: border-color 0.2s;
}

ion-input:focus-within {
  --background: #FFFFFF;
  border-color: #222222;
  box-shadow: 0 0 0 1px #222222;
}

.login-button {
  margin-top: 32px;
  height: 52px;
  font-weight: 700;
  font-size: 16px;
  --background: linear-gradient(90deg, #FF385C 0%, #FF5A5F 100%);
  --background-hover: linear-gradient(90deg, #E31C5F 0%, #FF385C 100%);
  --background-activated: #E31C5F;
  --color: #FFFFFF;
  --border-radius: 8px;
  --box-shadow: 0 4px 16px rgba(255, 56, 92, 0.3);
  text-transform: none;
  letter-spacing: 0;
}

.login-button:hover {
  transform: translateY(-1px);
  --box-shadow: 0 6px 20px rgba(255, 56, 92, 0.4);
}

.login-button ion-spinner {
  --color: #FFFFFF;
}

.error-message {
  display: block;
  text-align: center;
  margin-top: 20px;
  animation: shake 0.4s;
}

.error-message p {
  margin: 0;
  padding: 12px 16px;
  background: #FFF5F5;
  border-left: 3px solid #FF385C;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  color: #FF385C;
}

@keyframes shake {
  0%, 100% { transform: translateX(0); }
  25% { transform: translateX(-10px); }
  75% { transform: translateX(10px); }
}

@media (max-width: 768px) {
  .login-container {
    padding: 24px 20px;
  }
  
  .logo h1 {
    font-size: 28px;
  }
}
</style>
