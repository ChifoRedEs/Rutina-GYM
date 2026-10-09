export function legacyKeys(){return Object.keys(localStorage).filter(k=>k.startsWith("session:")||k.startsWith("last:"))}
export async function migrateLegacy(){return{migrated:false,reason:"La migración del formato antiguo requiere confirmación explícita."}}
