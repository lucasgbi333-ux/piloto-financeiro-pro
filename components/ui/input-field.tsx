import { Text, TextInput, View, type TextInputProps } from "react-native";
import { StyleSheet } from "react-native";

interface InputFieldProps extends TextInputProps {
  label: string;
  suffix?: string;
}

export function InputField({ label, suffix, value, onChangeText, ...props }: InputFieldProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          value={value}
          onChangeText={onChangeText}
          keyboardType="numeric"
          placeholderTextColor="#555555"
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
    height: 48,
  },
  input: {
    flex: 1,
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  suffix: {
    color: "#8E8E93",
    fontSize: 14,
    marginLeft: 8,
  },
});
