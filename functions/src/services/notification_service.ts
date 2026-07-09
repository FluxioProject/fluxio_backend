import { admin } from "../firebaseAdmin";

const MOBILE_NOTIFICATION_COOLDOWN_MS = 60 * 1000;

function getCooldownMessage(remainingMs: number): string {
    const remainingSeconds = Math.ceil(remainingMs / 1000);
    return `Notificacao ignorada por rate limit. Tente novamente em ${remainingSeconds}s.`;
}

// Send mobile push notifications.
export async function sendNotification(
    deviceid: string,
    message: string,
): Promise<{ message: string }> {
    try {
        const deviceRef = admin.firestore().collection("devices").doc(deviceid);
        const now = Date.now();

        const rateLimitResult = await admin.firestore().runTransaction(async (transaction) => {
            const deviceSnapshot = await transaction.get(deviceRef);

            if (!deviceSnapshot.exists) {
                return {
                    allowed: false,
                    message: "Dispositivo nao encontrado.",
                    userId: null,
                };
            }

            const deviceData = deviceSnapshot.data() as {
                userId: string;
                lastMobileNotificationAt?: FirebaseFirestore.Timestamp;
            };

            const lastNotificationAt = deviceData.lastMobileNotificationAt?.toMillis() ?? 0;
            const elapsedMs = now - lastNotificationAt;

            if (elapsedMs < MOBILE_NOTIFICATION_COOLDOWN_MS) {
                return {
                    allowed: false,
                    message: getCooldownMessage(MOBILE_NOTIFICATION_COOLDOWN_MS - elapsedMs),
                    userId: deviceData.userId,
                };
            }

            transaction.update(deviceRef, {
                lastMobileNotificationAt: admin.firestore.Timestamp.fromMillis(now),
            });

            return {
                allowed: true,
                message: "OK",
                userId: deviceData.userId,
            };
        });

        if (!rateLimitResult.allowed) {
            return { message: rateLimitResult.message };
        }

        const tokensSnapshot = await deviceRef.collection("tokensfcm").get();

        if (tokensSnapshot.empty) {
            return { message: "Nenhum token encontrado." };
        }

        const userId = rateLimitResult.userId;

        if (!userId) {
            return { message: "Dispositivo nao encontrado." };
        }

        const descriptionSnapshot = await admin.firestore()
            .collection("users")
            .doc(userId)
            .collection("devices")
            .doc(deviceid)
            .get();

        if (!descriptionSnapshot.exists) {
            return { message: "Dispositivo nao encontrado 2." };
        }

        const { name } = descriptionSnapshot.data() as { name: string };

        const tokenData = tokensSnapshot.docs.map(doc => {
            return {
                token: doc.id,
                name,
            };
        });

        // Create one personalized message per token.
        const messages = tokenData.map(({ token, name }) => {
            return {
                token,
                notification: {
                    title: name,
                    body: message,
                },
                data: { deviceid, name },
                apns: {
                    payload: {
                        aps: {
                            "content-available": 1,
                            "mutable-content": 1,
                        },
                    },
                },
            };
        });

        // Send notifications.
        const response = await admin.messaging().sendEach(messages);

        // Check and remove invalid tokens.
        const tokensToDelete = response.responses
            .map((resp, index) => {
                const errorCode = resp.error?.code;
                if (!resp.success && (errorCode === "messaging/invalid-registration-token" || errorCode === "messaging/registration-token-not-registered")) {
                    return tokenData[index].token;
                }
                return null;
            })
            .filter(token => token !== null);

        if (tokensToDelete.length > 0) {
            await Promise.all(tokensToDelete.map(token =>
                deviceRef
                    .collection("tokensfcm")
                    .doc(token as string)
                    .delete()
            ));
        }

        return { message: "Notificacoes enviadas com sucesso!" };

    } catch (error) {
        console.log("Erro ao enviar notificacoes:", error);

        throw new Error("Erro interno.");
    }
}
