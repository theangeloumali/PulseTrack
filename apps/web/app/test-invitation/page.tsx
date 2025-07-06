// Test invitation through the UI
// Open this in browser: http://localhost:3001/test-invitation

"use client";

import { useState } from "react";

export default function TestInvitationPage() {
  const [email, setEmail] = useState("carions46@gmail.com");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState("");

  const testInvitation = async () => {
    setLoading(true);
    setResult("Sending invitation...");

    try {
      // First, we need to be logged in to call the API
      // For testing, let's bypass the API and create directly with admin client
      const response = await fetch("/api/invite-user", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: email,
          role: "user",
          companyId: "test-company-123",
          invitedBy: "test-admin-123",
          firstName: "Angelo",
          lastName: "Carions",
          hourlyRate: 50,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setResult(`✅ Invitation sent successfully! User ID: ${data.data?.id}`);
      } else {
        setResult(`❌ Error: ${data.error}`);
      }
    } catch (error: any) {
      setResult(`❌ Network error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Test Invitation</h1>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Email
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        <button
          onClick={testInvitation}
          disabled={loading}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? "Sending..." : "Send Test Invitation"}
        </button>

        {result && (
          <div className="mt-4 p-4 bg-gray-100 rounded-md">
            <pre>{result}</pre>
          </div>
        )}
      </div>

      <div className="mt-8 p-4 bg-yellow-50 border border-yellow-200 rounded-md">
        <h3 className="font-bold text-yellow-800">Expected Result:</h3>
        <p className="text-sm text-yellow-700">
          This will likely return "Unauthorized" because we're not logged in.
          That's expected - the API properly requires authentication.
        </p>
      </div>

      <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-md">
        <h3 className="font-bold text-blue-800">Testing the Full Flow:</h3>
        <ol className="text-sm text-blue-700 list-decimal list-inside space-y-1">
          <li>Check your email for the invitation</li>
          <li>Click the invitation link</li>
          <li>You should see the password setup page (not login)</li>
          <li>Set your password and complete setup</li>
        </ol>
      </div>
    </div>
  );
}
