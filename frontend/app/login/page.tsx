'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { signIn } from 'next-auth/react'
import { login } from '@/utils/api'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const router = useRouter()

  // Regular email/password login
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    try {
      console.log('Starting login process with email:', email)
      const response = await login(email, password)
      
      if (response) {
        console.log('Login successful, redirecting...')
        router.push('/profile')
      }
    } catch (error: any) {
      console.error('Login error in component:', error)
      setError(error.message || 'Invalid email or password')
    }
  }

  // Social login (Google/Twitter)
  const handleSocialLogin = async (provider: string) => {
    try {
      console.log(`Starting ${provider} login...`)
      await signIn(provider, {
        callbackUrl: '/profile',
      })
    } catch (error) {
      console.error(`Error during ${provider} sign in:`, error)
      setError(`An unexpected error occurred during ${provider} login`)
    }
  }

  const handleGoogleSignIn = async () => {
    try {
      const result = await signIn('google', { 
        redirect: false,
        callbackUrl: '/profile' 
      });
      
      if (result?.error) {
        setError(result.error);
      } else if (result?.ok) {
        router.push('/profile');
      }
    } catch (error) {
      console.error('Google sign in error:', error);
      setError('Failed to sign in with Google');
    }
  };

  const handleTwitterSignIn = async () => {
    try {
      const result = await signIn('twitter', { 
        redirect: false,
        callbackUrl: '/profile' 
      });
      
      if (result?.error) {
        setError(result.error);
      } else if (result?.ok) {
        router.push('/profile');
      }
    } catch (error) {
      console.error('Twitter sign in error:', error);
      setError('Failed to sign in with Twitter');
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <Card className="w-[350px]">
        <CardHeader>
          <CardTitle>Login</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            {error && <p className="text-red-500">{error}</p>}
            <Button type="submit" className="w-full">Login</Button>
          </form>
          <div className="mt-4 space-y-2">
            <Button onClick={handleGoogleSignIn} variant="outline" className="w-full">
              Login with Google
            </Button>
            <Button onClick={handleTwitterSignIn} variant="outline" className="w-full">
              Login with Twitter
            </Button>
          </div>
          <div className="mt-4 text-center">
            <Link href="/register" className="text-sm text-blue-600 hover:underline">
              Don't have an account? Register here
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}