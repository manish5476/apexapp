import { zodResolver } from '@hookform/resolvers/zod';
import { Link, router } from 'expo-router';
import React, { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import {
  ActivityIndicator, Alert, KeyboardAvoidingView,
  Platform, ScrollView,
  Text, TextInput, TouchableOpacity,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { z } from 'zod';
import { AuthService } from '../../api/authService';
import { useAuthStore } from '../../store/auth.store';

const loginSchema = z.object({
  email: z.string().min(1, 'Email is required'),
  uniqueShopId: z.string().min(1, 'Shop ID is required'),
  password: z.string().min(1, 'Password is required'),
  remember: z.boolean(),  // ← no .default(), no .optional()
});

type LoginFormData = z.infer<typeof loginSchema>;

export default function LoginScreen() {
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { setAuth } = useAuthStore();

  const { control, handleSubmit, formState: { errors } } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', uniqueShopId: '', password: '', remember: false }  });

  const onSubmit = async (data: LoginFormData, forceLogout: boolean = false) => {
    setErrorMessage(null);
    setIsLoading(true);
    try {
      const response = await AuthService.login({ ...data, forceLogout });
      setAuth(response.token, response.data.user);
      router.replace('/(tabs)' as any);
    } catch (err: any) {
      if (err.response?.status === 409 && err.response?.data?.code === 'SESSION_CONCURRENCY_LIMIT') {
        Alert.alert(
          "Session Limit Reached",
          err.response?.data?.message || "Maximum concurrent sessions reached. Logout from other devices?",
          [
            { text: "Cancel", style: "cancel" },
            { text: "Yes, Logout Others", onPress: () => onSubmit(data, true) }
          ]
        );
        return;
      }
      setErrorMessage(err.response?.data?.message || 'Invalid credentials. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: 'white' }}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 24 }}>

          <View style={{ marginBottom: 32 }}>
            <Text style={{ fontSize: 28, fontWeight: 'bold', color: '#111827', marginBottom: 8 }}>Sign in to Apex</Text>
            <Text style={{ color: '#4B5563', fontSize: 16 }}>Enter your credentials to continue</Text>
          </View>

          {errorMessage && (
            <View style={{ backgroundColor: '#FEF2F2', borderColor: '#FCA5A5', borderWidth: 1, padding: 16, borderRadius: 8, marginBottom: 24, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <Text style={{ color: '#B91C1C', flex: 1, marginRight: 8 }}>{errorMessage}</Text>
              <TouchableOpacity onPress={() => setErrorMessage(null)}>
                <Text style={{ color: '#B91C1C', fontSize: 20, fontWeight: 'bold' }}>×</Text>
              </TouchableOpacity>
            </View>
          )}

          <View style={{ gap: 20, borderWidth: 1, borderColor: '#E5E7EB', padding: 24, borderRadius: 12, backgroundColor: 'white' }}>

            {/* Email */}
            <View>
              <Text style={{ color: '#1F2937', marginBottom: 8, fontWeight: '600' }}>Email or Phone</Text>
              <Controller control={control} name="email"
                render={({ field: { onChange, onBlur, value } }) => (
                  <TextInput
                    style={{ height: 48, paddingHorizontal: 16, borderRadius: 8, borderWidth: focusedField === 'email' ? 2 : 1, borderColor: focusedField === 'email' ? '#2563EB' : errors.email ? '#EF4444' : '#D1D5DB', backgroundColor: 'white', color: '#111827' }}
                    placeholder="name@company.com" placeholderTextColor="#9CA3AF"
                    onBlur={() => { onBlur(); setFocusedField(null); }}
                    onFocus={() => setFocusedField('email')}
                    onChangeText={onChange} value={value}
                    autoCapitalize="none" keyboardType="email-address"
                  />
                )}
              />
              {errors.email && <Text style={{ color: '#EF4444', fontSize: 12, marginTop: 4 }}>{errors.email.message}</Text>}
            </View>

            {/* Shop ID */}
            <View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                <Text style={{ color: '#1F2937', fontWeight: '600' }}>Shop ID</Text>
              </View>
              <Controller control={control} name="uniqueShopId"
                render={({ field: { onChange, onBlur, value } }) => (
                  <TextInput
                    style={{ height: 48, paddingHorizontal: 16, borderRadius: 8, borderWidth: focusedField === 'shopId' ? 2 : 1, borderColor: focusedField === 'shopId' ? '#2563EB' : errors.uniqueShopId ? '#EF4444' : '#D1D5DB', backgroundColor: 'white', color: '#111827' }}
                    placeholder="SHOP-1042" placeholderTextColor="#9CA3AF"
                    autoCapitalize="characters"
                    onBlur={() => { onBlur(); setFocusedField(null); }}
                    onFocus={() => setFocusedField('shopId')}
                    onChangeText={onChange} value={value}
                  />
                )}
              />
              {errors.uniqueShopId && <Text style={{ color: '#EF4444', fontSize: 12, marginTop: 4 }}>{errors.uniqueShopId.message}</Text>}
            </View>

            {/* Password */}
            <View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                <Text style={{ color: '#1F2937', fontWeight: '600' }}>Password</Text>
                <Link href={'/(auth)/forgot-password' as any} asChild>
                <TouchableOpacity>
                    <Text style={{ color: '#2563EB', fontSize: 14 }}>Forgot?</Text>
                  </TouchableOpacity>
                </Link>
              </View>
              <Controller control={control} name="password"
                render={({ field: { onChange, onBlur, value } }) => (
                  <TextInput
                    style={{ height: 48, paddingHorizontal: 16, borderRadius: 8, borderWidth: focusedField === 'password' ? 2 : 1, borderColor: focusedField === 'password' ? '#2563EB' : errors.password ? '#EF4444' : '#D1D5DB', backgroundColor: 'white', color: '#111827' }}
                    placeholder="••••••••" placeholderTextColor="#9CA3AF"
                    secureTextEntry
                    onBlur={() => { onBlur(); setFocusedField(null); }}
                    onFocus={() => setFocusedField('password')}
                    onChangeText={onChange} value={value}
                  />
                )}
              />
              {errors.password && <Text style={{ color: '#EF4444', fontSize: 12, marginTop: 4 }}>{errors.password.message}</Text>}
            </View>

            {/* Remember Me */}
            <Controller control={control} name="remember"
              render={({ field: { onChange, value } }) => (
                <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8 }} onPress={() => onChange(!value)} activeOpacity={0.7}>
                  <View style={{ width: 20, height: 20, borderWidth: 1, borderRadius: 4, alignItems: 'center', justifyContent: 'center', marginRight: 12, backgroundColor: value ? '#2563EB' : 'white', borderColor: value ? '#2563EB' : '#9CA3AF' }}>
                    {value && <Text style={{ color: 'white', fontSize: 12, fontWeight: 'bold' }}>✓</Text>}
                  </View>
                  <Text style={{ color: '#374151', fontWeight: '500' }}>Keep me signed in for 30 days</Text>
                </TouchableOpacity>
              )}
            />

            {/* Submit */}
            <TouchableOpacity
              style={{ height: 48, borderRadius: 8, alignItems: 'center', justifyContent: 'center', marginTop: 16, flexDirection: 'row', backgroundColor: isLoading ? '#93C5FD' : '#2563EB' }}
              onPress={handleSubmit((data) => onSubmit(data, false))}
              disabled={isLoading} activeOpacity={0.8}
            >
              {isLoading ? (
                <>
                  <ActivityIndicator color="white" style={{ marginRight: 8 }} />
                  <Text style={{ color: 'white', fontWeight: 'bold', fontSize: 16 }}>Signing in...</Text>
                </>
              ) : (
                <Text style={{ color: 'white', fontWeight: 'bold', fontSize: 16 }}>Sign in</Text>
              )}
            </TouchableOpacity>
          </View>

          <View style={{ flexDirection: 'row', justifyContent: 'center', marginTop: 32 }}>
            <Text style={{ color: '#4B5563' }}>No account? </Text>
            <Link href={'/(auth)/register' as any} asChild>
            <TouchableOpacity>
                <Text style={{ color: '#2563EB', fontWeight: 'bold' }}>Start your free trial</Text>
              </TouchableOpacity>
            </Link>
          </View>

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}