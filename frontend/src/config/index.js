export const API_BASE_URL = "/api/v1"
export const APP_NAME = "Spendwise"

const wsProto = typeof window !== "undefined" && window.location.protocol === "https:" ? "wss" : "ws"
const wsHost = typeof window !== "undefined" ? window.location.host : "localhost:8000"
export const WS_URL = `${wsProto}://${wsHost}/api/v1/ws`