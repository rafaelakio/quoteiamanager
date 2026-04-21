import React, { useState, useEffect } from 'react'
import { Bell, X, Check, AlertCircle, Info, CheckCircle, AlertTriangle, Trash2 } from 'lucide-react'
import { NotificationService, Notification } from '../services/notificationService'

interface NotificationCenterProps {
  className?: string
}

export function NotificationCenter({ className = '' }: NotificationCenterProps) {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)

  useEffect(() => {
    const unsubscribe = NotificationService.subscribe((newNotifications) => {
      setNotifications(newNotifications)
      setUnreadCount(NotificationService.getUnreadCount())
    })

    return unsubscribe
  }, [])

  const handleMarkAsRead = (id: string) => {
    NotificationService.markAsRead(id)
  }

  const handleMarkAllAsRead = () => {
    NotificationService.markAllAsRead()
  }

  const handleRemove = (id: string) => {
    NotificationService.removeNotification(id)
  }

  const handleClearAll = () => {
    NotificationService.clear()
    setIsOpen(false)
  }

  const getNotificationIcon = (type: Notification['type']) => {
    switch (type) {
      case 'success':
        return <CheckCircle className="w-4 h-4 text-green-500" />
      case 'error':
        return <AlertCircle className="w-4 h-4 text-red-500" />
      case 'warning':
        return <AlertTriangle className="w-4 h-4 text-yellow-500" />
      case 'info':
      default:
        return <Info className="w-4 h-4 text-blue-500" />
    }
  }

  const getNotificationBg = (type: Notification['type']) => {
    switch (type) {
      case 'success':
        return 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
      case 'error':
        return 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
      case 'warning':
        return 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800'
      case 'info':
      default:
        return 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800'
    }
  }

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)

    if (diffMins < 1) return 'Agora'
    if (diffMins < 60) return `${diffMins} min`
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)} h`
    return date.toLocaleDateString('pt-BR')
  }

  return (
    <div className={`relative ${className}`}>
      {/* Bell Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setIsOpen(false)}
          />

          {/* Panel */}
          <div className="absolute right-0 top-12 w-96 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-50 max-h-96 overflow-hidden">
            {/* Header */}
            <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <h3 className="font-semibold text-gray-900 dark:text-white">
                Notificações
                {unreadCount > 0 && (
                  <span className="ml-2 text-sm text-blue-600 dark:text-blue-400">
                    ({unreadCount} não lidas)
                  </span>
                )}
              </h3>
              <div className="flex items-center gap-2">
                {notifications.length > 0 && (
                  <>
                    <button
                      onClick={handleMarkAllAsRead}
                      className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded"
                      title="Marcar todas como lidas"
                    >
                      <Check className="w-4 h-4" />
                    </button>
                    <button
                      onClick={handleClearAll}
                      className="p-1 text-gray-400 hover:text-red-600 dark:hover:text-red-400 rounded"
                      title="Limpar todas"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </>
                )}
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Notifications List */}
            <div className="overflow-y-auto max-h-80">
              {notifications.length === 0 ? (
                <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                  <Bell className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p className="text-sm">Nenhuma notificação</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-200 dark:divide-gray-700">
                  {notifications.map((notification) => (
                    <div
                      key={notification.id}
                      className={`p-4 ${getNotificationBg(notification.type)} ${
                        !notification.read ? 'border-l-4' : ''
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        {getNotificationIcon(notification.type)}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <p className={`text-sm font-medium ${
                                notification.read 
                                  ? 'text-gray-700 dark:text-gray-300' 
                                  : 'text-gray-900 dark:text-white'
                              }`}>
                                {notification.title}
                              </p>
                              <p className={`text-sm mt-1 ${
                                notification.read 
                                  ? 'text-gray-600 dark:text-gray-400' 
                                  : 'text-gray-700 dark:text-gray-300'
                              }`}>
                                {notification.message}
                              </p>
                              {notification.actions && (
                                <div className="flex gap-2 mt-2">
                                  {notification.actions.map((action, index) => (
                                    <button
                                      key={index}
                                      className="text-xs px-2 py-1 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-50 dark:hover:bg-gray-600"
                                    >
                                      {action.label}
                                    </button>
                                  ))}
                                </div>
                              )}
                            </div>
                            <div className="flex items-center gap-1 ml-2">
                              {!notification.read && (
                                <button
                                  onClick={() => handleMarkAsRead(notification.id)}
                                  className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded"
                                  title="Marcar como lida"
                                >
                                  <Check className="w-3 h-3" />
                                </button>
                              )}
                              <button
                                onClick={() => handleRemove(notification.id)}
                                className="p-1 text-gray-400 hover:text-red-600 dark:hover:text-red-400 rounded"
                                title="Remover"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                            {formatTime(notification.timestamp)}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}