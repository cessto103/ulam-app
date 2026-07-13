import { ScrollView, Text, View, Pressable } from 'react-native';

export default function BudgetScreen() {
  return (
    <ScrollView className="flex-1 bg-cream-50" contentContainerClassName="px-4 py-6">
      <View className="rounded-2xl bg-leaf-600 p-5 mb-5">
        <Text className="text-white font-bold text-base">Budget Tracker 💰</Text>
        <Text className="text-leaf-100 text-xs mt-1">Track your daily food spending</Text>
      </View>

      {/* Placeholder — budget setup */}
      <View className="rounded-2xl border border-cream-200 bg-white p-6 items-center">
        <Text className="text-4xl mb-3">📊</Text>
        <Text className="font-semibold text-ink mb-1">Set up your budget</Text>
        <Text className="text-xs text-ink-soft mb-6 text-center px-4">
          Add your monthly budget so we can track how much you have left for food each day.
        </Text>
        <Pressable className="rounded-xl bg-leaf-600 px-6 py-3 active:bg-leaf-700">
          <Text className="text-sm font-semibold text-white">Set Monthly Budget</Text>
        </Pressable>
      </View>

      <View className="mt-4 rounded-2xl border border-leaf-100 bg-leaf-50 p-4">
        <Text className="text-xs font-semibold text-leaf-800">💡 Tip</Text>
        <Text className="mt-1 text-xs text-leaf-700 leading-4">
          Log your expenses daily to see how well you're staying within your food budget.
        </Text>
      </View>
    </ScrollView>
  );
}
