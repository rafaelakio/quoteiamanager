export interface Notification {
  id: string
  type: 'info' | 'success' | 'warning' | 'error'
  title: string
  message: string
  timestamp: string
  read: boolean
  actions?: Array<{
    label: string
    action: string
  }>
}

export class NotificationService {
  private static notifications: Notification[] = []
  private static listeners: Array<(notifications: Notification[]) => void> = []

  static addNotification(notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) {
    const newNotification: Notification = {
      ...notification,
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      timestamp: new Date().toISOString(),
      read: false
    }

    this.notifications.unshift(newNotification)
    this.notifyListeners()

    // Auto-remove success notifications after 5 seconds
    if (notification.type === 'success') {
      setTimeout(() => {
        this.removeNotification(newNotification.id)
      }, 5000)
    }

    return newNotification.id
  }

  static removeNotification(id: string) {
    this.notifications = this.notifications.filter(n => n.id !== id)
    this.notifyListeners()
  }

  static markAsRead(id: string) {
    const notification = this.notifications.find(n => n.id === id)
    if (notification) {
      notification.read = true
      this.notifyListeners()
    }
  }

  static markAllAsRead() {
    this.notifications.forEach(n => n.read = true)
    this.notifyListeners()
  }

  static getNotifications(): Notification[] {
    return [...this.notifications]
  }

  static getUnreadCount(): number {
    return this.notifications.filter(n => !n.read).length
  }

  static subscribe(listener: (notifications: Notification[]) => void) {
    this.listeners.push(listener)
    listener(this.getNotifications())
    
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener)
    }
  }

  private static notifyListeners() {
    this.listeners.forEach(listener => listener(this.getNotifications()))
  }

  static clear() {
    this.notifications = []
    this.notifyListeners()
  }

  // Convenience methods for common notification types
  static success(title: string, message: string) {
    return this.addNotification({
      type: 'success',
      title,
      message
    })
  }

  static error(title: string, message: string) {
    return this.addNotification({
      type: 'error',
      title,
      message
    })
  }

  static warning(title: string, message: string) {
    return this.addNotification({
      type: 'warning',
      title,
      message
    })
  }

  static info(title: string, message: string) {
    return this.addNotification({
      type: 'info',
      title,
      message
    })
  }

  // Handle reset-specific notifications
  static notifyResetCompleted(providerName: string, resetType: string, totalTokens: number, totalCost: number) {
    return this.addNotification({
      type: 'success',
      title: 'Reset Automático Executado',
      message: `${providerName}: Contadores zerados (${resetType}). ${totalTokens.toLocaleString()} tokens, $${totalCost.toFixed(2)} no período.`,
      actions: [
        { label: 'Ver Histórico', action: 'view-history' }
      ]
    })
  }

  static notifyResetError(providerName: string, error: string) {
    return this.addNotification({
      type: 'error',
      title: 'Erro no Reset Automático',
      message: `${providerName}: Falha ao executar reset - ${error}`,
      actions: [
        { label: 'Ver Configuração', action: 'view-config' }
      ]
    })
  }

  static notifyResetScheduled(providerName: string, nextReset: string) {
    return this.addNotification({
      type: 'info',
      title: 'Reset Agendado',
      message: `${providerName}: Próximo reset em ${new Date(nextReset).toLocaleDateString('pt-BR')}`
    })
  }

  static notifyQuotaWarning(providerName: string, percentUsed: number) {
    return this.addNotification({
      type: 'warning',
      title: 'Alerta de Cota',
      message: `${providerName}: ${percentUsed.toFixed(1)} da cota utilizada`,
      actions: [
        { label: 'Ver Detalhes', action: 'view-details' }
      ]
    })
  }

  static notifyQuotaExceeded(providerName: string) {
    return this.addNotification({
      type: 'error',
      title: 'Cota Excedida',
      message: `${providerName}: Limite de cota atingido`,
      actions: [
        { label: 'Ver Plano', action: 'view-plan' }
      ]
    })
  }
}