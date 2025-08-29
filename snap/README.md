# Snap Package for GitPeach Desktop

このディレクトリには、GitPeach Desktop の Snap パッケージを作成するための設定ファイルが含まれています。

## 必要な環境

- Ubuntu 18.04 以降または snap がサポートされている Linux ディストリビューション
- snapcraft (`sudo snap install snapcraft --classic`)

## ビルド手順

1. 最初に Debian パッケージをビルドします：
```bash
yarn package:linux
```

2. Snap パッケージをビルドします：
```bash
yarn build:snap
# または
yarn package:snap
```

## ファイル構成

- `snapcraft.yaml` - Snap パッケージの設定ファイル
- `script/build-snap.sh` - Snap ビルド用 bash スクリプト
- `script/package-snap.ts` - Snap ビルド用 TypeScript スクリプト

## 注意事項

- このアプリケーションは非公式の GitHub クライアントです
- GitHub Inc. によって開発されたものではありません
- Snap Store への公開には審査が必要です

## 生成されるファイル

ビルドが成功すると、`dist/` ディレクトリに `.snap` ファイルが生成されます。

## インストール方法

```bash
sudo snap install dist/rin-gitpeach-desktop_*.snap --dangerous --devmode
```

## アンインストール方法

```bash
sudo snap remove rin-gitpeach-desktop
```
