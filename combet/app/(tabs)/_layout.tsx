import { Tabs } from 'expo-router';
import { HapticTab } from '@/components/haptic-tab';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { View, Text, Pressable, TextInput } from 'react-native';

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const [showBetModal, setShowBetModal] = useState(false);
  const [step, setStep] = useState<1 | 2>(1);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [postType, setPostType] = useState<'circle' | 'friend'>('circle');
  const [selectedTarget, setSelectedTarget] = useState<string | null>(null);
  const [options, setOptions] = useState<string[]>(['', '']);
  const [stake, setStake] = useState('');

  const inputStyle = {
    backgroundColor: '#0B1A2D',
    color: 'white',
    borderRadius: 10,
    padding: 10,
    marginBottom: 10,
    fontSize: 14,
  };

  return (
    <View style={{ flex: 1 }}>
      <Tabs
        screenOptions={{
          tabBarActiveTintColor: Colors[colorScheme ?? 'light'].tint,
          tabBarInactiveTintColor: '#9e9e9e',
          headerShown: false,
          tabBarButton: HapticTab,
          tabBarStyle: {
            height: 70,
            paddingBottom: 8,
            paddingTop: 8,
            backgroundColor: '#0f223a',
            borderTopWidth: 0,
            shadowColor: 'transparent',
            elevation: 0,
          },
        }}
      >
        <Tabs.Screen name="index" options={{
          title: 'Home',
          tabBarIcon: ({ color }) => (
            <Ionicons size={28} name="home-outline" color={color} />
          ),
        }} />

        <Tabs.Screen name="community" options={{
          title: 'Community',
          tabBarIcon: ({ color }) => (
            <Ionicons size={24} name="globe-outline" color={color} />
          ),
        }} />

        <Tabs.Screen
          name="add-bet"
          options={{
            title: 'Bet',
            tabBarIcon: ({ color }) => (
              <Ionicons size={28} name="add-circle" color={color} />
            ),
            tabBarButton: ({ children, style }) => (
              <Pressable
                onPress={() => {
                  setShowBetModal(true);
                  setStep(1);
                }}
                style={[style, { justifyContent: 'center', alignItems: 'center' }]}
              >
                {children}
              </Pressable>
            ),
          }}
        />

        <Tabs.Screen name="circles" options={{
          title: 'Circles',
          tabBarIcon: ({ color }) => (
            <Ionicons size={28} name="people-circle" color={color} />
          ),
        }} />

        <Tabs.Screen name="profile" options={{
          title: 'Profile',
          tabBarIcon: ({ color }) => (
            <Ionicons size={28} name="person" color={color} />
          ),
        }} />

        <Tabs.Screen name="inbox" options={{
          title: 'Inbox',
          href: null,
          headerShown: false,
        }} />
      </Tabs>

      {showBetModal && (
        <View
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.6)',
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <View
            style={{
              width: '90%',
              maxHeight: '90%',
              backgroundColor: '#0F223A',
              borderRadius: 24,
              padding: 20,
            }}
          >
            {step === 1 ? (
              <View key = "step1">

                <Text style={{ color: 'white', fontSize: 20, fontWeight: '700', marginBottom: 15, textAlign: 'center' }}>
                  Create Bet
                </Text>

                <Text style={{ color: '#9BB7D4', fontSize: 13 }}>Title</Text>
                <TextInput value={title} onChangeText={setTitle} placeholder="Bet title"
                  placeholderTextColor="#6B8BAA" style={inputStyle} />

                <Text style={{ color: '#9BB7D4', fontSize: 13 }}>Description</Text>
                <TextInput value={description} onChangeText={setDescription}
                  placeholder="Describe the bet"
                  placeholderTextColor="#6B8BAA" style={inputStyle} />

                <View style={{ flexDirection: 'row', marginBottom: 12 }}>
                  <Pressable
                    onPress={() => setPostType('circle')}
                    style={{
                      flex: 1,
                      padding: 8,
                      borderRadius: 8,
                      backgroundColor: postType === 'circle' ? '#2F80ED' : '#0B1A2D',
                      alignItems: 'center',
                      marginRight: 6,
                    }}
                  >
                    <Text style={{ color: 'white', fontSize: 13 }}>Circle</Text>
                  </Pressable>

                  <Pressable
                    onPress={() => setPostType('friend')}
                    style={{
                      flex: 1,
                      padding: 8,
                      borderRadius: 8,
                      backgroundColor: postType === 'friend' ? '#2F80ED' : '#0B1A2D',
                      alignItems: 'center',
                    }}
                  >
                    <Text style={{ color: 'white', fontSize: 13 }}>Friend</Text>
                  </Pressable>
                </View>

                {options.map((opt, index) => (
                  <TextInput
                    key={index}
                    value={opt}
                    onChangeText={(text) => {
                      const updated = [...options];
                      updated[index] = text;
                      setOptions(updated);
                    }}
                    placeholder={`Option ${index + 1}`}
                    placeholderTextColor="#6B8BAA"
                    style={inputStyle}
                  />
                ))}

                <Pressable onPress={() => setOptions([...options, ''])}>
                  <Text style={{ color: '#6FA8DC', fontSize: 13, marginBottom: 10 }}>
                    + Add Option
                  </Text>
                </Pressable>

                <Text style={{ color: '#9BB7D4', fontSize: 13 }}>Buy-in</Text>
                <TextInput value={stake} onChangeText={setStake}
                  placeholder="Coins"
                  keyboardType="numeric"
                  placeholderTextColor="#6B8BAA"
                  style={inputStyle}
                />

                <Pressable
                  onPress={() => setStep(2)}
                  style={{
                    backgroundColor: '#2F80ED',
                    padding: 12,
                    borderRadius: 12,
                    alignItems: 'center',
                    marginTop: 10,
                  }}
                >
                  <Text style={{ color: 'white', fontWeight: '600' }}>Next</Text>
                </Pressable>

                <Pressable
                  onPress={() => {
                    setShowBetModal(false);
                    setStep(1);
                  }}
                  style={{ alignItems: 'center', marginTop: 10 }}
                >
                  <Text style={{ color: '#6FA8DC' }}>Cancel</Text>
                </Pressable>

              </View>
            ) : (
              <View key = "step2">

                <Text style={{ color: 'white', fontSize: 20, fontWeight: '700', marginBottom: 15, textAlign: 'center' }}>
                  Resolution Rules
                </Text>

                <Text style={{ color: '#9BB7D4', fontSize: 13 }}>Resolution Description</Text>
                <TextInput
                  placeholder="How will this bet be decided?"
                  placeholderTextColor="#6B8BAA"
                  style={inputStyle}
                />

                <Text style={{ color: '#9BB7D4', fontSize: 13 }}>End Date</Text>
                <TextInput
                  placeholder="MM/DD/YYYY"
                  placeholderTextColor="#6B8BAA"
                  style={inputStyle}
                />

                <Pressable
                  onPress={() => setStep(1)}
                  style={{ alignItems: 'center', marginBottom: 15 }}
                >
                  <Text style={{ color: '#6FA8DC' }}>Back</Text>
                </Pressable>

                <Pressable
                  onPress={() => {
                    setShowBetModal(false);
                    setStep(1);
                  }}
                  style={{
                    backgroundColor: '#2F80ED',
                    padding: 12,
                    borderRadius: 12,
                    alignItems: 'center',
                  }}
                >
                  <Text style={{ color: 'white', fontWeight: '600' }}>
                    Create Bet
                  </Text>
                </Pressable>

              </View>
            )}
          </View>
        </View>
      )}
    </View>
  );
}
