importScripts('https://www.gstatic.com/firebasejs/8.3.2/firebase-app.js');
importScripts('https://www.gstatic.com/firebasejs/8.3.2/firebase-messaging.js');

// [プロジェクトの設定] > [全般]タブの[SDK の設定と構成]で「CDN」を選択して表示されるスクリプトに置き換える
var firebaseConfig = {
  apiKey: "xxxxxxxxxxxxxxxxxxxx",
  authDomain: "your-project-id.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project-id.appspot.com",
  messagingSenderId: "0000000000000",
  appId: "1:0000000000000:web:000000000000000000000"
};
// Initialize Firebase
firebase.initializeApp(firebaseConfig);

const messaging = firebase.messaging();

messaging.onBackgroundMessage(function (payload) {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);
});