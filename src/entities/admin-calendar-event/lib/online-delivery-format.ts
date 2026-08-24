const ONLINE_DELIVERY_FORMAT_NAMES = new Set([
  'онлайн синхронный',
  'онлайн асинхронный',
])

export function isOnlineDeliveryFormatName(name: string | null | undefined): boolean {
  return ONLINE_DELIVERY_FORMAT_NAMES.has(name?.trim().toLowerCase() ?? '')
}

export const ONLINE_EVENT_ICON_URL = `${import.meta.env.BASE_URL}icons/online-event.png`
