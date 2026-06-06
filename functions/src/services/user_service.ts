// src/services/user_service.ts
import { FastifyReply, FastifyRequest } from "fastify";
import axios from "axios";
import { admin, db } from "../firebaseAdmin";
import { FieldValue } from "firebase-admin/firestore";
import { setCookies } from "../auth/tokens";
import { RegisterBody } from "../schemas/user_schemas";
import { removeFCMToken } from "./fcm_token_service";

async function getMqttConfig() {
  const mqttRef = db.doc("internal/mqtt");
  const mqttSnap = await mqttRef.get();

  if (!mqttSnap.exists) {
    throw new Error("MQTT não configurado");
  }

  const mqtt = mqttSnap.data();
  if (!mqtt) {
    throw new Error("MQTT inválido");
  }

  return {
    host: mqtt.host as string,
    ports: Array.isArray(mqtt.port) ? mqtt.port : [mqtt.port],
    user: mqtt.user as string,
    pass: mqtt.pass as string,
  };
}

// Login do usuário
export async function loginUserService(
  request: any,
  reply: FastifyReply
) {
  const { email, password } = request.body;

  try {
    if (!email || !password) {
      return reply.status(400).send("Email e senha são obrigatórios.");
    }

    const API_KEY = "AIzaSyDzKtn2J4KCmuihHFXAOeo5ZOwRpHpzTNE";

    const authUrl =
      "https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword";

    // Firebase Auth
    const { data } = await axios.post(
      `${authUrl}?key=${API_KEY}`,
      {
        email,
        password,
        returnSecureToken: true,
      },
      { timeout: 8000 }
    );

    const { idToken, refreshToken, localId } = data;

    setCookies(reply, idToken, refreshToken);

    // Usuário
    const userSnap = await db.collection("users").doc(localId).get();

    if (!userSnap.exists) {
      return reply
        .status(500)
        .send("Dados de usuário não encontrados.");
    }

    const dataUser = userSnap.data() as any;

    // Devices do usuário (SUBCOLEÇÃO)
    const devicesSnap = await db
      .collection("users")
      .doc(localId)
      .collection("devices")
      .get();

    const devices = devicesSnap.docs.map(d => {
      const data = d.data();
      return {
        name: typeof data.name === "string" ? data.name : "Sem nome",
        deviceId: d.id,
        createdAt: data.createdAt?.toMillis() ?? null, // number
      };
    });

    const mqtt = await getMqttConfig();

    return reply.status(200).send({
      message: "Login realizado com sucesso.",
      user: {
        name: dataUser.name,
        email: dataUser.email,
      },
      devices,
      mqtt
    });
  } catch (err: any) {
    const code = err?.response?.data?.error?.message;

    if (
      code === "INVALID_PASSWORD" ||
      code === "EMAIL_NOT_FOUND" ||
      code === "INVALID_LOGIN_CREDENTIALS"
    ) {
      return reply.status(401).send("Credenciais inválidas.");
    }

    return reply
      .status(500)
      .send("Erro ao fazer login. Tente novamente.");
  }
}

// Obtém credenciais do firebase
export async function getCredentialsFirebase() {
  try {
    const userDocRef = db.collection('internal').doc('firebase');

    const userDoc = await userDocRef.get();

    if (!userDoc.exists) {
      throw new Error('Informações não encontradas.');
    }

    const { apiKey, appId, messagingSenderId, projectId, storageBucket, databaseURL } = userDoc.data() || {};

    if (!apiKey || !appId || !messagingSenderId || !projectId || !storageBucket || !databaseURL) {
      throw new Error('Informações não encontradas.');
    }

    const encodedApiKey = Buffer.from(apiKey).toString('base64');
    const encodedAppId = Buffer.from(appId).toString('base64');
    const encodedMessagingSenderId = Buffer.from(messagingSenderId).toString('base64');
    const encodedProjectId = Buffer.from(projectId).toString('base64');
    const encodedStorageBucket = Buffer.from(storageBucket).toString('base64');
    const encodedDatabaseURL = Buffer.from(databaseURL).toString('base64');

    return {
      x4r1: encodedApiKey,
      x4r2: encodedAppId,
      x4r3: encodedMessagingSenderId,
      x4r4: encodedProjectId,
      x4r5: encodedStorageBucket,
      x4r6: encodedDatabaseURL
    };

  } catch (error) {
    throw new Error('Erro interno.');
  }
}

// Persistência de login
export async function persistLoginService(
  request: FastifyRequest,
  reply: FastifyReply
) {
  const uid = (request as any).userId as string | undefined;

  if (!uid) {
    return reply.status(401).send("Acesso negado.");
  }

  try {
    const userSnap = await db.collection("users").doc(uid).get();

    if (!userSnap.exists) {
      return reply.status(401).send("Usuário não encontrado.");
    }

    const dataUser = userSnap.data() as any;

    const devicesSnap = await db
      .collection("users")
      .doc(uid)
      .collection("devices")
      .get();

    const devices = devicesSnap.docs.map(d => {
      const data = d.data();
      return {
        name: typeof data.name === "string" ? data.name : "Sem nome",
        deviceId: d.id,
        createdAt: data.createdAt?.toMillis() ?? null, // number
      };
    });

    const mqtt = await getMqttConfig();

    return reply.status(200).send({
      message: "Persistência de login detectada.",
      user: {
        name: dataUser.name,
        email: dataUser.email,
      },
      devices,
      mqtt
    });
  } catch (err) {
    request.log.error({ err }, "Erro em /users/persist");
    return reply.status(500).send("Erro interno.");
  }
}

// Registra novo usuário
export async function registerUserService(
  request: FastifyRequest<{ Body: RegisterBody }>,
  reply: FastifyReply
) {
  const { email, password, name } = request.body;

  try {
    // Verifica se já existe usuário com esse e-mail (via Admin SDK)
    try {
      const existing = await admin.auth().getUserByEmail(email);
      if (existing) {
        return reply
          .status(400)
          .send("O e-mail informado já está em uso.");
      }
    } catch (err: any) {
      // auth/user-not-found é ok
      const fbCode = err?.code || err?.errorInfo?.code;
      if (fbCode && fbCode !== "auth/user-not-found") {
        request.log.error(
          { fbCode, err },
          "Erro inesperado ao verificar usuário existente"
        );
        return reply
          .status(500)
          .send("Erro interno ao verificar usuário.");
      }
    }

    // Cria usuário no Auth
    const userRecord = await admin.auth().createUser({
      email,
      password,
    });

    // Salva no Firestore os dados adicionais
    await db.collection("users").doc(userRecord.uid).set({
      name,
      email,
      createdAt: FieldValue.serverTimestamp(),
    });

    return reply.status(200).send("Conta criada com sucesso.");
  } catch (err: any) {
    const fbCode = err?.code || err?.errorInfo?.code;

    if (fbCode === "auth/email-already-exists") {
      return reply
        .status(400)
        .send("O e-mail informado já está em uso.");
    }

    if (fbCode === "auth/invalid-password") {
      return reply
        .status(400)
        .send("Senha inválida. Use uma senha mais forte.");
    }

    if (fbCode === "auth/invalid-email") {
      return reply
        .status(400)
        .send("E-mail inválido. Verifique o endereço informado.");
    }

    return reply
      .status(500)
      .send("Erro interno ao criar conta. Tente novamente.");
  }
}

// Exclui conta de usuário
export async function deleteOwnUserService(
  request: FastifyRequest,
  reply: FastifyReply
) {
  const uid = (request as any).userId as string | undefined;

  if (!uid) {
    return reply
      .status(401)
      .send("Acesso negado. Faça login novamente.");
  }

  try {
    // Apaga doc no Firestore (se existir)
    try {
      await db.collection("users").doc(uid).delete();
    } catch (err) {
    }

    // Apaga usuário no Auth
    try {
      await admin.auth().deleteUser(uid);
    } catch (err: any) {
      const fbCode = err?.code || err?.errorInfo?.code;

      if (fbCode === "auth/user-not-found") {
        // Se já não existe mais no Auth, seguimos como sucesso
        // pra experiência do usuário ser "conta apagada"
      } else {
        return reply
          .status(500)
          .send("Erro ao excluir conta. Tente novamente.");
      }
    }

    // Limpa cookie de sessão
    reply.clearCookie("__session", {
      path: "/",
      httpOnly: true,
      secure: true,
      sameSite: "none",
    });

    return reply.status(200).send("Conta excluída com sucesso.");
  } catch (err) {
    request.log.error({ err }, "Erro inesperado ao excluir conta");
    return reply
      .status(500)
      .send("Erro ao excluir conta. Tente novamente.");
  }
}

// Logout do usuário
export async function logoutUserService(
  request: FastifyRequest,
  reply: FastifyReply
) {
  const uid = (request as any).userId as string | undefined;

  if (!uid) {
    return reply
      .status(401)
      .send("Acesso negado. Faça login novamente.");
  }

  try {
    try {
      await admin.auth().revokeRefreshTokens(uid);
    } catch (err) {
    }

    await removeFCMToken(uid);

    // Limpa cookie de sessão
    reply.clearCookie("__session", {
      path: "/",
      httpOnly: true,
      secure: true,
      sameSite: "none",
    });

    return reply.status(200).send("Logout realizado com sucesso.");
  } catch (err) {
    return reply
      .status(500)
      .send("Erro ao fazer logout. Tente novamente.");
  }
}

// Atualiza nome do usuário
export async function updateUserNameService(
  request: FastifyRequest<{ Body: { name: string } }>,
  reply: FastifyReply
) {
  const uid = (request as any).userId as string | undefined;
  const { name } = request.body;

  if (!uid) {
    return reply
      .status(401)
      .send("Acesso negado. Faça login novamente.");
  }

  if (!name || name.trim().length < 2) {
    return reply.status(400).send("Nome inválido.");
  }

  try {
    const userRef = db.collection("users").doc(uid);

    const snap = await userRef.get();
    if (!snap.exists) {
      return reply.status(401).send("Usuário não encontrado.");
    }

    // Atualiza apenas o nome
    await userRef.update({
      name: name.trim(),
      updatedAt: FieldValue.serverTimestamp(),
    });

    const dataUser = snap.data() as any;

    return reply.status(200).send({
      message: "Dados atualizados com sucesso.",
      user: {
        name: name.trim(),
        email: dataUser.email,
      },
    });
  } catch (err) {
    request.log.error({ err }, "Erro ao editar usuário");
    return reply
      .status(500)
      .send("Erro interno ao atualizar dados.");
  }
}