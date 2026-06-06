// src/auth/tokens.ts
import { admin } from "../firebaseAdmin";
import axios from "axios";

// Função para verificar o idToken e extrair o userId
export async function verifyToken(request: any, reply: any): Promise<void> {
  let tokens;
  try {
    tokens = request.cookies.__session;

    if (!tokens) {
      reply.status(401).send("Acesso negado. Faça o login novamente.");
      return;
    }

    const idToken = tokens.toString().split("|")[0];

    const decodedToken = await admin
      .auth()
      .verifyIdToken(idToken)
      .catch(() => null);

    if (decodedToken) {
      const userId = decodedToken.uid;
      request.userId = userId;
      return;
    }

    const newTokens = await refreshIdToken(tokens);
    if (newTokens) {
      setCookies(reply, newTokens.idToken, newTokens.refreshToken);

      const userId = await extractUserId(newTokens.idToken);
      if (userId) {
        request.userId = userId;
        return;
      }
    }

    reply.status(401).send("Token inválido");
  } catch (error: unknown) {
    if (
      error instanceof Error &&
      (error as any).code === "auth/id-token-expired"
    ) {
      const newTokens = await refreshIdToken(tokens);
      if (newTokens) {
        setCookies(reply, newTokens.idToken, newTokens.refreshToken);

        const userId = await extractUserId(newTokens.idToken);
        if (userId) {
          request.userId = userId;
          return;
        }
      }
    }

    reply.status(500).send("Erro ao verificar o idToken.");
  }
}

// Verifica se a API Key pública está correta
export async function verifyApiKeyPublic(
  request: any,
  reply: any
): Promise<void> {
  if (request.method === "OPTIONS") {
    return;
  }

  const API_KEY_PUBLIC = "ycevqNVkJRs5vSImbfCe6zpI8LBthNd4";

  const apiKey = request.headers["x-api-key"];

  if (apiKey !== API_KEY_PUBLIC) {
    reply.code(401).send("API Key inválida");
    return;
  }
}

// Extrai o userId do idToken
async function extractUserId(token: string): Promise<string | null> {
  try {
    const idToken = token.toString().split("|")[0];
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    return decodedToken?.uid || null;
  } catch (e) {
    return null;
  }
}

// Reinicia o idToken usando o refreshToken
async function refreshIdToken(
  token: string
): Promise<{ idToken: string; refreshToken: string } | null> {
  try {
    const refreshToken = token.toString().split("|")[1];

    if (!refreshToken || refreshToken.length < 10) {
      return null;
    }

    const data = new URLSearchParams();
    data.append("grant_type", "refresh_token");
    data.append("refresh_token", refreshToken);

    const API_KEY = "AIzaSyDzKtn2J4KCmuihHFXAOeo5ZOwRpHpzTNE"; // apikey do projeto firebase (gcp)

    const response = await axios.post(
      `https://securetoken.googleapis.com/v1/token?key=${API_KEY}`,
      data,
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
      }
    );

    const { id_token: newIdToken, refresh_token: newRefreshToken } =
      response.data;

    return {
      idToken: newIdToken,
      refreshToken: newRefreshToken,
    };
  } catch {
    return null;
  }
}

// Define os cookies __session com os tokens
export function setCookies(
  reply: any,
  idToken: string | undefined,
  refreshToken: string | undefined,
) {
  reply.cookie(
    "__session",
    idToken + "|" + refreshToken,
    {
      maxAge: 60 * 60 * 24 * 365 * 2,
      path: "/",
      httpOnly: true,
      secure: true,
      sameSite: "None",
    }
  );
}
