// El backend está en el plan gratuito de Render: si nadie lo usa durante unos
// 15 minutos se duerme y tarda hasta un minuto en despertar. Mientras tanto
// Render puede responder 502/503/504 o cortar la conexión. Estas utilidades
// reintentan en ese caso en lugar de mostrar un error al usuario.

const API_URL = process.env.NEXT_PUBLIC_API_URL;

const ESTADOS_ARRANQUE = [502, 503, 504];
const TIEMPO_MAXIMO_MS = 120_000;

const esperar = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Llamada ligera para que el servidor empiece a despertar en cuanto se abre
// la página, mientras el usuario escribe sus datos.
export function despertarServidor() {
  fetch(`${API_URL}/`, { method: "GET", cache: "no-store" }).catch(() => {});
}

// fetch que reintenta mientras el servidor está arrancando.
// onEsperando se llama la primera vez que hay que esperar, para avisar al usuario.
export async function fetchConReintento(
  url: string,
  opciones: RequestInit,
  onEsperando?: () => void
): Promise<Response> {
  const inicio = Date.now();
  let avisado = false;

  while (true) {
    try {
      const res = await fetch(url, opciones);
      if (!ESTADOS_ARRANQUE.includes(res.status)) return res;
    } catch {
      // Error de red: normalmente el servidor aún no acepta conexiones.
    }

    if (Date.now() - inicio > TIEMPO_MAXIMO_MS) {
      throw new Error(
        "El servidor no responde. Espera un par de minutos y vuelve a intentarlo."
      );
    }
    if (!avisado) {
      avisado = true;
      onEsperando?.();
    }
    await esperar(4000);
  }
}

// Lee el JSON de la respuesta sin romperse si el servidor devuelve texto o HTML.
export async function leerJson(res: Response): Promise<any> {
  try {
    return await res.json();
  } catch {
    return {};
  }
}
