export interface PhotoData {
  dataUrl: string;
  webPath?: string;
}

export class PhotoService {

  /** Vérifie si on est sur une app native (Android/iOS) */
  private async isNative(): Promise<boolean> {
    try {
      const { Capacitor } = await import('@capacitor/core');
      return Capacitor.isNativePlatform();
    } catch {
      return false;
    }
  }

  /**
   * Prendre une photo avec la caméra
   * - Mobile natif (APK) → Capacitor Camera plugin
   * - Navigateur web (PC/mobile) → getUserMedia → fallback file input capture
   */
  async takePhoto(): Promise<PhotoData | null> {
    const native = await this.isNative();

    // Sur mobile natif : utiliser Capacitor Camera directement
    if (native) {
      try {
        const { Camera, CameraResultType, CameraSource } = await import('@capacitor/camera');
        const photo = await Camera.getPhoto({
          quality: 50,
          allowEditing: false,
          resultType: CameraResultType.DataUrl,
          source: CameraSource.Camera,
          width: 400,
          height: 400
        });
        if (photo.dataUrl) {
          return { dataUrl: photo.dataUrl, webPath: photo.webPath };
        }
      } catch (err) {
        console.warn('Capacitor Camera erreur:', err);
      }
      return null;
    }

    // Sur navigateur web : getUserMedia
    try {
      const result = await this.openWebCamera();
      if (result) return result;
    } catch (err) {
      console.warn('getUserMedia erreur:', err);
    }

    // Dernier fallback : input file avec capture
    return this.openFilePickerWithCapture();
  }

  /**
   * Choisir une photo depuis la galerie
   * - Mobile natif (APK) → Capacitor Camera plugin (galerie)
   * - Navigateur web (PC/mobile) → file input
   */
  async pickPhoto(): Promise<PhotoData | null> {
    const native = await this.isNative();

    // Sur mobile natif
    if (native) {
      try {
        const { Camera, CameraResultType, CameraSource } = await import('@capacitor/camera');
        const photo = await Camera.getPhoto({
          quality: 50,
          allowEditing: false,
          resultType: CameraResultType.DataUrl,
          source: CameraSource.Photos,
          width: 400,
          height: 400
        });
        if (photo.dataUrl) {
          return { dataUrl: photo.dataUrl, webPath: photo.webPath };
        }
      } catch (err) {
        console.warn('Capacitor Photos erreur:', err);
      }
      return null;
    }

    // Sur navigateur web : file input
    return this.openFilePicker();
  }

  /**
   * Ouvrir la caméra via getUserMedia sur navigateur web
   */
  private openWebCamera(): Promise<PhotoData | null> {
    return new Promise((resolve) => {
      // Créer un overlay avec vidéo et bouton capture
      const overlay = document.createElement('div');
      overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:#000;z-index:99999;display:flex;flex-direction:column;align-items:center;justify-content:center;';

      const video = document.createElement('video');
      video.style.cssText = 'width:100%;max-height:80vh;object-fit:contain;';
      video.setAttribute('autoplay', '');
      video.setAttribute('playsinline', '');

      const btnContainer = document.createElement('div');
      btnContainer.style.cssText = 'display:flex;gap:20px;margin-top:16px;';

      const captureBtn = document.createElement('button');
      captureBtn.textContent = '📸 Capturer';
      captureBtn.style.cssText = 'padding:12px 32px;font-size:18px;border-radius:50px;border:none;background:#FF385C;color:white;cursor:pointer;font-weight:600;';

      const cancelBtn = document.createElement('button');
      cancelBtn.textContent = '✕ Annuler';
      cancelBtn.style.cssText = 'padding:12px 32px;font-size:18px;border-radius:50px;border:none;background:#484848;color:white;cursor:pointer;font-weight:600;';

      btnContainer.appendChild(captureBtn);
      btnContainer.appendChild(cancelBtn);
      overlay.appendChild(video);
      overlay.appendChild(btnContainer);
      document.body.appendChild(overlay);

      let stream: MediaStream | null = null;

      const cleanup = () => {
        if (stream) {
          stream.getTracks().forEach(t => t.stop());
        }
        overlay.remove();
      };

      navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment', width: { ideal: 800 }, height: { ideal: 800 } } })
        .then(s => {
          stream = s;
          video.srcObject = s;
        })
        .catch(() => {
          cleanup();
          // Fallback vers sélecteur de fichier si pas de caméra
          this.openFilePicker().then(resolve);
        });

      captureBtn.onclick = async () => {
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d')!;
        ctx.drawImage(video, 0, 0);

        // Compresser
        let w = canvas.width;
        let h = canvas.height;
        if (w > 400 || h > 400) {
          const ratio = Math.min(400 / w, 400 / h);
          w = Math.round(w * ratio);
          h = Math.round(h * ratio);
          const small = document.createElement('canvas');
          small.width = w;
          small.height = h;
          small.getContext('2d')!.drawImage(canvas, 0, 0, w, h);
          const dataUrl = small.toDataURL('image/jpeg', 0.5);
          cleanup();
          resolve({ dataUrl });
        } else {
          const dataUrl = canvas.toDataURL('image/jpeg', 0.5);
          cleanup();
          resolve({ dataUrl });
        }
      };

      cancelBtn.onclick = () => {
        cleanup();
        resolve(null);
      };
    });
  }

  /**
   * Ouvrir le sélecteur de fichier pour choisir une image
   */
  private openFilePicker(): Promise<PhotoData | null> {
    return new Promise((resolve) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';

      input.onchange = async (e: any) => {
        const file = e.target.files[0];
        if (!file) {
          resolve(null);
          return;
        }

        try {
          const compressed = await this.compressImage(file, 400, 0.5);
          resolve({
            dataUrl: compressed,
            webPath: URL.createObjectURL(file)
          });
        } catch {
          const reader = new FileReader();
          reader.onload = (evt: any) => resolve({ dataUrl: evt.target.result });
          reader.readAsDataURL(file);
        }
      };

      input.oncancel = () => resolve(null);
      input.click();
    });
  }

  /**
   * Ouvrir le sélecteur de fichier avec capture (ouvre caméra sur mobile)
   */
  private openFilePickerWithCapture(): Promise<PhotoData | null> {
    return new Promise((resolve) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.setAttribute('capture', 'environment');

      input.onchange = async (e: any) => {
        const file = e.target.files[0];
        if (!file) {
          resolve(null);
          return;
        }

        try {
          const compressed = await this.compressImage(file, 400, 0.5);
          resolve({
            dataUrl: compressed,
            webPath: URL.createObjectURL(file)
          });
        } catch {
          const reader = new FileReader();
          reader.onload = (evt: any) => resolve({ dataUrl: evt.target.result });
          reader.readAsDataURL(file);
        }
      };

      input.oncancel = () => resolve(null);
      input.click();
    });
  }

  /**
   * Compresser une image via canvas
   */
  private compressImage(file: File, maxSize: number, quality: number): Promise<string> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let w = img.width;
        let h = img.height;

        // Redimensionner si trop grand
        if (w > maxSize || h > maxSize) {
          if (w > h) {
            h = Math.round(h * maxSize / w);
            w = maxSize;
          } else {
            w = Math.round(w * maxSize / h);
            h = maxSize;
          }
        }

        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d')!;
        ctx.drawImage(img, 0, 0, w, h);

        const dataUrl = canvas.toDataURL('image/jpeg', quality);
        resolve(dataUrl);
      };
      img.onerror = reject;
      img.src = URL.createObjectURL(file);
    });
  }

  /**
   * Récupérer les dataUrls compressées des photos sélectionnées
   */
  getPhotoDataUrls(photos: PhotoData[]): string[] {
    return photos.map(p => p.dataUrl);
  }
}

export const photoService = new PhotoService();
