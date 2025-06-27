import { redirect } from 'next/navigation'

export default function Page() {
  // Redirect to dashboard as main entry point
  redirect('/dashboard')
}
