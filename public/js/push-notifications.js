// Push Notifications - Obuxixo Gospel
(function() {
  'use strict';

  // Verificar se o navegador suporta notificações
  if (!('Notification' in window) || !('serviceWorker' in navigator)) {
    console.log('Este navegador não suporta notificações push');
    return;
  }

  // Chave pública VAPID
  const VAPID_PUBLIC_KEY = 'BJSsnfk5_Rb21l31-sn_uG5gpi5H2111dKpXpbOi7m4FIOF1qbvE_nWLN11H_smBJBN4WJFn_gWJVtGaIzmOmCQ';

  // Verificar se já pediu permissão antes
  const hasAskedPermission = localStorage.getItem('notification_asked');
  const permissionDenied = localStorage.getItem('notification_denied');

  // Se já negou, não mostrar novamente por 7 dias
  if (permissionDenied) {
    const deniedDate = new Date(permissionDenied);
    const daysSinceDenied = (Date.now() - deniedDate.getTime()) / (1000 * 60 * 60 * 24);
    if (daysSinceDenied < 7) {
      return;
    }
  }

  // Se já tem permissão, registrar service worker
  if (Notification.permission === 'granted') {
    registerServiceWorker();
    return;
  }

  // Se já foi negado permanentemente, não mostrar
  if (Notification.permission === 'denied') {
    return;
  }

  // Mostrar popup após 5 segundos na página
  setTimeout(showNotificationPopup, 5000);

  function showNotificationPopup() {
    // Não mostrar se já existe um popup
    if (document.getElementById('notification-popup')) return;

    const popup = document.createElement('div');
    popup.id = 'notification-popup';
    popup.innerHTML = `
      <div class="notification-popup-overlay"></div>
      <div class="notification-popup-content">
        <div class="notification-popup-icon">
          <i class="fas fa-bell"></i>
        </div>
        <div class="notification-popup-text">
          <h3>Quer receber notificações?</h3>
          <p>Fique por dentro das últimas notícias do mundo gospel em primeira mão!</p>
        </div>
        <div class="notification-popup-buttons">
          <button class="notification-btn-allow" onclick="allowNotifications()">
            <i class="fas fa-check"></i> Sim, quero!
          </button>
          <button class="notification-btn-deny" onclick="denyNotifications()">
            Agora não
          </button>
        </div>
        <button class="notification-popup-close" onclick="closeNotificationPopup()">
          <i class="fas fa-times"></i>
        </button>
      </div>
    `;

    document.body.appendChild(popup);

    // Adicionar estilos
    addPopupStyles();

    // Animar entrada
    setTimeout(() => {
      popup.classList.add('active');
    }, 100);
  }

  function addPopupStyles() {
    if (document.getElementById('notification-popup-styles')) return;

    const styles = document.createElement('style');
    styles.id = 'notification-popup-styles';
    styles.textContent = `
      #notification-popup {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        z-index: 99999;
        display: flex;
        align-items: center;
        justify-content: center;
        opacity: 0;
        visibility: hidden;
        transition: all 0.3s ease;
      }

      #notification-popup.active {
        opacity: 1;
        visibility: visible;
      }

      .notification-popup-overlay {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.5);
        backdrop-filter: blur(4px);
      }

      .notification-popup-content {
        position: relative;
        background: white;
        border-radius: 16px;
        padding: 32px;
        max-width: 400px;
        width: 90%;
        text-align: center;
        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
        transform: translateY(20px);
        transition: transform 0.3s ease;
      }

      #notification-popup.active .notification-popup-content {
        transform: translateY(0);
      }

      .notification-popup-icon {
        width: 70px;
        height: 70px;
        background: linear-gradient(135deg, #FF6B00 0%, #E65100 100%);
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        margin: 0 auto 20px;
        animation: bellRing 1s ease-in-out infinite;
      }

      @keyframes bellRing {
        0%, 100% { transform: rotate(0); }
        10%, 30% { transform: rotate(10deg); }
        20%, 40% { transform: rotate(-10deg); }
        50% { transform: rotate(0); }
      }

      .notification-popup-icon i {
        font-size: 32px;
        color: white;
      }

      .notification-popup-text h3 {
        font-size: 22px;
        font-weight: 700;
        color: #1a202c;
        margin: 0 0 10px;
      }

      .notification-popup-text p {
        font-size: 15px;
        color: #64748b;
        margin: 0;
        line-height: 1.5;
      }

      .notification-popup-buttons {
        display: flex;
        flex-direction: column;
        gap: 12px;
        margin-top: 24px;
      }

      .notification-btn-allow {
        background: linear-gradient(135deg, #FF6B00 0%, #E65100 100%);
        color: white;
        border: none;
        padding: 14px 24px;
        border-radius: 10px;
        font-size: 16px;
        font-weight: 600;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        transition: all 0.2s;
        box-shadow: 0 4px 15px rgba(255, 107, 0, 0.4);
      }

      .notification-btn-allow:hover {
        transform: translateY(-2px);
        box-shadow: 0 6px 20px rgba(255, 107, 0, 0.5);
      }

      .notification-btn-deny {
        background: transparent;
        color: #64748b;
        border: none;
        padding: 10px;
        font-size: 14px;
        cursor: pointer;
        transition: color 0.2s;
      }

      .notification-btn-deny:hover {
        color: #1a202c;
      }

      .notification-popup-close {
        position: absolute;
        top: 12px;
        right: 12px;
        background: #f1f5f9;
        border: none;
        width: 32px;
        height: 32px;
        border-radius: 50%;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        color: #64748b;
        transition: all 0.2s;
      }

      .notification-popup-close:hover {
        background: #e2e8f0;
        color: #1a202c;
      }

      @media (max-width: 480px) {
        .notification-popup-content {
          padding: 24px 20px;
          margin: 0 16px;
        }

        .notification-popup-icon {
          width: 60px;
          height: 60px;
        }

        .notification-popup-icon i {
          font-size: 28px;
        }

        .notification-popup-text h3 {
          font-size: 20px;
        }

        .notification-popup-text p {
          font-size: 14px;
        }
      }
    `;
    document.head.appendChild(styles);
  }

  // Funções globais
  window.allowNotifications = async function() {
    closeNotificationPopup();
    localStorage.setItem('notification_asked', 'true');

    try {
      const permission = await Notification.requestPermission();
      
      if (permission === 'granted') {
        console.log('Permissão concedida!');
        await registerServiceWorker();
        showSuccessMessage();
      } else {
        localStorage.setItem('notification_denied', new Date().toISOString());
      }
    } catch (error) {
      console.error('Erro ao solicitar permissão:', error);
    }
  };

  window.denyNotifications = function() {
    closeNotificationPopup();
    localStorage.setItem('notification_asked', 'true');
    localStorage.setItem('notification_denied', new Date().toISOString());
  };

  window.closeNotificationPopup = function() {
    const popup = document.getElementById('notification-popup');
    if (popup) {
      popup.classList.remove('active');
      setTimeout(() => popup.remove(), 300);
    }
  };

  async function registerServiceWorker() {
    try {
      console.log('🔧 Iniciando registro do Service Worker...');
      
      const registration = await navigator.serviceWorker.register('/sw.js');
      console.log('✅ Service Worker registrado:', registration.scope);

      // Aguardar o service worker estar pronto
      console.log('⏳ Aguardando Service Worker ficar pronto...');
      const sw = await navigator.serviceWorker.ready;
      console.log('✅ Service Worker pronto');

      // Verificar se já tem subscription
      let subscription = await sw.pushManager.getSubscription();
      console.log('📋 Subscription existente:', subscription ? 'Sim' : 'Não');

      if (!subscription) {
        // Criar nova subscription
        console.log('🔑 Criando nova subscription com VAPID key...');
        console.log('VAPID Public Key:', VAPID_PUBLIC_KEY.substring(0, 20) + '...');
        
        try {
          // Verificar se pushManager está disponível
          if (!sw.pushManager) {
            console.error('❌ PushManager não está disponível');
            return;
          }
          
          const applicationServerKey = urlBase64ToUint8Array(VAPID_PUBLIC_KEY);
          console.log('🔐 Application Server Key gerada, tamanho:', applicationServerKey.length);
          
          subscription = await sw.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: applicationServerKey
          });
          
          console.log('✅ Subscription criada com sucesso');
          console.log('Endpoint:', subscription.endpoint.substring(0, 50) + '...');
        } catch (subError) {
          console.error('❌ Erro ao criar subscription:', subError);
          console.error('Nome do erro:', subError.name);
          console.error('Mensagem:', subError.message);
          console.error('Stack:', subError.stack);
          return;
        }
      }

      if (subscription) {
        // Enviar subscription para o servidor
        console.log('📤 Enviando subscription para o servidor...');
        await saveSubscription(subscription);
      } else {
        console.error('❌ Subscription não foi criada');
      }

    } catch (error) {
      console.error('❌ Erro ao registrar Service Worker:', error);
      console.error('Detalhes:', error.message);
    }
  }

  async function saveSubscription(subscription) {
    try {
      // Converter subscription para JSON
      const subscriptionJson = subscription.toJSON();
      console.log('📤 Enviando subscription para o servidor...');
      console.log('Endpoint:', subscriptionJson.endpoint);
      console.log('Keys:', subscriptionJson.keys ? 'Presente' : 'Ausente');
      
      const response = await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(subscriptionJson),
        credentials: 'same-origin'
      });
      
      console.log('📥 Status da resposta:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Erro HTTP:', response.status, errorText);
        return;
      }
      
      const result = await response.json();
      console.log('📥 Resposta do servidor:', result);
      
      if (result.success) {
        console.log('✅ Subscription salva no servidor com sucesso!');
      } else {
        console.error('❌ Erro ao salvar subscription:', result.error);
      }
    } catch (error) {
      console.error('❌ Erro ao salvar subscription:', error);
      console.error('Stack:', error.stack);
    }
  }

  function showSuccessMessage() {
    const toast = document.createElement('div');
    toast.style.cssText = `
      position: fixed;
      bottom: 20px;
      left: 50%;
      transform: translateX(-50%);
      background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%);
      color: white;
      padding: 16px 24px;
      border-radius: 12px;
      font-size: 15px;
      font-weight: 500;
      box-shadow: 0 4px 20px rgba(34, 197, 94, 0.4);
      z-index: 99999;
      display: flex;
      align-items: center;
      gap: 10px;
      animation: slideUp 0.3s ease;
    `;
    toast.innerHTML = '<i class="fas fa-check-circle"></i> Notificações ativadas com sucesso!';
    document.body.appendChild(toast);

    // Adicionar animação
    const style = document.createElement('style');
    style.textContent = `
      @keyframes slideUp {
        from { transform: translateX(-50%) translateY(100px); opacity: 0; }
        to { transform: translateX(-50%) translateY(0); opacity: 1; }
      }
    `;
    document.head.appendChild(style);

    setTimeout(() => toast.remove(), 4000);
  }

  function urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }

})();
