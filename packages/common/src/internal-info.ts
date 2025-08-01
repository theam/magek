export const MAGEK_LOCAL_PORT = 'BOOSTER_INTERNAL_LOCAL_PORT'

export const boosterLocalPort = (): string => process.env[MAGEK_LOCAL_PORT] || '3000'
