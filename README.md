# Claude Futebol

Jogo de futebol 3D 3 contra 3 no estilo Brawl Stars: começa com o Chico e vai liberando os outros jogadores
(Raro, Super Raro, Épico, Mítico e Lendário), cada um com um super diferente. Tem editor para criar o próprio
campo e uma aba para jogar os mapas que a galera publicou.

- React Native + Expo + TypeScript
- Site (PWA) na Vercel via React Native Web: `npx expo export -p web`
- Android/iPhone pelo EAS: `eas build -p android --profile apk` (APK), `--profile production` (AAB) e `eas build -p ios`
- Jogadores modelados, com esqueleto e animações, no Blender: `blender/gerar_personagens.py`
