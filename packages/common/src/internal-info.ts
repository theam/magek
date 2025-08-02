export const MAGEK_LOCAL_PORT = 'INTERNAL_LOCAL_PORT'

export const localPort = (): string => process.env[MAGEK_LOCAL_PORT] || '3000'
