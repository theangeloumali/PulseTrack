'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@workspace/ui/components/button';
import { Input } from '@workspace/ui/components/input';
import { Label } from '@workspace/ui/components/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@workspace/ui/components/card';
import { Eye, EyeOff, Loader2, CheckCircle, ArrowLeft } from 'lucide-react';
import { supabase } from '@/lib/db';

function ResetPasswordContent() {
	const [password, setPassword] = useState('');
	const [confirmPassword, setConfirmPassword] = useState('');
	const [showPassword, setShowPassword] = useState(false);
	const [showConfirmPassword, setShowConfirmPassword] = useState(false);
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState('');
	const [isSuccess, setIsSuccess] = useState(false);

	const router = useRouter();
	const searchParams = useSearchParams();

	useEffect(() => {
		// Check if we have the necessary parameters for password reset
		const urlError = searchParams.get('error');
		const urlErrorDescription = searchParams.get('error_description');

		if (urlError) {
			setError(urlErrorDescription || 'Invalid or expired reset link');
		}
	}, [searchParams]);

	const validatePassword = (pwd: string) => {
		if (pwd.length < 8) {
			return 'Password must be at least 8 characters long';
		}
		if (!/[A-Z]/.test(pwd)) {
			return 'Password must contain at least one uppercase letter';
		}
		if (!/[a-z]/.test(pwd)) {
			return 'Password must contain at least one lowercase letter';
		}
		if (!/[0-9]/.test(pwd)) {
			return 'Password must contain at least one number';
		}
		return null;
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setIsLoading(true);
		setError('');

		// Validate password
		const passwordError = validatePassword(password);
		if (passwordError) {
			setError(passwordError);
			setIsLoading(false);
			return;
		}

		// Check if passwords match
		if (password !== confirmPassword) {
			setError('Passwords do not match');
			setIsLoading(false);
			return;
		}

		try {
			const { error } = await supabase.auth.updateUser({
				password: password,
			});

			if (error) {
				setError(error.message);
			} else {
				setIsSuccess(true);
				// Redirect to login after 3 seconds
				setTimeout(() => {
					router.push('/login');
				}, 3000);
			}
		} catch (err) {
			setError('An unexpected error occurred');
		} finally {
			setIsLoading(false);
		}
	};

	if (isSuccess) {
		return (
			<div className='min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8'>
				<div className='max-w-md w-full space-y-8'>
					<div className='text-center'>
						<CheckCircle className='mx-auto h-12 w-12 text-green-600' />
						<h2 className='mt-6 text-3xl font-extrabold text-gray-900'>Password Updated</h2>
						<p className='mt-2 text-sm text-gray-600'>Your password has been successfully updated.</p>
					</div>

					<Card className='bg-white border border-gray-200 shadow-sm'>
						<CardContent className='bg-white pt-6'>
							<div className='text-center space-y-4'>
								<p className='text-sm text-gray-600'>You will be redirected to the login page in a few seconds.</p>
								<Link href='/login'>
									<Button className='w-full bg-blue-600 hover:bg-blue-700 text-white'>Continue to login</Button>
								</Link>
							</div>
						</CardContent>
					</Card>
				</div>
			</div>
		);
	}

	return (
		<div className='min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8'>
			<div className='max-w-md w-full space-y-8'>
				<div className='text-center'>
					<h2 className='mt-6 text-3xl font-extrabold text-gray-900'>Reset your password</h2>
					<p className='mt-2 text-sm text-gray-600'>Enter your new password below to complete the reset process.</p>
				</div>

				<Card className='bg-white border border-gray-200 shadow-sm'>
					<CardHeader className='bg-white'>
						<CardTitle className='text-gray-900'>New Password</CardTitle>
						<CardDescription className='text-gray-600'>Choose a strong password for your account</CardDescription>
					</CardHeader>
					<CardContent className='bg-white'>
						<form onSubmit={handleSubmit} className='space-y-6'>
							{error && <div className='bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md text-sm'>{error}</div>}

							<div className='space-y-2'>
								<Label htmlFor='password' className='text-gray-700'>
									New Password
								</Label>
								<div className='relative'>
									<Input
										id='password'
										name='password'
										type={showPassword ? 'text' : 'password'}
										autoComplete='new-password'
										required
										value={password}
										onChange={(e) => setPassword(e.target.value)}
										placeholder='Enter your new password'
										className='bg-white border-gray-300 text-gray-900 placeholder-gray-500'
									/>
									<button type='button' className='absolute inset-y-0 right-0 pr-3 flex items-center' onClick={() => setShowPassword(!showPassword)}>
										{showPassword ? <EyeOff className='h-4 w-4 text-gray-400' /> : <Eye className='h-4 w-4 text-gray-400' />}
									</button>
								</div>
								<p className='text-xs text-gray-500'>Password must be at least 8 characters with uppercase, lowercase, and numbers</p>
							</div>

							<div className='space-y-2'>
								<Label htmlFor='confirmPassword' className='text-gray-700'>
									Confirm New Password
								</Label>
								<div className='relative'>
									<Input
										id='confirmPassword'
										name='confirmPassword'
										type={showConfirmPassword ? 'text' : 'password'}
										autoComplete='new-password'
										required
										value={confirmPassword}
										onChange={(e) => setConfirmPassword(e.target.value)}
										placeholder='Confirm your new password'
										className='bg-white border-gray-300 text-gray-900 placeholder-gray-500'
									/>
									<button type='button' className='absolute inset-y-0 right-0 pr-3 flex items-center' onClick={() => setShowConfirmPassword(!showConfirmPassword)}>
										{showConfirmPassword ? <EyeOff className='h-4 w-4 text-gray-400' /> : <Eye className='h-4 w-4 text-gray-400' />}
									</button>
								</div>
							</div>

							<Button type='submit' className='w-full bg-blue-600 hover:bg-blue-700 text-white' disabled={isLoading}>
								{isLoading ? (
									<>
										<Loader2 className='h-4 w-4 animate-spin mr-2' />
										Updating password...
									</>
								) : (
									'Update password'
								)}
							</Button>
						</form>

						<div className='mt-6'>
							<Link href='/login'>
								<Button variant='ghost' className='w-full'>
									<ArrowLeft className='h-4 w-4 mr-2' />
									Back to sign in
								</Button>
							</Link>
						</div>
					</CardContent>
				</Card>
			</div>
		</div>
	);
}

export default function ResetPasswordPage() {
	return (
		<Suspense
			fallback={
				<div className='min-h-screen flex items-center justify-center bg-gray-50'>
					<div className='text-center'>
						<div className='animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto'></div>
						<p className='mt-4 text-gray-600'>Loading...</p>
					</div>
				</div>
			}
		>
			<ResetPasswordContent />
		</Suspense>
	);
}