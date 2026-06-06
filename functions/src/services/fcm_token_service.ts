import * as admin from 'firebase-admin';

// Função para salvar FCM token no Firestore
export async function saveFCMToken(userid: string, deviceIds: string[], token: string,
) {
    try {
        const batch = admin.firestore().batch();

        deviceIds.forEach(deviceid => {
            const deviceTokenRef = admin.firestore()
                .collection('devices')
                .doc(deviceid)
                .collection('tokensfcm')
                .doc(token);

            const dataToSave: any = {
                userid: userid
            };

            batch.set(deviceTokenRef, dataToSave, { merge: true });
        });

        await batch.commit();

        return { status: 200, message: "Token salvo com sucesso!" };
    } catch (error) {
        throw new Error('Erro interno.');
    }
}

// Função para remover FCM token no Firestore
export async function removeFCMToken(userid: string, tokenfcm?: string) {
    try {
        const devicesCollection = admin.firestore().collection('devices-db');
        const snapshot = await devicesCollection.get();

        if (snapshot.empty) {
            return {
                status: 404,
                message: "Nenhum dispositivo encontrado para o userId fornecido.",
            };
        }

        const batch = admin.firestore().batch();

        const devicePromises = snapshot.docs.map(async (deviceDoc) => {
            const tokensRef = deviceDoc.ref.collection('tokensfcm');
            const tokenDocs = await tokensRef.get();

            tokenDocs.forEach((tokenDoc) => {
                const tokenData = tokenDoc.data();

                if (tokenfcm) {
                    // Excluir pelo token específico (logout simples)
                    if (tokenDoc.id === tokenfcm) {
                        batch.delete(tokenDoc.ref);
                    }
                } else {
                    // Excluir pelo userId
                    if (tokenData.userid === userid) {
                        batch.delete(tokenDoc.ref);
                    }
                }
            });
        });

        await Promise.all(devicePromises);
        await batch.commit();

        return {
            status: 200,
            message: "Tokens associados ao userId removidos com sucesso!",
        };
    } catch (error) {
        throw new Error('Erro interno.');
    }
}
