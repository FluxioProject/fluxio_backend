// src/services/product_service.ts
import { FastifyReply, FastifyRequest } from "fastify";
import { bucket, db } from "../firebaseAdmin";
import { FieldValue } from "firebase-admin/firestore";
import * as schemas from "../schemas/product_schemas";
import { admin } from "../firebaseAdmin";

// Compares two "X.Y.Z" version strings (already validated by the schema).
// Returns <0 if a<b, 0 if equal, >0 if a>b.
function compareSemver(a: string, b: string): number {
  const pa = a.split(".").map(Number);
  const pb = b.split(".").map(Number);
  for (let i = 0; i < 3; i++) {
    if (pa[i] !== pb[i]) return pa[i] - pb[i];
  }
  return 0;
}

// Create a product.
export async function createProductService(
  request: FastifyRequest<{ Body: schemas.CreateProductBody }>,
  reply: FastifyReply
) {
  const uid = (request as any).userId as string | undefined;

  if (!uid) {
    return reply.status(401).send("Acesso negado.");
  }

  try {
    let { name, deviceId } = request.body;

    name = name.trim();
    deviceId = deviceId.trim();

    if (!name || !deviceId) {
      return reply
        .status(400)
        .send("Nome do produto e Device ID são obrigatórios.");
    }

    const deviceGlobalRef = db.collection("devices").doc(deviceId);
    const deviceSnap = await deviceGlobalRef.get();

    if (deviceSnap.exists) {
      return reply
        .status(400)
        .send("Este device já está vinculado a outro usuário.");
    }

    const nowServer = FieldValue.serverTimestamp();

    await deviceGlobalRef.set({
      name: name,
      userId: uid,
      createdAt: nowServer,
    });

    await db
      .collection("users")
      .doc(uid)
      .collection("devices")
      .doc(deviceId)
      .set({
        name: name,
        createdAt: nowServer,
      });

    return reply.status(200).send({
      message: "Produto e device cadastrados com sucesso.",
    });
  } catch (err) {
    return reply
      .status(500)
      .send("Erro ao criar produto. Tente novamente.");
  }
}

// Edit the device name.
export async function updateDeviceNameService(
  request: FastifyRequest<{
    Params: { deviceId: string };
    Body: schemas.UpdateDeviceBody;
  }>,
  reply: FastifyReply
) {
  const uid = (request as any).userId as string | undefined;
  const { deviceId } = request.params;
  const { name } = request.body;

  if (!uid) {
    return reply.status(401).send("Acesso negado.");
  }

  const newName = name.trim();
  if (!newName) {
    return reply.status(400).send("Nome inválido.");
  }

  try {
    /** References. */
    const userDeviceRef = db
      .collection("users")
      .doc(uid)
      .collection("devices")
      .doc(deviceId);

    const globalDeviceRef = db
      .collection("devices")
      .doc(deviceId);

    /** Validate ownership. */
    const userDeviceSnap = await userDeviceRef.get();

    if (!userDeviceSnap.exists) {
      return reply
        .status(404)
        .send("Device não encontrado para este usuário.");
    }

    /** Update both documents in parallel. */
    await Promise.all([
      userDeviceRef.update({
        name: newName,
        updatedAt: FieldValue.serverTimestamp(),
      }),
      globalDeviceRef.update({
        name: newName,
        updatedAt: FieldValue.serverTimestamp(),
      }),
    ]);

    return reply.status(200).send({
      message: "Nome do device atualizado com sucesso.",
    });
  } catch (err) {
    request.log.error({ err }, "Erro ao editar device");
    return reply
      .status(500)
      .send("Erro ao atualizar device. Tente novamente.");
  }
}
// Update channel settings.
export async function updateChannelService(request: any, reply: any) {
  try {
    const {
      deviceId,
      channelName,
      type,
      index,
      min,
      max,
      mapMin,
      mapMax,
      notifyMobile,
      notifyEmail,
      notifySms,
    } = request.body;

    const deviceRef = admin.firestore().collection('devices').doc(deviceId);
    const deviceSnap = await deviceRef.get();

    if (!deviceSnap.exists) {
      return reply.status(404).send('Dispositivo não encontrado.');
    }

    const docId = `${type}_${index}`;

    const channelRef = deviceRef
      .collection('channels')
      .doc(docId);

    const updateData: any = {
      type,
      index,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    if (channelName !== undefined) updateData.channelName = channelName;
    if (min !== undefined) updateData.min = min;
    if (max !== undefined) updateData.max = max;
    if (mapMin !== undefined) updateData.mapMin = mapMin;
    if (mapMax !== undefined) updateData.mapMax = mapMax;
    if (notifyMobile !== undefined) updateData.notifyMobile = notifyMobile;
    if (notifyEmail !== undefined) updateData.notifyEmail = notifyEmail;
    if (notifySms !== undefined) updateData.notifySms = notifySms;

    await channelRef.set(updateData, { merge: true });

    return reply.status(200).send({
      message: 'Canal atualizado com sucesso.',
    });
  } catch (err) {
    console.error(err);
    return reply.status(500).send('Erro interno.');
  }
}

// Get the latest committed firmware version for a device.
export async function getLatestFirmwareService(
  request: FastifyRequest<{ Params: { deviceId: string } }>,
  reply: FastifyReply
) {
  const { deviceId } = request.params;

  const snap = await db
    .collection("firmwares")
    .where("deviceId", "==", deviceId)
    .orderBy("createdAt", "desc")
    .limit(1)
    .get();

  if (snap.empty) {
    return reply.status(404).send("Nenhum firmware encontrado para este device.");
  }

  const doc = snap.docs[0].data();

  const [readUrl] = await bucket.file(doc.path).getSignedUrl({
    action: "read",
    expires: Date.now() + 30 * 60 * 1000,
  });

  return reply.send({
    version: doc.version,
    sha256: doc.sha256,
    size: doc.size,
    readUrl,
  });
}

// Get all device channels.
export async function getAllChannelsService(request: any, reply: any) {
  try {
    const { deviceId } = request.query;

    const deviceRef = admin.firestore().collection('devices').doc(deviceId);
    const snap = await deviceRef.collection('channels').get();

    const result: any = {
      ai: {},
      ao: {},
      di: {},
      do: {},
    };

    snap.forEach((doc) => {
      const data = doc.data();
      if (!data.type || data.index === undefined) return;

      result[data.type][String(data.index)] = {
        channelName: data.channelName || '',
        mapMin: data.mapMin,
        mapMax: data.mapMax,
        min: data.min,
        max: data.max,
        notifyMobile: data.notifyMobile ?? false,
        notifyEmail: data.notifyEmail ?? false,
        notifySms: data.notifySms ?? false,
      };
    });

    return reply.status(200).send(result);
  } catch (err) {
    console.error(err);
    return reply.status(500).send('Erro interno.');
  }
}

// Delete a device.
export async function deleteDeviceService(
  request: FastifyRequest<{
    Params: { deviceId: string };
  }>,
  reply: FastifyReply
) {
  const uid = (request as any).userId as string | undefined;
  const { deviceId } = request.params;

  if (!uid) {
    return reply.status(401).send("Acesso negado.");
  }

  try {
    const userDeviceRef = db
      .collection("users")
      .doc(uid)
      .collection("devices")
      .doc(deviceId);

    const globalDeviceRef = db
      .collection("devices")
      .doc(deviceId);

    /** Validate ownership. */
    const userDeviceSnap = await userDeviceRef.get();

    if (!userDeviceSnap.exists) {
      return reply
        .status(404)
        .send("Device não encontrado para este usuário.");
    }

    /** Remove both documents in parallel. */
    await Promise.all([
      userDeviceRef.delete(),
      globalDeviceRef.delete(),
    ]);

    return reply.status(200).send({
      message: "Device removido com sucesso.",
    });
  } catch (err) {
    request.log.error({ err }, "Erro ao excluir device");
    return reply
      .status(500)
      .send("Erro ao excluir device. Tente novamente.");
  }
}

// Get MQTT credentials for the device.
export async function getMqttCredentialsService(
  request: any,
  reply: FastifyReply
) {
  try {
    const { deviceId } = request.query as { deviceId: string };

    if (!deviceId) {
      return reply.code(400).send("deviceId não informado");
    }

    const deviceRef = db.doc(`devices/${deviceId}`);
    const deviceSnap = await deviceRef.get();

    if (!deviceSnap.exists) {
      return reply.code(404).send("Device não encontrado");
    }

    const mqttRef = db.doc("internal/mqtt");
    const mqttSnap = await mqttRef.get();

    if (!mqttSnap.exists) {
      return reply.code(500).send("MQTT não configurado");
    }

    const mqtt = mqttSnap.data();
    if (!mqtt) {
      return reply.code(500).send("MQTT não configurado");
    }

    const port = Array.isArray(mqtt.port)
      ? Number(mqtt.port[1])
      : Number(mqtt.port);

    return reply.send({
      mqtt: {
        host: mqtt.host as string,
        port,
        user: mqtt.user as string,
        pass: mqtt.pass as string,
      },
    });
  } catch (err) {
    console.error(err);
    return reply.code(500).send("Erro interno");
  }
}

// Get a firmware upload URL. Now takes a client-chosen version (X.Y.Z) and
// the file extension, and builds the storage path as
// "firmwares/{deviceId}/v{version}.{extension}" instead of a timestamp.
// Rejects versions that are older than or equal to the latest committed
// one for this device, so re-uploading an outdated build is blocked
// server-side even if the client-side check was bypassed.
export async function getFirmwareUploadUrlService(
  request: FastifyRequest<{
    Params: { deviceId: string };
    Body: { version: string; extension: "bin" | "hex" | "uf2" };
  }>,
  reply: FastifyReply
) {
  const { deviceId } = request.params;
  const { version, extension } = request.body;
  const uid = (request as any).userId;

  const deviceRef = db.collection("devices").doc(deviceId);
  const snap = await deviceRef.get();

  if (!snap.exists || snap.data()?.userId !== uid) {
    return reply.status(404).send("Device não encontrado.");
  }

  const latestSnap = await db
    .collection("firmwares")
    .where("deviceId", "==", deviceId)
    .orderBy("createdAt", "desc")
    .limit(1)
    .get();

  if (!latestSnap.empty) {
    const latestVersion = latestSnap.docs[0].data().version as string;
    if (compareSemver(version, latestVersion) <= 0) {
      return reply
        .status(400)
        .send(
          `Versão inválida: já existe a versão ${latestVersion} para este device. Envie uma versão mais recente.`
        );
    }
  }

  const path = `firmwares/${deviceId}/v${version}.${extension}`;

  const [uploadUrl] = await bucket.file(path).getSignedUrl({
    action: "write",
    expires: Date.now() + 10 * 60 * 1000, // 10 minutes.
    contentType: "application/octet-stream",
  });

  return reply.send({
    uploadUrl,
    path,
    version,
  });
}

// Commit firmware metadata and return a read URL.
export async function commitFirmwareService(
  request: FastifyRequest<{
    Params: { deviceId: string };
    Body: {
      path: string;
      sha256: string;
      size: number;
      version: string;
    };
  }>,
  reply: FastifyReply
) {
  const { deviceId } = request.params;
  const { path, sha256, size, version } = request.body;
  const uid = (request as any).userId;

  const deviceRef = db.collection("devices").doc(deviceId);
  const snap = await deviceRef.get();

  if (!snap.exists || snap.data()?.userId !== uid) {
    return reply.status(404).send("Device não encontrado.");
  }

  const [readUrl] = await bucket.file(path).getSignedUrl({
    action: "read",
    expires: Date.now() + 30 * 60 * 1000,
  });

  await db.collection("firmwares").add({
    deviceId,
    version,
    sha256,
    size,
    path,
    createdAt: new Date(),
  });

  return reply.send({
    readUrl,
    version,
  });
}

export async function saveLogicService(
  request: FastifyRequest<{
    Params: { deviceId: string };
    Body: schemas.SaveLogicBody;
  }>,
  reply: FastifyReply
) {
  const uid = (request as any).userId as string | undefined;
  const { deviceId } = request.params;
  const { v, blocks } = request.body;

  if (!uid) {
    return reply.status(401).send("Acesso negado.");
  }

  try {
    // Valida posse do device, igual ao padrão usado em
    // updateDeviceNameService / deleteDeviceService.
    const userDeviceRef = db
      .collection("users")
      .doc(uid)
      .collection("devices")
      .doc(deviceId);

    const userDeviceSnap = await userDeviceRef.get();

    if (!userDeviceSnap.exists) {
      return reply
        .status(404)
        .send("Device não encontrado para este usuário.");
    }

    const logicRef = db
      .collection("devices")
      .doc(deviceId)
      .collection("logic")
      .doc("current");

    const now = new Date();

    await logicRef.set({
      v,
      blocks: blocksToFirestore(blocks),
      updatedAt: FieldValue.serverTimestamp(),
      updatedBy: uid,
    });

    return reply.status(200).send({
      message: "Lógica salva com sucesso.",
      updatedAt: now.toISOString(),
    });
  } catch (err) {
    request.log.error({ err }, "Erro ao salvar lógica");
    return reply.status(500).send("Erro ao salvar lógica. Tente novamente.");
  }
}

function blocksToFirestore(blocks: any[]) {
  return blocks.map((b) => ({
    ...b,
    in: Array.isArray(b.in)
      ? b.in.map((pair: any[]) => ({ k: pair[0], v: pair[1] }))
      : [],
  }));
}

function blocksFromFirestore(blocks: any[]) {
  return blocks.map((b) => ({
    ...b,
    in: Array.isArray(b.in)
      ? b.in.map((pair: any) => [pair.k, pair.v])
      : [],
  }));
}

export async function getLogicService(
  request: FastifyRequest<{ Params: { deviceId: string } }>,
  reply: FastifyReply
) {
  const uid = (request as any).userId as string | undefined;
  const { deviceId } = request.params;

  if (!uid) {
    return reply.status(401).send("Acesso negado.");
  }

  try {
    const userDeviceRef = db
      .collection("users")
      .doc(uid)
      .collection("devices")
      .doc(deviceId);

    const userDeviceSnap = await userDeviceRef.get();

    if (!userDeviceSnap.exists) {
      return reply
        .status(404)
        .send("Device não encontrado para este usuário.");
    }

    const logicRef = db
      .collection("devices")
      .doc(deviceId)
      .collection("logic")
      .doc("current");

    const snap = await logicRef.get();

    if (!snap.exists) {
      return reply.status(404).send("Nenhuma lógica salva para este device.");
    }

    const data = snap.data()!;
    const updatedAt = data.updatedAt?.toDate?.() ?? null;

    return reply.status(200).send({
      v: data.v,
      blocks: blocksFromFirestore(data.blocks),
      updatedAt: updatedAt ? updatedAt.toISOString() : null,
    });
  } catch (err) {
    request.log.error({ err }, "Erro ao buscar lógica");
    return reply.status(500).send("Erro ao buscar lógica. Tente novamente.");
  }
}

export async function getLogicForDeviceService(
  request: FastifyRequest<{ Params: { deviceId: string } }>,
  reply: FastifyReply
) {
  const { deviceId } = request.params;

  const deviceRef = db.collection("devices").doc(deviceId);
  const deviceSnap = await deviceRef.get();

  if (!deviceSnap.exists) {
    return reply.status(404).send("Device não encontrado.");
  }

  const logicRef = deviceRef.collection("logic").doc("current");
  const snap = await logicRef.get();

  if (!snap.exists) {
    return reply.status(404).send("Nenhuma lógica salva para este device.");
  }

  const data = snap.data()!;
  const updatedAt = data.updatedAt?.toDate?.() ?? null;

  const blocks = blocksFromFirestore(data.blocks).map(
    ({ x, y, ...rest }) => rest
  );

  return reply.status(200).send({
    v: data.v,
    blocks,
    updatedAt: updatedAt ? updatedAt.toISOString() : null,
  });
}