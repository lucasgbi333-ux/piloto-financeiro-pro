import { Text, TextInput, View, type TextInputProps, StyleSheet } from "react-native";
import { useState, useCallback, useEffect } from "react";

interface InputFieldProps extends Omit<TextInputProps, "value" | "onChangeText"> {
  label: string;
  suffix?: string;
  /** Valor numérico atual */
  value: number;
  /** Chamado com o novo valor numérico (0 quando inválido) */
  onChangeValue: (num: number) => void;
}

/**
 * Input numérico que aceita tanto ponto quanto vírgula como separador decimal.
 * Mantém o texto bruto enquanto o usuário digita e só converte para número no blur.
 */
export function InputField({
  label,
  suffix,
  value,
  onChangeValue,
  placeholder,
  ...props
}: InputFieldProps) {
  // Texto exibido no input — começa vazio se valor for 0
  const [text, setText] = useState<string>(value > 0 ? String(value) : "");
  const [focused, setFocused] = useState(false);

  // Sincroniza o texto interno quando o valor externo muda e o campo não está focado
  // Isso garante que ao resetar (value=0), o campo é limpo visualmente
  useEffect(() => {
    if (!focused) {
      setText(value > 0 ? String(value).replace(".", ",") : "");
    }
  }, [value, focused]);

  const parseNum = useCallback((raw: string): number => {
    // Aceita vírgula ou ponto como separador decimal
    const normalized = raw.replace(",", ".");
    const val = parseFloat(normalized);
    return isNaN(val) ? 0 : val;
  }, []);

  const handleChangeText = useCallback(
    (raw: string) => {
      // Permite apenas dígitos, ponto e vírgula (e sinal negativo no início)
      const filtered = raw.replace(/[^0-9.,]/g, "");
      // Garante no máximo um separador decimal
      const parts = filtered.split(/[.,]/);
      let clean = filtered;
      if (parts.length > 2) {
        clean = parts[0] + (filtered.includes(",") ? "," : ".") + parts.slice(1).join("");
      }
      setText(clean);
      onChangeValue(parseNum(clean));
    },
    [onChangeValue, parseNum]
  );

  const handleFocus = useCallback(() => {
    setFocused(true);
  }, []);

  const handleBlur = useCallback(() => {
    setFocused(false);
    // Ao sair do campo, normaliza a exibição
    if (text === "" || text === "0") {
      setText("");
    } else {
      const num = parseNum(text);
      if (num === 0) {
        setText("");
      }
      // mantém o texto como está para não surpreender o usuário
    }
  }, [text, parseNum]);

  // Exibe o texto interno (já sincronizado pelo useEffect acima)
  const displayText = text;

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <View style={[styles.inputRow, focused && styles.inputRowFocused]}>
        <TextInput
          style={styles.input}
          value={displayText}
          onChangeText={handleChangeText}
          onFocus={handleFocus}
          onBlur={handleBlur}
          keyboardType="decimal-pad"
          placeholderTextColor="#444444"
          placeholder={placeholder ?? "0,00"}
          returnKeyType="done"
          {...props}
        />
        {suffix ? <Text style={styles.suffix}>{suffix}</Text> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  label: {
    color: "#8E8E93",
    fontSize: 13,
    fontWeight: "500",
    marginBottom: 6,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#111111",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#1C1C1E",
    paddingHorizontal: 16,
    height: 50,
  },
  inputRowFocused: {
    borderColor: "#00D4AA",
  },
  input: {
    flex: 1,
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "600",
    paddingVertical: 0,
  },
  suffix: {
    color: "#8E8E93",
    fontSize: 14,
    marginLeft: 8,
  },
});
