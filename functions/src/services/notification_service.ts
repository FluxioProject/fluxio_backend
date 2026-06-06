import { admin } from "../firebaseAdmin";

// Função para enviar notificações
export async function sendNotification(
    deviceid: string,
    message: string,
): Promise<{ message: string }> {
    try {
        const [tokensSnapshot, deviceSnapshot] = await Promise.all([
            admin.firestore().collection('devices').doc(deviceid).collection('tokensfcm').get(),
            admin.firestore().collection('devices').doc(deviceid).get(),
        ]);

        if (tokensSnapshot.empty) {
            return { message: 'Nenhum token encontrado.' };
        }
        if (!deviceSnapshot.exists) {
            return { message: "Dispositivo não encontrado." };
        }

        const { userId } = deviceSnapshot.data() as { userId: string };

        const descriptionSnapshot = await admin.firestore()
            .collection('users')
            .doc(userId)
            .collection('devices')
            .doc(deviceid)
            .get();

        if (!descriptionSnapshot.exists) {
            return { message: "Dispositivo não encontrado 2." };
        }

        const { name } = descriptionSnapshot.data() as { name: string };

        setImmediate(async () => {
            try {
                const tokenData = tokensSnapshot.docs.map(doc => {
                    return {
                        token: doc.id,
                        name,
                    };
                });

                // Criando mensagens personalizadas por token com base na linguagem
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
                                }
                            }
                        }
                    };
                });

                // Envia as notificações
                const response = await admin.messaging().sendEach(messages);

                // Verificar e remover tokens inválidos
                const tokensToDelete = response.responses
                    .map((resp, index) => {
                        const errorCode = resp.error?.code;
                        if (!resp.success && (errorCode === 'messaging/invalid-registration-token' || errorCode === 'messaging/registration-token-not-registered')) {
                            return tokenData[index].token;
                        }
                        return null;
                    })
                    .filter(token => token !== null);

                if (tokensToDelete.length > 0) {
                    await Promise.all(tokensToDelete.map(token =>
                        admin.firestore()
                            .collection('devices')
                            .doc(deviceid)
                            .collection('tokensfcm')
                            .doc(token as string)
                            .delete()
                    ));
                }
            } catch (err) {
                console.log('Erro ao enviar notificações:', err);
                throw new Error('Erro interno.');
            }
        });

        return { message: "Notificações enviadas com sucesso!" };

    } catch (error) {
        console.log('Erro ao enviar notificações:', error);

        throw new Error('Erro interno.');
    }
}