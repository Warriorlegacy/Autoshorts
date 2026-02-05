import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle, AlertCircle, Loader } from 'lucide-react';

export default function OAuthCallback() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const platform = searchParams.get('platform');
    const connected = searchParams.get('connected');
    const errorMsg = searchParams.get('error');
    const successMsg = searchParams.get('message');

    if (connected === 'true') {
      setStatus('success');
      setMessage(successMsg || `${platform} account connected successfully!`);
      // Redirect back to settings after 2 seconds
      setTimeout(() => {
        navigate('/settings');
      }, 2000);
    } else {
      setStatus('error');
      setMessage(errorMsg || `Failed to connect ${platform} account`);
      // Redirect back to settings after 3 seconds
      setTimeout(() => {
        navigate('/settings');
      }, 3000);
    }
  }, [searchParams, navigate]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full text-center">
        {status === 'loading' && (
          <>
            <Loader className="w-12 h-12 text-primary-blue mx-auto mb-4 animate-spin" />
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Processing</h1>
            <p className="text-gray-600">Connecting your account...</p>
          </>
        )}

        {status === 'success' && (
          <>
            <CheckCircle className="w-12 h-12 text-green-600 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Success!</h1>
            <p className="text-gray-600 mb-4">{message}</p>
            <p className="text-sm text-gray-500">Redirecting to settings...</p>
          </>
        )}

        {status === 'error' && (
          <>
            <AlertCircle className="w-12 h-12 text-red-600 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Connection Failed</h1>
            <p className="text-gray-600 mb-4">{message}</p>
            <p className="text-sm text-gray-500">Redirecting to settings...</p>
          </>
        )}
      </div>
    </div>
  );
}
