export default function handler(request, response) {
  const apiKey = process.env.ABLY_API_KEY;

  if (!apiKey || apiKey.trim() === '') {
    return response.status(500).json({
      ok: false,
      error: 'No existe una clave de Ably configurada en el entorno de Vercel.'
    });
  }

  response.status(200).json({
    ok: true,
    key: apiKey
  });
}
