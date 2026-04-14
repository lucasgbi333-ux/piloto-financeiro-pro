import { ScrollView, Text, View, StyleSheet, TouchableOpacity } from "react-native";
import { router } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";

export default function PrivacyPolicyScreen() {
  return (
    <ScreenContainer className="p-0">
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <MaterialIcons name="chevron-left" size={28} color="#1ECFB3" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Política de Privacidade</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Content */}
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.content}>
          {/* Title */}
          <Text style={styles.mainTitle}>Piloto Financeiro</Text>
          <Text style={styles.subtitle}>Política de Privacidade</Text>
          <Text style={styles.date}>Última atualização: 14 de abril de 2026</Text>

          {/* Section 1 */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>1. Introdução</Text>
            <Text style={styles.sectionText}>
              Bem-vindo ao Piloto Financeiro. Sua privacidade é importante para nós. Esta Política de Privacidade explica como coletamos, usamos, protegemos e compartilhamos suas informações quando você usa nosso aplicativo mobile.
            </Text>
          </View>

          {/* Section 2 */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>2. Dados que Coletamos</Text>
            
            <Text style={styles.subsectionTitle}>Dados de Autenticação</Text>
            <Text style={styles.sectionText}>• Email: Necessário para criar sua conta{"\n"}• Senha: Armazenada de forma segura</Text>

            <Text style={styles.subsectionTitle}>Dados Inseridos por Você</Text>
            <Text style={styles.sectionText}>• Ganhos em corridas{"\n"}• Quilometragem percorrida{"\n"}• Despesas e gastos{"\n"}• Notas sobre desempenho</Text>

            <Text style={styles.subsectionTitle}>Dados que NÃO Coletamos</Text>
            <Text style={styles.sectionText}>• CPF ou RG{"\n"}• Endereço residencial{"\n"}• Número de telefone{"\n"}• Dados de cartão de crédito</Text>
          </View>

          {/* Section 3 */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>3. Como Usamos Seus Dados</Text>
            <Text style={styles.sectionText}>
              • Criar e gerenciar sua conta{"\n"}
              • Exibir seus dados de forma segura{"\n"}
              • Processar pagamentos via Stripe{"\n"}
              • Melhorar o aplicativo{"\n"}
              • Enviar notificações importantes{"\n"}
              • Cumprir obrigações legais
            </Text>
          </View>

          {/* Section 4 */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>4. Compartilhamento de Dados</Text>
            <Text style={styles.subsectionTitle}>Dados que NÃO Compartilhamos</Text>
            <Text style={styles.sectionText}>Nunca compartilhamos seus dados pessoais com terceiros para fins comerciais ou marketing.</Text>

            <Text style={styles.subsectionTitle}>Processadores de Dados</Text>
            <Text style={styles.sectionText}>
              <Text style={styles.bold}>Supabase</Text>: Autenticação e armazenamento{"\n"}
              <Text style={styles.bold}>Stripe</Text>: Processamento de pagamentos
            </Text>
          </View>

          {/* Section 5 */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>5. Segurança de Dados</Text>
            <Text style={styles.sectionText}>
              Implementamos medidas de segurança técnicas para proteger seus dados:{"\n\n"}
              • Criptografia de dados em trânsito (HTTPS){"\n"}
              • Criptografia de senhas{"\n"}
              • Acesso restrito a dados pessoais{"\n"}
              • Monitoramento de segurança
            </Text>
          </View>

          {/* Section 6 */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>6. Seus Direitos (LGPD)</Text>
            <Text style={styles.sectionText}>
              Conforme a Lei Geral de Proteção de Dados, você tem direito a:{"\n\n"}
              • Acessar seus dados pessoais{"\n"}
              • Corrigir dados incorretos{"\n"}
              • Deletar sua conta{"\n"}
              • Portar seus dados{"\n"}
              • Revogar consentimento{"\n"}
              • Receber informações sobre uso de dados
            </Text>
          </View>

          {/* Section 7 */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>7. Contato</Text>
            <Text style={styles.sectionText}>
              Se você tiver dúvidas sobre esta Política de Privacidade:{"\n\n"}
              <Text style={styles.bold}>Email:</Text> privacidade@pilotofinanceiro.com{"\n"}
              <Text style={styles.bold}>Assunto:</Text> Solicitação de Privacidade{"\n\n"}
              Responderemos em até 10 dias úteis.
            </Text>
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>
              Piloto Financeiro © 2026{"\n"}
              Todos os direitos reservados
            </Text>
          </View>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: "#0a0a0a",
    borderBottomWidth: 1,
    borderBottomColor: "#1a1a1a",
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#ECEDEE",
    flex: 1,
    textAlign: "center",
  },
  scrollContent: {
    paddingBottom: 40,
  },
  content: {
    paddingHorizontal: 16,
    paddingVertical: 24,
  },
  mainTitle: {
    fontSize: 28,
    fontWeight: "700",
    color: "#ECEDEE",
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1ECFB3",
    marginBottom: 8,
  },
  date: {
    fontSize: 12,
    color: "#9BA1A6",
    marginBottom: 24,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1ECFB3",
    marginBottom: 12,
  },
  subsectionTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#ECEDEE",
    marginTop: 12,
    marginBottom: 8,
  },
  sectionText: {
    fontSize: 14,
    color: "#9BA1A6",
    lineHeight: 22,
    letterSpacing: 0.3,
  },
  bold: {
    fontWeight: "700",
    color: "#ECEDEE",
  },
  footer: {
    marginTop: 32,
    paddingTop: 24,
    borderTopWidth: 1,
    borderTopColor: "#1a1a1a",
    alignItems: "center",
  },
  footerText: {
    fontSize: 12,
    color: "#687076",
    textAlign: "center",
    lineHeight: 18,
  },
});
