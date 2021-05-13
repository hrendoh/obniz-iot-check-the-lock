const functions = require('firebase-functions');
const admin = require('firebase-admin');
const Obniz = require('obniz');
const fetch = require('node-fetch');

const { obniz_id, access_token } = functions.config().obniz;

admin.initializeApp();
const db = admin.firestore();

const OBNIZ_REST_API_ENDPOINT = `https://obniz.com/obniz/${obniz_id}/api/1`;

// REST APIでIOトリガースリープを実行
const sleepIOTrigger = async () => {
  const opt = {
    method: 'POST',
    body: JSON.stringify([
      {
        "system": {
          "sleep_io_trigger": true
        }
      }
    ]),
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${access_token}`
    }
  };
  await fetch(OBNIZ_REST_API_ENDPOINT, opt);
}

// Firestoreに計測データを保存
const storeDistance = async (distance) => {
  try {
    console.log('storeDistance', distance);
    const docRef = await db.collection("logs").add({
      distance: distance,
      timestamp: new Date()
    });
    console.log("Document written with ID: ", docRef.id);
  } catch (err) {
    console.log('firestore error:', err);
  }
}

// 計測データをPWAにpush送信
const sendDistance = async (distance) => {
  const tokenSnapshot = await db.collection('tokens').orderBy('timestamp', 'desc').limit(1).get();
  if (!tokenSnapshot.empty) {
    const doc = tokenSnapshot.docs[0];
    const data = doc.data();
    var payload = {
      data: {
        distance: `${distance}`
      }
    };
    try {
      const response = await admin.messaging().sendToDevice(data.token, payload);
      console.log('Successfully sent message:', response);
    } catch (error) {
      console.log('Error sending message:', error);
    }
  }
}

// 開きっぱなしをpush通知
const sendNotification = async () => {
  const tokenSnapshot = await db.collection('tokens').orderBy('timestamp', 'desc').limit(1).get();
  if (!tokenSnapshot.empty) {
    const doc = tokenSnapshot.docs[0];
    const data = doc.data();
    console.log(data.token, data.timestamp);
    var payload = {
      notification: {
        title: 'ドアが空いています',
        body: '戸締まりして下さい',
        icon: 'images/icons/icon-192x192.png',
      }
    };
    try {
      const response = await admin.messaging().sendToDevice(data.token, payload);
      console.log('Successfully sent message:', response);
    } catch (error) {
      console.log('Error sending message:', error);
    }
  }
}

// メインロジック 1分ごとに実行
const main = async () => {
  const obniz = new Obniz(obniz_id, { access_token: access_token })
  // 参考: https://qiita.com/wicket/items/8b1acffdd9880e2b3637
  const connected = await obniz.connectWait({ timeout: 5 });

  if (!connected) {
    console.log('obniz is offline. skip process.');
    await obniz.closeWait();
    return;
  }
  console.log('Obniz connected!');

  try {
    const sensor = obniz.wired('VL53L0X', { scl: 2, sda: 1 });
    const distance = await sensor.getWait();
    console.log(distance);
    await storeDistance(distance);
    await sendDistance(distance);

    const snapshot = await db.collection('logs').orderBy('timestamp', 'desc').limit(3).get();
    let isGoingSleep = false;
    if (!snapshot.empty) {
      // 最近の計測が3回連続で閉じているか？
      isGoingSleep = snapshot.docs.every((doc) => {
        const data = doc.data();
        console.log(data.distance, data.timestamp);
        return data.distance > 20 && data.distance < 120;
      });
    }

    if (isGoingSleep) {
      // リセットのデータ -1 を保存して、IOトリガーでスリープ
      console.log('Key is closing, going to sleep.');
      await storeDistance(-1);
      await sleepIOTrigger();
    } else {
      // 3回連続で開いていたらpush通知
      const isPushing = snapshot.docs.every((doc) => {
        const data = doc.data();
        console.log(data.distance, data.timestamp);
        return data.distance === 20 || data.distance > 120;
      });
      console.log('Do push: ' + isPushing);
      if (isPushing) {
        sendNotification();
      }
    }
  } catch (err) {
    console.log(err);
  } finally {
    await obniz.closeWait();
  }
}

exports.runGetDistance = functions.region('asia-northeast1').https.onRequest(async (request, response) => {
  const distance = await getDistance();
  response.send('distance:' + distance);
});

exports.runSendNotification = functions.region('asia-northeast1').https.onRequest(async (request, response) => {
  await sendNotification();
  response.send('notification is sent.');
});

exports.runMain = functions.region('asia-northeast1').https.onRequest(async (request, response) => {
  await main();
  response.send('Status checked.');
});

exports.scheduledFunction = functions.region('asia-northeast1').pubsub.schedule('every 1 minutes')
  .onRun(main);