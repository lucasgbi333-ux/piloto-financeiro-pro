# KeyStore de Produção - Piloto Financeiro Pro

**Data de Criação:** 14 de abril de 2026

---

## 📋 Informações da KeyStore

### Arquivo
- **Nome:** `piloto-financeiro-prod.jks`
- **Localização:** `android/app/keystore/piloto-financeiro-prod.jks`
- **Tamanho:** 2.8 KB
- **Formato:** PKCS12

### Credenciais
- **Senha da KeyStore:** `PilotoFinanceiro2026!`
- **Nome do Alias:** `piloto_prod`
- **Senha do Alias:** `PilotoFinanceiro2026!`

### Detalhes do Certificado
- **Proprietário:** CN=Lucas, OU=Piloto Financeiro Pro, O=Piloto Financeiro Pro, L=Vitória da Conquista, ST=BA, C=BR
- **Algoritmo:** SHA256withRSA
- **Tamanho da Chave:** 2048-bit RSA
- **Validade:** 30 anos (até 06 de abril de 2056)
- **Data de Criação:** 14 de abril de 2026

### Fingerprints
- **SHA1:** `F8:61:88:23:3C:1E:43:FA:07:2D:24:8B:0F:77:85:21:22:EF:BE:22`
- **SHA256:** `96:FD:FA:60:C5:2C:8A:0A:5C:13:37:73:FF:98:C8:51:10:69:7B:14:25:85:24:5C:D5:3D:BA:BE:6B:96:2B:C4`

---

## 🔒 Segurança

**⚠️ IMPORTANTE:**
- Guarde este arquivo em local seguro
- Nunca compartilhe as senhas
- Faça backup do arquivo `.jks`
- Se a senha for comprometida, gere uma nova KeyStore

---

## 📱 Configurações do Android

### Package Name
```
com.lucas.pilotofinanceiro
```

### Version
```
1.0.14
```

### Permissões
```
- POST_NOTIFICATIONS (para notificações push)
```

### Intent Filters
- Deep link scheme: `pilotofinanceiro://`
- Stripe redirects: `pilotofinanceiro://checkout-success` e `pilotofinanceiro://checkout-canceled`

---

## 🚀 Como Usar a KeyStore

### Para Assinar um APK
```bash
jarsigner -verbose -sigalg SHA256withRSA -digestalg SHA-256 \
  -keystore android/app/keystore/piloto-financeiro-prod.jks \
  -storepass PilotoFinanceiro2026! \
  -keypass PilotoFinanceiro2026! \
  app-release-unsigned.apk piloto_prod
```

### Para Verificar o Certificado
```bash
keytool -list -v -keystore android/app/keystore/piloto-financeiro-prod.jks \
  -storepass PilotoFinanceiro2026!
```

---

## 📝 Checklist para Produção

- [x] Package Name alterado para `com.lucas.pilotofinanceiro`
- [x] KeyStore de produção gerada
- [x] Version Code e Version Name atualizados (1.0.14)
- [x] Permissões otimizadas (apenas POST_NOTIFICATIONS)
- [x] Intent Filters configurados para Stripe
- [x] Adaptive Icon configurado
- [x] Edge-to-Edge habilitado

---

**Piloto Financeiro Pro** © 2026
