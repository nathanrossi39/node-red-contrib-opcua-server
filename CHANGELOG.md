# Changelog

All notable changes to this project will be documented in this file. See [standard-version](https://github.com/conventional-changelog/standard-version) for commit guidelines.

## 2.0.0 (2026-09-08)


### ⚠ BREAKING CHANGES

* the server node type changed from opcua-compact-server to opcua-compact-server-v2. Existing flows must replace the old node with the new Compact-Server v2 node (config fields are unchanged).

### Features

* add External Helper Module field - load shared JS without settings.js ([b9fe712](https://github.com/nathanrossi39/node-red-contrib-opcua-server/commit/b9fe7121eee7ed1cb12b2936e2cafb115c314f89))
* add Namespace URI field on the node editor ([321871d](https://github.com/nathanrossi39/node-red-contrib-opcua-server/commit/321871d0d6b0742ad48d10e54b6051c915f724d6))
* Bad-quality tag flagging on device/feed silence (Kepware-style) ([6a884f7](https://github.com/nathanrossi39/node-red-contrib-opcua-server/commit/6a884f77c9d6de13afaefe4ff5ebb01801140ee3))
* Import from JSON now handles pasting directly from existing JS code ([b369901](https://github.com/nathanrossi39/node-red-contrib-opcua-server/commit/b369901b1c4a658b928eb7edecf7b5ee828a01ce))
* Import from JSON on the tag dictionary node ([d1d5dca](https://github.com/nathanrossi39/node-red-contrib-opcua-server/commit/d1d5dcae46dc872ade104822882ffd84bbd36759))
* new product uri access ([56f4617](https://github.com/nathanrossi39/node-red-contrib-opcua-server/commit/56f4617e8074e26abbe1f205a4f834989b25738c))
* opcua-tag-dictionary node - config-editor UI for the tag dictionary ([7c935a9](https://github.com/nathanrossi39/node-red-contrib-opcua-server/commit/7c935a9aed8d51d135c6a9bdfec580c3bfabe8bd))
* rename server node type to opcua-compact-server-v2 ([5a8cf5a](https://github.com/nathanrossi39/node-red-contrib-opcua-server/commit/5a8cf5a36a88ffabc00785b366573e12a9eb7d6b))
* **server:** add the wohle server from compact development ([4091b60](https://github.com/nathanrossi39/node-red-contrib-opcua-server/commit/4091b604e4e34a582864a47b42630861b1742d3b))
* **server:** use custom config on server and give more config access ([a09ebfe](https://github.com/nathanrossi39/node-red-contrib-opcua-server/commit/a09ebfee1d62e8962c20327f840ee4f9ce47adf1))
* warn at startup on insecure/unbounded production defaults ([d31aa01](https://github.com/nathanrossi39/node-red-contrib-opcua-server/commit/d31aa01a69b16d30ea07895dbe5727a592053a79))
* Windows deploy script, openssl pre-check, complete example flow ([69517c1](https://github.com/nathanrossi39/node-red-contrib-opcua-server/commit/69517c19322262ac86687a219333399761b770e5))


### Bug Fixes

* blueprint helper - node-opcua module resolution and startup collision ([27a4975](https://github.com/nathanrossi39/node-red-contrib-opcua-server/commit/27a4975e0fb44802a4c65dd12f05a94bc7dd7674))
* codacy ([3fbe647](https://github.com/nathanrossi39/node-red-contrib-opcua-server/commit/3fbe647fef212b86619dd4ee1b9eecf6f497967b))
* correct Prettier formatting, remove stray duplicate test file ([e3e82fd](https://github.com/nathanrossi39/node-red-contrib-opcua-server/commit/e3e82fd0585a127564d4cf79e4e26bb7e55143fb))
* example flow - explicit session/connection limits, use Tag Dictionary node ([d693ba6](https://github.com/nathanrossi39/node-red-contrib-opcua-server/commit/d693ba6656adc291c6c0d42016fc2490b0329711))
* guard against unhandled promise rejection crashing the process during server init ([3b9180b](https://github.com/nathanrossi39/node-red-contrib-opcua-server/commit/3b9180bd2a6de747ecbb4027d5e41094566ceadb))
* icon reference used an outdated Node-RED icon convention ([3e6174d](https://github.com/nathanrossi39/node-red-contrib-opcua-server/commit/3e6174dffe260a51f67e0e439f62f8879359851d))
* install failure ([cc41404](https://github.com/nathanrossi39/node-red-contrib-opcua-server/commit/cc41404c63dcfe77492fb5771a9426fd01aab552))
* maxAllowedSubscriptionNumber silently ignored, defaulting to 10 subscriptions ([530e170](https://github.com/nathanrossi39/node-red-contrib-opcua-server/commit/530e17035d925ecd8d50febbdd0e5b32eb3559d0))
* minifier collapsed // comments into following code, breaking the palette ([f229a7a](https://github.com/nathanrossi39/node-red-contrib-opcua-server/commit/f229a7a235e32b9db68591735ba5a393d00ea33d))
* minifier comment collapse and outdated icon reference in tag-dictionary node ([6df9b05](https://github.com/nathanrossi39/node-red-contrib-opcua-server/commit/6df9b05e38cba366cba2f7d1c6223fa412eba32d))
* node-opcua bump to ~2.175.2 + fix 3 real bugs it surfaced ([ee1e33d](https://github.com/nathanrossi39/node-red-contrib-opcua-server/commit/ee1e33dbe0b9c823087d7d0f42a4e1289f5ca20e))
* node-red manage install missing source-map-support ([c3b9c17](https://github.com/nathanrossi39/node-red-contrib-opcua-server/commit/c3b9c17d18e6f9313c8ce4841879679d5516baa4))
* Node.js 24 compatibility - replace vm2 and harden certificate script ([4eaa7b7](https://github.com/nathanrossi39/node-red-contrib-opcua-server/commit/4eaa7b7559e233374b63f37ae362e0bcbad895e2))
* npm install ([9d19ad9](https://github.com/nathanrossi39/node-red-contrib-opcua-server/commit/9d19ad9ebcc0b6c62daef45dcb3ea779c95e23d0))
* prettier style for travis ([38ed92f](https://github.com/nathanrossi39/node-red-contrib-opcua-server/commit/38ed92f9889a1e5035f73fe58896e6c3ff46472e))
* remove ISA95  ([15eb1e6](https://github.com/nathanrossi39/node-red-contrib-opcua-server/commit/15eb1e6f65137d07806297b39a49186179478e77))
* restore Discovery tab config, add session lifecycle test coverage, tidy headers ([1793b2a](https://github.com/nathanrossi39/node-red-contrib-opcua-server/commit/1793b2aa9cba25330e6493d29e97d47e67fed2e7))
* retry test suite once in deploy.sh - known intermittent timing flake was silently blocking deploys ([3deb4b5](https://github.com/nathanrossi39/node-red-contrib-opcua-server/commit/3deb4b5d3138b1e73cb176821bd752d26092cd54))
* sandboxed setTimeout/setInterval wrappers never actually applied ([8a3e9db](https://github.com/nathanrossi39/node-red-contrib-opcua-server/commit/8a3e9db503c4fa5314fafeb1efdc28722ae966d5))
* **server:** HTML key inputs to short ([c71061c](https://github.com/nathanrossi39/node-red-contrib-opcua-server/commit/c71061c77efd83e595c27862c8a884ef9b097498))
* **server:** html template for address space ([2d3eebb](https://github.com/nathanrossi39/node-red-contrib-opcua-server/commit/2d3eebb9410136e57b3409332c5a89226cdb414b))
* set back to HIDDEN default in discovery because of crashing LDS without a running LDS  ([7e7377e](https://github.com/nathanrossi39/node-red-contrib-opcua-server/commit/7e7377e2c1cc998dc425a8a21214258e94a203d8))
* travis npm ([d67f905](https://github.com/nathanrossi39/node-red-contrib-opcua-server/commit/d67f9050dc05c46e0901d88029456ab017b04249))
* use serverCapabilities.maxSessions instead of deprecated maxAllowedSessionNumber ([fdb0d90](https://github.com/nathanrossi39/node-red-contrib-opcua-server/commit/fdb0d903c8e2c5e88ccc04794cf6491314feeabc))
* vm2 not ready to use object shorthand for now ([a4dddb7](https://github.com/nathanrossi39/node-red-contrib-opcua-server/commit/a4dddb7f5c0f263c2e24a39542337ac2ee09e4e7))
* xml sets moved but more ([a045ee9](https://github.com/nathanrossi39/node-red-contrib-opcua-server/commit/a045ee926f41902f97c2b3847d390ee3eb316d8a))

## 1.2.3 (2026-09-08)


### Bug Fixes

* blueprint helper - node-opcua module resolution and startup collision ([27a4975](https://github.com/nathanrossi39/node-red-contrib-opcua-server/commit/27a4975e0fb44802a4c65dd12f05a94bc7dd7674))
* codacy ([3fbe647](https://github.com/nathanrossi39/node-red-contrib-opcua-server/commit/3fbe647fef212b86619dd4ee1b9eecf6f497967b))
* correct Prettier formatting, remove stray duplicate test file ([e3e82fd](https://github.com/nathanrossi39/node-red-contrib-opcua-server/commit/e3e82fd0585a127564d4cf79e4e26bb7e55143fb))
* example flow - explicit session/connection limits, use Tag Dictionary node ([d693ba6](https://github.com/nathanrossi39/node-red-contrib-opcua-server/commit/d693ba6656adc291c6c0d42016fc2490b0329711))
* guard against unhandled promise rejection crashing the process during server init ([3b9180b](https://github.com/nathanrossi39/node-red-contrib-opcua-server/commit/3b9180bd2a6de747ecbb4027d5e41094566ceadb))
* icon reference used an outdated Node-RED icon convention ([3e6174d](https://github.com/nathanrossi39/node-red-contrib-opcua-server/commit/3e6174dffe260a51f67e0e439f62f8879359851d))
* install failure ([cc41404](https://github.com/nathanrossi39/node-red-contrib-opcua-server/commit/cc41404c63dcfe77492fb5771a9426fd01aab552))
* maxAllowedSubscriptionNumber silently ignored, defaulting to 10 subscriptions ([530e170](https://github.com/nathanrossi39/node-red-contrib-opcua-server/commit/530e17035d925ecd8d50febbdd0e5b32eb3559d0))
* minifier collapsed // comments into following code, breaking the palette ([f229a7a](https://github.com/nathanrossi39/node-red-contrib-opcua-server/commit/f229a7a235e32b9db68591735ba5a393d00ea33d))
* minifier comment collapse and outdated icon reference in tag-dictionary node ([6df9b05](https://github.com/nathanrossi39/node-red-contrib-opcua-server/commit/6df9b05e38cba366cba2f7d1c6223fa412eba32d))
* node-opcua bump to ~2.175.2 + fix 3 real bugs it surfaced ([ee1e33d](https://github.com/nathanrossi39/node-red-contrib-opcua-server/commit/ee1e33dbe0b9c823087d7d0f42a4e1289f5ca20e))
* node-red manage install missing source-map-support ([c3b9c17](https://github.com/nathanrossi39/node-red-contrib-opcua-server/commit/c3b9c17d18e6f9313c8ce4841879679d5516baa4))
* Node.js 24 compatibility - replace vm2 and harden certificate script ([4eaa7b7](https://github.com/nathanrossi39/node-red-contrib-opcua-server/commit/4eaa7b7559e233374b63f37ae362e0bcbad895e2))
* npm install ([9d19ad9](https://github.com/nathanrossi39/node-red-contrib-opcua-server/commit/9d19ad9ebcc0b6c62daef45dcb3ea779c95e23d0))
* prettier style for travis ([38ed92f](https://github.com/nathanrossi39/node-red-contrib-opcua-server/commit/38ed92f9889a1e5035f73fe58896e6c3ff46472e))
* remove ISA95  ([15eb1e6](https://github.com/nathanrossi39/node-red-contrib-opcua-server/commit/15eb1e6f65137d07806297b39a49186179478e77))
* restore Discovery tab config, add session lifecycle test coverage, tidy headers ([1793b2a](https://github.com/nathanrossi39/node-red-contrib-opcua-server/commit/1793b2aa9cba25330e6493d29e97d47e67fed2e7))
* retry test suite once in deploy.sh - known intermittent timing flake was silently blocking deploys ([3deb4b5](https://github.com/nathanrossi39/node-red-contrib-opcua-server/commit/3deb4b5d3138b1e73cb176821bd752d26092cd54))
* sandboxed setTimeout/setInterval wrappers never actually applied ([8a3e9db](https://github.com/nathanrossi39/node-red-contrib-opcua-server/commit/8a3e9db503c4fa5314fafeb1efdc28722ae966d5))
* **server:** HTML key inputs to short ([c71061c](https://github.com/nathanrossi39/node-red-contrib-opcua-server/commit/c71061c77efd83e595c27862c8a884ef9b097498))
* **server:** html template for address space ([2d3eebb](https://github.com/nathanrossi39/node-red-contrib-opcua-server/commit/2d3eebb9410136e57b3409332c5a89226cdb414b))
* set back to HIDDEN default in discovery because of crashing LDS without a running LDS  ([7e7377e](https://github.com/nathanrossi39/node-red-contrib-opcua-server/commit/7e7377e2c1cc998dc425a8a21214258e94a203d8))
* travis npm ([d67f905](https://github.com/nathanrossi39/node-red-contrib-opcua-server/commit/d67f9050dc05c46e0901d88029456ab017b04249))
* vm2 not ready to use object shorthand for now ([a4dddb7](https://github.com/nathanrossi39/node-red-contrib-opcua-server/commit/a4dddb7f5c0f263c2e24a39542337ac2ee09e4e7))
* xml sets moved but more ([a045ee9](https://github.com/nathanrossi39/node-red-contrib-opcua-server/commit/a045ee926f41902f97c2b3847d390ee3eb316d8a))


### Features

* add External Helper Module field - load shared JS without settings.js ([b9fe712](https://github.com/nathanrossi39/node-red-contrib-opcua-server/commit/b9fe7121eee7ed1cb12b2936e2cafb115c314f89))
* add Namespace URI field on the node editor ([321871d](https://github.com/nathanrossi39/node-red-contrib-opcua-server/commit/321871d0d6b0742ad48d10e54b6051c915f724d6))
* Bad-quality tag flagging on device/feed silence (Kepware-style) ([6a884f7](https://github.com/nathanrossi39/node-red-contrib-opcua-server/commit/6a884f77c9d6de13afaefe4ff5ebb01801140ee3))
* Import from JSON now handles pasting directly from existing JS code ([b369901](https://github.com/nathanrossi39/node-red-contrib-opcua-server/commit/b369901b1c4a658b928eb7edecf7b5ee828a01ce))
* Import from JSON on the tag dictionary node ([d1d5dca](https://github.com/nathanrossi39/node-red-contrib-opcua-server/commit/d1d5dcae46dc872ade104822882ffd84bbd36759))
* new product uri access ([56f4617](https://github.com/nathanrossi39/node-red-contrib-opcua-server/commit/56f4617e8074e26abbe1f205a4f834989b25738c))
* opcua-tag-dictionary node - config-editor UI for the tag dictionary ([7c935a9](https://github.com/nathanrossi39/node-red-contrib-opcua-server/commit/7c935a9aed8d51d135c6a9bdfec580c3bfabe8bd))
* **server:** add the wohle server from compact development ([4091b60](https://github.com/nathanrossi39/node-red-contrib-opcua-server/commit/4091b604e4e34a582864a47b42630861b1742d3b))
* **server:** use custom config on server and give more config access ([a09ebfe](https://github.com/nathanrossi39/node-red-contrib-opcua-server/commit/a09ebfee1d62e8962c20327f840ee4f9ce47adf1))
* warn at startup on insecure/unbounded production defaults ([d31aa01](https://github.com/nathanrossi39/node-red-contrib-opcua-server/commit/d31aa01a69b16d30ea07895dbe5727a592053a79))
* Windows deploy script, openssl pre-check, complete example flow ([69517c1](https://github.com/nathanrossi39/node-red-contrib-opcua-server/commit/69517c19322262ac86687a219333399761b770e5))



