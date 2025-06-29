'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@workspace/ui/components/button';
import { Input } from '@workspace/ui/components/input';
import { Label } from '@workspace/ui/components/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@workspace/ui/components/card';
import { useAuthStore } from '@/lib/stores/auth';
import { generateSlug } from '@/lib/utils';
import { Eye, EyeOff, Loader2 } from 'lucide-react';

export default function SignUpPage() {
	const isDev = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
	const [formData, setFormData] = useState({
		email: isDev ? 'christianangeloumaliofficial@gmail.com' : '',
		password: isDev ? '@Testing123' : '',
		confirmPassword: isDev ? '@Testing123' : '',
		firstName: isDev ? 'Christian' : '',
		lastName: isDev ? 'Maliofficial' : '',
		companyName: isDev ? 'Christian Inc.' : '',
	});

	const [showPassword, setShowPassword] = useState(false);
	const [showConfirmPassword, setShowConfirmPassword] = useState(false);
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState('');

	const { signUp } = useAuthStore();
	const router = useRouter();

	const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		setFormData((prev) => ({
			...prev,
			[e.target.name]: e.target.value,
		}));
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setIsLoading(true);
		setError('');

		// Validation
		if (formData.password !== formData.confirmPassword) {
			setError('Passwords do not match');
			setIsLoading(false);
			return;
		}

		if (formData.password.length < 8) {
			setError('Password must be at least 8 characters long');
			setIsLoading(false);
			return;
		}

		try {
			const { error } = await signUp(formData.email, formData.password, {
				firstName: formData.firstName,
				lastName: formData.lastName,
				companyName: formData.companyName,
				companySlug: generateSlug(formData.companyName),
				email: formData.email, // Ensure email is included in user data
				role: 'admin', // First user becomes admin
			});

			if (error) {
				setError(error.message);
			} else {
				// Redirect to email verification page instead of dashboard
				router.push(`/verify-email?email=${formData.email}`);
			}
		} catch (err) {
			setError('An unexpected error occurred');
		} finally {
			setIsLoading(false);
		}
	};

	return (
		<div className='min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8'>
			<div className='max-w-md w-full space-y-8'>
				<div className='text-center'>
					<h2 className='mt-6 text-3xl font-extrabold text-gray-900'>Create your account</h2>
					<p className='mt-2 text-sm text-gray-600'>
						Already have an account?{' '}
						<Link href='/login' className='font-medium text-indigo-600 hover:text-indigo-500'>
							Sign in
						</Link>
					</p>
				</div>

				<Card>
					<CardHeader>
						<CardTitle>Get started</CardTitle>
						<CardDescription>Create your account and company workspace</CardDescription>
					</CardHeader>
					<CardContent>
						<form onSubmit={handleSubmit} className='space-y-6'>
							{error && <div className='bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md text-sm'>{error}</div>}

							<div className='grid grid-cols-2 gap-4'>
								<div className='space-y-2'>
									<Label htmlFor='firstName'>First name</Label>
									<Input id='firstName' name='firstName' type='text' required value={formData.firstName} onChange={handleChange} placeholder='John' />
								</div>
								<div className='space-y-2'>
									<Label htmlFor='lastName'>Last name</Label>
									<Input id='lastName' name='lastName' type='text' required value={formData.lastName} onChange={handleChange} placeholder='Doe' />
								</div>
							</div>

							<div className='space-y-2'>
								<Label htmlFor='email'>Email address</Label>
								<Input id='email' name='email' type='email' autoComplete='email' required value={formData.email} onChange={handleChange} placeholder='john@company.com' />
							</div>

							<div className='space-y-2'>
								<Label htmlFor='companyName'>Company name</Label>
								<Input id='companyName' name='companyName' type='text' required value={formData.companyName} onChange={handleChange} placeholder='Acme Corp' />
								<p className='text-xs text-gray-500'>This will be your company workspace name</p>
							</div>

							<div className='space-y-2'>
								<Label htmlFor='password'>Password</Label>
								<div className='relative'>
									<Input id='password' name='password' type={showPassword ? 'text' : 'password'} autoComplete='new-password' required value={formData.password} onChange={handleChange} placeholder='Create a strong password' />
									<button type='button' className='absolute inset-y-0 right-0 pr-3 flex items-center' onClick={() => setShowPassword(!showPassword)}>
										{showPassword ? <EyeOff className='h-4 w-4 text-gray-400' /> : <Eye className='h-4 w-4 text-gray-400' />}
									</button>
								</div>
							</div>

							<div className='space-y-2'>
								<Label htmlFor='confirmPassword'>Confirm password</Label>
								<div className='relative'>
									<Input id='confirmPassword' name='confirmPassword' type={showConfirmPassword ? 'text' : 'password'} autoComplete='new-password' required value={formData.confirmPassword} onChange={handleChange} placeholder='Confirm your password' />
									<button type='button' className='absolute inset-y-0 right-0 pr-3 flex items-center' onClick={() => setShowConfirmPassword(!showConfirmPassword)}>
										{showConfirmPassword ? <EyeOff className='h-4 w-4 text-gray-400' /> : <Eye className='h-4 w-4 text-gray-400' />}
									</button>
								</div>
							</div>

							<Button type='submit' className='w-full' disabled={isLoading}>
								{isLoading ? (
									<>
										<Loader2 className='h-4 w-4 animate-spin' />
										Creating account...
									</>
								) : (
									'Create account'
								)}
							</Button>

							<p className='text-xs text-gray-500 text-center'>
								By creating an account, you agree to our{' '}
								<Link href='/terms' className='text-indigo-600 hover:text-indigo-500'>
									Terms of Service
								</Link>{' '}
								and{' '}
								<Link href='/privacy' className='text-indigo-600 hover:text-indigo-500'>
									Privacy Policy
								</Link>
							</p>
						</form>
					</CardContent>
				</Card>
			</div>
		</div>
	);
}
