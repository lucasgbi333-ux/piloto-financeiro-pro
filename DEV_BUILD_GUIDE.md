# Guia de Build para Expo Dev Build — Radar de Ganhos

Este documento descreve como gerar um **APK de desenvolvimento** (Dev Build) do Piloto Financeiro Pro com o módulo nativo do Radar de Ganhos ativado.

## Pré-requisitos

1. **Node.js 18+** e **npm** ou **pnpm** instalados
2. **Java 17+** instalado (necessário para compilar Kotlin)
3. **Android SDK** com API 35 (ou compatível)
4. **Expo CLI** instalado globalmente: `npm install -g expo-cli`
5. **EAS CLI** instalado globalmente: `npm install -g eas-cli`
6. **Conta Expo** (gratuita) para usar EAS Build

## Estrutura do Módulo Nativo

O módulo nativo está localizado em `modules/radar-overlay/` e contém:

```
modules/radar-overlay/
├── expo-module.config.json          # Configuração do módulo Expo
├── android/build.gradle             # Build do módulo Android
├── android/src/main/
│   ├── AndroidManifest.xml          # Permissões e declaração do AccessibilityService
│   ├── java/expo/modules/radaroverlay/
│   │   ├── RadarOverlayModule.kt    # Bridge Expo Modules (JS ↔ Kotlin)
│   │   ├── RadarAccessibilityService.kt  # Captura de dados via Accessibility
│   │   ├── OverlayManager.kt        # Gerencia o overlay com WindowManager
│   │   ├── RideOffer.kt             # Modelo de dados de oferta
│   │   └── RideTextParser.kt        # Parser de texto das notificações
│   └── res/
│       ├── xml/accessibility_service_config.xml
│       └── values/strings.xml
├── index.ts                         # API TypeScript do módulo
└── src/index.ts                     # Re-export

plugins/
└── withRadarOverlay.js              # Config plugin para adicionar permissões
```

## Passo 1: Preparar o Projeto Localmente

```bash
cd /home/ubuntu/piloto-financeiro-pro

# Instalar dependências
pnpm install

# Verificar que o módulo nativo está registrado
ls -la modules/radar-overlay/
```

## Passo 2: Configurar EAS Build

```bash
# Login na conta Expo
eas login

# Inicializar EAS no projeto (se não existir eas.json)
eas build:configure
```

Isso criará um arquivo `eas.json`. Adicione a seguinte configuração:

```json
{
  "cli": {
    "version": ">= 5.0.0"
  },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal",
      "android": {
        "buildType": "apk",
        "gradleCommand": ":app:assembleRelease"
      }
    },
    "preview": {
      "android": {
        "buildType": "apk"
      }
    },
    "production": {
      "android": {
        "buildType": "aab"
      }
    }
  },
  "submit": {
    "production": {
      "android": {
        "serviceAccount": "~/.android/service-account.json",
        "track": "internal"
      }
    }
  }
}
```

## Passo 3: Gerar o APK de Desenvolvimento

```bash
# Build para Android (Dev Build com módulo nativo)
eas build --platform android --profile development

# Ou, se preferir compilar localmente (requer Android SDK completo):
# expo prebuild --clean
# cd android && ./gradlew assembleRelease && cd ..
```

O EAS Build vai:
1. Fazer checkout do código
2. Executar `expo prebuild` para gerar código Android nativo
3. Compilar o módulo Kotlin (`modules/radar-overlay/`)
4. Gerar o APK final com o módulo integrado

**Tempo estimado:** 10-15 minutos na primeira build.

## Passo 4: Baixar e Instalar o APK

Após a build completar:

```bash
# O link de download aparecerá no terminal
# Ou acesse: https://expo.dev/builds

# Instalar no dispositivo Android conectado
adb install -r ~/Downloads/piloto-financeiro-pro-dev.apk

# Ou, transferir para o dispositivo manualmente e instalar
```

## Passo 5: Testar o Overlay

1. **Abra o app** no dispositivo Android
2. **Navegue para "Radar de Ganhos"** (aba com ícone de radar)
3. **Verifique as permissões:**
   - Se a permissão "Exibir sobre outros apps" não estiver concedida, toque em "Abrir configurações"
   - Se o Serviço de Acessibilidade não estiver ativo, toque em "Ativar acessibilidade"
4. **Teste o overlay:**
   - Toque no botão **"Testar Overlay"** (laranja, na seção Aparência)
   - Um pop-up com dados fictícios deve aparecer sobre o app
   - Ajuste os sliders (tamanho, transparência, duração) e teste novamente

## Passo 6: Testar com Apps de Corrida Reais

1. **Instale um app de corrida** (Uber, 99 ou InDrive) no dispositivo
2. **Abra o app de corrida** e aguarde uma oferta de corrida
3. **O overlay do Piloto Financeiro Pro deve aparecer automaticamente** com:
   - Cor do semáforo (verde/amarelo/vermelho)
   - Valor da corrida
   - Ganhos por km, hora, minuto
   - Nota do passageiro

## Troubleshooting

### "Módulo nativo não disponível"

Se o app disser "Módulo nativo não disponível", você está rodando no **Expo Go** em vez do Dev Build.

**Solução:** Use o APK do Dev Build, não o Expo Go.

### "Permissão de overlay não concedida"

1. Abra **Configurações do Android**
2. Vá para **Aplicativos** → **Permissões especiais** → **Exibir sobre outros apps**
3. Encontre "Piloto Financeiro Pro" e ative a permissão

### "Serviço de Acessibilidade não ativo"

1. Abra **Configurações do Android**
2. Vá para **Acessibilidade** → **Serviços**
3. Encontre "Piloto Financeiro Pro - Radar de Ganhos" e ative

### O overlay não aparece sobre apps de corrida

Verifique:
- [ ] Ambas as permissões estão concedidas
- [ ] O app de corrida está entre os suportados (Uber, 99, InDrive)
- [ ] O semáforo está habilitado na tela Radar de Ganhos
- [ ] O app de corrida está em primeiro plano (tela ativa)

## Estrutura de Permissões

O módulo nativo declara:

- **`SYSTEM_ALERT_WINDOW`** — Permite desenhar sobre outros apps
- **`BIND_ACCESSIBILITY_SERVICE`** — Permite ativar o serviço de acessibilidade
- **`FOREGROUND_SERVICE`** — (Futuro) Para manter o serviço rodando em background

## Próximos Passos

1. **Captura de tela automática:** Implementar `MediaProjection` para salvar prints das ofertas
2. **Notificações push:** Alertar o usuário quando uma oferta boa chegar
3. **Histórico sincronizado:** Armazenar ofertas capturadas e sincronizar com Supabase
4. **Integração com Dashboard:** Mostrar estatísticas das ofertas no Dashboard principal

## Contato & Suporte

Se encontrar problemas:

1. Verifique os logs: `adb logcat | grep RadarOverlay`
2. Consulte a documentação do Expo: https://docs.expo.dev/modules/get-started/
3. Verifique o código do módulo em `modules/radar-overlay/`

---

**Versão:** 1.0  
**Data:** 2026-04-09  
**Compatibilidade:** Android 6.0+ (API 24+)
