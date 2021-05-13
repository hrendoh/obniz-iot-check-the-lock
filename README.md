## Firebase へのデプロイ手順

### 前提条件

- デプロイ用のFirebaseプロジェクトを作成済み
- firebase CLI がインストール済み

### 1.プロジェクトで firebase にログイン

```
firebase login
```

### 2. Firebaseプロジェクトを切り替え

以下のコマンドで、用意したFirebaseプロジェクトに切り替えます

```
$ firebase use <your-project-id>
```

### 3. obniz のデバイス ID とアクセストークンを環境変数にセット

```
firebase functions:config:set obniz.obniz_id=<デバイスID>
firebase functions:config:set obniz.access_token=<デバイスのアクセストークン>
```

- <デバイス ID> : obniz Board 1Y のデバイス ID
- <デバイスのアクセストークン> : obniz Board 1Y のデバイスのアクセストークン

設定は`firebase functions:config:get`コマンドで確認できます。

### 4. Webアプリの設定
#### public/index.htmlのvapidKeyを置き換える

Firebaseプロジェクトの[プロジェクトの概要]からWebアプリを開き、以下のvapidKeyの値「VAPI_KEY_VALUE」を[Cloud Messaging]タブの[ウェブプッシュ証明書] > [鍵ペア]の値に置き換えます。

```
messaging.getToken({ vapidKey: 'VAPI_KEY_VALUE' }).then((currentToken) => {
```

#### サービスワーカーのFirebaseの初期化を置き換える

public/firebase-messaging-sw.jsのFirebaseの初期化処理を、[プロジェクトの設定] > [全般]タブの[SDK の設定と構成]で「CDN」を選択して表示されるスクリプトに置き換えます。

```
  // Your web app's Firebase configuration
  var firebaseConfig = {
    apiKey: "xxxxxxxxxxxxxxxxxxxx",
    authDomain: "your-project-id.firebaseapp.com",
    projectId: "your-project-id",
    storageBucket: "your-project-id.appspot.com",
    messagingSenderId: "0000000000000",
    appId: "1:666167191710:web:000000000000000000000"
  };
  // Initialize Firebase
  firebase.initializeApp(firebaseConfig);
```

### 5.デプロイする

```
firebase deploy
```
