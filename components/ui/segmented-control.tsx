import { Text, View, Pressable, StyleSheet } from "react-native";

interface SegmentedControlProps {
  options: string[];
  selectedIndex: number;
  onSelect: (index: number) => void;
}

export function SegmentedControl({ options, selectedIndex, onSelect }: SegmentedControlProps) {
  return (
    <View style={styles.container}>
      {options.map((option, index) => {
        const isSelected = index === selectedIndex;
        return (
          <Pressable
            key={option}
            onPress={() => onSelect(index)}
            style={[
              styles.option,
              isSelected && styles.optionSelected,
            ]}
          >
            <Text
              style={[
                styles.optionText,
                isSelected && styles.optionTextSelected,
              ]}
            >
              {option}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    backgroundColor: "#111111",
    borderRadius: 12,
    padding: 3,
    marginBottom: 20,
  },
  option: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
    borderRadius: 10,
  },
  optionSelected: {
    backgroundColor: "#00D4AA",
  },
  optionText: {
    color: "#8E8E93",
    fontSize: 14,
    fontWeight: "600",
  },
  optionTextSelected: {
    color: "#000000",
    fontWeight: "700",
  },
});
